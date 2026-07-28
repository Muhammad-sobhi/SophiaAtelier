<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Safe check using native Laravel 11 Schema::getIndexes
        $bookingsIndexes = collect(Schema::getIndexes('bookings'))->pluck('name')->toArray();
        Schema::table('bookings', function (Blueprint $table) use ($bookingsIndexes) {
            if (!in_array('bookings_booking_date_index', $bookingsIndexes)) {
                $table->index('booking_date');
            }
            if (!in_array('bookings_event_date_index', $bookingsIndexes)) {
                $table->index('event_date');
            }
        });

        $revenuesIndexes = collect(Schema::getIndexes('revenues'))->pluck('name')->toArray();
        Schema::table('revenues', function (Blueprint $table) use ($revenuesIndexes) {
            if (!in_array('revenues_payment_date_index', $revenuesIndexes)) {
                $table->index('payment_date');
            }
        });

        $expensesIndexes = collect(Schema::getIndexes('expenses'))->pluck('name')->toArray();
        Schema::table('expenses', function (Blueprint $table) use ($expensesIndexes) {
            if (!in_array('expenses_date_index', $expensesIndexes)) {
                $table->index('date');
            }
        });
    }

    public function down(): void
    {
        // Safe drop index
        $bookingsIndexes = collect(Schema::getIndexes('bookings'))->pluck('name')->toArray();
        Schema::table('bookings', function (Blueprint $table) use ($bookingsIndexes) {
            if (in_array('bookings_booking_date_index', $bookingsIndexes)) {
                $table->dropIndex(['booking_date']);
            }
            if (in_array('bookings_event_date_index', $bookingsIndexes)) {
                $table->dropIndex(['event_date']);
            }
        });

        $revenuesIndexes = collect(Schema::getIndexes('revenues'))->pluck('name')->toArray();
        Schema::table('revenues', function (Blueprint $table) use ($revenuesIndexes) {
            if (in_array('revenues_payment_date_index', $revenuesIndexes)) {
                $table->dropIndex(['payment_date']);
            }
        });

        $expensesIndexes = collect(Schema::getIndexes('expenses'))->pluck('name')->toArray();
        Schema::table('expenses', function (Blueprint $table) use ($expensesIndexes) {
            if (in_array('expenses_date_index', $expensesIndexes)) {
                $table->dropIndex(['date']);
            }
        });
    }
};
