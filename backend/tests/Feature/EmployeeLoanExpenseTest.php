<?php

namespace Tests\Feature;

use App\Models\Employee;
use App\Models\EmployeeLoan;
use App\Models\Expense;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class EmployeeLoanExpenseTest extends TestCase
{
    use DatabaseTransactions;

    private Employee $emp;

    protected function setUp(): void
    {
        parent::setUp();
        Sanctum::actingAs(User::create(['name' => 'Boss', 'email' => 'zz-loan-boss@test.local', 'password' => 'secret123', 'role' => 'admin']));
        $this->emp = Employee::create(['name' => 'Staff', 'email' => 'zz-loan-staff@test.local', 'password' => 'staff123']);
    }

    private function createLoan(): EmployeeLoan
    {
        $id = $this->postJson('/api/employee-loans', [
            'employee_id' => $this->emp->id,
            'amount' => 500,
            'date' => '2026-10-10',
            'reason' => 'ظرف طارئ',
            'payment_method' => 'instapay',
        ])->assertCreated()->json('id');

        return EmployeeLoan::findOrFail($id);
    }

    public function test_loan_creates_linked_expense()
    {
        $loan = $this->createLoan();

        $this->assertNotNull($loan->expense_id);
        $expense = $loan->expense;
        $this->assertSame('loan', $expense->category);
        $this->assertSame(500.0, (float) $expense->amount);
        $this->assertSame('2026-10-10', $expense->date->format('Y-m-d'));
        $this->assertSame('instapay', $expense->payment_method);
        $this->assertSame($this->emp->id, $expense->employee_id);
    }

    public function test_updating_loan_updates_its_expense()
    {
        $loan = $this->createLoan();

        $this->putJson("/api/employee-loans/{$loan->id}", ['amount' => 750, 'date' => '2026-10-12', 'reason' => 'إيجار'])->assertOk();

        $expense = Expense::findOrFail($loan->expense_id);
        $this->assertSame(750.0, (float) $expense->amount);
        $this->assertSame('2026-10-12', $expense->date->format('Y-m-d'));
        $this->assertStringContainsString('إيجار', $expense->description);
    }

    public function test_deleting_loan_deletes_its_expense()
    {
        $loan = $this->createLoan();
        $expenseId = $loan->expense_id;

        $this->deleteJson("/api/employee-loans/{$loan->id}")->assertOk();

        $this->assertDatabaseMissing('employee_loans', ['id' => $loan->id]);
        $this->assertDatabaseMissing('expenses', ['id' => $expenseId]);
    }

    public function test_loan_expense_cannot_be_edited_or_deleted_from_finance()
    {
        $loan = $this->createLoan();

        $this->putJson("/api/expenses/{$loan->expense_id}", ['amount' => 1])->assertStatus(422);
        $this->deleteJson("/api/expenses/{$loan->expense_id}")->assertStatus(422);

        $this->assertSame(500.0, (float) Expense::findOrFail($loan->expense_id)->amount);
    }

    public function test_deleting_unlinked_legacy_loan_still_works()
    {
        $loan = EmployeeLoan::create(['employee_id' => $this->emp->id, 'amount' => 300, 'date' => '2026-09-01', 'status' => 'approved']);
        $other = Expense::create(['category' => 'loan', 'amount' => 300, 'date' => '2026-09-01', 'employee_id' => $this->emp->id]);

        $this->deleteJson("/api/employee-loans/{$loan->id}")->assertOk();

        $this->assertDatabaseHas('expenses', ['id' => $other->id]);
    }
}
