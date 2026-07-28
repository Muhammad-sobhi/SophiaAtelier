<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AttendanceController extends Controller
{
    public function index(Request $request)
    {
        $query = Attendance::with('employee');

        if ($employeeId = $request->input('employee_id')) {
            $query->where('employee_id', $employeeId);
        }

        if ($date = $request->input('date')) {
            $query->whereDate('date', $date);
        }

        if ($request->has('all')) {
            return response()->json($query->latest('date')->get());
        }

        return response()->json($query->latest('date')->paginate($request->input('per_page', 50)));
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'date' => 'required|date',
            'status' => 'nullable|in:present,absent,late,half_day,leave',
            'check_in' => 'nullable|string',
            'check_out' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        $calculated = $this->calculateHours($validated['check_in'] ?? null, $validated['check_out'] ?? null);
        $data = array_merge($validated, $calculated);

        $attendance = Attendance::updateOrCreate(
            ['employee_id' => $validated['employee_id'], 'date' => $validated['date']],
            $data
        );

        return response()->json($attendance->load('employee'), 201);
    }

    public function bulkStore(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'date' => 'required|date',
            'attendances' => 'required|array',
            'attendances.*.employee_id' => 'required|exists:employees,id',
            'attendances.*.status' => 'required|in:present,absent,late,half_day,leave',
            'attendances.*.check_in' => 'nullable|string',
            'attendances.*.check_out' => 'nullable|string',
            'attendances.*.notes' => 'nullable|string',
        ]);

        $date = $validated['date'];
        $saved = [];

        foreach ($validated['attendances'] as $item) {
            $calculated = $this->calculateHours($item['check_in'] ?? null, $item['check_out'] ?? null);
            $data = array_merge($item, ['date' => $date], $calculated);

            $att = Attendance::updateOrCreate(
                ['employee_id' => $item['employee_id'], 'date' => $date],
                $data
            );
            $saved[] = $att->load('employee');
        }

        return response()->json($saved);
    }

    public function show(Attendance $attendance)
    {
        $attendance->load('employee');

        return response()->json($attendance);
    }

    public function update(Request $request, Attendance $attendance): JsonResponse
    {
        $validated = $request->validate([
            'employee_id' => 'sometimes|required|exists:employees,id',
            'date' => 'sometimes|required|date',
            'status' => 'nullable|in:present,absent,late,half_day,leave',
            'check_in' => 'nullable|string',
            'check_out' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        $checkIn = $validated['check_in'] ?? $attendance->check_in;
        $checkOut = $validated['check_out'] ?? $attendance->check_out;

        $calculated = $this->calculateHours($checkIn, $checkOut);
        $data = array_merge($validated, $calculated);

        $attendance->update($data);

        return response()->json($attendance->load('employee'));
    }

    public function destroy(Attendance $attendance): JsonResponse
    {
        $attendance->delete();

        return response()->json(['message' => 'Attendance deleted']);
    }

    private function calculateHours(?string $checkIn, ?string $checkOut): array
    {
        if (!$checkIn || !$checkOut) {
            return [
                'worked_hours' => 0,
                'late_minutes' => 0,
                'overtime_hours' => 0,
            ];
        }

        try {
            $in = Carbon::parse($checkIn);
            $out = Carbon::parse($checkOut);

            if ($out->lt($in)) {
                $out->addDay();
            }

            $diffMinutes = $in->diffInMinutes($out);
            $workedHours = round($diffMinutes / 60, 2);

            $overtimeHours = $workedHours > 8.0 ? round($workedHours - 8.0, 2) : 0.0;

            return [
                'worked_hours' => $workedHours,
                'late_minutes' => 0,
                'overtime_hours' => $overtimeHours,
            ];
        } catch (\Exception $e) {
            return [
                'worked_hours' => 0,
                'late_minutes' => 0,
                'overtime_hours' => 0,
            ];
        }
    }
}
