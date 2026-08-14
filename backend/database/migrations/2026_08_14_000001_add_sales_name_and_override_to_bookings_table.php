<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            if (!Schema::hasColumn('bookings', 'sales_name')) {
                $table->string('sales_name')->nullable()->after('payment_method');
            }
            if (!Schema::hasColumn('bookings', 'is_override')) {
                $table->boolean('is_override')->default(false)->after('sales_name');
            }
        });
    }

    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $cols = [];
            if (Schema::hasColumn('bookings', 'sales_name')) $cols[] = 'sales_name';
            if (Schema::hasColumn('bookings', 'is_override')) $cols[] = 'is_override';
            if (!empty($cols)) {
                $table->dropColumn($cols);
            }
        });
    }
};
