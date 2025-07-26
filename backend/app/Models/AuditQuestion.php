<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AuditQuestion extends Model
{
    protected $fillable = [
        'question',
        'description',
        'possible_answers',
        'risk_criteria',
    ];

    protected $casts = [
        'possible_answers' => 'array',
        'risk_criteria' => 'array',
    ];

    public function answers(): HasMany
    {
        return $this->hasMany(AuditAnswer::class);
    }
}
