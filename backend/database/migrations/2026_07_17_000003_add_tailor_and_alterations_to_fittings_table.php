<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('fittings', function (Blueprint $table) {
            $table->foreignId('tailor_id')->nullable()->after('sales_associate')->constrained('employees')->nullOnDelete();
            $table->json('alterations')->nullable()->after('measurements');
            $table->text('additional_notes')->nullable()->after('alterations_notes');
        });
    }

    public function down(): void
    {
        Schema::table('fittings', function (Blueprint $table) {
            $table->dropForeign(['tailor_id']);
            $table->dropColumn(['tailor_id', 'alterations', 'additional_notes']);
        });
    }
};
