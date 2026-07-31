<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('dresses', function (Blueprint $table) {
            $table->string('code')->nullable()->after('id');
            $table->unsignedInteger('weight_from')->nullable()->after('size');
            $table->unsignedInteger('weight_to')->nullable()->after('weight_from');
        });
    }

    public function down(): void
    {
        Schema::table('dresses', function (Blueprint $table) {
            $table->dropColumn(['code', 'weight_from', 'weight_to']);
        });
    }
};
