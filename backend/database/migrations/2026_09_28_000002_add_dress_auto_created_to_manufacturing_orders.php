<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('manufacturing_orders', function (Blueprint $table) {
            // The linked dress was created by the approval (removed again if the approval is cancelled)
            $table->boolean('dress_auto_created')->default(false)->after('dress_id');
        });
    }

    public function down(): void
    {
        Schema::table('manufacturing_orders', function (Blueprint $table) {
            $table->dropColumn('dress_auto_created');
        });
    }
};
