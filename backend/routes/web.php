<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/storage/{path}', function ($path) {
    $cleanPath = ltrim($path, '/');
    $fullPath = storage_path('app/public/' . $cleanPath);
    if (!file_exists($fullPath) || is_dir($fullPath)) {
        $fullPath = storage_path('app/' . $cleanPath);
    }
    if (!file_exists($fullPath) || is_dir($fullPath)) {
        $svg = '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500" viewBox="0 0 400 500"><rect width="400" height="500" fill="#f8fafc"/><path d="M160 210 Q 200 170 240 210 Q 280 250 240 290 Q 200 330 160 290 Z" fill="#e2e8f0"/><circle cx="200" cy="180" r="25" fill="#cbd5e1"/><text x="50%" y="82%" font-family="system-ui, sans-serif" font-size="16" font-weight="600" fill="#94a3b8" text-anchor="middle">Sophia Atelier</text></svg>';
        return response($svg, 200, ['Content-Type' => 'image/svg+xml', 'Cache-Control' => 'no-cache']);
    }
    $mime = mime_content_type($fullPath) ?: 'image/jpeg';
    return response()->file($fullPath, [
        'Content-Type' => $mime,
        'Cache-Control' => 'public, max-age=31536000',
    ]);
})->where('path', '.*');
