<?php

namespace Tests\Feature;

use App\Models\Employee;
use App\Models\EmployeeSalaryPayment;
use App\Models\Expense;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PayrollReceiptTest extends TestCase
{

    private const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow('2026-10-14');
        Storage::fake('public');
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_loan_expense_keeps_payment_method_and_receipt(): void
    {
        $employee = Employee::create(['name' => 'Loaned', 'daily_rate' => 100]);

        $this->postJson('/api/employee-loans', [
            'employee_id' => $employee->id,
            'amount' => 300,
            'date' => '2026-10-14',
            'payment_method' => 'instapay',
            'receipt_image' => self::PNG,
        ])->assertCreated();

        $expense = Expense::where('employee_id', $employee->id)->where('category', 'loan')->sole();
        $this->assertSame('instapay', $expense->payment_method);
        $this->assertNotNull($expense->receipt_path);
        Storage::disk('public')->assertExists($expense->receipt_path);

        // Without a method the loan is recorded as cash
        $this->postJson('/api/employee-loans', ['employee_id' => $employee->id, 'amount' => 50, 'date' => '2026-10-14'])->assertCreated();
        $this->assertSame('cash', Expense::where('employee_id', $employee->id)->where('amount', 50)->sole()->payment_method);
    }

    public function test_salary_payment_expense_keeps_receipt(): void
    {
        $employee = Employee::create(['name' => 'Paid', 'daily_rate' => 100, 'pay_cycle' => 'monthly']);

        $this->postJson('/api/payroll/payments', [
            'employee_id' => $employee->id,
            'period_start' => '2026-09-01',
            'amount' => 1000,
            'payment_method' => 'vodafone_cash',
            'payment_date' => '2026-10-01',
            'receipt_image' => self::PNG,
        ])->assertCreated();

        $expense = Expense::findOrFail(EmployeeSalaryPayment::where('employee_id', $employee->id)->sole()->expense_id);
        $this->assertSame('vodafone_cash', $expense->payment_method);
        Storage::disk('public')->assertExists($expense->receipt_path);
    }
}
