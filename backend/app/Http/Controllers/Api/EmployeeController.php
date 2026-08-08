<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EmployeeController extends Controller
{
    public function index()
    {
        return response()->json(Employee::withCount('attendance')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'nullable|string|max:50',
            'email' => 'nullable|email',
            'position' => 'nullable|string|max:255',
            'salary' => 'nullable|numeric|min:0',
            'pay_cycle' => 'nullable|in:monthly,weekly,custom',
            'pay_cycle_days' => 'nullable|integer|min:1|max:365',
            'hire_date' => 'nullable|date',
            'notes' => 'nullable|string',
            'password' => 'nullable|string|min:6',
            'address' => 'nullable|string',
            'id_number' => 'nullable|string',
            'id_image' => 'nullable|string',
            'permissions' => 'nullable|array',
        ]);

        // Hash password before storing
        if (!empty($validated['password'])) {
            $validated['password'] = \Illuminate\Support\Facades\Hash::make($validated['password']);
        }

        $employee = Employee::create($validated);

        return response()->json($employee, 201);
    }

    public function show(Employee $employee)
    {
        $employee->load('attendance');

        return response()->json($employee);
    }

    public function update(Request $request, Employee $employee): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'phone' => 'nullable|string|max:50',
            'email' => 'nullable|email',
            'position' => 'nullable|string|max:255',
            'salary' => 'nullable|numeric|min:0',
            'pay_cycle' => 'nullable|in:monthly,weekly,custom',
            'pay_cycle_days' => 'nullable|integer|min:1|max:365',
            'hire_date' => 'nullable|date',
            'notes' => 'nullable|string',
            'password' => 'nullable|string|min:6',
            'address' => 'nullable|string',
            'id_number' => 'nullable|string',
            'id_image' => 'nullable|string',
            'permissions' => 'nullable|array',
        ]);

        // Hash password before storing
        if (!empty($validated['password'])) {
            $validated['password'] = \Illuminate\Support\Facades\Hash::make($validated['password']);
        } else {
            unset($validated['password']);
        }

        $employee->update($validated);

        return response()->json($employee);
    }

    public function destroy(Employee $employee): JsonResponse
    {
        $employee->delete();

        return response()->json(['message' => 'Employee deleted']);
    }
}
