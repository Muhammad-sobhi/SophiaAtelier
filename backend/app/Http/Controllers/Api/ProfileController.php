<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\PersonalAccessToken;

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

        if (isset($validated['password'])) {
            $this->logoutOtherDevices($request);
        }

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

    /**
     * Revoke every session and API token of the user except the current request's session.
     */
    private function logoutOtherDevices(Request $request): void
    {
        $user = $request->user();
        $session = $request->hasSession() ? $request->session() : null;

        DB::table(config('session.table', 'sessions'))
            ->where('user_id', $user->id)
            ->when($session, fn ($query) => $query->where('id', '!=', $session->getId()))
            ->delete();

        $currentToken = $user->currentAccessToken();
        $user->tokens()
            ->when($currentToken instanceof PersonalAccessToken, fn ($query) => $query->whereKeyNot($currentToken->getKey()))
            ->delete();

        $user->setRememberToken(Str::random(60));
        $user->save();

        // Issue a fresh session id so the old one can't be reused
        $session?->regenerate(true);
    }
}
