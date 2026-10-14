<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EmployeeLoan;
use App\Models\Expense;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class EmployeeLoanController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = EmployeeLoan::with('employee');

        if ($employeeId = $request->input('employee_id')) {
            $query->where('employee_id', $employeeId);
        }

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        // Filter for undeducted loans (for payroll)
        if ($request->boolean('undeducted')) {
            $query->where('status', 'approved')->where('deducted_from_salary', false);
        }

        return response()->json($query->latest('date')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'amount' => 'required|numeric|min:1',
            'date' => 'required|date',
            'reason' => 'nullable|string',
            'status' => 'nullable|in:pending,approved,rejected,paid',
            'payment_method' => 'nullable|string|max:50',
            'receipt_image' => 'nullable',
        ]);

        $validated['status'] = $validated['status'] ?? 'approved';

        $receiptPath = self::saveReceipt($request, 'receipt_image');

        $loan = DB::transaction(function () use ($validated, $receiptPath) {
            $loan = EmployeeLoan::create($validated);

            // Auto-create an expense record for the loan, linked so loan edits / deletes reach it
            $expense = Expense::create([
                'category' => 'loan',
                'amount' => $validated['amount'],
                'payment_method' => $validated['payment_method'] ?? 'cash',
                'receipt_path' => $receiptPath,
                'description' => self::expenseDescription($loan),
                'date' => $validated['date'],
                'employee_id' => $validated['employee_id'],
            ]);
            $loan->update(['expense_id' => $expense->id]);

            return $loan;
        });

        return response()->json($loan->load('employee'), 201);
    }

    public function show(EmployeeLoan $employeeLoan): JsonResponse
    {
        return response()->json($employeeLoan->load('employee'));
    }

    public function update(Request $request, EmployeeLoan $employeeLoan): JsonResponse
    {
        $validated = $request->validate([
            'amount' => 'sometimes|numeric|min:1',
            'date' => 'sometimes|date',
            'reason' => 'nullable|string',
            'status' => 'nullable|in:pending,approved,rejected,paid',
            'deducted_from_salary' => 'nullable|boolean',
            'deduction_month' => 'nullable|string',
        ]);

        DB::transaction(function () use ($employeeLoan, $validated) {
            $employeeLoan->update($validated);

            // Keep the linked finance expense in step with the loan
            $employeeLoan->expense?->update([
                'amount' => $employeeLoan->amount,
                'date' => $employeeLoan->date,
                'description' => self::expenseDescription($employeeLoan),
            ]);
        });

        return response()->json($employeeLoan->load('employee'));
    }

    public function destroy(EmployeeLoan $employeeLoan): JsonResponse
    {
        DB::transaction(function () use ($employeeLoan) {
            $expenseId = $employeeLoan->expense_id;
            $employeeLoan->delete();
            if ($expenseId) {
                Expense::whereKey($expenseId)->delete();
            }
        });

        return response()->json(['message' => 'Loan deleted']);
    }

    private static function expenseDescription(EmployeeLoan $loan): string
    {
        return 'سلفة موظف: ' . ($loan->employee->name ?? '') . ' — ' . ($loan->reason ?: 'بدون سبب');
    }
}
