<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fittings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('booking_id')->constrained()->cascadeOnDelete();
            $table->date('fitting_date');
            $table->text('measurements')->nullable();
            $table->string('sales_associate')->nullable();
            $table->text('alterations_notes')->nullable();
            $table->enum('status', ['scheduled', 'completed', 'rescheduled'])->default('scheduled');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fittings');
    }
};
