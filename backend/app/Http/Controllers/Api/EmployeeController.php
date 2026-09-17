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
        return \App\Http\Resources\EmployeeResource::collection(Employee::withCount('attendance')->get());
    }

    public function store(\App\Http\Requests\StoreEmployeeRequest $request): JsonResponse
    {
        $validated = $request->validated();

        // Remove empty password to avoid overriding
        if (empty($validated['password'])) {
            unset($validated['password']);
        }

        $employee = Employee::create($validated);

        return response()->json($employee, 201);
    }

    public function show(Employee $employee)
    {
        $employee->loadMissing(['attendance', 'loans']);
        return new \App\Http\Resources\EmployeeResource($employee);
    }

    public function update(\App\Http\Requests\UpdateEmployeeRequest $request, Employee $employee): JsonResponse
    {
        $validated = $request->validated();

        // Remove empty password to avoid overriding
        if (empty($validated['password'])) {
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
