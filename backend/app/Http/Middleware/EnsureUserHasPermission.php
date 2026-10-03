<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserHasPermission
{
    public function handle(Request $request, Closure $next, string $permission): Response
    {
        if (! $request->user() || ! $request->user()->hasPermission($permission)) {
            return response()->json(['message' => 'ليس لديك صلاحية لتنفيذ هذا الإجراء'], 403);
        }

        return $next($request);
    }
}
