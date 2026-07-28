<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\Employee;
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
            $dailyRate = $baseSalary > 0 ? $baseSalary / $daysInMonth : 0;
            $hourlyRate = $dailyRate > 0 ? $dailyRate / 8 : 0;

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

            $unexcusedAbsenceDeduction = round($absentDays * $dailyRate, 2);
            $unpaidLeaveDeduction = round($unpaidLeaveDays * $dailyRate, 2);
            $shortageDeduction = round($shortageHours * $hourlyRate, 2);
            $totalDeductions = round($unexcusedAbsenceDeduction + $unpaidLeaveDeduction + $shortageDeduction, 2);

            $overtimePay = round($totalOvertimeHours * $hourlyRate * 1.25, 2);
            $netSalary = round(max(0, $baseSalary - $totalDeductions + $overtimePay), 2);

            $report[] = [
                'employee_id' => $employee->id,
                'employee_name' => $employee->name,
                'position' => $employee->position ?? 'موظف',
                'month' => $month,
                'year' => $year,
                'days_in_month' => $daysInMonth,
                'base_salary' => $baseSalary,
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
                'total_deductions' => $totalDeductions,
                'overtime_pay' => $overtimePay,
                'net_salary' => $netSalary,
            ];
        }

        return response()->json($report);
    }
}
