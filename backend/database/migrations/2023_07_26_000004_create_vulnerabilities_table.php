<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('vulnerabilities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('vulnerability_submission_id')->constrained('vulnerability_submissions');
            $table->string('category');
            $table->string('title');
            $table->text('description');
            $table->enum('severity', ['low', 'medium', 'high']);
            $table->decimal('cvss_score', 3, 1)->nullable();
            $table->json('affected_systems')->nullable();
            $table->text('remediation_steps')->nullable();
            $table->boolean('is_resolved')->default(false);
            $table->foreignId('resolved_by')->nullable()->constrained('users');
            $table->timestamp('resolved_at')->nullable();
            $table->text('resolution_notes')->nullable();
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('vulnerabilities');
    }
};