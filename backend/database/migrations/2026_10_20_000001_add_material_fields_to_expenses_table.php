<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // "fabrics" expenses (خامات وأقمشة) record what was bought: amount = quantity × unit_price
        Schema::table('expenses', function (Blueprint $table) {
            $table->string('material_name')->nullable()->after('description');
            $table->decimal('quantity', 10, 2)->nullable()->after('material_name');
            $table->decimal('unit_price', 10, 2)->nullable()->after('quantity');
        });
    }

    public function down(): void
    {
        Schema::table('expenses', function (Blueprint $table) {
            $table->dropColumn(['material_name', 'quantity', 'unit_price']);
        });
    }
};
