<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->alias([
            'role' => \App\Http\Middleware\EnsureUserHasRole::class,
        ]);
        $middleware->prepend(\Illuminate\Http\Middleware\HandleCors::class);
        $middleware->append(\App\Http\Middleware\SecurityHeaders::class);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        $exceptions->render(function (\Throwable $e, \Illuminate\Http\Request $request) {
            if ($request->is('api/*') || $request->wantsJson()) {
                if ($e instanceof \Illuminate\Validation\ValidationException) {
                    return response()->json([
                        'message' => 'بيانات غير صالحة',
                        'errors' => $e->errors(),
                    ], 422);
                }

                if ($e instanceof \Symfony\Component\HttpKernel\Exception\NotFoundHttpException) {
                    return response()->json([
                        'message' => 'العنصر المطلوب غير موجود',
                    ], 404);
                }

                if ($e instanceof \Illuminate\Auth\AuthenticationException) {
                    return response()->json([
                        'message' => 'غير مصرح للوصول',
                    ], 401);
                }

                \Illuminate\Support\Facades\Log::error('API Error: ' . $e->getMessage(), [
                    'exception' => $e,
                    'url' => $request->fullUrl(),
                ]);

                return response()->json([
                    'message' => 'حدث خطأ في النظام، يرجى المحاولة لاحقاً',
                    'error' => config('app.debug') ? $e->getMessage() : null,
                ], 500);
            }
        });
    })->create();
