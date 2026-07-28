<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->foreignId('dress_2_id')->nullable()->after('dress_id')->constrained('dresses')->nullOnDelete();
            $table->foreignId('dress_3_id')->nullable()->after('dress_2_id')->constrained('dresses')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->dropForeign(['dress_2_id']);
            $table->dropColumn('dress_2_id');
            $table->dropForeign(['dress_3_id']);
            $table->dropColumn('dress_3_id');
        });
    }
};
