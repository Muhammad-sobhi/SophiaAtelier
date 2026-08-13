<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('dresses')
            ->whereNotNull('deleted_at')
            ->update(['code' => null]);
    }

    public function down(): void
    {
        // No reversal needed as soft-deleted dress codes are cleared intentionally to avoid unique conflicts
    }
};
