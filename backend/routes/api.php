<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\AuditQuestionController;
use App\Http\Controllers\AuditSubmissionController;
use App\Http\Controllers\VulnerabilitySubmissionController;
use App\Http\Controllers\VulnerabilityController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\AnalyticsController;

Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login']);

// Protected routes
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'user']);

    // Routes accessible by both admin and users
    Route::get('/audit-questions', [AuditQuestionController::class, 'index']);
    Route::get('/audit-questions/{auditQuestion}', [AuditQuestionController::class, 'show']);

    // Admin routes
    Route::middleware(['role:admin', 'debug.audit'])->group(function () {
        Route::apiResource('users', UserController::class);
        
        // Analytics route with query parameter validation
        Route::get('/analytics', [AnalyticsController::class, 'index']);

        
        // Admin-only audit question operations
        Route::post('/audit-questions', [AuditQuestionController::class, 'store']);
        Route::put('/audit-questions/{auditQuestion}', [AuditQuestionController::class, 'update']);
        Route::delete('/audit-questions/{auditQuestion}', [AuditQuestionController::class, 'destroy']);
        Route::get('/audit-questions-statistics', [AuditQuestionController::class, 'statistics']);
        Route::get('/audit-questions/archived', [AuditQuestionController::class, 'archived']);
        Route::post('/audit-questions/{id}/restore', [AuditQuestionController::class, 'restore']);

        // Admin-only audit submission operations
        Route::prefix('audit-submissions')->group(function () {
            Route::put('/{submission}/answers/{answer}/review', [AuditSubmissionController::class, 'reviewAnswer'])
                ->where([
                    'submission' => '[0-9]+',
                    'answer' => '[0-9]+',
                ]);
            Route::put('/{submission}/complete', [AuditSubmissionController::class, 'completeReview']);
            Route::get('/admin/dashboard', [AuditSubmissionController::class, 'adminDashboard']);
            Route::get('/admin/analytics', [AuditSubmissionController::class, 'analytics']);
        });

        // Admin vulnerability management
        Route::prefix('vulnerability-submissions')->group(function () {
            Route::get('/admin', [VulnerabilitySubmissionController::class, 'index']);
            Route::put('/{submission}/assign', [VulnerabilitySubmissionController::class, 'assign']);
            Route::put('/{submission}/status', [VulnerabilitySubmissionController::class, 'updateStatus']);
        });

        Route::get('/admin/vulnerabilities', [VulnerabilityController::class, 'index']);
    });

    // User routes
    Route::middleware(['role:user'])->group(function () {
        Route::post('/audit-submissions', [AuditSubmissionController::class, 'store']);
        Route::post('/vulnerability-submissions', [VulnerabilitySubmissionController::class, 'store']);
        Route::get('/my-vulnerability-submissions', [VulnerabilitySubmissionController::class, 'index']);
        Route::get('/my-vulnerabilities', [VulnerabilityController::class, 'index']);
    });

    // Common routes for both roles (with permission checks inside controllers)
    Route::prefix('audit-submissions')->group(function () {
        Route::get('/', [AuditSubmissionController::class, 'index']);
        Route::get('/{submission}', [AuditSubmissionController::class, 'show']);
    });

    Route::prefix('vulnerability-submissions')->group(function () {
        Route::get('/status/{status}', [VulnerabilitySubmissionController::class, 'byStatus'])
            ->where('status', 'open|resolved');
        Route::get('/assigned/{userId}', [VulnerabilitySubmissionController::class, 'byAssignee'])
            ->where('userId', '[0-9]+');
        Route::get('/{submission}', [VulnerabilitySubmissionController::class, 'show']);
        Route::put('/{submission}', [VulnerabilitySubmissionController::class, 'update']);
        Route::delete('/{submission}', [VulnerabilitySubmissionController::class, 'destroy']);
    });

    Route::prefix('vulnerabilities')->group(function () {
        Route::get('/', [VulnerabilityController::class, 'index']);
        Route::get('/{vulnerability}', [VulnerabilityController::class, 'show']);
        Route::put('/{vulnerability}', [VulnerabilityController::class, 'update']);
        Route::delete('/{vulnerability}', [VulnerabilityController::class, 'destroy']);
    });
});

Route::get('/favicon.ico', function () {
    return response()->file(public_path('favicon.ico'));
});