<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ClosedDay;
use App\Models\Visit;
use App\Services\ActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ClosedDayController extends Controller
{
    /** Upcoming closed days for the website date picker */
    public function publicIndex(): JsonResponse
    {
        return response()->json(
            ClosedDay::whereDate('date', '>=', ClosedDay::today())->orderBy('date')->get(['date', 'reason'])
        );
    }

    /** Upcoming closed days with the visits already booked on each (so staff can contact those brides) */
    public function index(): JsonResponse
    {
        $days = ClosedDay::whereDate('date', '>=', ClosedDay::today())->orderBy('date')->get(['id', 'date', 'reason']);
        $days->each(fn ($day) => $day->visits_count = $this->openVisitsCount($day->date));

        return response()->json($days);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'date' => 'required|date|after_or_equal:' . ClosedDay::today() . '|unique:closed_days,date',
            'reason' => 'nullable|string|max:255',
        ], [
            'date.unique' => 'هذا اليوم مغلق بالفعل',
            'date.after_or_equal' => 'لا يمكن إغلاق يوم مضى',
        ]);

        $day = ClosedDay::create([
            'date' => \Carbon\Carbon::parse($validated['date'])->toDateString(),
            'reason' => $validated['reason'] ?? null,
            'created_by' => $request->user()?->id,
        ]);
        $day->visits_count = $this->openVisitsCount($day->date);

        ActivityLogger::log('إغلاق يوم للزيارات', 'ClosedDay', $day->id, ['التاريخ' => $day->date->toDateString(), 'السبب' => $day->reason]);

        return response()->json($day->only(['id', 'date', 'reason', 'visits_count']), 201);
    }

    public function destroy(ClosedDay $closedDay): JsonResponse
    {
        ActivityLogger::log('إعادة فتح يوم للزيارات', 'ClosedDay', $closedDay->id, ['التاريخ' => $closedDay->date->toDateString()]);
        $closedDay->delete();

        return response()->json(null, 204);
    }

    private function openVisitsCount($date): int
    {
        return Visit::whereDate('visit_date', $date)->whereIn('status', Visit::OPEN_STATUSES)->count();
    }
}
