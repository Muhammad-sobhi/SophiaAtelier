<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Resolve existing duplicate dress codes by appending -id to duplicates
        $duplicates = \Illuminate\Support\Facades\DB::table('dresses')
            ->select('code', \Illuminate\Support\Facades\DB::raw('COUNT(*) as count'))
            ->whereNotNull('code')
            ->where('code', '!=', '')
            ->groupBy('code')
            ->having('count', '>', 1)
            ->get();

        foreach ($duplicates as $dup) {
            $dresses = \Illuminate\Support\Facades\DB::table('dresses')
                ->where('code', $dup->code)
                ->orderBy('id')
                ->get();

            // Keep the first one, append -id to remaining duplicates
            foreach ($dresses->skip(1) as $dress) {
                \Illuminate\Support\Facades\DB::table('dresses')
                    ->where('id', $dress->id)
                    ->update(['code' => $dress->code . '-' . $dress->id]);
            }
        }

        // 2. Add unique index on code column
        Schema::table('dresses', function (Blueprint $table) {
            $table->unique('code', 'dresses_code_unique');
        });
    }

    public function down(): void
    {
        Schema::table('dresses', function (Blueprint $table) {
            $table->dropUnique('dresses_code_unique');
        });
    }
};
