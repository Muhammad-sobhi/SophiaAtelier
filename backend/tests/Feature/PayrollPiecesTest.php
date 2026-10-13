<?php

namespace Tests\Feature;

use App\Models\Attendance;
use App\Models\Employee;
use App\Models\EmployeeLoan;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PayrollPiecesTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow('2026-10-14');
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    private function row(Employee $employee, int $month = 10): ?array
    {
        $rows = $this->getJson("/api/payroll/summary?month={$month}&year=2026")->assertOk()->json();

        return collect($rows)->firstWhere('employee_id', $employee->id);
    }

    private function addPieces(Employee $employee, string $date, int $pieces, ?float $rate = null)
    {
        return $this->postJson('/api/payroll/pieces', array_filter([
            'employee_id' => $employee->id,
            'date' => $date,
            'pieces' => $pieces,
            'piece_rate' => $rate,
        ]));
    }

    public function test_per_piece_employee_is_paid_for_recorded_pieces_only(): void
    {
        $employee = Employee::create(['name' => 'Piece', 'pay_type' => 'per_piece', 'piece_rate' => 25, 'daily_rate' => 200]);
        Attendance::create(['employee_id' => $employee->id, 'date' => '2026-10-05', 'status' => 'absent']);
        EmployeeLoan::create(['employee_id' => $employee->id, 'amount' => 100, 'date' => '2026-10-06', 'status' => 'approved']);

        // Listed with nothing recorded yet, so pieces can be added
        $this->assertSame(0, (int) $this->row($employee)['net_salary']);

        // Daily entries and one entry at a custom rate
        $this->addPieces($employee, '2026-10-01', 10)->assertCreated();
        $this->addPieces($employee, '2026-10-02', 4, 30)->assertCreated();

        $row = $this->row($employee);
        $this->assertSame(0, (int) $row['cycle_salary']); // daily rate is ignored
        $this->assertSame(14, $row['total_pieces']);
        $this->assertSame(370, (int) $row['pieces_pay']); // 10x25 + 4x30
        $this->assertSame(0, (int) $row['unexcused_absence_deduction']);
        $this->assertSame(270, (int) $row['net_salary']); // loan deducted

        // Changing the piece price keeps recorded entries at their rate
        $employee->update(['piece_rate' => 50]);
        $this->assertSame(370, (int) $this->row($employee)['pieces_pay']);

        $entryId = $row['piece_entries'][1]['id'];
        $this->deleteJson("/api/payroll/pieces/{$entryId}")->assertOk()->assertJsonPath('total_pieces', 10);
    }

    public function test_both_adds_pieces_to_the_daily_salary_and_deductions_are_optional(): void
    {
        $employee = Employee::create(['name' => 'Both', 'pay_type' => 'both', 'piece_rate' => 10, 'daily_rate' => 100]);
        Attendance::create(['employee_id' => $employee->id, 'date' => '2026-10-05', 'status' => 'absent']);
        $this->addPieces($employee, '2026-10-10', 20)->assertCreated()->assertJsonPath('pieces_pay', 200);

        $this->assertSame(3100, (int) $this->row($employee)['net_salary']); // 3000 + 200 - 100 absence

        $employee->update(['attendance_deductions' => false]);
        $row = $this->row($employee);
        $this->assertSame(0, (int) $row['total_deductions']);
        $this->assertSame(3200, (int) $row['net_salary']);
    }

    public function test_piece_entry_validation(): void
    {
        $employee = Employee::create(['name' => 'NoRate', 'pay_type' => 'per_piece']);

        $this->addPieces($employee, '2026-10-01', 5)->assertStatus(422)->assertJsonValidationErrors('piece_rate');
        $this->addPieces($employee, '2026-10-20', 5, 10)->assertStatus(422)->assertJsonValidationErrors('date');
        $this->addPieces($employee, '2026-10-01', 0, 10)->assertStatus(422)->assertJsonValidationErrors('pieces');
        $this->addPieces($employee, '2026-10-01', 5, 10)->assertCreated()->assertJsonPath('net_salary', 50);
    }
}
