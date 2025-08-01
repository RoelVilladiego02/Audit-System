<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Log;

class AuditAnswer extends Model
{
    protected $fillable = [
        'audit_submission_id',
        'audit_question_id',
        'answer',
        'system_risk_level',
        'admin_risk_level',
        'reviewed_by',
        'reviewed_at',
        'admin_notes',
        'recommendation',
        'status',
    ];

    protected $casts = [
        'id' => 'integer',
        'audit_submission_id' => 'integer',
        'audit_question_id' => 'integer',
        'reviewed_by' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
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
        if (!$question) {
            // Try to load the question if it's not loaded
            $question = AuditQuestion::find($this->audit_question_id);
        }
        
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

        $recommendation = $recommendation ? trim($recommendation) : 'Review required to address potential security concerns.';
        
        $updateData = [
            'admin_risk_level' => $riskLevel,
            'reviewed_by' => (int) $admin->id,
            'reviewed_at' => now(),
            'admin_notes' => $notes ? trim($notes) : '',
            'recommendation' => $recommendation,
            'status' => 'reviewed',
        ];

        Log::info('Updating audit answer', [
            'answer_id' => $this->id,
            'update_data' => $updateData
        ]);

        $result = $this->update($updateData);

        // Verify update
        $updated = self::find($this->id);
        foreach ($updateData as $key => $value) {
            if ($key === 'reviewed_at' && $value instanceof \Carbon\Carbon) {
                $expected = $value->toDateTimeString();
                $actual = $updated->$key ? $updated->$key->toDateTimeString() : null;
                if ($actual !== $expected) {
                    Log::error('Answer update verification failed for timestamp', [
                        'answer_id' => $this->id,
                        'field' => $key,
                        'expected' => $expected,
                        'actual' => $actual
                    ]);
                    throw new \Exception("Failed to verify answer update for field: {$key}");
                }
            } elseif ($updated->$key !== $value) {
                Log::error('Answer update verification failed', [
                    'answer_id' => $this->id,
                    'field' => $key,
                    'expected' => $value,
                    'actual' => $updated->$key
                ]);
                throw new \Exception("Failed to verify answer update for field: {$key}");
            }
        }

        // Update submission status
        $submission = $this->auditSubmission;
        if ($submission && $submission->status === 'submitted') {
            $submission->update(['status' => 'under_review']);
        }

        return $result;
    }

    // Scopes
    public function scopePendingReview($query)
    {
        return $query->where(function($q) {
            $q->where('status', 'pending')
              ->orWhereNull('status')
              ->orWhereNull('reviewed_by');
        });
    }

    public function scopeReviewed($query)
    {
        return $query->where('status', 'reviewed')
                    ->whereNotNull('reviewed_by');
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