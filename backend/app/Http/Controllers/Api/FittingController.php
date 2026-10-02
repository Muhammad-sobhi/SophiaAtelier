<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Fitting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class FittingController extends Controller
{
    public function index(Request $request)
    {
        $query = Fitting::with([
            'booking.client', 'booking.dress', 'booking.dress2', 'booking.dress3', 'tailor',
            ...\App\Models\Client::appendedRelations('booking.client'),
        ]);

        if ($bookingId = $request->input('booking_id')) {
            $query->where('booking_id', $bookingId);
        }

        $fittings = $query->latest('fitting_date')->paginate($request->input('per_page', 50));
        $fittings->getCollection()->each(fn($fitting) => $fitting->booking?->client?->hideAppendedRelations());

        return response()->json($fittings);
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
            'sales_name' => 'nullable|string|max:255',
            'alterations_notes' => 'nullable|string',
            'additional_notes' => 'nullable|string',
            'status' => 'nullable|in:scheduled,completed,rescheduled',
            'tailor_id' => 'nullable|exists:employees,id',
        ]);

        $fitting->update($validated);

        return response()->json($fitting->load(['booking.client', 'booking.dress', 'booking.dress2', 'booking.dress3', 'tailor']));
    }

    // Original photo of the handwritten measurement sheet, kept as the bride's reference record
    public function uploadMeasurementImage(Request $request, Fitting $fitting): JsonResponse
    {
        $request->validate([
            'image' => 'required|image|mimes:jpeg,png,jpg,webp|max:10240',
        ]);

        $oldPath = $fitting->measurement_image_path;
        $fitting->update([
            'measurement_image_path' => $request->file('image')->store('fittings', 'public'),
        ]);
        if ($oldPath) {
            Storage::disk('public')->delete($oldPath);
        }

        return response()->json($fitting->load(['booking.client', 'booking.dress', 'booking.dress2', 'booking.dress3', 'tailor']));
    }

    public function deleteMeasurementImage(Fitting $fitting): JsonResponse
    {
        if ($fitting->measurement_image_path) {
            Storage::disk('public')->delete($fitting->measurement_image_path);
            $fitting->update(['measurement_image_path' => null]);
        }

        return response()->json($fitting->load(['booking.client', 'booking.dress', 'booking.dress2', 'booking.dress3', 'tailor']));
    }

    public function destroy(Fitting $fitting): JsonResponse
    {
        if ($fitting->measurement_image_path) {
            Storage::disk('public')->delete($fitting->measurement_image_path);
        }
        $fitting->delete();

        return response()->json(['message' => 'Fitting deleted']);
    }
}

