<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | Here you may configure your settings for cross-origin resource sharing
    | or "CORS". This determines what cross-origin operations may execute
    | in web browsers. You are free to adjust these settings as needed.
    |
    | To learn more: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
    |
    */

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => [
        'http://localhost:3000',                    // Development
        'https://f58deeaacf82.ngrok-free.app',      // Your ngrok URL
        'https://your-vercel-domain.vercel.app',    // Your Vercel domain (after deployment)
    ],

    'allowed_headers' => ['*'],

    'exposed_headers' => ['*'],

    'max_age' => 0,
    
    'supports_credentials' => true,

];
