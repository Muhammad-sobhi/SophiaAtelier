<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('offers', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('name_ar')->nullable();
            // percentage: value is a %, fixed: value is an amount off, perk: a free extra described by perk/perk_ar
            $table->string('type', 20);
            $table->decimal('value', 10, 2)->nullable();
            $table->string('perk')->nullable();
            $table->string('perk_ar')->nullable();
            // Which dresses the offer covers: all, one category, one collection, or hand-picked (dress_offer)
            $table->string('scope', 20)->default('all');
            $table->unsignedBigInteger('scope_id')->nullable();
            $table->string('banner_text')->nullable();
            $table->string('banner_text_ar')->nullable();
            $table->date('starts_at');
            $table->date('ends_at');
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['is_active', 'starts_at', 'ends_at']);
        });

        Schema::create('dress_offer', function (Blueprint $table) {
            $table->foreignId('offer_id')->constrained()->cascadeOnDelete();
            $table->foreignId('dress_id')->constrained()->cascadeOnDelete();
            $table->primary(['offer_id', 'dress_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dress_offer');
        Schema::dropIfExists('offers');
    }
};
