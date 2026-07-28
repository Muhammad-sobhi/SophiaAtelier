<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Task;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TaskController extends Controller
{
    public function index(Request $request)
    {
        $query = Task::with('booking');

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        if ($type = $request->input('type')) {
            $query->where('type', $type);
        }

        return response()->json($query->latest('due_date')->paginate($request->input('per_page', 15)));
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'booking_id' => 'nullable|exists:bookings,id',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'type' => 'nullable|in:preparation,alteration,cleaning,maintenance,followup',
            'assigned_to' => 'nullable|string|max:255',
            'status' => 'nullable|in:pending,in_progress,completed',
            'due_date' => 'nullable|date',
        ]);

        $task = Task::create($validated);

        // Create notification for new task
        \App\Models\Notification::create([
            'type' => 'new_task',
            'title' => 'مهمة جديدة: ' . $task->title,
            'message' => 'تم إضافة مهمة جديدة للعمل في لوحة التحكم وتعيينها للموظف المسند إليه: ' . ($task->assigned_to ?? 'غير محدد'),
            'related_type' => 'task',
            'related_id' => $task->id
        ]);

        return response()->json($task->load('booking'), 201);
    }

    public function show(Task $task)
    {
        $task->load('booking');

        return response()->json($task);
    }

    public function update(Request $request, Task $task): JsonResponse
    {
        $validated = $request->validate([
            'booking_id' => 'nullable|exists:bookings,id',
            'title' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'type' => 'nullable|in:preparation,alteration,cleaning,maintenance,followup',
            'assigned_to' => 'nullable|string|max:255',
            'status' => 'nullable|in:pending,in_progress,completed',
            'due_date' => 'nullable|date',
        ]);

        $task->update($validated);

        return response()->json($task->load('booking'));
    }

    public function destroy(Task $task): JsonResponse
    {
        $task->delete();

        return response()->json(['message' => 'Task deleted']);
    }
}
