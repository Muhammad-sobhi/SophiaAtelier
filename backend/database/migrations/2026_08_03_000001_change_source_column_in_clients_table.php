<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            $table->string('source')->default('walkin')->change();
        });
    }

    public function down(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            $table->enum('source', ['instagram', 'website', 'referral', 'walkin', 'whatsapp', 'excel_import'])->default('walkin')->change();
        });
    }
};
