<?php

namespace Tests\Feature;

use App\Models\Employee;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SalaryExpenseTest extends TestCase
{
    use DatabaseTransactions;

    public function test_past_salary_is_recorded_as_expense_for_the_employee()
    {
        Sanctum::actingAs(User::create(['name' => 'Boss', 'email' => 'zz-boss@test.local', 'password' => 'secret123', 'role' => 'admin']));
        $emp = Employee::create(['name' => 'Staff', 'email' => 'zz-staff@test.local', 'password' => 'staff123']);

        $this->postJson('/api/expenses', [
            'category' => 'salary',
            'amount' => 4500,
            'date' => '2025-03-31',
            'payment_method' => 'instapay',
            'description' => 'راتب - Staff',
            'receipt_image' => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        ])->assertStatus(422)->assertJsonValidationErrors('employee_id');

        $res = $this->postJson('/api/expenses', [
            'category' => 'salary',
            'employee_id' => $emp->id,
            'amount' => 4500,
            'date' => '2025-03-31',
            'payment_method' => 'instapay',
            'description' => 'راتب - Staff',
        ])->assertCreated();

        $res->assertJsonPath('employee_id', $emp->id)
            ->assertJsonPath('category', 'salary')
            ->assertJsonPath('date', '2025-03-31')
            ->assertJsonPath('payment_method', 'instapay');
    }
}
