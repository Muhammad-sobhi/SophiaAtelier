<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Fitting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FittingController extends Controller
{
    public function index(Request $request)
    {
        $query = Fitting::with(['booking.client', 'booking.dress', 'booking.dress2', 'booking.dress3', 'tailor']);

        if ($bookingId = $request->input('booking_id')) {
            $query->where('booking_id', $bookingId);
        }

        return response()->json($query->latest('fitting_date')->paginate($request->input('per_page', 50)));
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'booking_id' => 'required|exists:bookings,id',
            'fitting_date' => 'required|date',
            'measurements' => 'nullable|array',
            'alterations' => 'nullable|array',
            'sales_associate' => 'nullable|string|max:255',
            'alterations_notes' => 'nullable|string',
            'additional_notes' => 'nullable|string',
            'status' => 'nullable|in:scheduled,completed,rescheduled',
            'tailor_id' => 'nullable|exists:employees,id',
        ]);

        $fitting = Fitting::create($validated);

        return response()->json($fitting->load(['booking.client', 'booking.dress', 'booking.dress2', 'booking.dress3', 'tailor']), 201);
    }

    public function show(Fitting $fitting)
    {
        $fitting->load(['booking.client', 'booking.dress', 'booking.dress2', 'booking.dress3', 'tailor']);

        return response()->json($fitting);
    }

    public function update(Request $request, Fitting $fitting): JsonResponse
    {
        $validated = $request->validate([
            'booking_id' => 'sometimes|required|exists:bookings,id',
            'fitting_date' => 'sometimes|required|date',
            'measurements' => 'nullable|array',
            'alterations' => 'nullable|array',
            'sales_associate' => 'nullable|string|max:255',
            'alterations_notes' => 'nullable|string',
            'additional_notes' => 'nullable|string',
            'status' => 'nullable|in:scheduled,completed,rescheduled',
            'tailor_id' => 'nullable|exists:employees,id',
        ]);

        $fitting->update($validated);

        return response()->json($fitting->load(['booking.client', 'booking.dress', 'booking.dress2', 'booking.dress3', 'tailor']));
    }

    public function destroy(Fitting $fitting): JsonResponse
    {
        $fitting->delete();

        return response()->json(['message' => 'Fitting deleted']);
    }
}
