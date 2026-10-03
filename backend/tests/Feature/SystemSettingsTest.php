<?php

namespace Tests\Feature;

use App\Models\Setting;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SystemSettingsTest extends TestCase
{
    use DatabaseTransactions;

    private function actingAsRole(string $role): User
    {
        $user = User::factory()->create(['role' => $role]);
        Sanctum::actingAs($user);

        return $user;
    }

    public function test_public_settings_expose_whatsapp_number(): void
    {
        Setting::put('whatsapp_number', '+201554159359');

        $this->getJson('/api/public/settings')->assertOk()->assertExactJson(['whatsapp_number' => '+201554159359']);
    }

    public function test_admin_updates_whatsapp_number_normalized(): void
    {
        $this->actingAsRole('admin');

        $this->putJson('/api/settings', ['whatsapp_number' => '01012345678'])
            ->assertOk()->assertJson(['whatsapp_number' => '+201012345678']);
        $this->putJson('/api/settings', ['whatsapp_number' => '12345'])->assertStatus(422);

        $this->assertSame('+201012345678', Setting::get('whatsapp_number'));
    }

    public function test_non_admin_cannot_update_settings(): void
    {
        $this->actingAsRole('staff');

        $this->putJson('/api/settings', ['whatsapp_number' => '01012345678'])->assertForbidden();
    }
}
