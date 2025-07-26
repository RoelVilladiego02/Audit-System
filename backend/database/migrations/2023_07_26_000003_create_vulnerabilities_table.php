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
            $table->foreignId('submission_id')->constrained();
            $table->string('category');
            $table->string('title');
            $table->text('description');
            $table->enum('severity', ['low', 'medium', 'high']);
            $table->boolean('is_resolved')->default(false);
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('vulnerabilities');
    }
};
