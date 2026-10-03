<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Employee pay is entered as a daily rate; the cycle salary is daily rate x cycle days
     * (monthly = 30, weekly = 7, custom = pay_cycle_days). Existing monthly salaries become salary / 30.
     */
    public function up(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->renameColumn('salary', 'daily_rate');
        });
        DB::table('employees')->update(['daily_rate' => DB::raw('ROUND(daily_rate / 30, 2)')]);
    }

    public function down(): void
    {
        DB::table('employees')->update(['daily_rate' => DB::raw('ROUND(daily_rate * 30, 2)')]);
        Schema::table('employees', function (Blueprint $table) {
            $table->renameColumn('daily_rate', 'salary');
        });
    }
};
