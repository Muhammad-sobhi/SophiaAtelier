<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('designers')
            ->whereRaw('LOWER(name) = ?', ['isbridal'])
            ->orWhere('name', 'LIKE', '%isbridal%')
            ->update([
                'name' => 'Esraa El Qsas',
                'name_ar' => 'اسراء القصاص',
            ]);

        DB::table('designers')
            ->where('name_ar', 'LIKE', '%اسراء القصاص%')
            ->update([
                'name' => 'Esraa El Qsas',
            ]);
    }

    public function down(): void
    {
    }
};
