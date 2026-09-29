<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users,email',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $validated['email'] = strtolower(trim($validated['email']));
        $validated['password'] = Hash::make($validated['password']);
        $validated['role'] = 'staff';

        $user = User::create($validated);

        Auth::guard('web')->login($user);
        $request->session()->regenerate();

        return response()->json([
            'user' => $user,
        ], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|string|email|max:255',
            'password' => 'required|string|max:128',
        ]);

        $normalizedEmail = strtolower(trim($request->email));
        $user = User::where('email', $normalizedEmail)->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        // Session cookie is HttpOnly, so the credential is never readable by frontend JS
        Auth::guard('web')->login($user);
        $request->session()->regenerate();

        $employee = \App\Models\Employee::where('email', $user->email)->first();
        $user->permissions = $employee ? ($employee->permissions ?? []) : [];

        \App\Services\ActivityLogger::log('تسجيل دخول للنظام', 'User', $user->id, ['email' => $user->email], $user->name);

        return response()->json([
            'user' => $user,
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();
        if ($user) {
            \App\Services\ActivityLogger::log('تسجيل خروج من النظام', 'User', $user->id, null, $user->name);
        }

        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json([
            'message' => 'Logged out successfully',
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user();
        $employee = \App\Models\Employee::where('email', $user->email)->first();
        $user->permissions = $employee ? ($employee->permissions ?? []) : [];
        return response()->json($user);
    }
}
