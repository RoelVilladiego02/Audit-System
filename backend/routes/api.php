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
use App\Http\Controllers\DepartmentController;

Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login']);

// Protected routes
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'user']);

    // Analytics routes (available to all authenticated users)
    Route::get('/analytics', [AnalyticsController::class, 'index']);

    // Routes accessible by both admin and users - FIXED: Remove nested middleware
    // Read-only access to audit questions for all authenticated users
    Route::get('/audit-questions', [AuditQuestionController::class, 'index']);
    Route::get('/audit-questions/{auditQuestion}', [AuditQuestionController::class, 'show']);

    // Admin routes
    Route::middleware(['role:admin'])->group(function () {
        Route::apiResource('users', UserController::class);
        Route::apiResource('departments', DepartmentController::class);
        
        // Admin-only audit question operations
        Route::post('/audit-questions', [AuditQuestionController::class, 'store']);
        Route::put('/audit-questions/{auditQuestion}', [AuditQuestionController::class, 'update']);
        Route::delete('/audit-questions/{auditQuestion}', [AuditQuestionController::class, 'destroy']);
        
        // Additional admin routes for question management
        Route::get('/audit-questions-statistics', [AuditQuestionController::class, 'statistics']);
        
        // Admin can access all submissions and vulnerabilities  
        Route::get('/admin/vulnerability-submissions', [VulnerabilitySubmissionController::class, 'index']);
        Route::get('/admin/audit-submissions', [AuditSubmissionController::class, 'index']);
        Route::get('/admin/vulnerabilities', [VulnerabilityController::class, 'index']);
        Route::get('/audit-analytics', [AuditSubmissionController::class, 'analytics']);
    });

    // User routes
    Route::middleware(['role:user'])->group(function () {
        
        // User audit submissions
        Route::post('/audit-submissions', [AuditSubmissionController::class, 'store']);
        Route::get('/my-audit-submissions', [AuditSubmissionController::class, 'index']);
        
        // User vulnerability submissions
        Route::post('/vulnerability-submissions', [VulnerabilitySubmissionController::class, 'store']);
        Route::get('/my-vulnerability-submissions', [VulnerabilitySubmissionController::class, 'index']);
        Route::get('/my-vulnerabilities', [VulnerabilityController::class, 'index']);
    });

    // Common routes for both roles (with permission checks inside controllers)
    Route::group([], function () {
        // Departments (read-only for regular users)
        Route::get('/departments', [DepartmentController::class, 'index']);
        Route::get('/departments/{department}', [DepartmentController::class, 'show']);
        
        // Submissions - individual access with ownership/admin checks
        Route::get('/audit-submissions/{submission}', [AuditSubmissionController::class, 'show']);
        Route::get('/vulnerability-submissions/{submission}', [VulnerabilitySubmissionController::class, 'show']);
        Route::put('/vulnerability-submissions/{submission}', [VulnerabilitySubmissionController::class, 'update']);
        Route::delete('/vulnerability-submissions/{submission}', [VulnerabilitySubmissionController::class, 'destroy']);
        
        // Vulnerabilities - individual access with ownership/admin checks
        Route::get('/vulnerabilities/{vulnerability}', [VulnerabilityController::class, 'show']);
        Route::put('/vulnerabilities/{vulnerability}', [VulnerabilityController::class, 'update']);
        Route::delete('/vulnerabilities/{vulnerability}', [VulnerabilityController::class, 'destroy']);
        
        // General submission listings (filtered by role in controller)
        Route::get('/vulnerability-submissions', [VulnerabilitySubmissionController::class, 'index']);
        Route::get('/audit-submissions', [AuditSubmissionController::class, 'index']);
        Route::get('/vulnerabilities', [VulnerabilityController::class, 'index']);
    });
});