<?php

namespace App\Services;

use App\Models\Attendance;
use App\Models\Employee;
use App\Models\EmployeeLoan;
use App\Models\EmployeeSalaryPayment;
use App\Models\Expense;
use App\Models\LeaveRequest;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Employee pay is a daily rate. Each employee is paid per period of their pay cycle:
 * - monthly: the calendar month, worth daily_rate x 30 whatever the month length
 * - weekly:  Saturday to Friday, worth daily_rate x 7
 * - custom:  blocks of pay_cycle_days days counted from the hire date, worth daily_rate x pay_cycle_days
 * Absences, unpaid leave, missing shift hours and the period's loans are deducted; overtime is added.
 * Paying a period writes a "salary" expense, so it shows in the finance page.
 */
class PayrollService
{
    public const MONTH_DAYS = 30;
    public const WEEK_DAYS = 7;
    public const SHIFT_HOURS = 8;
    public const OVERTIME_FACTOR = 1.25;

    // A Saturday: weekly periods run Saturday -> Friday
    private const WEEK_ANCHOR = '2000-01-01';

    public function cycleDays(Employee $employee): int
    {
        return match ($employee->pay_cycle) {
            'weekly' => self::WEEK_DAYS,
            'custom' => (int) $employee->pay_cycle_days > 0 ? (int) $employee->pay_cycle_days : self::MONTH_DAYS,
            default => self::MONTH_DAYS,
        };
    }

    /**
     * Started periods of the employee that end within the given month (each period belongs to exactly one month).
     *
     * @return array<int, array{start: Carbon, end: Carbon, key: string}>
     */
    public function periodsForMonth(Employee $employee, int $year, int $month): array
    {
        $monthStart = Carbon::create($year, $month, 1)->startOfDay();
        $monthEnd = $monthStart->copy()->endOfMonth()->startOfDay();

        if ($this->isMonthly($employee)) {
            $periods = [$this->makePeriod($employee, $monthStart, $monthEnd)];
        } else {
            $days = $this->cycleDays($employee);
            $anchor = $this->anchor($employee);
            $periods = [];
            if ($monthEnd->gte($anchor)) {
                $start = $monthStart->gt($anchor)
                    ? $anchor->copy()->addDays(intdiv($this->daysBetween($anchor, $monthStart), $days) * $days)
                    : $anchor->copy();
                for (; ; $start->addDays($days)) {
                    $end = $start->copy()->addDays($days - 1);
                    if ($end->gt($monthEnd)) {
                        break;
                    }
                    if ($end->gte($monthStart)) {
                        $periods[] = $this->makePeriod($employee, $start->copy(), $end);
                    }
                }
            }
        }

        $today = Carbon::today();
        $hired = $employee->hire_date ? Carbon::parse($employee->hire_date)->startOfDay() : null;

        return array_values(array_filter(
            $periods,
            fn ($p) => $p['start']->lte($today) && (!$hired || $p['end']->gte($hired))
        ));
    }

    /**
     * The employee's period that contains the given date.
     *
     * @return array{start: Carbon, end: Carbon, key: string}
     */
    public function periodContaining(Employee $employee, Carbon $date): array
    {
        $date = $date->copy()->startOfDay();
        if ($this->isMonthly($employee)) {
            return $this->makePeriod($employee, $date->copy()->startOfMonth(), $date->copy()->endOfMonth()->startOfDay());
        }

        $days = $this->cycleDays($employee);
        $anchor = $this->anchor($employee);
        if ($date->lt($anchor)) {
            throw ValidationException::withMessages(['period_start' => 'التاريخ قبل بداية أول دورة صرف للموظف']);
        }
        $start = $anchor->copy()->addDays(intdiv($this->daysBetween($anchor, $date), $days) * $days);

        return $this->makePeriod($employee, $start, $start->copy()->addDays($days - 1));
    }

    /**
     * Payroll row of one employee for one period, or null when there is nothing to pay or show.
     *
     * @param array{start: Carbon, end: Carbon, key: string} $period
     */
    public function compute(Employee $employee, array $period): ?array
    {
        ['start' => $start, 'end' => $end, 'key' => $key] = $period;
        $from = $start->format('Y-m-d');
        $to = $end->format('Y-m-d');

        $dailyRate = (float) $employee->daily_rate;
        $hourlyRate = $dailyRate / self::SHIFT_HOURS;
        $cycleDays = $this->cycleDays($employee);
        $cycleSalary = round($dailyRate * $cycleDays, 2);

        $presentDays = 0;
        $absentDays = 0;
        $absentRecords = [];
        $totalWorkedHours = 0.0;
        $totalLateMinutes = 0;
        $totalOvertimeHours = 0.0;
        $shortageHours = 0.0;
        $shortageRecords = [];

        $attendances = Attendance::where('employee_id', $employee->id)->whereBetween('date', [$from, $to])->get();
        foreach ($attendances as $att) {
            if (in_array($att->status, ['present', 'late', 'half_day'])) {
                $presentDays++;
                $worked = (float) ($att->worked_hours ?? 0);
                $totalWorkedHours += $worked;
                $totalLateMinutes += (int) ($att->late_minutes ?? 0);
                $totalOvertimeHours += (float) ($att->overtime_hours ?? 0);

                if ($worked > 0 && $worked < self::SHIFT_HOURS) {
                    $shortage = round(self::SHIFT_HOURS - $worked, 2);
                    $shortageHours += $shortage;
                    $shortageRecords[] = [
                        'id' => $att->id,
                        'date' => $att->date->format('Y-m-d'),
                        'worked_hours' => $worked,
                        'shortage_hours' => $shortage,
                    ];
                }
            } elseif ($att->status === 'absent') {
                $absentDays++;
                $absentRecords[] = ['id' => $att->id, 'date' => $att->date->format('Y-m-d'), 'status' => $att->status];
            }
        }

        // Approved leave days inside the period
        $paidLeaveDays = 0;
        $unpaidLeaveDays = 0;
        $leaves = LeaveRequest::where('employee_id', $employee->id)
            ->where('status', 'approved')
            ->where('start_date', '<=', $to)
            ->where('end_date', '>=', $from)
            ->get();
        foreach ($leaves as $leave) {
            $leaveStart = Carbon::parse($leave->start_date)->max($start);
            $leaveEnd = Carbon::parse($leave->end_date)->min($end);
            $count = $this->daysBetween($leaveStart->startOfDay(), $leaveEnd->startOfDay()) + 1;
            if (in_array($leave->type, ['paid_leave', 'sick_leave', 'official_holiday'])) {
                $paidLeaveDays += $count;
            } else {
                $unpaidLeaveDays += $count;
            }
        }

        // Loans dated in the period: still pending, or already deducted by this period's payment
        $loans = EmployeeLoan::where('employee_id', $employee->id)
            ->where('status', 'approved')
            ->whereBetween('date', [$from, $to])
            ->where(fn ($q) => $q->where('deducted_from_salary', false)->orWhere('deduction_month', $key))
            ->get();
        $loanDeduction = round((float) $loans->sum('amount'), 2);
        $loanDetails = $loans->map(fn ($loan) => [
            'id' => $loan->id,
            'amount' => (float) $loan->amount,
            'date' => $loan->date->format('Y-m-d'),
            'reason' => $loan->reason,
        ])->values()->all();

        $unexcusedAbsenceDeduction = round($absentDays * $dailyRate, 2);
        $unpaidLeaveDeduction = round($unpaidLeaveDays * $dailyRate, 2);
        $shortageDeduction = round($shortageHours * $hourlyRate, 2);
        $totalDeductions = round($unexcusedAbsenceDeduction + $unpaidLeaveDeduction + $shortageDeduction + $loanDeduction, 2);
        $overtimePay = round($totalOvertimeHours * $hourlyRate * self::OVERTIME_FACTOR, 2);
        $netSalary = round(max(0, $cycleSalary - $totalDeductions + $overtimePay), 2);

        $payments = EmployeeSalaryPayment::where('employee_id', $employee->id)
            ->where('period', $key)
            ->orderBy('payment_date')
            ->orderBy('id')
            ->get();
        $paidAmount = round((float) $payments->sum('amount'), 2);
        $remainingAmount = round(max(0, $netSalary - $paidAmount), 2);

        // Nothing to pay and nothing recorded: leave the employee out
        $hasActivity = $attendances->isNotEmpty() || $leaves->isNotEmpty() || $loans->isNotEmpty() || $payments->isNotEmpty();
        if ($dailyRate <= 0 && !$hasActivity) {
            return null;
        }

        return [
            'employee_id' => $employee->id,
            'employee_name' => $employee->name,
            'position' => $employee->role ?: 'موظف',
            'pay_cycle' => $employee->pay_cycle ?? 'monthly',
            'pay_cycle_days' => $cycleDays,
            'period_key' => $key,
            'period_start' => $from,
            'period_end' => $to,
            'period_finished' => $end->lt(Carbon::today()),
            'daily_rate' => round($dailyRate, 2),
            'hourly_rate' => round($hourlyRate, 2),
            'cycle_salary' => $cycleSalary,
            'present_days' => $presentDays,
            'absent_days' => $absentDays,
            'paid_leave_days' => $paidLeaveDays,
            'unpaid_leave_days' => $unpaidLeaveDays,
            'total_worked_hours' => round($totalWorkedHours, 2),
            'total_late_minutes' => $totalLateMinutes,
            'shortage_hours' => round($shortageHours, 2),
            'total_overtime_hours' => round($totalOvertimeHours, 2),
            'unexcused_absence_deduction' => $unexcusedAbsenceDeduction,
            'absent_records' => $absentRecords,
            'unpaid_leave_deduction' => $unpaidLeaveDeduction,
            'shortage_deduction' => $shortageDeduction,
            'shortage_records' => $shortageRecords,
            'loan_deduction' => $loanDeduction,
            'loan_details' => $loanDetails,
            'total_deductions' => $totalDeductions,
            'overtime_pay' => $overtimePay,
            'net_salary' => $netSalary,
            'paid_amount' => $paidAmount,
            'remaining_amount' => $remainingAmount,
            'payment_status' => $paidAmount <= 0 ? 'unpaid' : ($remainingAmount > 0 ? 'partial' : 'paid'),
            'payments' => $payments->map(fn (EmployeeSalaryPayment $p) => [
                'id' => $p->id,
                'amount' => (float) $p->amount,
                'payment_method' => $p->payment_method,
                'payment_date' => $p->payment_date->format('Y-m-d'),
                'notes' => $p->notes,
            ])->values()->all(),
        ];
    }

    /**
     * Pay (fully or partially) the period that starts on $periodStart.
     *
     * @param array{amount: float|string, payment_method: string, payment_date: string, notes?: ?string} $data
     */
    public function pay(int $employeeId, string $periodStart, array $data, ?int $userId): array
    {
        return DB::transaction(function () use ($employeeId, $periodStart, $data, $userId) {
            // Lock the employee so two clicks cannot both pay the same remaining amount
            $employee = Employee::whereKey($employeeId)->lockForUpdate()->firstOrFail();
            $period = $this->periodContaining($employee, Carbon::parse($periodStart));
            if ($period['start']->format('Y-m-d') !== Carbon::parse($periodStart)->format('Y-m-d')) {
                throw ValidationException::withMessages(['period_start' => 'فترة الصرف لا تطابق دورة راتب الموظف — حدّث الصفحة وحاول مرة أخرى']);
            }

            $row = $this->compute($employee, $period);
            $remaining = $row['remaining_amount'] ?? 0;
            $amount = round((float) $data['amount'], 2);
            if ($remaining <= 0) {
                throw ValidationException::withMessages(['amount' => 'لا يوجد مبلغ مستحق متبقٍ لهذا الموظف عن هذه الفترة']);
            }
            if ($amount > $remaining) {
                throw ValidationException::withMessages(['amount' => 'المبلغ أكبر من المتبقي المستحق (' . number_format($remaining, 2) . ' ج.م)']);
            }

            $expense = Expense::create([
                'category' => 'salary',
                'employee_id' => $employee->id,
                'amount' => $amount,
                'payment_method' => $data['payment_method'],
                'date' => $data['payment_date'],
                'description' => 'راتب ' . $this->periodLabel($employee, $period) . ' - ' . $employee->name
                    . ($amount < $remaining ? ' (دفعة جزئية)' : '')
                    . (!empty($data['notes']) ? ' - ' . $data['notes'] : ''),
            ]);

            EmployeeSalaryPayment::create([
                'employee_id' => $employee->id,
                'expense_id' => $expense->id,
                'period' => $period['key'],
                'period_start' => $period['start']->format('Y-m-d'),
                'period_end' => $period['end']->format('Y-m-d'),
                'amount' => $amount,
                'net_salary' => $row['net_salary'],
                'payment_method' => $data['payment_method'],
                'payment_date' => $data['payment_date'],
                'notes' => $data['notes'] ?? null,
                'paid_by' => $userId,
            ]);

            // The period's loans are deducted from this salary
            EmployeeLoan::where('employee_id', $employee->id)
                ->where('status', 'approved')
                ->where('deducted_from_salary', false)
                ->whereBetween('date', [$period['start']->format('Y-m-d'), $period['end']->format('Y-m-d')])
                ->update(['deducted_from_salary' => true, 'deduction_month' => $period['key']]);

            ActivityLogger::log('صرف راتب موظف', 'Employee', $employee->id, [
                'period' => $period['key'],
                'amount' => $amount,
                'payment_method' => $data['payment_method'],
            ]);

            return $this->compute($employee, $period);
        });
    }

    /**
     * Undo a payment: removes its finance expense; when the period has no payments left its loans become pending again.
     */
    public function undo(EmployeeSalaryPayment $payment): ?array
    {
        return DB::transaction(function () use ($payment) {
            $employee = $payment->employee;
            $period = [
                'start' => Carbon::parse($payment->period_start)->startOfDay(),
                'end' => Carbon::parse($payment->period_end)->startOfDay(),
                'key' => $payment->period,
            ];

            $expenseId = $payment->expense_id;
            $payment->delete();
            if ($expenseId) {
                Expense::whereKey($expenseId)->delete();
            }

            if (!EmployeeSalaryPayment::where('employee_id', $employee->id)->where('period', $period['key'])->exists()) {
                EmployeeLoan::where('employee_id', $employee->id)
                    ->where('deduction_month', $period['key'])
                    ->update(['deducted_from_salary' => false, 'deduction_month' => null]);
            }

            ActivityLogger::log('إلغاء صرف راتب موظف', 'Employee', $employee->id, [
                'period' => $period['key'],
                'amount' => (float) $payment->amount,
            ]);

            return $this->compute($employee, $period);
        });
    }

    private function isMonthly(Employee $employee): bool
    {
        return !in_array($employee->pay_cycle, ['weekly', 'custom'], true);
    }

    // First day of the employee's first weekly / custom period
    private function anchor(Employee $employee): Carbon
    {
        if ($employee->pay_cycle === 'weekly') {
            return Carbon::parse(self::WEEK_ANCHOR)->startOfDay();
        }

        return Carbon::parse($employee->hire_date ?? $employee->created_at ?? Carbon::today())->startOfDay();
    }

    /** @return array{start: Carbon, end: Carbon, key: string} */
    private function makePeriod(Employee $employee, Carbon $start, Carbon $end): array
    {
        return [
            'start' => $start,
            'end' => $end,
            'key' => $this->isMonthly($employee) ? $start->format('Y-m') : $start->format('Y-m-d') . '_' . $end->format('Y-m-d'),
        ];
    }

    private function periodLabel(Employee $employee, array $period): string
    {
        return $this->isMonthly($employee)
            ? 'شهر ' . $period['start']->format('m/Y')
            : 'الفترة ' . $period['start']->format('d/m') . ' - ' . $period['end']->format('d/m/Y');
    }

    // Whole days from $from to $to (both at midnight)
    private function daysBetween(Carbon $from, Carbon $to): int
    {
        return (int) round($from->diffInDays($to));
    }
}
