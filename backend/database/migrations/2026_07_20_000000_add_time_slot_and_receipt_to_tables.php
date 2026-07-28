<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('visits', function (Blueprint $table) {
            if (!Schema::hasColumn('visits', 'time_slot')) {
                $table->string('time_slot')->nullable()->after('visit_date');
            }
        });

        Schema::table('bookings', function (Blueprint $table) {
            if (!Schema::hasColumn('bookings', 'receipt_path')) {
                $table->string('receipt_path')->nullable()->after('notes');
            }
            if (!Schema::hasColumn('bookings', 'payment_method')) {
                $table->string('payment_method')->nullable()->after('notes');
            }
        });

        Schema::table('revenues', function (Blueprint $table) {
            if (!Schema::hasColumn('revenues', 'receipt_path')) {
                $table->string('receipt_path')->nullable()->after('notes');
            }
        });

        Schema::table('expenses', function (Blueprint $table) {
            if (!Schema::hasColumn('expenses', 'receipt_path')) {
                $table->string('receipt_path')->nullable()->after('description');
            }
            if (!Schema::hasColumn('expenses', 'payment_method')) {
                $table->string('payment_method')->nullable()->after('description');
            }
        });
    }

    public function down(): void
    {
        Schema::table('visits', function (Blueprint $table) {
            if (Schema::hasColumn('visits', 'time_slot')) {
                $table->dropColumn('time_slot');
            }
        });

        Schema::table('bookings', function (Blueprint $table) {
            $cols = [];
            if (Schema::hasColumn('bookings', 'receipt_path')) $cols[] = 'receipt_path';
            if (Schema::hasColumn('bookings', 'payment_method')) $cols[] = 'payment_method';
            if (!empty($cols)) $table->dropColumn($cols);
        });

        Schema::table('revenues', function (Blueprint $table) {
            if (Schema::hasColumn('revenues', 'receipt_path')) {
                $table->dropColumn('receipt_path');
            }
        });

        Schema::table('expenses', function (Blueprint $table) {
            $cols = [];
            if (Schema::hasColumn('expenses', 'receipt_path')) $cols[] = 'receipt_path';
            // Do not drop payment_method since it was created in a prior migration
            if (!empty($cols)) $table->dropColumn($cols);
        });
    }
};
