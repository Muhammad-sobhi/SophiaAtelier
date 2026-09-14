<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            $table->enum('journey_mode', ['legacy', 'live'])->default('live')->after('source');
        });

        // Backfill excel_import
        DB::table('clients')->where('source', 'excel_import')->update(['journey_mode' => 'legacy']);

        Schema::table('bookings', function (Blueprint $table) {
            $table->date('pickup_scheduled_on')->nullable()->after('event_date');
            $table->date('return_scheduled_on')->nullable()->after('pickup_scheduled_on');
            $table->string('pickup_sales_name')->nullable()->after('sales_name');
            $table->string('return_sales_name')->nullable()->after('pickup_sales_name');
            $table->json('accessories_snapshot')->nullable()->after('notes');
        });

        Schema::table('visits', function (Blueprint $table) {
            $table->string('sales_name')->nullable()->after('time_slot');
        });

        Schema::table('fittings', function (Blueprint $table) {
            $table->string('sales_name')->nullable()->after('status');
        });

        Schema::create('activity_logs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->string('employee_name')->nullable();
            $table->string('action');
            $table->string('entity_type')->nullable();
            $table->unsignedBigInteger('entity_id')->nullable();
            $table->json('summary')->nullable(); // (json old/new, no secrets)
            $table->string('ip')->nullable();
            $table->timestamp('created_at')->nullable();

            $table->index('created_at');
            $table->index('user_id');
            $table->index(['entity_type', 'entity_id']);
            
            $table->foreign('user_id')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('activity_logs');

        Schema::table('fittings', function (Blueprint $table) {
            $table->dropColumn('sales_name');
        });

        Schema::table('visits', function (Blueprint $table) {
            $table->dropColumn('sales_name');
        });

        Schema::table('bookings', function (Blueprint $table) {
            $table->dropColumn([
                'pickup_scheduled_on',
                'return_scheduled_on',
                'pickup_sales_name',
                'return_sales_name',
                'accessories_snapshot'
            ]);
        });

        Schema::table('clients', function (Blueprint $table) {
            $table->dropColumn('journey_mode');
        });
    }
};

