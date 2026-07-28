<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        try {
            Schema::table('dresses', function (Blueprint $table) {
                if (Schema::hasColumn('dresses', 'status') && Schema::hasColumn('dresses', 'category_id')) {
                    try { $table->index(['status', 'category_id']); } catch (\Throwable $e) {}
                }
                if (Schema::hasColumn('dresses', 'collection_id')) {
                    try { $table->index(['collection_id']); } catch (\Throwable $e) {}
                }
                if (Schema::hasColumn('dresses', 'designer_id')) {
                    try { $table->index(['designer_id']); } catch (\Throwable $e) {}
                }
            });
        } catch (\Throwable $e) {}

        try {
            Schema::table('bookings', function (Blueprint $table) {
                if (Schema::hasColumn('bookings', 'booking_date') && Schema::hasColumn('bookings', 'status')) {
                    try { $table->index(['booking_date', 'status']); } catch (\Throwable $e) {}
                }
                if (Schema::hasColumn('bookings', 'client_id')) {
                    try { $table->index(['client_id']); } catch (\Throwable $e) {}
                }
            });
        } catch (\Throwable $e) {}

        try {
            Schema::table('visits', function (Blueprint $table) {
                if (Schema::hasColumn('visits', 'visit_date') && Schema::hasColumn('visits', 'status')) {
                    try { $table->index(['visit_date', 'status']); } catch (\Throwable $e) {}
                }
                if (Schema::hasColumn('visits', 'client_id')) {
                    try { $table->index(['client_id']); } catch (\Throwable $e) {}
                }
            });
        } catch (\Throwable $e) {}
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
