<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('fittings', function (Blueprint $table) {
            $table->string('measurement_image_path')->nullable()->after('measurements');
        });
    }

    public function down(): void
    {
        Schema::table('fittings', function (Blueprint $table) {
            $table->dropColumn('measurement_image_path');
        });
    }
};
