<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // Other spellings of the employee's name (e.g. Arabic "لمياء" for "lamia") used to match free-text sales names
    public function up(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->json('sales_aliases')->nullable()->after('role');
        });
    }

    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->dropColumn('sales_aliases');
        });
    }
};
