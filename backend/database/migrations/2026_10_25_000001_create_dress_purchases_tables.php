<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Dress purchases (a normal purchase, or our share of a dress bought together with a bride) and their
 * payment schedule. A paid installment writes a "dress_purchase" expense; prior_paid is money paid before
 * the purchase was recorded here, so it has no expense of its own.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('dress_purchases', function (Blueprint $table) {
            $table->id();
            $table->foreignId('dress_id')->unique()->constrained()->cascadeOnDelete();
            $table->foreignId('supplier_id')->nullable()->constrained()->nullOnDelete();
            $table->string('type', 20)->default('purchase'); // purchase | shared
            $table->string('partner_name')->nullable();
            $table->decimal('dress_total_price', 12, 2)->nullable();
            $table->decimal('amount', 12, 2);
            $table->decimal('prior_paid', 12, 2)->default(0);
            $table->date('purchase_date');
            $table->string('receipt_path')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('dress_purchase_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('dress_purchase_id')->constrained()->cascadeOnDelete();
            $table->decimal('amount', 12, 2);
            $table->date('due_date');
            $table->date('paid_date')->nullable();
            $table->string('payment_method', 50)->nullable();
            $table->string('receipt_path')->nullable();
            $table->foreignId('expense_id')->nullable()->constrained()->nullOnDelete();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->index(['paid_date', 'due_date']);
        });

        // Piece pay builds the dress (its cost is the order's worker fee), so it gets its own category
        DB::table('expenses')->where('category', 'manufacturing_wages')
            ->whereIn('id', DB::table('worker_payments')->where('type', 'piece')->whereNotNull('expense_id')->select('expense_id'))
            ->update(['category' => 'manufacturing_piece']);
    }

    public function down(): void
    {
        DB::table('expenses')->where('category', 'manufacturing_piece')->update(['category' => 'manufacturing_wages']);
        Schema::dropIfExists('dress_purchase_payments');
        Schema::dropIfExists('dress_purchases');
    }
};
