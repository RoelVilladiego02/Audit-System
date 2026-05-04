<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class AuditQuestionnaireSet extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'audit_questionnaire_sets';

    protected $fillable = [
        'name',
        'description',
        'status',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'id' => 'integer',
        'created_by' => 'integer',
        'updated_by' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    protected $hidden = [
        'deleted_at',
    ];

    /**
     * Get questions in this questionnaire set.
     */
    public function questions(): HasMany
    {
        return $this->hasMany(AuditQuestion::class, 'questionnaire_set_id');
    }

    /**
     * Get submissions using this questionnaire set.
     */
    public function submissions(): HasMany
    {
        return $this->hasMany(AuditSubmission::class, 'questionnaire_set_id');
    }

    /**
     * Get creator of this questionnaire set.
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get updater of this questionnaire set.
     */
    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    /**
     * Scope to get active questionnaire sets.
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    /**
     * Duplicate a questionnaire set with all its questions.
     */
    public function duplicate(string $newName, int $userId)
    {
        $newSet = static::create([
            'name' => $newName,
            'description' => $this->description,
            'status' => 'draft',
            'created_by' => $userId,
            'updated_by' => $userId,
        ]);

        // Duplicate all questions
        foreach ($this->questions as $question) {
            AuditQuestion::create([
                'question' => $question->question,
                'description' => $question->description,
                'category' => $question->category,
                'possible_answers' => $question->possible_answers,
                'risk_criteria' => $question->risk_criteria,
                'possible_recommendation' => $question->possible_recommendation,
                'questionnaire_set_id' => $newSet->id,
            ]);
        }

        return $newSet;
    }

    /**
     * Check if set can be deleted.
     */
    public function canBeDeleted(): bool
    {
        return !$this->submissions()
            ->whereIn('status', ['submitted', 'under_review', 'completed'])
            ->exists();
    }

    /**
     * Get comprehensive statistics for the questionnaire set.
     */
    public function getStatistics(): array
    {
        $submissionQuery = $this->submissions();
        $totalSubmissions = $submissionQuery->count();
        
        // Risk distribution
        $riskDistribution = $submissionQuery->clone()
            ->groupBy('system_overall_risk')
            ->selectRaw('system_overall_risk, COUNT(*) as count')
            ->get()
            ->mapWithKeys(fn($item) => [$item->system_overall_risk => $item->count])
            ->toArray();

        // Status distribution
        $statusDistribution = $submissionQuery->clone()
            ->groupBy('status')
            ->selectRaw('status, COUNT(*) as count')
            ->get()
            ->mapWithKeys(fn($item) => [$item->status => $item->count])
            ->toArray();

        // Average review time for completed submissions
        $completedSubmissions = $submissionQuery->clone()
            ->where('status', 'completed')
            ->whereNotNull('reviewed_at')
            ->get();

        $avgReviewTime = 0;
        if ($completedSubmissions->count() > 0) {
            $totalTime = $completedSubmissions->sum(function ($submission) {
                return $submission->reviewed_at->diffInHours($submission->created_at);
            });
            $avgReviewTime = round($totalTime / $completedSubmissions->count(), 2);
        }

        return [
            'total_submissions' => $totalSubmissions,
            'total_questions' => $this->questions()->count(),
            'risk_distribution' => $riskDistribution,
            'status_distribution' => $statusDistribution,
            'completion_rate' => $totalSubmissions > 0 ? round(($statusDistribution['completed'] ?? 0) / $totalSubmissions * 100, 2) : 0,
            'average_review_time_hours' => $avgReviewTime,
        ];
    }
}
