<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EmployeeLoan;
use App\Models\EmployeeSalaryPayment;
use App\Models\Expense;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ExpenseController extends Controller
{
    // Material purchases (خامات وأقمشة): what was bought, how much, and the price per unit
    private const MATERIAL_RULES = [
        'material_name' => 'nullable|required_if:category,fabrics|string|max:255',
        'quantity' => 'nullable|required_if:category,fabrics|numeric|min:0.01',
        'unit_price' => 'nullable|required_if:category,fabrics|numeric|min:0',
    ];

    /**
     * A fabrics expense costs quantity × unit price; other categories don't keep material fields.
     */
    private static function withMaterialTotal(array $validated): array
    {
        if (($validated['category'] ?? null) === 'fabrics') {
            $validated['amount'] = round($validated['quantity'] * $validated['unit_price'], 2);
        } elseif (array_key_exists('category', $validated)) {
            $validated['material_name'] = $validated['quantity'] = $validated['unit_price'] = null;
        }

        return $validated;
    }

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

        return response()->json($query->latest('date')->latest('id')->paginate(min((int) $request->input('per_page', 50), 100)));
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'category' => 'nullable|in:salary,loan,purchase,maintenance,cleaning,fabrics,other',
            'amount' => 'required_unless:category,fabrics|nullable|numeric|min:0',
            'payment_method' => 'nullable|string|max:100',
            'description' => 'nullable|string',
            'date' => 'required|date',
            'employee_id' => 'nullable|required_if:category,salary|exists:employees,id',
            ...self::MATERIAL_RULES,
            'receipt' => 'nullable',
            'receipt_image' => 'nullable',
        ]);

        $validated = self::withMaterialTotal($validated);

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
        if (\App\Services\ManufacturingService::ownsExpense($expense)) {
            return response()->json(['message' => 'هذا المصروف مسجل من قسم التصنيع (مورد / عامل / شراء خامات) — عدّله أو احذفه من هناك'], 422);
        }
        if (EmployeeSalaryPayment::where('expense_id', $expense->id)->exists()) {
            return response()->json(['message' => 'هذا المصروف مسجل من صرف الرواتب — عدّله أو ألغِه من صفحة الحضور والرواتب'], 422);
        }
        if (EmployeeLoan::where('expense_id', $expense->id)->exists()) {
            return response()->json(['message' => 'هذا المصروف مسجل من سلف الموظفين — عدّله أو احذفه من صفحة الحضور والرواتب'], 422);
        }
        $validated = $request->validate([
            'category' => 'nullable|in:salary,loan,purchase,maintenance,cleaning,fabrics,other',
            'amount' => 'sometimes|required_unless:category,fabrics|nullable|numeric|min:0',
            'payment_method' => 'nullable|string|max:100',
            'description' => 'nullable|string',
            'date' => 'sometimes|required|date',
            'employee_id' => 'nullable|required_if:category,salary|exists:employees,id',
            ...self::MATERIAL_RULES,
            'receipt' => 'nullable',
            'receipt_image' => 'nullable',
        ]);

        $validated = self::withMaterialTotal($validated);

        $receiptPath = self::saveReceipt($request, 'receipt') ?? self::saveReceipt($request, 'receipt_image');
        if ($receiptPath) {
            $validated['receipt_path'] = $receiptPath;
        } elseif (array_key_exists('receipt_image', $validated) && empty($validated['receipt_image'])) {
            $validated['receipt_path'] = null;
        }

        $expense->update($validated);

        return response()->json($expense->load('employee'));
    }

    public function destroy(Expense $expense): JsonResponse
    {
        if (\App\Services\ManufacturingService::ownsExpense($expense)) {
            return response()->json(['message' => 'هذا المصروف مسجل من قسم التصنيع (مورد / عامل / شراء خامات) — عدّله أو احذفه من هناك'], 422);
        }
        if (EmployeeSalaryPayment::where('expense_id', $expense->id)->exists()) {
            return response()->json(['message' => 'هذا المصروف مسجل من صرف الرواتب — عدّله أو ألغِه من صفحة الحضور والرواتب'], 422);
        }
        if (EmployeeLoan::where('expense_id', $expense->id)->exists()) {
            return response()->json(['message' => 'هذا المصروف مسجل من سلف الموظفين — عدّله أو احذفه من صفحة الحضور والرواتب'], 422);
        }
        $expense->delete();

        return response()->json(['message' => 'Expense deleted']);
    }
}
