<?php

// 1. ENHANCED AuditSubmission.php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AuditSubmission extends Model
{
    protected $fillable = [
        'user_id',
        'title',
        'system_overall_risk',     // Auto-calculated from answers
        'admin_overall_risk',      // Admin final assessment
        'status',                  // draft, submitted, under_review, completed
        'reviewed_by',             // Admin who completed the review
        'reviewed_at',             // When review was completed
        'admin_summary',           // Admin's overall comments
    ];

    protected $casts = [
        'reviewed_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function answers(): HasMany
    {
        return $this->hasMany(AuditAnswer::class);
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    // Get answers pending admin review
    public function pendingAnswers()
    {
        return $this->answers()->pendingReview();
    }

    // Check if submission is fully reviewed
    public function isFullyReviewed(): bool
    {
        return $this->pendingAnswers()->count() === 0;
    }

    // Get review progress percentage
    public function getReviewProgressAttribute(): float
    {
        $total = $this->answers()->count();
        if ($total === 0) return 0;
        
        $reviewed = $this->answers()->whereNotNull('reviewed_by')->count();
        return round(($reviewed / $total) * 100, 2);
    }

    // Calculate system overall risk from all answers
    public function calculateSystemOverallRisk(): string
    {
        $answers = $this->answers;
        if ($answers->isEmpty()) return 'low';

        $riskScores = ['low' => 1, 'medium' => 2, 'high' => 3];
        $totalScore = 0;
        $count = 0;

        foreach ($answers as $answer) {
            $riskLevel = $answer->effective_risk_level;
            $totalScore += $riskScores[$riskLevel] ?? 1;
            $count++;
        }

        $averageScore = $totalScore / $count;
        
        if ($averageScore >= 2.5) return 'high';
        if ($averageScore >= 1.5) return 'medium';
        return 'low';
    }

    // Get the effective overall risk (admin override or system calculated)
    public function getEffectiveOverallRiskAttribute(): string
    {
        return $this->admin_overall_risk ?? $this->system_overall_risk ?? 'pending';
    }

    // Scopes
    public function scopePendingReview($query)
    {
        return $query->where('status', 'submitted');
    }

    public function scopeUnderReview($query)
    {
        return $query->where('status', 'under_review');
    }

    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }
}