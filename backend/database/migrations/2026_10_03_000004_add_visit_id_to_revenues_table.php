<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Trying fees are paid at the visit, before any booking exists
        Schema::table('revenues', function (Blueprint $table) {
            $table->foreignId('visit_id')->nullable()->after('booking_id')->constrained()->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('revenues', function (Blueprint $table) {
            $table->dropConstrainedForeignId('visit_id');
        });
    }
};
