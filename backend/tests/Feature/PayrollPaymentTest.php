<?php

namespace Tests\Feature;

use App\Models\Attendance;
use App\Models\Employee;
use App\Models\EmployeeLoan;
use App\Models\EmployeeSalaryPayment;
use App\Models\Expense;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PayrollPaymentTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow('2026-10-03');
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    private function rows(int $month, Employee $employee): array
    {
        $rows = $this->getJson("/api/payroll/summary?month={$month}&year=2026")->assertOk()->json();

        return array_values(array_filter($rows, fn ($r) => $r['employee_id'] === $employee->id));
    }

    private function pay(Employee $employee, string $periodStart, float $amount)
    {
        return $this->postJson('/api/payroll/payments', [
            'employee_id' => $employee->id,
            'period_start' => $periodStart,
            'amount' => $amount,
            'payment_method' => 'cash',
            'payment_date' => '2026-10-01',
        ]);
    }

    public function test_monthly_salary_is_daily_rate_times_30_and_payments_reach_finance(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
        $employee = Employee::create(['name' => 'Monthly', 'daily_rate' => 100, 'pay_cycle' => 'monthly']);
        EmployeeLoan::create(['employee_id' => $employee->id, 'amount' => 500, 'date' => '2026-08-05', 'status' => 'approved']);

        // August has 31 days, the month is still worth 30 days
        $rows = $this->rows(8, $employee);
        $this->assertCount(1, $rows);
        $this->assertSame(3000, (int) $rows[0]['cycle_salary']);
        $this->assertSame(2500, (int) $rows[0]['net_salary']);
        $this->assertSame('2026-08', $rows[0]['period_key']);

        $this->pay($employee, '2026-08-01', 1000)->assertCreated()->assertJsonPath('payment_status', 'partial')->assertJsonPath('remaining_amount', 1500);

        // Loan is now deducted but still counted in this period, so the net does not jump up
        $this->assertTrue(EmployeeLoan::where('employee_id', $employee->id)->first()->deducted_from_salary);
        $this->assertSame(2500, (int) $this->rows(8, $employee)[0]['net_salary']);

        $this->pay($employee, '2026-08-01', 2000)->assertStatus(422); // more than remaining
        $this->pay($employee, '2026-08-01', 1500)->assertCreated()->assertJsonPath('payment_status', 'paid');

        $this->assertSame(2, Expense::where('employee_id', $employee->id)->where('category', 'salary')->count());
        $operational = $this->getJson('/api/finance/transactions?tab=operational&per_page=100')->assertOk()->json('data');
        $this->assertNotEmpty(collect($operational)->where('kind', 'expense')->where('employee_id', $employee->id));

        // Salary expenses are managed from payroll, not edited in finance
        $expense = Expense::where('employee_id', $employee->id)->where('category', 'salary')->first();
        $this->deleteJson("/api/expenses/{$expense->id}")->assertStatus(422);

        // Undo both payments: expenses removed, loan pending again
        foreach (EmployeeSalaryPayment::where('employee_id', $employee->id)->get() as $payment) {
            $this->deleteJson("/api/payroll/payments/{$payment->id}")->assertOk();
        }
        $this->assertSame(0, Expense::where('employee_id', $employee->id)->where('category', 'salary')->count());
        $this->assertFalse(EmployeeLoan::where('employee_id', $employee->id)->first()->deducted_from_salary);
        $this->assertSame('unpaid', $this->rows(8, $employee)[0]['payment_status']);
    }

    public function test_weekly_employee_is_paid_per_saturday_to_friday_week(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
        $employee = Employee::create(['name' => 'Weekly', 'daily_rate' => 200, 'pay_cycle' => 'weekly']);
        Attendance::create(['employee_id' => $employee->id, 'date' => '2026-09-07', 'status' => 'absent']);

        // Weeks ending in September 2026 (the week of Sep 26 ends in October)
        $rows = $this->rows(9, $employee);
        $this->assertSame(
            ['2026-08-29', '2026-09-05', '2026-09-12', '2026-09-19'],
            array_column($rows, 'period_start')
        );
        $this->assertSame('2026-09-04', $rows[0]['period_end']);
        $this->assertSame(1400, (int) $rows[0]['cycle_salary']);
        $this->assertSame(1200, (int) $rows[1]['net_salary']); // one absent day

        // Only the period's own start date is accepted
        $this->pay($employee, '2026-09-06', 100)->assertStatus(422);
        $this->pay($employee, '2026-09-05', 1200)->assertCreated()->assertJsonPath('payment_status', 'paid');
        $this->assertSame('unpaid', $this->rows(9, $employee)[2]['payment_status']);
    }

    public function test_custom_cycle_counts_blocks_of_days_from_the_hire_date(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
        $employee = Employee::create(['name' => 'Custom', 'daily_rate' => 150, 'pay_cycle' => 'custom', 'pay_cycle_days' => 3, 'hire_date' => '2026-09-01']);

        $rows = $this->rows(9, $employee);
        $this->assertCount(10, $rows); // Sep 1-3, 4-6, ..., 28-30
        $this->assertSame(['2026-09-28', '2026-09-30'], [$rows[9]['period_start'], $rows[9]['period_end']]);
        $this->assertSame(450, (int) $rows[0]['cycle_salary']);

        // Only periods that already started are listed
        $this->assertSame(['2026-10-01'], array_column($this->rows(10, $employee), 'period_start'));
    }

    public function test_staff_needs_payroll_permission(): void
    {
        $staff = User::factory()->create(['role' => 'staff', 'email' => 'payroll-staff@test.local']);
        Employee::create(['name' => 'Staff', 'email' => 'payroll-staff@test.local', 'permissions' => ['/dashboard', '/dashboard/attendance']]);
        $employee = Employee::create(['name' => 'Paid', 'daily_rate' => 100, 'pay_cycle' => 'monthly']);
        Sanctum::actingAs($staff);

        $this->pay($employee, '2026-09-01', 100)->assertForbidden();

        Employee::where('email', 'payroll-staff@test.local')->update(['permissions' => json_encode(['/dashboard', 'payroll.manage'])]);
        $this->pay($employee, '2026-09-01', 100)->assertCreated();
    }
}
