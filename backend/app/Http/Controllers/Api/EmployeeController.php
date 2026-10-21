<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\User;
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
        $this->guardAccessFields($request, $validated);

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
        $this->guardAccessFields($request, $validated, $employee);

        $employee->update($validated);

        return response()->json($employee);
    }

    public function destroy(Request $request, Employee $employee): JsonResponse
    {
        // Deleting an employee also deletes their login (Employee::deleted)
        if ($request->user()->role !== 'admin' && $employee->email && User::where('email', $employee->email)->exists()) {
            abort(403, 'حذف موظف له حساب دخول متاح للمدير فقط');
        }

        $employee->delete();

        return response()->json(['message' => 'Employee deleted']);
    }

    /**
     * Logins (email, password) and access rights are the admin's call: Employee::saved copies them onto
     * the user account, so otherwise any employee could grant themselves full access or take over a login.
     */
    private function guardAccessFields(Request $request, array $validated, ?Employee $employee = null): void
    {
        if ($request->user()->role === 'admin') {
            return;
        }

        $currentPermissions = collect($employee?->permissions ?? [])->sort()->values()->all();
        $changes = [
            'permissions' => array_key_exists('permissions', $validated)
                && collect($validated['permissions'] ?? [])->sort()->values()->all() !== $currentPermissions,
            'password' => array_key_exists('password', $validated),
            'email' => array_key_exists('email', $validated)
                && strtolower(trim((string) $validated['email'])) !== strtolower(trim((string) $employee?->email)),
        ];

        if (in_array(true, $changes, true) || ($employee && in_array('*', $currentPermissions, true))) {
            abort(403, 'تعديل بيانات الدخول والصلاحيات متاح للمدير فقط');
        }
    }
}
