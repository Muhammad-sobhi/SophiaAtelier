<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LeaveRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LeaveRequestController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = LeaveRequest::with('employee');

        if ($employeeId = $request->input('employee_id')) {
            $query->where('employee_id', $employeeId);
        }

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        return response()->json($query->latest()->get());
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'type' => 'nullable|in:paid_leave,unpaid_leave,sick_leave,official_holiday',
            'reason' => 'nullable|string',
        ]);

        $leaveRequest = LeaveRequest::create($validated);

        return response()->json($leaveRequest->load('employee'), 201);
    }

    public function updateStatus(Request $request, LeaveRequest $leaveRequest): JsonResponse
    {
        $validated = $request->validate([
            'status' => 'required|in:approved,rejected,pending',
            'approved_by' => 'nullable|string',
        ]);

        $leaveRequest->update($validated);

        return response()->json($leaveRequest->load('employee'));
    }

    public function destroy(LeaveRequest $leaveRequest): JsonResponse
    {
        $leaveRequest->delete();

        return response()->json(['message' => 'Leave request deleted']);
    }
}
