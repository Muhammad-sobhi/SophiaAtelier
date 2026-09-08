<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserHasRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        \Illuminate\Support\Facades\Log::info('EnsureUserHasRole:', [
            'user_role' => $request->user()?->role,
            'allowed_roles' => $roles,
            'args_raw' => func_get_args()
        ]);

        if (! $request->user() || ! in_array($request->user()->role, $roles)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        return $next($request);
    }
}
