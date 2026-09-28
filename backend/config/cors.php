<?php

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie', 'storage/*'],
    'allowed_methods' => ['*'],
    'allowed_origins' => array_filter([
        env('FRONTEND_URL', 'http://localhost:3000'),
        env('DASHBOARD_URL', 'http://localhost:5173'),
        'https://sophiadresses.cloud',
        'https://www.sophiadresses.cloud',
        'https://dashboard.sophiadresses.cloud',
        'https://admin.sophiadresses.cloud',
        'https://api.sophiadresses.cloud',
        'http://localhost:5173',
        'http://localhost:3000',
    ]),
    'allowed_origins_patterns' => array_filter([
        '#^https?://.*\.sophiadresses\.cloud$#',
        // Local development: any localhost port (vite moves to 5174+ when 5173 is taken)
        env('APP_ENV') === 'local' ? '#^http://(localhost|127\.0\.0\.1):\d+$#' : null,
    ]),
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => true,
];
