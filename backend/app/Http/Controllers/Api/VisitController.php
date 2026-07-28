<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Visit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class VisitController extends Controller
{
    public function index(Request $request)
    {
        $query = Visit::with('client');

        if ($clientId = $request->input('client_id')) {
            $query->where('client_id', $clientId);
        }

        return response()->json($query->latest('visit_date')->paginate($request->input('per_page', 15)));
    }

    public static function normalizeTimeSlot($timeStr)
    {
        if (!$timeStr) return null;
        
        // Remove spaces and normalize arabic PM/AM markers
        $timeStr = trim(str_replace(' ', '', $timeStr));
        $timeStr = str_ireplace(['م', 'ص'], ['PM', 'AM'], $timeStr);
        
        try {
            return \Carbon\Carbon::parse($timeStr)->format('H:i');
        } catch (\Exception $e) {
            return $timeStr;
        }
    }

    public function getFullyBookedSlots(Request $request): JsonResponse
    {
        $date = $request->input('date');
        if (!$date) {
            return response()->json([]);
        }

        $slots = Visit::whereDate('visit_date', $date)
            ->whereNotNull('time_slot')
            ->select('time_slot', \DB::raw('count(*) as count'))
            ->groupBy('time_slot')
            ->get();

        $fullyBookedSlots = [];
        foreach ($slots as $slot) {
            if ($slot->count >= 4) {
                $fullyBookedSlots[] = $slot->time_slot;
            }
        }

        return response()->json($fullyBookedSlots);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'client_id' => 'required|exists:clients,id',
            'visit_date' => 'required|date',
            'status' => 'nullable|in:arrived,done,booked,no_show',
            'source' => 'nullable|string|max:100',
            'notes' => 'nullable|string',
            'time_slot' => 'nullable|string|max:50',
        ]);

        if (!empty($validated['time_slot'])) {
            $normalized = self::normalizeTimeSlot($validated['time_slot']);
            $validated['time_slot'] = $normalized;

            // Check limit
            $existingCount = Visit::whereDate('visit_date', $validated['visit_date'])
                ->where('time_slot', $normalized)
                ->count();

            if ($existingCount >= 4) {
                return response()->json([
                    'message' => 'عذراً، هذا الوقت ممتلئ بالكامل (الحد الأقصى 4 زيارات). يرجى اختيار وقت آخر.'
                ], 422);
            }
        }

        $visit = Visit::create($validated);

        return response()->json($visit->load('client'), 201);
    }

    public function show(Visit $visit)
    {
        $visit->load('client');

        return response()->json($visit);
    }

    public function update(Request $request, Visit $visit): JsonResponse
    {
        $validated = $request->validate([
            'client_id' => 'sometimes|required|exists:clients,id',
            'visit_date' => 'sometimes|required|date',
            'status' => 'nullable|in:arrived,done,booked,no_show',
            'source' => 'nullable|string|max:100',
            'notes' => 'nullable|string',
            'time_slot' => 'nullable|string|max:50',
        ]);

        if (!empty($validated['time_slot'])) {
            $normalized = self::normalizeTimeSlot($validated['time_slot']);
            $validated['time_slot'] = $normalized;

            // Check limit excluding current visit
            $visitDate = $validated['visit_date'] ?? $visit->visit_date;
            $existingCount = Visit::whereDate('visit_date', $visitDate)
                ->where('time_slot', $normalized)
                ->where('id', '!=', $visit->id)
                ->count();

            if ($existingCount >= 4) {
                return response()->json([
                    'message' => 'عذراً، هذا الوقت ممتلئ بالكامل (الحد الأقصى 4 زيارات). يرجى اختيار وقت آخر.'
                ], 422);
            }
        }

        $visit->update($validated);

        return response()->json($visit->load('client'));
    }

    public function destroy(Visit $visit): JsonResponse
    {
        $visit->delete();

        return response()->json(['message' => 'Visit deleted']);
    }
}
