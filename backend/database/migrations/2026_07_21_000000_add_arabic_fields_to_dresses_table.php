<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('dresses', function (Blueprint $table) {
            $table->string('name_ar')->nullable()->after('name');
            $table->text('description_ar')->nullable()->after('description');
            $table->string('fabric_ar')->nullable()->after('fabric');
        });
    }

    public function down(): void
    {
        Schema::table('dresses', function (Blueprint $table) {
            $table->dropColumn(['name_ar', 'description_ar', 'fabric_ar']);
        });
    }
};
