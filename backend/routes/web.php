<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/storage/{path}', function ($path) {
    $basePath = realpath(storage_path('app/public'));
    $fullPath = realpath(storage_path('app/public/' . $path));

    // Prevent path traversal — resolved path must stay inside base directory
    if (!$fullPath || !$basePath || !str_starts_with($fullPath, $basePath . DIRECTORY_SEPARATOR)) {
        abort(404);
    }

    return response()->file($fullPath);
})->where('path', '.*');
