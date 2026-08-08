<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\Employee;
use App\Models\EmployeeLoan;
use App\Models\LeaveRequest;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PayrollController extends Controller
{
    public function summary(Request $request): JsonResponse
    {
        $year = (int) $request->input('year', date('Y'));
        $month = (int) $request->input('month', date('m'));

        $startDate = Carbon::createFromDate($year, $month, 1)->startOfDay();
        $endDate = $startDate->copy()->endOfMonth()->endOfDay();
        $daysInMonth = $startDate->daysInMonth;

        $employees = Employee::all();
        $report = [];

        foreach ($employees as $employee) {
            $baseSalary = (float) $employee->salary;
            $payCycle = $employee->pay_cycle ?? 'monthly';
            $payCycleDays = (int) ($employee->pay_cycle_days ?? 0);

            // The entered salary is the employee's standard monthly salary (e.g. 8000).
            // Daily rate is calculated from monthly salary / daysInMonth.
            $dailyRate = $daysInMonth > 0 ? $baseSalary / $daysInMonth : 0;
            $hourlyRate = $dailyRate > 0 ? $dailyRate / 8 : 0;

            // Monthly salary stays as entered base salary
            $monthlySalary = $baseSalary;

            // Cycle salary is the amount per cycle (e.g. 3 days salary = dailyRate * 3)
            $cycleDays = $payCycle === 'weekly' ? 7 : ($payCycle === 'custom' && $payCycleDays > 0 ? $payCycleDays : $daysInMonth);
            $cycleSalary = round($dailyRate * $cycleDays, 2);

            // Fetch attendance logs for this month
            $attendances = Attendance::where('employee_id', $employee->id)
                ->whereBetween('date', [$startDate->format('Y-m-d'), $endDate->format('Y-m-d')])
                ->get();

            // Fetch approved leaves overlapping with this month
            $approvedLeaves = LeaveRequest::where('employee_id', $employee->id)
                ->where('status', 'approved')
                ->where(function ($query) use ($startDate, $endDate) {
                    $query->whereBetween('start_date', [$startDate->format('Y-m-d'), $endDate->format('Y-m-d')])
                          ->orWhereBetween('end_date', [$startDate->format('Y-m-d'), $endDate->format('Y-m-d')])
                          ->orWhere(function ($q2) use ($startDate, $endDate) {
                              $q2->where('start_date', '<=', $startDate->format('Y-m-d'))
                                 ->where('end_date', '>=', $endDate->format('Y-m-d'));
                          });
                })->get();

            // Fetch approved, undeducted loans for this employee
            $monthKey = sprintf('%04d-%02d', $year, $month);
            $pendingLoans = EmployeeLoan::where('employee_id', $employee->id)
                ->where('status', 'approved')
                ->where('deducted_from_salary', false)
                ->get();

            $presentDays = 0;
            $absentDays = 0;
            $totalWorkedHours = 0.0;
            $totalLateMinutes = 0;
            $totalOvertimeHours = 0.0;
            $shortageHours = 0.0;

            foreach ($attendances as $att) {
                if (in_array($att->status, ['present', 'late', 'half_day'])) {
                    $presentDays++;
                    $worked = (float) ($att->worked_hours ?? 0);
                    $totalWorkedHours += $worked;
                    $totalLateMinutes += (int) ($att->late_minutes ?? 0);
                    $totalOvertimeHours += (float) ($att->overtime_hours ?? 0);

                    // Standard shift is 8 hours
                    if ($worked > 0 && $worked < 8.0) {
                        $shortageHours += (8.0 - $worked);
                    }
                } elseif ($att->status === 'absent') {
                    $absentDays++;
                }
            }

            // Calculate leave days count
            $paidLeaveDays = 0;
            $unpaidLeaveDays = 0;

            foreach ($approvedLeaves as $leave) {
                $leaveStart = Carbon::parse($leave->start_date)->clamp($startDate, $endDate);
                $leaveEnd = Carbon::parse($leave->end_date)->clamp($startDate, $endDate);
                $count = $leaveStart->diffInDays($leaveEnd) + 1;

                if (in_array($leave->type, ['paid_leave', 'sick_leave', 'official_holiday'])) {
                    $paidLeaveDays += $count;
                } else {
                    $unpaidLeaveDays += $count;
                }
            }

            // Calculate loan deductions
            $loanDeduction = 0;
            $loanDetails = [];
            foreach ($pendingLoans as $loan) {
                $loanDeduction += (float) $loan->amount;
                $loanDetails[] = [
                    'id' => $loan->id,
                    'amount' => (float) $loan->amount,
                    'date' => $loan->date->format('Y-m-d'),
                    'reason' => $loan->reason,
                ];
            }

            $unexcusedAbsenceDeduction = round($absentDays * $dailyRate, 2);
            $unpaidLeaveDeduction = round($unpaidLeaveDays * $dailyRate, 2);
            $shortageDeduction = round($shortageHours * $hourlyRate, 2);
            $totalDeductions = round($unexcusedAbsenceDeduction + $unpaidLeaveDeduction + $shortageDeduction + $loanDeduction, 2);

            $overtimePay = round($totalOvertimeHours * $hourlyRate * 1.25, 2);
            $netSalary = round(max(0, $monthlySalary - $totalDeductions + $overtimePay), 2);

            $report[] = [
                'employee_id' => $employee->id,
                'employee_name' => $employee->name,
                'position' => $employee->position ?? 'موظف',
                'month' => $month,
                'year' => $year,
                'days_in_month' => $daysInMonth,
                'pay_cycle' => $payCycle,
                'pay_cycle_days' => $payCycleDays ?: null,
                'base_salary' => $baseSalary,
                'monthly_salary' => $monthlySalary,
                'cycle_salary' => $cycleSalary,
                'daily_rate' => round($dailyRate, 2),
                'hourly_rate' => round($hourlyRate, 2),
                'present_days' => $presentDays,
                'absent_days' => $absentDays,
                'paid_leave_days' => $paidLeaveDays,
                'unpaid_leave_days' => $unpaidLeaveDays,
                'total_worked_hours' => round($totalWorkedHours, 2),
                'total_late_minutes' => $totalLateMinutes,
                'shortage_hours' => round($shortageHours, 2),
                'total_overtime_hours' => round($totalOvertimeHours, 2),
                'unexcused_absence_deduction' => $unexcusedAbsenceDeduction,
                'unpaid_leave_deduction' => $unpaidLeaveDeduction,
                'shortage_deduction' => $shortageDeduction,
                'loan_deduction' => round($loanDeduction, 2),
                'loan_details' => $loanDetails,
                'total_deductions' => $totalDeductions,
                'overtime_pay' => $overtimePay,
                'net_salary' => $netSalary,
            ];
        }

        return response()->json($report);
    }

    /**
     * Mark all pending loans as deducted for a specific employee and month.
     * POST /api/payroll/deduct-loans
     */
    public function deductLoans(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'month' => 'required|string', // format: "2026-08"
        ]);

        $updated = EmployeeLoan::where('employee_id', $validated['employee_id'])
            ->where('status', 'approved')
            ->where('deducted_from_salary', false)
            ->update([
                'deducted_from_salary' => true,
                'deduction_month' => $validated['month'],
            ]);

        return response()->json([
            'message' => 'Loans marked as deducted',
            'count' => $updated,
        ]);
    }
}
