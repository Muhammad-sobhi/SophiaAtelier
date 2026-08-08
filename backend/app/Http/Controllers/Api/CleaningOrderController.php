<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CleaningOrder;
use App\Models\Expense;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CleaningOrderController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = CleaningOrder::query();

        if ($status = $request->input('payment_status')) {
            $query->where('payment_status', $status);
        }

        if ($startDate = $request->input('start_date')) {
            $query->where('date', '>=', $startDate);
        }

        if ($endDate = $request->input('end_date')) {
            $query->where('date', '<=', $endDate);
        }

        $orders = $query->latest('date')->get();

        // Add summary stats
        $totalCost = $orders->sum('cost');
        $totalPaid = $orders->sum('paid_amount');
        $outstanding = $totalCost - $totalPaid;

        return response()->json([
            'orders' => $orders,
            'summary' => [
                'total_orders' => $orders->count(),
                'total_cost' => round($totalCost, 2),
                'total_paid' => round($totalPaid, 2),
                'outstanding' => round($outstanding, 2),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'description' => 'required|string',
            'cost' => 'required|numeric|min:0',
            'paid_amount' => 'nullable|numeric|min:0',
            'payment_status' => 'nullable|in:unpaid,partial,paid',
            'date' => 'required|date',
            'notes' => 'nullable|string',
        ]);

        // Auto-determine payment status
        $paidAmount = (float) ($validated['paid_amount'] ?? 0);
        $cost = (float) $validated['cost'];
        if ($paidAmount >= $cost && $cost > 0) {
            $validated['payment_status'] = 'paid';
        } elseif ($paidAmount > 0) {
            $validated['payment_status'] = 'partial';
        } else {
            $validated['payment_status'] = $validated['payment_status'] ?? 'unpaid';
        }

        $order = CleaningOrder::create($validated);

        // Auto-create expense record for the cleaning cost
        Expense::create([
            'category' => 'cleaning',
            'amount' => $validated['cost'],
            'description' => 'طلب تنظيف: ' . $validated['description'],
            'date' => $validated['date'],
        ]);

        return response()->json($order, 201);
    }

    public function show(CleaningOrder $cleaningOrder): JsonResponse
    {
        return response()->json($cleaningOrder);
    }

    public function update(Request $request, CleaningOrder $cleaningOrder): JsonResponse
    {
        $validated = $request->validate([
            'description' => 'sometimes|required|string',
            'cost' => 'sometimes|numeric|min:0',
            'paid_amount' => 'nullable|numeric|min:0',
            'payment_status' => 'nullable|in:unpaid,partial,paid',
            'date' => 'sometimes|date',
            'notes' => 'nullable|string',
        ]);

        // Auto-determine payment status if amounts change
        if (isset($validated['paid_amount']) || isset($validated['cost'])) {
            $paidAmount = (float) ($validated['paid_amount'] ?? $cleaningOrder->paid_amount);
            $cost = (float) ($validated['cost'] ?? $cleaningOrder->cost);
            if ($paidAmount >= $cost && $cost > 0) {
                $validated['payment_status'] = 'paid';
            } elseif ($paidAmount > 0) {
                $validated['payment_status'] = 'partial';
            } else {
                $validated['payment_status'] = 'unpaid';
            }
        }

        $cleaningOrder->update($validated);

        return response()->json($cleaningOrder);
    }

    public function destroy(CleaningOrder $cleaningOrder): JsonResponse
    {
        $cleaningOrder->delete();

        return response()->json(['message' => 'Cleaning order deleted']);
    }
}
