<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Expense;
use App\Models\FinanceTransaction;
use App\Models\Revenue;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class FinanceController extends Controller
{
    public function ledger(Request $request)
    {
        $query = FinanceTransaction::query();

        if ($type = $request->input('type')) {
            $query->where('type', $type);
        }

        if ($startDate = $request->input('start_date')) {
            $query->where('transaction_date', '>=', $startDate);
        }

        if ($endDate = $request->input('end_date')) {
            $query->where('transaction_date', '<=', $endDate);
        }

        return response()->json($query->orderByDesc('transaction_date')->paginate($request->input('per_page', 30)));
    }

    public function transfer(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'from_method' => 'required|string|max:100',
            'to_method' => 'required|string|max:100|different:from_method',
            'amount' => 'required|numeric|min:0.01',
            'date' => 'required|date',
            'notes' => 'nullable|string|max:1000',
            'receipt' => 'nullable',
            'receipt_image' => 'nullable',
        ]);

        $receiptPath = self::saveReceipt($request, 'receipt') ?? self::saveReceipt($request, 'receipt_image');

        $methodLabels = [
            'instapay' => 'إنستاباي',
            'vodafone_cash' => 'فودافون كاش',
            'cash' => 'كاش (نقدي)',
            'credit_card' => 'فيزا / كارت',
            'bank_transfer' => 'تحويل بنكي',
        ];

        $fromLabel = $methodLabels[$validated['from_method']] ?? $validated['from_method'];
        $toLabel = $methodLabels[$validated['to_method']] ?? $validated['to_method'];
        $notes = !empty($validated['notes']) ? " ({$validated['notes']})" : '';

        return DB::transaction(function () use ($validated, $receiptPath, $fromLabel, $toLabel, $notes) {
            $outDesc = "مناقلة مالية: تحويل إلى {$toLabel}{$notes}";
            $inDesc = "مناقلة مالية: وارد من {$fromLabel}{$notes}";

            $expense = Expense::create([
                'category' => 'transfer_out',
                'amount' => $validated['amount'],
                'payment_method' => $validated['from_method'],
                'description' => $outDesc,
                'date' => $validated['date'],
                'receipt_path' => $receiptPath,
            ]);

            $revenue = Revenue::create([
                'type' => 'transfer_in',
                'amount' => $validated['amount'],
                'payment_method' => $validated['to_method'],
                'notes' => $inDesc,
                'payment_date' => $validated['date'],
                'receipt_path' => $receiptPath,
            ]);

            return response()->json([
                'message' => 'تم التحويل بين الخزائن بنجاح',
                'expense' => $expense,
                'revenue' => $revenue,
            ], 201);
        });
    }

    public function deposit(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'payment_method' => 'required|string|max:100',
            'amount' => 'required|numeric|min:0.01',
            'date' => 'required|date',
            'notes' => 'nullable|string|max:1000',
            'receipt' => 'nullable',
            'receipt_image' => 'nullable',
        ]);

        $receiptPath = self::saveReceipt($request, 'receipt') ?? self::saveReceipt($request, 'receipt_image');
        $desc = "إيداع رصيد / تغذية خزينة" . (!empty($validated['notes']) ? ": {$validated['notes']}" : '');

        $revenue = Revenue::create([
            'type' => 'capital_deposit',
            'amount' => $validated['amount'],
            'payment_method' => $validated['payment_method'],
            'notes' => $desc,
            'payment_date' => $validated['date'],
            'receipt_path' => $receiptPath,
        ]);

        return response()->json([
            'message' => 'تم تسجيل الإيداع بنجاح',
            'revenue' => $revenue,
        ], 201);
    }

    public function withdraw(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'payment_method' => 'required|string|max:100',
            'amount' => 'required|numeric|min:0.01',
            'date' => 'required|date',
            'notes' => 'nullable|string|max:1000',
            'receipt' => 'nullable',
            'receipt_image' => 'nullable',
        ]);

        $receiptPath = self::saveReceipt($request, 'receipt') ?? self::saveReceipt($request, 'receipt_image');
        $desc = "مسحوبات / سحب رصيد" . (!empty($validated['notes']) ? ": {$validated['notes']}" : '');

        $expense = Expense::create([
            'category' => 'owner_withdrawal',
            'amount' => $validated['amount'],
            'payment_method' => $validated['payment_method'],
            'description' => $desc,
            'date' => $validated['date'],
            'receipt_path' => $receiptPath,
        ]);

        return response()->json([
            'message' => 'تم تسجيل السحب بنجاح',
            'expense' => $expense,
        ], 201);
    }
}
