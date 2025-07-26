<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('audit_questions', function (Blueprint $table) {
            $table->id();
            $table->string('question');
            $table->text('description')->nullable();
            $table->json('possible_answers');
            $table->json('risk_criteria');
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('audit_questions');
    }
};
