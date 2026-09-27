<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('visits', function (Blueprint $table) {
            $table->timestamp('confirmed_at')->nullable()->after('status');
            // null confirmed_by + auto_confirmed = confirmed by the system (all dresses available)
            $table->foreignId('confirmed_by')->nullable()->after('confirmed_at')->constrained('users')->nullOnDelete();
            $table->boolean('auto_confirmed')->default(false)->after('confirmed_by');
            $table->timestamp('confirmation_sent_at')->nullable()->after('auto_confirmed');
            $table->index(['status', 'visit_date']);
        });

        // Visits confirmed before this change: best estimate is their last update
        DB::table('visits')->whereIn('status', ['confirmed', 'arrived', 'done', 'booked', 'no_show'])
            ->update(['confirmed_at' => DB::raw('updated_at')]);

        // Dresses a bride wanted but that were booked on her wedding date (lost demand)
        Schema::create('dress_demand_misses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('dress_id')->constrained()->cascadeOnDelete();
            $table->foreignId('client_id')->constrained()->cascadeOnDelete();
            $table->date('wedding_date');
            $table->date('available_from')->nullable();
            $table->timestamps();
            $table->unique(['dress_id', 'client_id', 'wedding_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dress_demand_misses');

        Schema::table('visits', function (Blueprint $table) {
            $table->dropIndex(['status', 'visit_date']);
            $table->dropConstrainedForeignId('confirmed_by');
            $table->dropColumn(['confirmed_at', 'auto_confirmed', 'confirmation_sent_at']);
        });
    }
};
