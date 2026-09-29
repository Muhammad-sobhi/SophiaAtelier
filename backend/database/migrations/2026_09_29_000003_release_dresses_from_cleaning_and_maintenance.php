<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /** Cleaning and maintenance are handled outside the system now: those dresses are available again */
    public function up(): void
    {
        DB::table('dresses')
            ->whereIn('status', ['cleaning', 'dry_clean', 'maintenance'])
            ->update(['status' => 'available']);
    }

    public function down(): void
    {
        // Previous cleaning / maintenance statuses are not restored
    }
};
