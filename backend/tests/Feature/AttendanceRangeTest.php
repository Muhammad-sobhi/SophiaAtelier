<?php

namespace Tests\Feature;

use App\Models\Attendance;
use App\Models\Employee;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AttendanceRangeTest extends TestCase
{
    use DatabaseTransactions;

    public function test_attendance_can_be_listed_for_a_date_range()
    {
        Sanctum::actingAs(User::create(['name' => 'Boss', 'email' => 'zz-att-boss@test.local', 'password' => 'secret123', 'role' => 'admin']));
        $emp = Employee::create(['name' => 'Staff', 'email' => 'zz-att-staff@test.local', 'password' => 'staff123']);

        foreach (['2031-01-31', '2031-02-01', '2031-02-28', '2031-03-01'] as $date) {
            Attendance::create(['employee_id' => $emp->id, 'date' => $date, 'status' => 'present']);
        }

        $dates = collect($this->getJson('/api/attendance?from=2031-02-01&to=2031-02-28&all=1')->assertOk()->json())
            ->pluck('date')->map(fn ($d) => substr($d, 0, 10))->sort()->values()->all();

        $this->assertSame(['2031-02-01', '2031-02-28'], $dates);

        $this->getJson('/api/attendance?from=not-a-date&all=1')->assertStatus(422);
    }
}
