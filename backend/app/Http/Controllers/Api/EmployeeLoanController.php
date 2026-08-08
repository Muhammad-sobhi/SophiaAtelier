<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EmployeeLoan;
use App\Models\Expense;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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
        ]);

        $validated['status'] = $validated['status'] ?? 'approved';

        $loan = EmployeeLoan::create($validated);

        // Auto-create an expense record for the loan
        Expense::create([
            'category' => 'loan',
            'amount' => $validated['amount'],
            'description' => 'سلفة موظف: ' . ($loan->employee->name ?? '') . ' — ' . ($validated['reason'] ?? 'بدون سبب'),
            'date' => $validated['date'],
            'employee_id' => $validated['employee_id'],
        ]);

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

        $employeeLoan->update($validated);

        return response()->json($employeeLoan->load('employee'));
    }

    public function destroy(EmployeeLoan $employeeLoan): JsonResponse
    {
        $employeeLoan->delete();

        return response()->json(['message' => 'Loan deleted']);
    }
}
