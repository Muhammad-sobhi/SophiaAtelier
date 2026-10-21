<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\User;
use App\Models\Visit;
use Illuminate\Support\Facades\Cache;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SlotCapacityTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo(\Carbon\Carbon::parse('2026-10-01 10:00', 'Africa/Cairo'));
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
    }

    private function fillSlot(string $date = '2026-10-10', string $slot = '14:30', int $count = 4): void
    {
        for ($i = 0; $i < $count; $i++) {
            $client = Client::create(['name' => "Bride {$i}", 'phone' => '0101000000' . $i]);
            Visit::create(['client_id' => $client->id, 'visit_date' => $date, 'time_slot' => $slot, 'status' => 'confirmed', 'source' => 'walkin']);
        }
    }

    public function test_staff_registration_into_a_full_slot_saves_nothing(): void
    {
        $this->fillSlot();

        $this->postJson('/api/clients', ['name' => 'Fifth', 'visit_date' => '2026-10-10', 'visit_time' => '02:30 PM'])
            ->assertStatus(422)->assertJsonPath('code', 'slot_full');
        $this->assertSame(0, Client::where('name', 'Fifth')->count());

        $this->postJson('/api/clients', ['name' => 'Other time', 'visit_date' => '2026-10-10', 'visit_time' => '03:00 PM'])->assertCreated();
        $this->assertSame(1, Client::where('name', 'Other time')->first()->visits()->count());
    }

    public function test_visit_endpoints_respect_the_slot_limit(): void
    {
        $this->fillSlot();
        $client = Client::create(['name' => 'Late', 'phone' => '01019999999']);

        $this->postJson('/api/visits', ['client_id' => $client->id, 'visit_date' => '2026-10-10', 'time_slot' => '02:30 PM'])
            ->assertStatus(422)->assertJsonPath('code', 'slot_full');

        $visit = Visit::create(['client_id' => $client->id, 'visit_date' => '2026-10-10', 'time_slot' => '15:00', 'status' => 'confirmed', 'source' => 'walkin']);
        $this->putJson("/api/visits/{$visit->id}", ['time_slot' => '02:30 PM'])->assertStatus(422);
        $this->assertSame('15:00', $visit->refresh()->time_slot);

        // A visit already in the slot can still be saved there
        $inside = Visit::where('time_slot', '14:30')->first();
        $this->putJson("/api/visits/{$inside->id}", ['time_slot' => '02:30 PM', 'notes' => 'ok'])->assertOk();
    }

    public function test_editing_a_bride_into_a_full_slot_changes_nothing(): void
    {
        $this->fillSlot();
        $client = Client::create(['name' => 'Edit me', 'phone' => '01018888888']);

        $this->putJson("/api/clients/{$client->id}", ['name' => 'Renamed', 'visit_date' => '2026-10-10', 'visit_time' => '02:30 PM'])
            ->assertStatus(422)->assertJsonPath('code', 'slot_full');
        $this->assertSame('Edit me', $client->refresh()->name);
        $this->assertSame(0, $client->visits()->count());
    }

    public function test_a_slot_being_saved_by_another_request_answers_busy(): void
    {
        // The lock's wait is timed with now(): it would never run out under frozen time
        $this->travelBack();
        $lock = Cache::lock('visit-slot:2026-10-10:14:30', 10);
        $lock->get();

        try {
            $this->postJson('/api/clients', ['name' => 'Waiting', 'visit_date' => '2026-10-10', 'visit_time' => '02:30 PM'])
                ->assertStatus(429)->assertJsonPath('code', 'request_in_progress');
        } finally {
            $lock->release();
        }
    }
}
