<?php

return [
    'name' => 'LUMA API',
    'version' => '7.0.0 - Inertia API',
    'debug' => true,
    'timezone' => 'Europe/Paris',
    'locale' => 'fr_FR',
    'url' => 'http://localhost',
    'api' => [
        'base_url' => 'http://localhost/api',
        'version' => 'v1',
        'cors' => [
            'allowed_origins' => ['*'],
            'allowed_methods' => ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            'allowed_headers' => ['Content-Type', 'Authorization', 'X-Requested-With'],
            'max_age' => 86400
        ]
    ],
    'jwt' => [
        'algorithm' => 'HS256',
        'expiration' => 86400, // 24 heures
        'refresh_expiration' => 604800 // 7 jours
    ],
    'security' => [
        'password_min_length' => 8,
        'password_require_special' => true,
        'password_require_number' => true,
        'password_require_uppercase' => true,
        'max_login_attempts' => 5,
        'lockout_time' => 900 // 15 minutes
    ]
]; 