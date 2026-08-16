<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('revenues', function (Blueprint $table) {
            $table->string('type', 50)->default('other')->change();
        });

        Schema::table('expenses', function (Blueprint $table) {
            $table->string('category', 50)->default('other')->change();
        });
    }

    public function down(): void
    {
        Schema::table('revenues', function (Blueprint $table) {
            $table->string('type', 50)->default('other')->change();
        });

        Schema::table('expenses', function (Blueprint $table) {
            $table->string('category', 50)->default('other')->change();
        });
    }
};
