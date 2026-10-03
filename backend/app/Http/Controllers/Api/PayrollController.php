<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\EmployeeLoan;
use App\Models\EmployeeSalaryPayment;
use App\Services\PayrollService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PayrollController extends Controller
{
    public function __construct(private PayrollService $payroll)
    {
    }

    /**
     * Pay periods ending in the given month, one row per employee period (see PayrollService).
     * GET /api/payroll/summary?year=&month=
     */
    public function summary(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'year' => 'nullable|integer|min:2000|max:2100',
            'month' => 'nullable|integer|min:1|max:12',
        ]);
        $year = (int) ($validated['year'] ?? date('Y'));
        $month = (int) ($validated['month'] ?? date('m'));

        $report = [];
        foreach (Employee::orderBy('name')->get() as $employee) {
            foreach ($this->payroll->periodsForMonth($employee, $year, $month) as $period) {
                if ($row = $this->payroll->compute($employee, $period)) {
                    $report[] = $row;
                }
            }
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

    /**
     * Pay an employee's salary (fully or partially) for one pay period.
     * POST /api/payroll/payments
     */
    public function pay(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'period_start' => 'required|date',
            'amount' => 'required|numeric|min:0.01',
            'payment_method' => 'required|string|max:50',
            'payment_date' => 'required|date',
            'notes' => 'nullable|string|max:1000',
        ]);

        $row = $this->payroll->pay((int) $validated['employee_id'], $validated['period_start'], $validated, $request->user()?->id);

        return response()->json($row, 201);
    }

    /**
     * Undo a salary payment.
     * DELETE /api/payroll/payments/{payment}
     */
    public function destroyPayment(EmployeeSalaryPayment $payment): JsonResponse
    {
        return response()->json($this->payroll->undo($payment));
    }
}
