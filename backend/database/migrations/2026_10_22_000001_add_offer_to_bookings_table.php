<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            // total_amount stays the price the bride pays; discount_amount records what the offer took off
            $table->foreignId('offer_id')->nullable()->after('insurance_amount')->constrained()->nullOnDelete();
            $table->decimal('discount_amount', 10, 2)->default(0)->after('offer_id');
        });
    }

    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->dropConstrainedForeignId('offer_id');
            $table->dropColumn('discount_amount');
        });
    }
};
