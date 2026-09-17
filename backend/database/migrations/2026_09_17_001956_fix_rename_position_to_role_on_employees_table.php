<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (Schema::hasTable('employees') && Schema::hasColumn('employees', 'position') && !Schema::hasColumn('employees', 'role')) {
            Schema::table('employees', function (Blueprint $table) {
                $table->renameColumn('position', 'role');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('employees') && Schema::hasColumn('employees', 'role') && !Schema::hasColumn('employees', 'position')) {
            Schema::table('employees', function (Blueprint $table) {
                $table->renameColumn('role', 'position');
            });
        }
    }
};
