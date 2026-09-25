<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->timestamp('cancelled_at')->nullable()->after('status');
            $table->unsignedBigInteger('cancelled_by')->nullable()->after('cancelled_at');
            $table->string('cancelled_by_name')->nullable()->after('cancelled_by');
            $table->string('cancelled_stage', 30)->nullable()->after('cancelled_by_name');
            $table->string('cancellation_reason', 50)->nullable()->after('cancelled_stage');
            $table->text('cancellation_note')->nullable()->after('cancellation_reason');
            $table->index('cancelled_at');
        });

        // Fittings of a cancelled booking are closed as "cancelled" (the dashboard already treats that status as closed)
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE fittings MODIFY status ENUM('scheduled','completed','rescheduled','cancelled') NOT NULL DEFAULT 'scheduled'");
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::table('fittings')->where('status', 'cancelled')->update(['status' => 'completed']);
            DB::statement("ALTER TABLE fittings MODIFY status ENUM('scheduled','completed','rescheduled') NOT NULL DEFAULT 'scheduled'");
        }

        Schema::table('bookings', function (Blueprint $table) {
            $table->dropIndex(['cancelled_at']);
            $table->dropColumn([
                'cancelled_at', 'cancelled_by', 'cancelled_by_name', 'cancelled_stage',
                'cancellation_reason', 'cancellation_note',
            ]);
        });
    }
};
