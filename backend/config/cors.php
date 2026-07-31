<?php

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie', 'storage/*'],
    'allowed_methods' => ['*'],
    'allowed_origins' => array_filter([
        env('FRONTEND_URL', 'http://localhost:3000'),
        env('DASHBOARD_URL', 'http://localhost:5173'),
        'https://sophiadresses.cloud',
        'https://www.sophiadresses.cloud',
        'https://admin.sophiadresses.cloud',
    ]),
    'allowed_origins_patterns' => [
        '#^https?://.*\.sophiadresses\.cloud$#',
    ],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => true,
];
