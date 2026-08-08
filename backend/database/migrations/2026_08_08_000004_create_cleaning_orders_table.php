<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cleaning_orders', function (Blueprint $table) {
            $table->id();
            $table->text('description'); // what was cleaned / which dresses
            $table->decimal('cost', 10, 2)->default(0);
            $table->decimal('paid_amount', 10, 2)->default(0);
            $table->enum('payment_status', ['unpaid', 'partial', 'paid'])->default('unpaid');
            $table->date('date');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('date');
            $table->index('payment_status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cleaning_orders');
    }
};
