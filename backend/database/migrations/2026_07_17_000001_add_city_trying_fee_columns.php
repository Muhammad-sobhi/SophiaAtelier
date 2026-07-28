<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Add city column to clients table
        Schema::table('clients', function (Blueprint $table) {
            $table->string('city')->nullable()->after('address');
        });

        // Add trying_fee column to dresses table
        Schema::table('dresses', function (Blueprint $table) {
            $table->decimal('trying_fee', 10, 2)->default(0)->after('rental_price');
        });

        // Update dresses status enum to include new stages
        // Drop old enum and create new one with additional values
        if (DB::getDriverName() !== 'sqlite') {
            DB::statement("ALTER TABLE dresses MODIFY COLUMN status ENUM('available', 'out', 'maintenance', 'cleaning', 'booked', 'dry_clean') DEFAULT 'available'");
        }
    }

    public function down(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            $table->dropColumn('city');
        });

        Schema::table('dresses', function (Blueprint $table) {
            $table->dropColumn('trying_fee');
        });

        if (DB::getDriverName() !== 'sqlite') {
            DB::statement("ALTER TABLE dresses MODIFY COLUMN status ENUM('available', 'out', 'maintenance', 'cleaning') DEFAULT 'available'");
        }
    }
};
