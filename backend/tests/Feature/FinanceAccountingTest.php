<?php

namespace Tests\Feature;

use App\Models\Dress;
use App\Models\DressPurchase;
use App\Models\Employee;
use App\Models\Expense;
use App\Models\ManufacturingOrder;
use App\Models\Material;
use App\Models\Notification;
use App\Models\Supplier;
use App\Models\User;
use App\Models\Worker;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class FinanceAccountingTest extends TestCase
{
    private const RANGE = 'start_date=2026-05-01&end_date=2026-05-31';

    protected function setUp(): void
    {
        parent::setUp();
        Sanctum::actingAs(User::create(['name' => 'Boss', 'email' => 'boss@test.local', 'password' => 'secret123', 'role' => 'admin']));
    }

    private function summary(string $range = self::RANGE): array
    {
        return $this->getJson('/api/finance/summary?' . $range)->assertOk()->json();
    }

    private function purchasePayload(Dress $dress, array $overrides = []): array
    {
        return array_merge([
            'dress_id' => $dress->id,
            'type' => 'purchase',
            'amount' => 30000,
            'purchase_date' => '2026-05-03',
            'payments' => [
                ['amount' => 10000, 'due_date' => '2026-05-03', 'paid' => true, 'paid_date' => '2026-05-03', 'payment_method' => 'cash'],
                ['amount' => 20000, 'due_date' => '2026-06-15', 'paid' => false],
            ],
        ], $overrides);
    }

    public function test_dress_purchase_is_cash_out_and_asset_but_not_operating_expense()
    {
        $dress = Dress::factory()->create(['purchase_price' => 0]);
        $supplier = Supplier::create(['name' => 'مورد الفساتين']);

        $res = $this->postJson('/api/dress-purchases', $this->purchasePayload($dress, ['supplier_id' => $supplier->id]))
            ->assertCreated()
            ->assertJsonPath('paid_total', 10000)
            ->assertJsonPath('remaining', 20000)
            ->assertJsonPath('payment_status', 'partial')
            ->assertJsonPath('next_due_date', '2026-06-15');

        // Only the paid installment left the cash box
        $expenses = Expense::where('category', 'dress_purchase')->get();
        $this->assertCount(1, $expenses);
        $this->assertSame('10000.00', $expenses[0]->amount);
        $this->assertSame('2026-05-03', $expenses[0]->date->toDateString());
        $this->assertStringContainsString('دفعة جزئية', $expenses[0]->description);
        $this->assertStringContainsString('مورد الفساتين', $expenses[0]->description);

        // The dress cost follows the purchase
        $this->assertSame('30000.00', $dress->fresh()->purchase_price);

        $s = $this->summary();
        $this->assertEquals(0, $s['net_expense']);
        $this->assertEquals(0, $s['net_profit']);
        $this->assertEquals(10000, $s['capital_spending']);
        $this->assertEquals(10000, $s['capital_breakdown']['dresses']);
        $this->assertEquals(-10000, $s['net_cash_flow']);
        $this->assertEquals(30000, $s['assets']['dresses']);
        $this->assertEquals(20000, $s['payables']['dress_purchases']);

        // Paying the second installment later
        $second = collect($res->json('payments'))->firstWhere('paid_date', null);
        $this->postJson("/api/dress-purchase-payments/{$second['id']}/pay", ['paid_date' => '2026-06-15', 'payment_method' => 'instapay'])
            ->assertOk()->assertJsonPath('remaining', 0)->assertJsonPath('payment_status', 'paid');
        $this->assertEquals(0, $this->summary('')['payables']['dress_purchases']);
        $this->assertEquals(20000, $this->summary('start_date=2026-06-01&end_date=2026-06-30')['capital_breakdown']['dresses']);

        // Its expense can only be changed from the purchase; undoing the payment removes it
        $expenseId = Expense::where('category', 'dress_purchase')->where('payment_method', 'instapay')->value('id');
        $this->putJson("/api/expenses/{$expenseId}", ['amount' => 1, 'date' => '2026-06-15'])->assertStatus(422);
        $this->deleteJson("/api/expenses/{$expenseId}")->assertStatus(422);
        $this->deleteJson("/api/dress-purchase-payments/{$second['id']}/pay")->assertOk()->assertJsonPath('remaining', 20000);
        $this->assertNull(Expense::find($expenseId));
    }

    public function test_payments_must_cover_the_amount_exactly()
    {
        $dress = Dress::factory()->create();

        $this->postJson('/api/dress-purchases', $this->purchasePayload($dress, ['amount' => 31000]))
            ->assertStatus(422)->assertJsonValidationErrors('payments');
        $this->postJson('/api/dress-purchases', $this->purchasePayload($dress, ['amount' => 29000]))
            ->assertStatus(422)->assertJsonValidationErrors('payments');
        // A paid installment needs its date and payment method
        $this->postJson('/api/dress-purchases', $this->purchasePayload($dress, ['payments' => [
            ['amount' => 30000, 'due_date' => '2026-05-03', 'paid' => true],
        ]]))->assertStatus(422)->assertJsonValidationErrors(['payments.0.paid_date', 'payments.0.payment_method']);

        $this->assertSame(0, DressPurchase::count());
        $this->assertSame(0, Expense::count());
    }

    public function test_shared_dress_records_only_our_share()
    {
        $dress = Dress::factory()->create();
        $payload = $this->purchasePayload($dress, [
            'type' => 'shared',
            'amount' => 15000,
            'payments' => [['amount' => 15000, 'due_date' => '2026-05-10', 'paid' => true, 'paid_date' => '2026-05-10', 'payment_method' => 'cash']],
        ]);

        $this->postJson('/api/dress-purchases', $payload)->assertStatus(422)->assertJsonValidationErrors(['partner_name', 'dress_total_price']);
        $this->postJson('/api/dress-purchases', $payload + ['partner_name' => 'سارة', 'dress_total_price' => 10000])
            ->assertStatus(422)->assertJsonValidationErrors('dress_total_price');

        $this->postJson('/api/dress-purchases', $payload + ['partner_name' => 'سارة', 'dress_total_price' => 40000])
            ->assertCreated()->assertJsonPath('partner_name', 'سارة')->assertJsonPath('dress_total_price', '40000.00');

        $this->assertSame('15000.00', $dress->fresh()->purchase_price);
        $this->assertStringContainsString('سارة', Expense::where('category', 'dress_purchase')->value('description'));
        $s = $this->summary();
        $this->assertEquals(15000, $s['assets']['dresses']);
        $this->assertEquals(15000, $s['capital_spending']);
        $this->assertEquals(0, $s['net_expense']);
    }

    public function test_editing_a_purchase_keeps_one_expense_per_paid_installment()
    {
        $dress = Dress::factory()->create();
        $res = $this->postJson('/api/dress-purchases', $this->purchasePayload($dress))->assertCreated();
        [$first, $second] = $res->json('payments');

        // Mark the second paid and change the first amount (total changes too)
        $this->putJson('/api/dress-purchases/' . $res->json('id'), $this->purchasePayload($dress, [
            'amount' => 32000,
            'payments' => [
                ['id' => $first['id'], 'amount' => 12000, 'due_date' => '2026-05-03', 'paid' => true, 'paid_date' => '2026-05-03', 'payment_method' => 'cash'],
                ['id' => $second['id'], 'amount' => 20000, 'due_date' => '2026-06-15', 'paid' => true, 'paid_date' => '2026-05-20', 'payment_method' => 'cash'],
            ],
        ]))->assertOk()->assertJsonPath('remaining', 0);

        $this->assertEquals([12000, 20000], Expense::where('category', 'dress_purchase')->orderBy('amount')->pluck('amount')->map(fn ($a) => (float) $a)->all());
        $this->assertSame('32000.00', $dress->fresh()->purchase_price);

        // Dropping an installment removes it with its expense; deleting the purchase removes the rest
        $this->putJson('/api/dress-purchases/' . $res->json('id'), $this->purchasePayload($dress, [
            'amount' => 12000,
            'payments' => [['id' => $first['id'], 'amount' => 12000, 'due_date' => '2026-05-03', 'paid' => true, 'paid_date' => '2026-05-03', 'payment_method' => 'cash']],
        ]))->assertOk();
        $this->assertSame(1, Expense::where('category', 'dress_purchase')->count());

        $this->deleteJson('/api/dress-purchases/' . $res->json('id'))->assertOk();
        $this->assertSame(0, Expense::where('category', 'dress_purchase')->count());
        $this->assertSame(0, \App\Models\DressPurchasePayment::count());
    }

    public function test_a_dress_cost_is_locked_to_its_purchase()
    {
        $dress = Dress::factory()->create();
        $this->postJson('/api/dress-purchases', $this->purchasePayload($dress))->assertCreated();
        $this->postJson('/api/dress-purchases', $this->purchasePayload($dress))->assertStatus(422)->assertJsonValidationErrors('dress_id');

        $this->putJson("/api/dresses/{$dress->id}", ['purchase_price' => 1, 'purchase_date' => '2020-01-01'])->assertOk();
        $this->assertSame('30000.00', $dress->fresh()->purchase_price);
        $this->assertSame('2026-05-03', $dress->fresh()->purchase_date->toDateString());
    }

    public function test_old_dresses_are_completed_without_counting_old_money_again()
    {
        $paid = Dress::factory()->create(['purchase_price' => 8000, 'purchase_date' => '2025-01-10']);
        $owed = Dress::factory()->create(['purchase_price' => 9000, 'purchase_date' => '2025-02-10']);
        $made = Dress::factory()->create(['purchase_price' => 5000]);
        ManufacturingOrder::create(['title' => 'قطعة', 'status' => 'approved', 'dress_id' => $made->id]);

        $pending = $this->getJson('/api/dress-purchases/pending-dresses')->assertOk();
        $this->assertEqualsCanonicalizing([$paid->id, $owed->id], array_column($pending->json('data'), 'id'));
        $this->assertSame(2, $pending->json('pending_count'));
        $this->assertEquals(17000, $pending->json('pending_cost'));

        $this->postJson('/api/dress-purchases', [
            'dress_id' => $paid->id, 'type' => 'purchase', 'amount' => 100, 'prior_paid' => 200, 'purchase_date' => '2025-01-01', 'payments' => [],
        ])->assertStatus(422)->assertJsonValidationErrors('prior_paid');

        // Paid in full before: no new expense
        $this->postJson('/api/dress-purchases', [
            'dress_id' => $paid->id, 'type' => 'purchase', 'amount' => 8000, 'prior_paid' => 8000,
            'purchase_date' => '2025-01-10', 'payments' => [],
        ])->assertCreated()->assertJsonPath('payment_status', 'paid');

        // Still owed: what was paid before + the rest scheduled
        $this->postJson('/api/dress-purchases', [
            'dress_id' => $owed->id, 'type' => 'purchase', 'amount' => 9000, 'prior_paid' => 4000,
            'purchase_date' => '2025-02-10', 'payments' => [['amount' => 5000, 'due_date' => '2026-07-01', 'paid' => false]],
        ])->assertCreated()->assertJsonPath('remaining', 5000);

        $this->assertSame(0, Expense::count());
        $this->assertSame(0, $this->getJson('/api/dress-purchases/pending-dresses')->json('pending_count'));
        $s = $this->summary('');
        $this->assertEquals(0, $s['cash_out']);
        $this->assertEquals(5000, $s['payables']['dress_purchases']);
        $this->assertEquals(8000 + 9000 + 5000, $s['assets']['dresses']);
    }

    public function test_operating_and_unclassified_expenses()
    {
        // New operating entries use "operational"; a new unclassified "purchase" is refused
        $this->postJson('/api/expenses', ['category' => 'operational', 'amount' => 700, 'date' => '2026-05-05'])->assertCreated();
        $this->postJson('/api/expenses', ['category' => 'purchase', 'amount' => 700, 'date' => '2026-05-05'])->assertStatus(422);
        $this->postJson('/api/expenses', ['category' => 'dress_purchase', 'amount' => 700, 'date' => '2026-05-05'])->assertStatus(422);

        $old = Expense::create(['category' => 'purchase', 'amount' => 2500, 'date' => '2026-05-06']);
        $old2 = Expense::create(['category' => 'purchase', 'amount' => 900, 'date' => '2026-05-07']);

        $s = $this->summary();
        $this->assertEquals(700, $s['net_expense']);
        $this->assertEquals(['count' => 1 + 1, 'total' => 3400], $s['unclassified_purchases']);
        $this->assertEquals(-4100, $s['net_cash_flow']);

        // The admin classifies them
        $this->putJson("/api/expenses/{$old->id}", ['category' => 'dress_purchase', 'amount' => 2500, 'date' => '2026-05-06'])->assertOk();
        $this->putJson("/api/expenses/{$old2->id}", ['category' => 'operational', 'amount' => 900, 'date' => '2026-05-07'])->assertOk();

        $s = $this->summary();
        $this->assertEquals(1600, $s['net_expense']);
        $this->assertEquals(2500, $s['capital_breakdown']['dresses']);
        $this->assertEquals(['count' => 0, 'total' => 0], $s['unclassified_purchases']);

        // A classified entry cannot go back to "purchase", and a normal one cannot become a dress purchase
        $this->putJson("/api/expenses/{$old2->id}", ['category' => 'purchase', 'amount' => 900, 'date' => '2026-05-07'])->assertStatus(422);

        $rows = $this->getJson('/api/finance/transactions?class=operating&' . self::RANGE)->assertOk()->json('data');
        $this->assertEquals([900, 700], array_map(fn ($r) => (float) $r['amount'], $rows));
        $this->assertSame(['operating', 'operating'], array_column($rows, 'finance_class'));
        $this->assertSame(['operational', 'operational'], array_column($rows, 'tab'));
    }

    public function test_insurance_and_transfers_are_not_income_but_move_cash()
    {
        $this->postJson('/api/revenues', ['type' => 'deposit', 'amount' => 5000, 'payment_method' => 'cash', 'payment_date' => '2026-05-02'])->assertCreated();
        $this->postJson('/api/revenues', ['type' => 'insurance', 'amount' => 3000, 'payment_method' => 'cash', 'payment_date' => '2026-05-02'])->assertCreated();
        $this->postJson('/api/finance/transfer', ['from_method' => 'cash', 'to_method' => 'instapay', 'amount' => 1000, 'date' => '2026-05-03'])->assertCreated();
        $this->postJson('/api/finance/withdraw', ['payment_method' => 'cash', 'amount' => 400, 'date' => '2026-05-04'])->assertCreated();

        $s = $this->summary();
        $this->assertEquals(5000, $s['net_revenue']);
        $this->assertEquals(0, $s['net_expense']);
        $this->assertEquals(5000, $s['net_profit']);
        $this->assertEquals(3000, $s['held_insurances']);
        $this->assertEquals(5000 + 3000 - 400, $s['net_cash_flow']);
    }

    public function test_manufacturing_money_is_capital_and_stock_used_for_upkeep_is_operating()
    {
        $material = Material::create(['name' => 'تول', 'category' => 'fabric', 'unit' => 'meter']);
        $supplier = Supplier::create(['name' => 'مورد خامات']);

        // Cash invoice: 10 m × 100
        $this->postJson('/api/material-purchases', [
            'purchase_date' => '2026-05-01', 'payment_method' => 'cash',
            'items' => [['material_id' => $material->id, 'quantity' => 10, 'unit_price' => 100]],
        ])->assertCreated();
        // Credit invoice: 10 m × 200, 500 paid now → owe 1500; average cost becomes 150
        $this->postJson('/api/material-purchases', [
            'supplier_id' => $supplier->id, 'purchase_date' => '2026-05-02', 'payment_method' => 'cash', 'paid_amount' => 500,
            'items' => [['material_id' => $material->id, 'quantity' => 10, 'unit_price' => 200]],
        ])->assertCreated();

        $s = $this->summary();
        $this->assertEquals(0, $s['net_expense']);
        $this->assertEquals(1500, $s['capital_breakdown']['materials']);
        $this->assertEquals(3000, $s['assets']['materials_stock']);
        $this->assertEquals(1500, $s['payables']['suppliers']);

        // 2 m used to repair a dress: an operating cost of 2 × 150, the stock drops by the same value
        $dress = Dress::factory()->create(['purchase_price' => 0]);
        $this->postJson('/api/materials/maintenance-use', [
            'dress_id' => $dress->id, 'movement_date' => '2026-05-05',
            'items' => [['material_id' => $material->id, 'quantity' => 2]],
        ])->assertCreated();

        // A workshop piece uses 4 m and earns its worker 800
        $worker = Worker::create(['name' => 'أم محمد', 'pay_type' => 'per_piece']);
        $order = ManufacturingOrder::create(['title' => 'فستان سواريه', 'worker_id' => $worker->id, 'status' => 'in_progress', 'worker_fee' => 800]);
        $this->postJson("/api/manufacturing-orders/{$order->id}/materials", [
            'movement_date' => '2026-05-06', 'items' => [['material_id' => $material->id, 'quantity' => 4]],
        ])->assertSuccessful();

        // Piece pay builds the dress; a monthly salary runs the workshop
        $this->postJson("/api/workers/{$worker->id}/payments", ['type' => 'piece', 'amount' => 300, 'payment_method' => 'cash', 'payment_date' => '2026-05-07', 'manufacturing_order_id' => $order->id])->assertCreated();
        $this->postJson("/api/workers/{$worker->id}/payments", ['type' => 'salary', 'amount' => 2000, 'payment_method' => 'cash', 'payment_date' => '2026-05-08'])->assertCreated();

        $s = $this->summary();
        $this->assertEquals(2000 + 300, $s['net_expense']);
        $this->assertEquals(300, $s['operating_expense_breakdown']['stock_maintenance']);
        $this->assertEquals(300, $s['capital_breakdown']['manufacturing_piece']);
        $this->assertEquals(3000 - 300 - 600, $s['assets']['materials_stock']);
        $this->assertEquals(600, $s['assets']['work_in_progress']); // materials only until the piece is finished
        $this->assertEquals(0, $s['payables']['workers']);

        // Finished: the fee is earned (500 still owed) and joins the piece's value
        $order->update(['status' => 'completed']);
        $s = $this->summary();
        $this->assertEquals(600 + 800, $s['assets']['work_in_progress']);
        $this->assertEquals(500, $s['payables']['workers']);

        // Cancelled instead: its materials are a loss, nothing stays in the workshop
        $order->update(['status' => 'cancelled']);
        $s = $this->summary();
        $this->assertEquals(600, $s['operating_expense_breakdown']['stock_cancelled_orders']);
        $this->assertEquals(0, $s['assets']['work_in_progress']);
    }

    public function test_due_payments_raise_reminders_for_finance_staff_only()
    {
        Carbon::setTestNow('2026-06-10 09:00:00');
        $dress = Dress::factory()->create();
        $this->postJson('/api/dress-purchases', $this->purchasePayload($dress, [
            'amount' => 3000,
            'payments' => [
                ['amount' => 1000, 'due_date' => '2026-06-05', 'paid' => false],
                ['amount' => 1000, 'due_date' => '2026-06-10', 'paid' => false],
                ['amount' => 1000, 'due_date' => '2026-06-11', 'paid' => false],
            ],
        ]))->assertCreated();

        $this->artisan('dress-payments:remind')->assertSuccessful();
        $this->artisan('dress-payments:remind')->assertSuccessful();
        $types = Notification::orderBy('type')->pluck('type')->all();
        $this->assertSame(['dress_payment_due', 'dress_payment_due_soon', 'dress_payment_overdue'], $types);

        $due = $this->getJson('/api/dress-purchases/due-payments?days=1')->assertOk();
        $this->assertEquals(3000, $due->json('total'));
        $this->assertEquals(1000, $due->json('overdue_total'));

        // Overdue repeats the next day; due-today / due-soon do not repeat
        Carbon::setTestNow('2026-06-11 09:00:00');
        $this->artisan('dress-payments:remind')->assertSuccessful();
        // the 5th again + the 10th, now overdue
        $this->assertSame(3, Notification::withTrashed()->where('type', 'dress_payment_overdue')->count());

        $finance = $this->getJson('/api/notifications?per_page=50')->assertOk()->json('data');
        $this->assertNotEmpty(array_filter($finance, fn ($n) => str_starts_with($n['type'], 'dress_payment_')));

        // An employee without the finance page does not see them
        Employee::create(['name' => 'Staff', 'email' => 'staff@test.local', 'permissions' => ['/dashboard/dresses']]);
        Sanctum::actingAs(User::create(['name' => 'Staff', 'email' => 'staff@test.local', 'password' => 'secret123', 'role' => 'staff']));
        $staff = $this->getJson('/api/notifications?per_page=50')->assertOk()->json('data');
        $this->assertEmpty(array_filter($staff, fn ($n) => str_starts_with($n['type'], 'dress_payment_')));
        $this->getJson('/api/notifications/' . Notification::where('type', 'dress_payment_due')->value('id'))->assertNotFound();
        $this->getJson('/api/dress-purchases')->assertForbidden();
        Carbon::setTestNow();
    }

    public function test_reminder_days_follow_cairo_time()
    {
        // 22:30 UTC on 10 June is already 11 June in Cairo
        Carbon::setTestNow('2026-06-10 22:30:00');
        $dress = Dress::factory()->create();
        $this->postJson('/api/dress-purchases', $this->purchasePayload($dress, [
            'amount' => 2000,
            'payments' => [
                ['amount' => 1000, 'due_date' => '2026-06-11', 'paid' => false],
                ['amount' => 1000, 'due_date' => '2026-06-10', 'paid' => false],
            ],
        ]))->assertCreated();

        $this->artisan('dress-payments:remind')->assertSuccessful();
        $this->assertSame(['dress_payment_due', 'dress_payment_overdue'], Notification::orderBy('type')->pluck('type')->all());

        $due = $this->getJson('/api/dress-purchases/due-payments?days=0')->assertOk();
        $this->assertEquals(2000, $due->json('total'));
        $this->assertEquals(1000, $due->json('overdue_total'));

        // A new Cairo day: the overdue one is reminded again
        Carbon::setTestNow('2026-06-11 21:30:00');
        $this->artisan('dress-payments:remind')->assertSuccessful();
        $this->assertSame(3, Notification::withTrashed()->where('type', 'dress_payment_overdue')->count());
        Carbon::setTestNow();
    }
}
