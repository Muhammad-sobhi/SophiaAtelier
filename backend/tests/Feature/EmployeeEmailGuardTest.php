<?php

namespace Tests\Feature;

use App\Models\Employee;
use App\Models\User;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class EmployeeEmailGuardTest extends TestCase
{

    public function test_new_employee_cannot_take_over_an_existing_login()
    {
        $admin = User::create(['name' => 'Boss', 'email' => 'zz-boss@test.local', 'password' => 'secret123', 'role' => 'admin']);
        Sanctum::actingAs($admin);

        $this->postJson('/api/employees', ['name' => 'New', 'email' => 'zz-boss@test.local', 'password' => 'other123'])
            ->assertStatus(422)->assertJsonValidationErrors('email');

        $admin->refresh();
        $this->assertSame('admin', $admin->role);
        $this->assertSame('Boss', $admin->name);
    }

    public function test_employee_can_keep_own_email_but_not_take_another_users()
    {
        $admin = User::create(['name' => 'Boss', 'email' => 'zz-boss@test.local', 'password' => 'secret123', 'role' => 'admin']);
        Sanctum::actingAs($admin);
        $emp = Employee::create(['name' => 'Staff', 'email' => 'zz-staff@test.local', 'password' => 'staff123']);

        $this->putJson("/api/employees/{$emp->id}", ['name' => 'Staff 2', 'email' => 'zz-staff@test.local'])->assertOk();
        $this->putJson("/api/employees/{$emp->id}", ['email' => 'zz-boss@test.local'])
            ->assertStatus(422)->assertJsonValidationErrors('email');
        $this->assertSame('admin', $admin->refresh()->role);
    }
}
