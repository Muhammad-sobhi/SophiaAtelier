<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Employees can be paid by the piece: pay_type daily (daily rate only), per_piece (pieces only) or both.
     * Pieces are recorded as entries (daily, or once when paying); each entry keeps the piece rate it was paid at.
     */
    public function up(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->enum('pay_type', ['daily', 'per_piece', 'both'])->default('daily')->after('daily_rate');
            $table->decimal('piece_rate', 10, 2)->default(0)->after('pay_type');
            // Absence, unpaid leave and missing shift hours are deducted from the salary (loans are always deducted)
            $table->boolean('attendance_deductions')->default(true)->after('piece_rate');
        });

        Schema::create('employee_piece_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained()->cascadeOnDelete();
            $table->date('date');
            $table->unsignedInteger('pieces');
            $table->decimal('piece_rate', 10, 2);
            $table->decimal('amount', 12, 2); // pieces x piece_rate
            $table->string('notes', 500)->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['employee_id', 'date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('employee_piece_entries');
        Schema::table('employees', function (Blueprint $table) {
            $table->dropColumn(['pay_type', 'piece_rate', 'attendance_deductions']);
        });
    }
};
