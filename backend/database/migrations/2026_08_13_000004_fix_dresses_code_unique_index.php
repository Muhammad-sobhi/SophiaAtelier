<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Set code = null for all soft-deleted dresses
        DB::table('dresses')
            ->whereNotNull('deleted_at')
            ->update(['code' => null]);

        // 2. Drop the rigid single-column database unique index if it exists
        Schema::table('dresses', function (Blueprint $table) {
            try {
                $table->dropUnique('dresses_code_unique');
            } catch (\Throwable $e) {
                // Index might already be dropped or named differently
            }
        });
    }

    public function down(): void
    {
    }
};
