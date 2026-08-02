<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('dresses', function (Blueprint $table) {
            $table->string('color_ar')->nullable()->after('color');
        });

        Schema::table('designers', function (Blueprint $table) {
            $table->string('name_ar')->nullable()->after('name');
        });
    }

    public function down(): void
    {
        Schema::table('dresses', function (Blueprint $table) {
            $table->dropColumn('color_ar');
        });

        Schema::table('designers', function (Blueprint $table) {
            $table->dropColumn('name_ar');
        });
    }
};
