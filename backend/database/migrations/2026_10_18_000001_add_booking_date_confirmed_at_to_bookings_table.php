<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Set when an admin confirms on the data-health page that a booking date differing from the
        // booked visit's day is correct (the bride really booked on another day)
        Schema::table('bookings', function (Blueprint $table) {
            $table->timestamp('booking_date_confirmed_at')->nullable()->after('booking_date');
        });
    }

    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->dropColumn('booking_date_confirmed_at');
        });
    }
};
