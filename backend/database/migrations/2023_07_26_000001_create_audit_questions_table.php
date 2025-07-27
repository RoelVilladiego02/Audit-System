<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('audit_questions', function (Blueprint $table) {
            $table->id();
            $table->text('question'); // The main question text
            $table->text('description')->nullable(); // Additional context/guidance
            $table->json('possible_answers'); // Array of possible answer options
            $table->json('risk_criteria'); // Object with high/medium/low risk criteria
            $table->timestamps();
            $table->softDeletes(); // For soft deletion to preserve data integrity
            
            // Indexes for better performance
            $table->index('created_at');
            $table->index('deleted_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('audit_questions');
    }
};
