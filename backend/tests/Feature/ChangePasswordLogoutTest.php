<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ChangePasswordLogoutTest extends TestCase
{
    use DatabaseTransactions;

    private function seedOtherSession(User $user, string $id): void
    {
        DB::table('sessions')->insert([
            'id' => $id,
            'user_id' => $user->id,
            'ip_address' => '127.0.0.1',
            'user_agent' => 'other-device',
            'payload' => '',
            'last_activity' => now()->timestamp,
        ]);
    }

    public function test_changing_password_revokes_other_sessions_and_tokens(): void
    {
        $user = User::factory()->create(['password' => Hash::make('old-password')]);
        $this->seedOtherSession($user, 'other-device-session');
        $user->createToken('ios');

        Sanctum::actingAs($user);

        $this->putJson('/api/auth/profile', [
            'current_password' => 'old-password',
            'password' => 'new-password-123',
            'password_confirmation' => 'new-password-123',
        ])->assertOk();

        $this->assertDatabaseMissing('sessions', ['id' => 'other-device-session']);
        $this->assertSame(0, $user->tokens()->count());
        $this->assertTrue(Hash::check('new-password-123', $user->fresh()->password));
    }

    public function test_dashboard_session_stays_logged_in_after_changing_password(): void
    {
        $user = User::factory()->create(['password' => Hash::make('old-password')]);
        $this->seedOtherSession($user, 'other-device-session');

        $this->actingAs($user, 'web')
            ->withHeader('Referer', 'http://localhost/')
            ->putJson('/api/auth/profile', [
                'current_password' => 'old-password',
                'password' => 'new-password-123',
                'password_confirmation' => 'new-password-123',
            ])->assertOk();

        $this->assertDatabaseMissing('sessions', ['id' => 'other-device-session']);
        $this->withHeader('Referer', 'http://localhost/')->getJson('/api/auth/me')->assertOk();
    }

    public function test_updating_name_only_keeps_other_sessions(): void
    {
        $user = User::factory()->create();
        $this->seedOtherSession($user, 'other-device-session');

        Sanctum::actingAs($user);

        $this->putJson('/api/auth/profile', ['name' => 'New Name'])->assertOk();

        $this->assertDatabaseHas('sessions', ['id' => 'other-device-session']);
    }
}
