<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class ProfileController extends Controller
{
    public function update(Request $request): JsonResponse
    {
        $user = $request->user();
        
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'email' => 'sometimes|required|email|unique:users,email,' . $user->id,
            'current_password' => 'required_with:password|string',
            'password' => 'nullable|string|min:8|confirmed',
        ]);

        if (!empty($validated['password'])) {
            if (!Hash::check($validated['current_password'], $user->password)) {
                throw ValidationException::withMessages([
                    'current_password' => ['كلمة المرور الحالية غير صحيحة'],
                ]);
            }
            $validated['password'] = Hash::make($validated['password']);
        } else {
            unset($validated['password'], $validated['current_password']);
        }

        $user->update($validated);

        // Also update the related employee record if it exists
        $employee = \App\Models\Employee::where('email', $user->getOriginal('email'))->first();
        if ($employee) {
            $employeeData = [];
            if (isset($validated['name'])) $employeeData['name'] = $validated['name'];
            if (isset($validated['email'])) $employeeData['email'] = $validated['email'];
            if (isset($validated['password'])) $employeeData['password'] = $validated['password'];
            
            if (!empty($employeeData)) {
                $employee->update($employeeData);
            }
        }

        // Return updated user with permissions
        $employee = \App\Models\Employee::where('email', $user->email)->first();
        $user->permissions = $employee ? ($employee->permissions ?? []) : [];
        
        return response()->json($user);
    }
}
