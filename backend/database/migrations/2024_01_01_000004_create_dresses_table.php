<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('dresses', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->foreignId('category_id')->constrained()->cascadeOnDelete();
            $table->foreignId('designer_id')->constrained()->cascadeOnDelete();
            $table->text('description')->nullable();
            $table->decimal('purchase_price', 10, 2)->default(0);
            $table->decimal('rental_price', 10, 2)->default(0);
            $table->enum('status', ['available', 'out', 'maintenance', 'cleaning'])->default('available');
            $table->string('size')->nullable();
            $table->string('color')->nullable();
            $table->string('fabric')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dresses');
    }
};
