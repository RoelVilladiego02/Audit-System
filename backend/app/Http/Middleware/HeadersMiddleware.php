<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class HeadersMiddleware
{
    public function handle(Request $request, Closure $next)
    {
        $response = $next($request);

        if (!$response) {
            return $response;
        }

        $response->headers->set('Access-Control-Allow-Origin', config('cors.allowed_origins')[0]);
        $response->headers->set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        $response->headers->set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-XSRF-TOKEN');
        $response->headers->set('Access-Control-Allow-Credentials', 'true');
        
        // Remove any duplicate cookies
        $cookies = array_unique($response->headers->getCookies(), SORT_REGULAR);
        $response->headers->setCookies($cookies);

        return $response;
    }
}
