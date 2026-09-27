<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 'requested' = dresses the bride asked to try (from the website or the visit form)
        DB::statement("ALTER TABLE visit_dresses MODIFY type ENUM('requested', 'tried', 'booked') NOT NULL");

        Schema::table('visits', function (Blueprint $table) {
            $table->decimal('trying_fee', 10, 2)->default(0)->after('time_slot');
        });

        // Backfill: visit dresses used to be kept on a pending booking; copy them to the bride's open visit
        $pendingBookings = DB::table('bookings')->where('status', 'pending')->get(['client_id', 'dress_id', 'dress_2_id', 'dress_3_id']);
        foreach ($pendingBookings as $booking) {
            $visit = DB::table('visits')
                ->where('client_id', $booking->client_id)
                ->whereIn('status', ['pending', 'confirmed', 'arrived'])
                ->orderByDesc('created_at')->orderByDesc('id')
                ->first();
            if (!$visit || DB::table('visit_dresses')->where('visit_id', $visit->id)->where('type', 'requested')->exists()) {
                continue;
            }

            $dressIds = array_unique(array_filter([$booking->dress_id, $booking->dress_2_id, $booking->dress_3_id]));
            foreach ($dressIds as $dressId) {
                DB::table('visit_dresses')->insert([
                    'visit_id' => $visit->id,
                    'dress_id' => $dressId,
                    'type' => 'requested',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
            DB::table('visits')->where('id', $visit->id)->update([
                'trying_fee' => DB::table('dresses')->whereIn('id', $dressIds)->sum('trying_fee'),
            ]);
        }
    }

    public function down(): void
    {
        DB::table('visit_dresses')->where('type', 'requested')->delete();
        DB::statement("ALTER TABLE visit_dresses MODIFY type ENUM('tried', 'booked') NOT NULL");

        Schema::table('visits', function (Blueprint $table) {
            $table->dropColumn('trying_fee');
        });
    }
};
