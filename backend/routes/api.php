<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuditQuestionController;
use App\Http\Controllers\AuditSubmissionController;

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});

// Admin-only routes for managing audit questions
Route::middleware(['auth:sanctum', 'admin'])->group(function () {
    Route::apiResource('questions', AuditQuestionController::class);
});

// User routes for submissions and analytics
Route::middleware('auth:sanctum')->group(function () {
    // Submission routes
    Route::post('/submissions', [AuditSubmissionController::class, 'store']);
    Route::get('/submissions', [AuditSubmissionController::class, 'index']);
    Route::get('/submissions/{submission}', [AuditSubmissionController::class, 'show']);
    
    // Analytics routes
    Route::get('/analytics', [AuditSubmissionController::class, 'analytics']);
});
