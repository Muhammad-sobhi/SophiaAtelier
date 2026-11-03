<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('offers', function (Blueprint $table) {
            // Shown on the website from this day (before starts_at), so brides can book visits on the offer days
            $table->date('visible_from')->nullable()->after('ends_at');
            // Weddings the offer is for; with wedding_until set, a visit on the offer days may be more than
            // 4 months before such a wedding
            $table->date('wedding_from')->nullable()->after('visible_from');
            $table->date('wedding_until')->nullable()->after('wedding_from');
            // Conditions shown on the website, one per line
            $table->text('terms')->nullable()->after('banner_text_ar');
            $table->text('terms_ar')->nullable()->after('terms');
        });
    }

    public function down(): void
    {
        Schema::table('offers', function (Blueprint $table) {
            $table->dropColumn(['visible_from', 'wedding_from', 'wedding_until', 'terms', 'terms_ar']);
        });
    }
};
