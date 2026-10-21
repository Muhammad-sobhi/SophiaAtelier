<?php

namespace Tests\Feature;

use App\Models\User;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class FabricsExpenseTest extends TestCase
{

    public function test_fabrics_expense_costs_quantity_times_unit_price_and_counts_as_expense()
    {
        Sanctum::actingAs(User::create(['name' => 'Boss', 'email' => 'zz-boss@test.local', 'password' => 'secret123', 'role' => 'admin']));
        $before = $this->getJson('/api/finance/summary?start_date=2025-04-01&end_date=2025-04-30')->json('net_expense');

        $this->postJson('/api/expenses', ['category' => 'fabrics', 'date' => '2025-04-10'])
            ->assertStatus(422)->assertJsonValidationErrors(['material_name', 'quantity', 'unit_price']);

        $res = $this->postJson('/api/expenses', [
            'category' => 'fabrics',
            'material_name' => 'تول فرنساوي',
            'quantity' => 12.5,
            'unit_price' => 80,
            'amount' => null, // the total comes from quantity × unit price
            'date' => '2025-04-10',
            'payment_method' => 'cash',
            'description' => 'تول فرنساوي',
        ])->assertCreated()
            ->assertJsonPath('amount', '1000.00')
            ->assertJsonPath('material_name', 'تول فرنساوي')
            ->assertJsonPath('quantity', '12.50')
            ->assertJsonPath('unit_price', '80.00');

        $this->assertEquals($before + 1000, $this->getJson('/api/finance/summary?start_date=2025-04-01&end_date=2025-04-30')->json('net_expense'));

        $rows = $this->getJson('/api/finance/transactions?tab=fabrics&start_date=2025-04-10&end_date=2025-04-10')->json('data');
        $this->assertContains($res->json('id'), array_column($rows, 'id'));

        // Moving it to another category drops the material details
        $this->putJson('/api/expenses/' . $res->json('id'), ['category' => 'other', 'amount' => 300, 'date' => '2025-04-10'])
            ->assertOk()
            ->assertJsonPath('amount', '300.00')
            ->assertJsonPath('material_name', null);
    }
}
