<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('audit_submissions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('title');
            $table->enum('overall_risk', ['low', 'medium', 'high']);
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('audit_submissions');
    }
};
