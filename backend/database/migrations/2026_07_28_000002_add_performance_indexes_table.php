<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('dresses', function (Blueprint $table) {
            $table->index(['status', 'category_id']);
            $table->index(['collection_id']);
            $table->index(['designer_id']);
        });

        Schema::table('bookings', function (Blueprint $table) {
            $table->index(['booking_date', 'status']);
            $table->index(['client_id']);
        });

        Schema::table('visits', function (Blueprint $table) {
            $table->index(['visit_date', 'status']);
            $table->index(['client_id']);
        });
    }

    public function down(): void
    {
        Schema::table('dresses', function (Blueprint $table) {
            $table->dropIndex(['status', 'category_id']);
            $table->dropIndex(['collection_id']);
            $table->dropIndex(['designer_id']);
        });

        Schema::table('bookings', function (Blueprint $table) {
            $table->dropIndex(['booking_date', 'status']);
            $table->dropIndex(['client_id']);
        });

        Schema::table('visits', function (Blueprint $table) {
            $table->dropIndex(['visit_date', 'status']);
            $table->dropIndex(['client_id']);
        });
    }
};
