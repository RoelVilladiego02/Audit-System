<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\AuditQuestionController;
use App\Http\Controllers\AuditSubmissionController;
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

    // Admin routes
    Route::middleware('role:admin')->group(function () {
        Route::apiResource('users', UserController::class);
        Route::apiResource('questions', AuditQuestionController::class);
        Route::apiResource('departments', DepartmentController::class);
    });

    // User routes
    Route::middleware('role:user')->group(function () {
        Route::get('/questions', [AuditQuestionController::class, 'index']);
        Route::post('/submissions', [AuditSubmissionController::class, 'store']);
        Route::get('/submissions', [AuditSubmissionController::class, 'index']);
    });

    // Common routes for both roles
    Route::get('/submissions/{submission}', [AuditSubmissionController::class, 'show']);
});