<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** Website request from a phone number that already had a visit: link to her latest previous visit */
    public function up(): void
    {
        Schema::table('visits', function (Blueprint $table) {
            $table->foreignId('previous_visit_id')->nullable()->after('source')->constrained('visits')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('visits', function (Blueprint $table) {
            $table->dropConstrainedForeignId('previous_visit_id');
        });
    }
};
