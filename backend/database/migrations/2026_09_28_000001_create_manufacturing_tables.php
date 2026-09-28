<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Manufacturing department: suppliers, materials stock, material purchases, stock movements,
 * workshop workers (monthly and/or per-piece pay) and manufacturing orders.
 * Money that leaves the shop (supplier payments, cash material purchases, worker pay) is written
 * as an expenses row and linked here through expense_id, so the finance page shows it.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('suppliers', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('phone', 50)->nullable();
            $table->string('address')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('materials', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('category', 50)->default('other');
            $table->string('unit', 30)->default('meter');
            $table->string('color', 100)->nullable();
            $table->decimal('quantity', 12, 2)->default(0);
            $table->decimal('min_quantity', 12, 2)->default(0);
            $table->decimal('avg_cost', 12, 2)->default(0);
            $table->foreignId('supplier_id')->nullable()->constrained()->nullOnDelete();
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('workers', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('phone', 50)->nullable();
            $table->string('specialty')->nullable();
            $table->string('pay_type', 20)->default('monthly'); // monthly | per_piece | both
            $table->decimal('monthly_salary', 12, 2)->default(0);
            $table->decimal('piece_rate', 12, 2)->default(0);
            $table->boolean('is_active')->default(true);
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('manufacturing_orders', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->foreignId('worker_id')->nullable()->constrained()->nullOnDelete();
            $table->string('status', 20)->default('planned'); // planned | in_progress | completed | approved | cancelled
            $table->date('start_date')->nullable();
            $table->date('due_date')->nullable();
            $table->date('completed_date')->nullable();
            $table->decimal('worker_fee', 12, 2)->default(0);
            $table->foreignId('dress_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->index('status');
        });

        Schema::create('material_purchases', function (Blueprint $table) {
            $table->id();
            $table->foreignId('supplier_id')->nullable()->constrained()->nullOnDelete();
            $table->date('purchase_date');
            $table->decimal('total_amount', 12, 2)->default(0);
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->index('purchase_date');
        });

        Schema::create('material_purchase_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('material_purchase_id')->constrained()->cascadeOnDelete();
            $table->foreignId('material_id')->constrained()->restrictOnDelete();
            $table->decimal('quantity', 12, 2);
            $table->decimal('unit_price', 12, 2);
            $table->timestamps();
        });

        // Stock ledger: + purchases / returns, - manufacturing and maintenance use
        Schema::create('material_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('material_id')->constrained()->cascadeOnDelete();
            $table->string('type', 20); // purchase | manufacturing | maintenance | adjustment
            $table->decimal('quantity', 12, 2); // signed
            $table->decimal('unit_cost', 12, 2)->default(0);
            $table->date('movement_date');
            $table->foreignId('material_purchase_id')->nullable()->constrained()->cascadeOnDelete();
            $table->foreignId('manufacturing_order_id')->nullable()->constrained()->cascadeOnDelete();
            $table->foreignId('dress_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->index(['material_id', 'movement_date']);
            $table->index('type');
        });

        Schema::create('supplier_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('supplier_id')->constrained()->cascadeOnDelete();
            $table->foreignId('material_purchase_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('expense_id')->nullable()->constrained()->nullOnDelete();
            $table->decimal('amount', 12, 2);
            $table->string('payment_method', 50)->default('cash');
            $table->date('payment_date');
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('worker_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('worker_id')->constrained()->cascadeOnDelete();
            $table->string('type', 20); // salary | piece | advance | bonus
            $table->foreignId('manufacturing_order_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('expense_id')->nullable()->constrained()->nullOnDelete();
            $table->decimal('amount', 12, 2);
            $table->string('payment_method', 50)->default('cash');
            $table->date('payment_date');
            $table->string('period', 7)->nullable(); // salary month YYYY-MM
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->index(['worker_id', 'period']);
        });

        // Cash purchases without a supplier are paid on the spot: link that expense to the purchase
        Schema::table('material_purchases', function (Blueprint $table) {
            $table->foreignId('expense_id')->nullable()->after('supplier_id')->constrained()->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('material_purchases', function (Blueprint $table) {
            $table->dropConstrainedForeignId('expense_id');
        });
        Schema::dropIfExists('worker_payments');
        Schema::dropIfExists('supplier_payments');
        Schema::dropIfExists('material_movements');
        Schema::dropIfExists('material_purchase_items');
        Schema::dropIfExists('material_purchases');
        Schema::dropIfExists('manufacturing_orders');
        Schema::dropIfExists('workers');
        Schema::dropIfExists('materials');
        Schema::dropIfExists('suppliers');
    }
};
