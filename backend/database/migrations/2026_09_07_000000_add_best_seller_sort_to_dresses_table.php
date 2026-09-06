<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('dresses', function (Blueprint $table) {
            $table->boolean('is_best_seller')->default(false)->after('is_website_visible');
            $table->unsignedSmallInteger('best_seller_sort')->nullable()->after('is_best_seller');
            $table->index('best_seller_sort');
        });
    }

    public function down(): void
    {
        Schema::table('dresses', function (Blueprint $table) {
            $table->dropIndex(['best_seller_sort']);
            $table->dropColumn(['is_best_seller', 'best_seller_sort']);
        });
    }
};
