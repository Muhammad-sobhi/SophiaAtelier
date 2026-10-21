<?php

namespace App\Http\Controllers;

/**
 * Serves uploaded files directly (bypasses web server symlink issues).
 * Only files inside the public upload folders can be served: "../" can never leave them.
 */
class StorageFileController extends Controller
{
    private const ROOTS = ['app/public', 'public/storage'];

    public function __invoke(string $path)
    {
        // Remove any "storage/" prefix that may have been prepended
        $cleanPath = preg_replace('#^storage/#', '', ltrim($path, '/'));

        foreach (self::ROOTS as $root) {
            $base = realpath($root === 'app/public' ? storage_path($root) : public_path('storage'));
            $candidate = $base ? realpath($base . DIRECTORY_SEPARATOR . $cleanPath) : false;

            if ($candidate && str_starts_with($candidate, $base . DIRECTORY_SEPARATOR) && is_file($candidate)) {
                $mime = @mime_content_type($candidate) ?: 'application/octet-stream';

                return response()->file($candidate, [
                    'Content-Type' => $mime,
                    'Cache-Control' => 'public, max-age=31536000',
                    // An uploaded HTML/SVG must not run scripts on the API origin
                    'Content-Security-Policy' => "default-src 'none'; img-src 'self'; media-src 'self'; style-src 'unsafe-inline'; sandbox",
                ]);
            }
        }

        // Return SVG placeholder with a 200 so <img> tags don't break
        $svg = '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500" viewBox="0 0 400 500"><rect width="400" height="500" fill="#f8fafc"/><path d="M160 210 Q 200 170 240 210 Q 280 250 240 290 Q 200 330 160 290 Z" fill="#e2e8f0"/><circle cx="200" cy="180" r="25" fill="#cbd5e1"/><text x="50%" y="82%" font-family="system-ui, sans-serif" font-size="16" font-weight="600" fill="#94a3b8" text-anchor="middle">Sophia Atelier</text></svg>';

        return response($svg, 200, ['Content-Type' => 'image/svg+xml', 'Cache-Control' => 'no-cache']);
    }
}
