<?php

uses(
    Tests\TestCase::class,
    Illuminate\Foundation\Testing\RefreshDatabase::class
)->in('Feature');

function actingAsAdmin()
{
    $admin = \App\Models\User::factory()->create(['role' => 'admin']);
    return test()->actingAs($admin);
}

function actingAsStaff()
{
    $staff = \App\Models\User::factory()->create(['role' => 'staff']);
    return test()->actingAs($staff);
}
