<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Revenue;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RevenueController extends Controller
{
    public function index(Request $request)
    {
        $query = Revenue::with('booking.client');

        if ($type = $request->input('type')) {
            $query->where('type', $type);
        }

        if ($startDate = $request->input('start_date')) {
            $query->where('payment_date', '>=', $startDate);
        }

        if ($endDate = $request->input('end_date')) {
            $query->where('payment_date', '<=', $endDate);
        }

        return response()->json($query->latest('payment_date')->paginate(min((int) $request->input('per_page', 50), 100)));
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'booking_id' => 'nullable|exists:bookings,id',
            'type' => 'nullable|string|max:50',
            'amount' => 'required|numeric|min:0',
            'payment_method' => 'nullable|string|max:100',
            'payment_date' => 'required|date',
            'notes' => 'nullable|string',
            'receipt' => 'nullable',
            'receipt_image' => 'nullable',
        ]);

        $receiptPath = self::saveReceipt($request, 'receipt') ?? self::saveReceipt($request, 'receipt_image');
        if ($receiptPath) {
            $validated['receipt_path'] = $receiptPath;
        }

        $revenue = Revenue::create($validated);

        return response()->json($revenue->load('booking'), 201);
    }

    public function show(Revenue $revenue)
    {
        $revenue->load('booking');

        return response()->json($revenue);
    }

    public function update(Request $request, Revenue $revenue): JsonResponse
    {
        $validated = $request->validate([
            'booking_id' => 'nullable|exists:bookings,id',
            'type' => 'nullable|string|max:50',
            'amount' => 'sometimes|required|numeric|min:0',
            'payment_method' => 'nullable|string|max:100',
            'payment_date' => 'sometimes|required|date',
            'notes' => 'nullable|string',
            'receipt' => 'nullable',
            'receipt_image' => 'nullable',
        ]);

        $receiptPath = self::saveReceipt($request, 'receipt') ?? self::saveReceipt($request, 'receipt_image');
        if ($receiptPath) {
            $validated['receipt_path'] = $receiptPath;
        }

        $revenue->update($validated);

        return response()->json($revenue->load('booking'));
    }

    public function destroy(Revenue $revenue): JsonResponse
    {
        $revenue->delete();

        return response()->json(['message' => 'Revenue deleted']);
    }
}
