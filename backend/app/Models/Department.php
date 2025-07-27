<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Department extends Model
{
    use HasFactory;

    protected $fillable = ['name'];

    public function vulnerabilitySubmissions()
    {
        return $this->hasMany(VulnerabilitySubmission::class);
    }
}