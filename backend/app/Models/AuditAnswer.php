<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AuditAnswer extends Model
{
    protected $fillable = [
        'audit_submission_id',
        'audit_question_id',
        'answer',
        'system_risk_level',      // Auto-calculated from question criteria
        'admin_risk_level',       // Admin override
        'reviewed_by',            // Admin user ID who reviewed this
        'reviewed_at',            // When this answer was reviewed
        'admin_notes',            // Admin comments on this answer
        'recommendation',         // Recommendation text
        'status',                 // pending, reviewed
    ];

    protected $casts = [
        'reviewed_at' => 'datetime',
    ];

    public function auditSubmission(): BelongsTo
    {
        return $this->belongsTo(AuditSubmission::class, 'audit_submission_id');
    }

    public function question(): BelongsTo
    {
        return $this->belongsTo(AuditQuestion::class, 'audit_question_id');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    // Alias for backward compatibility
    public function submission(): BelongsTo
    {
        return $this->auditSubmission();
    }

    // Get the effective risk level (admin override or system calculated)
    public function getEffectiveRiskLevelAttribute(): string
    {
        return $this->admin_risk_level ?? $this->system_risk_level ?? 'pending';
    }

    // Check if this answer has been reviewed by admin
    public function isReviewed(): bool
    {
        return !is_null($this->reviewed_by);
    }

    // Calculate system risk level based on question criteria
    public function calculateSystemRiskLevel(): string
    {
        $question = $this->question;
        if (!$question || !is_array($question->risk_criteria)) {
            return 'low';
        }

        $criteria = $question->risk_criteria;
        
        // Match answer against risk criteria
        foreach (['high', 'medium', 'low'] as $level) {
            if (isset($criteria[$level])) {
                // Handle both string and array criteria
                $levelCriteria = is_array($criteria[$level]) ? $criteria[$level] : [$criteria[$level]];
                if (in_array($this->answer, $levelCriteria, true)) {
                    return $level;
                }
            }
        }

        return 'low'; // Default fallback
    }

    // Admin reviews and rates this answer
    public function reviewByAdmin(User $admin, string $riskLevel, ?string $notes = null, ?string $recommendation = null): bool
    {
        if (!$admin->isAdmin()) {
            throw new \Exception('Only admins can review audit answers');
        }

        if (!in_array($riskLevel, ['low', 'medium', 'high'])) {
            throw new \Exception('Invalid risk level');
        }

        $this->update([
            'admin_risk_level' => $riskLevel,
            'reviewed_by' => $admin->id,
            'reviewed_at' => now(),
            'admin_notes' => $notes,
            'recommendation' => $recommendation,
            'status' => 'reviewed',
        ]);

        // Update submission status
        $submission = $this->auditSubmission;
        if ($submission->status === 'submitted') {
            $submission->update(['status' => 'under_review']);
        }

        // Check if all answers are now reviewed
        if ($submission->isFullyReviewed()) {
            $submission->update([
                'status' => 'completed',
                'reviewed_by' => $admin->id,
                'reviewed_at' => now(),
                'system_overall_risk' => $submission->calculateSystemOverallRisk(),
            ]);
        }

        return true;
    }

    // Scopes
    public function scopePendingReview($query)
    {
        return $query->where('status', 'pending')->orWhereNull('status');
    }

    public function scopeReviewed($query)
    {
        return $query->where('status', 'reviewed');
    }

    public function scopeHighRisk($query)
    {
        return $query->where(function($q) {
            $q->where('admin_risk_level', 'high')
              ->orWhere(function($subQ) {
                  $subQ->whereNull('admin_risk_level')
                       ->where('system_risk_level', 'high');
              });
        });
    }
}