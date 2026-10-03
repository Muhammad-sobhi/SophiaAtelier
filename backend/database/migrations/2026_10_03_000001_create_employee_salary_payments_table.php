<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Salary paid to an employee for one pay period; each row writes one "salary" expense (finance page)
        Schema::create('employee_salary_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained()->cascadeOnDelete();
            $table->foreignId('expense_id')->nullable()->constrained()->nullOnDelete();
            // Pay period of the employee's cycle: key is YYYY-MM (monthly) or start_end dates (weekly / custom)
            $table->string('period', 32);
            $table->date('period_start');
            $table->date('period_end');
            $table->decimal('amount', 12, 2);
            $table->decimal('net_salary', 12, 2)->default(0); // net due for the period when this payment was made
            $table->string('payment_method', 50)->default('cash');
            $table->date('payment_date');
            $table->text('notes')->nullable();
            $table->foreignId('paid_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['employee_id', 'period']);
            $table->index('period');
        });

        // Back side of the national ID (id_image holds the front side)
        Schema::table('employees', function (Blueprint $table) {
            $table->longText('id_image_back')->nullable()->after('id_image');
        });
    }

    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->dropColumn('id_image_back');
        });
        Schema::dropIfExists('employee_salary_payments');
    }
};
