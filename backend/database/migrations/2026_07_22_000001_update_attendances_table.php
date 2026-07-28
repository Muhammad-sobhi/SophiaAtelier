<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('attendances', function (Blueprint $table) {
            if (!Schema::hasColumn('attendances', 'worked_hours')) {
                $table->decimal('worked_hours', 5, 2)->default(0)->after('check_out');
            }
            if (!Schema::hasColumn('attendances', 'late_minutes')) {
                $table->integer('late_minutes')->default(0)->after('worked_hours');
            }
            if (!Schema::hasColumn('attendances', 'overtime_hours')) {
                $table->decimal('overtime_hours', 5, 2)->default(0)->after('late_minutes');
            }
        });
    }

    public function down(): void
    {
        Schema::table('attendances', function (Blueprint $table) {
            $table->dropColumn(['worked_hours', 'late_minutes', 'overtime_hours']);
        });
    }
};
