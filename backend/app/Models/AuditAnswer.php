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
        'risk_level',
        'recommendation',
    ];

    public function auditSubmission(): BelongsTo
    {
        return $this->belongsTo(AuditSubmission::class, 'audit_submission_id');
    }

    public function question(): BelongsTo
    {
        return $this->belongsTo(AuditQuestion::class, 'audit_question_id');
    }

    // Alias for backward compatibility
    public function submission(): BelongsTo
    {
        return $this->auditSubmission();
    }
}