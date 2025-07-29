<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AuditSubmission extends Model
{
    protected $fillable = [
        'user_id',
        'title',
        'system_overall_risk',
        'admin_overall_risk', 
        'status',
        'reviewed_by',
        'reviewed_at',
        'admin_summary',
    ];

    protected $casts = [
        'id' => 'integer',
        'user_id' => 'integer',
        'reviewed_by' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'reviewed_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function answers(): HasMany
    {
        return $this->hasMany(AuditAnswer::class, 'audit_submission_id');
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
        if ($total === 0) return 0.0;
        
        $reviewed = $this->answers()->whereNotNull('reviewed_by')->count();
        return round(($reviewed / $total) * 100, 2);
    }

    // Calculate system overall risk from all answers
    public function calculateSystemOverallRisk(): string
    {
        $answers = $this->answers()->with('question')->get();
        if ($answers->isEmpty()) return 'low';

        $riskScores = ['low' => 1, 'medium' => 2, 'high' => 3];
        $totalScore = 0;
        $count = 0;

        foreach ($answers as $answer) {
            // Ensure we have a proper risk level
            $riskLevel = $answer->admin_risk_level ?? $answer->system_risk_level ?? 'low';
            $totalScore += $riskScores[$riskLevel] ?? 1;
            $count++;
        }

        if ($count === 0) return 'low';

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