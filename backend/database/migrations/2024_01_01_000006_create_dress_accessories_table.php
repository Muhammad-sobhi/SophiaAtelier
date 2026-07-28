<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('dress_accessories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('dress_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->integer('quantity')->default(1);
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dress_accessories');
    }
};
