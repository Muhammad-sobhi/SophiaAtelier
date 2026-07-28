<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('expenses', function (Blueprint $table) {
            $table->id();
            $table->enum('category', ['salary', 'loan', 'purchase', 'maintenance', 'cleaning', 'other'])->default('other');
            $table->decimal('amount', 10, 2)->default(0);
            $table->text('description')->nullable();
            $table->date('date');
            $table->foreignId('employee_id')->nullable()->constrained()->cascadeOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('expenses');
    }
};
