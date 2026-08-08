<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->enum('pay_cycle', ['monthly', 'weekly', 'custom'])->default('monthly')->after('salary');
            $table->unsignedSmallInteger('pay_cycle_days')->nullable()->after('pay_cycle');
        });
    }

    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->dropColumn(['pay_cycle', 'pay_cycle_days']);
        });
    }
};
