<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('audit_answers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('audit_submission_id')->constrained('audit_submissions')->onDelete('cascade');
            $table->foreignId('audit_question_id')->constrained('audit_questions')->onDelete('cascade');
            $table->text('answer');
            $table->enum('system_risk_level', ['low', 'medium', 'high'])->nullable();
            $table->enum('admin_risk_level', ['low', 'medium', 'high'])->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users');
            $table->timestamp('reviewed_at')->nullable();
            $table->text('admin_notes')->nullable();
            $table->text('recommendation')->nullable();
            $table->enum('status', ['pending', 'reviewed'])->default('pending');
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('audit_answers');
    }
};