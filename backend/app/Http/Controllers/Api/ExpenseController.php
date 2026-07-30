<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Expense;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ExpenseController extends Controller
{
    public function index(Request $request)
    {
        $query = Expense::with('employee');

        if ($category = $request->input('category')) {
            $query->where('category', $category);
        }

        if ($startDate = $request->input('start_date')) {
            $query->where('date', '>=', $startDate);
        }

        if ($endDate = $request->input('end_date')) {
            $query->where('date', '<=', $endDate);
        }

        return response()->json($query->latest('date')->paginate(min((int) $request->input('per_page', 50), 100)));
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'category' => 'nullable|in:salary,loan,purchase,maintenance,cleaning,other',
            'amount' => 'required|numeric|min:0',
            'payment_method' => 'nullable|string|max:100',
            'description' => 'nullable|string',
            'date' => 'required|date',
            'employee_id' => 'nullable|exists:employees,id',
            'receipt' => 'nullable',
            'receipt_image' => 'nullable',
        ]);

        $receiptPath = self::saveReceipt($request, 'receipt') ?? self::saveReceipt($request, 'receipt_image');
        if ($receiptPath) {
            $validated['receipt_path'] = $receiptPath;
        }

        $expense = Expense::create($validated);

        return response()->json($expense->load('employee'), 201);
    }

    public function show(Expense $expense)
    {
        $expense->load('employee');

        return response()->json($expense);
    }

    public function update(Request $request, Expense $expense): JsonResponse
    {
        $validated = $request->validate([
            'category' => 'nullable|in:salary,loan,purchase,maintenance,cleaning,other',
            'amount' => 'sometimes|required|numeric|min:0',
            'payment_method' => 'nullable|string|max:100',
            'description' => 'nullable|string',
            'date' => 'sometimes|required|date',
            'employee_id' => 'nullable|exists:employees,id',
            'receipt' => 'nullable',
            'receipt_image' => 'nullable',
        ]);

        $receiptPath = self::saveReceipt($request, 'receipt') ?? self::saveReceipt($request, 'receipt_image');
        if ($receiptPath) {
            $validated['receipt_path'] = $receiptPath;
        }

        $expense->update($validated);

        return response()->json($expense->load('employee'));
    }

    public function destroy(Expense $expense): JsonResponse
    {
        $expense->delete();

        return response()->json(['message' => 'Expense deleted']);
    }
}
