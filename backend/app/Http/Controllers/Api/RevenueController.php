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
        $payments = $request->input('payments');
        if (is_array($payments) && count($payments) > 0) {
            $receiptPath = self::saveReceipt($request, 'receipt') ?? self::saveReceipt($request, 'receipt_image');
            $created = [];
            $bookingId = $request->input('booking_id');
            $rawType = $request->input('type', 'deposit');
            $type = in_array($rawType, ['deposit', 'balance', 'fitting_fee', 'insurance', 'other']) ? $rawType : 'other';
            $paymentDate = $request->input('payment_date', now()->toDateString());
            $baseNotes = $request->input('notes', '');

            foreach ($payments as $p) {
                $amt = floatval($p['amount'] ?? 0);
                $method = $p['payment_method'] ?? 'cash';
                $rowReceipt = !empty($p['receipt_image'])
                    ? self::saveReceiptData($p['receipt_image'])
                    : (!empty($p['receipt']) ? self::saveReceiptData($p['receipt']) : $receiptPath);

                if ($amt > 0) {
                    $created[] = Revenue::create([
                        'booking_id' => $bookingId,
                        'type' => $type,
                        'amount' => $amt,
                        'payment_method' => $method,
                        'payment_date' => $paymentDate,
                        'notes' => $baseNotes,
                        'receipt_path' => $rowReceipt,
                    ]);
                }
            }

            return response()->json($created, 201);
        }

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

        if (!in_array($validated['type'] ?? '', ['deposit', 'balance', 'fitting_fee', 'insurance', 'other'])) {
            $validated['type'] = 'other';
        }

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
            'amount' => 'sometimes|required|numeric',
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
