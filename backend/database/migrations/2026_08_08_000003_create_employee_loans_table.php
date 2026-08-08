<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('employee_loans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained()->cascadeOnDelete();
            $table->decimal('amount', 10, 2);
            $table->date('date');
            $table->text('reason')->nullable();
            $table->enum('status', ['pending', 'approved', 'rejected', 'paid'])->default('approved');
            $table->boolean('deducted_from_salary')->default(false);
            $table->string('deduction_month')->nullable(); // e.g. "2026-08" — the month it was deducted in
            $table->timestamps();

            $table->index(['employee_id', 'status']);
            $table->index(['employee_id', 'deducted_from_salary']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('employee_loans');
    }
};
