<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->string('password')->nullable();
            $table->text('address')->nullable();
            $table->string('id_number')->nullable();
            $table->longText('id_image')->nullable();
            $table->json('permissions')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->dropColumn(['password', 'address', 'id_number', 'id_image', 'permissions']);
        });
    }
};
