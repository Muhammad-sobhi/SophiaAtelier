<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\ClosedDay;
use App\Models\Dress;
use App\Models\User;
use App\Models\Visit;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ClosedDaysTest extends TestCase
{
    use DatabaseTransactions;

    private function actingAsRole(string $role): User
    {
        $user = User::factory()->create(['role' => $role]);
        Sanctum::actingAs($user);

        return $user;
    }

    private function websitePost(string $visitDate)
    {
        return $this->postJson('/api/public/bookings', [
            'client_name' => 'Website Bride',
            'client_phone' => '01077777777',
            'client_city' => 'القاهرة',
            'visit_date' => $visitDate,
            'time_slot' => '02:30 PM',
            'wedding_date' => '2027-01-10',
            'dress_ids' => [Dress::factory()->create()->id],
        ]);
    }

    public function test_admin_closes_and_reopens_a_day(): void
    {
        $this->actingAsRole('admin');

        $id = $this->postJson('/api/closed-days', ['date' => '2026-11-12', 'reason' => 'إجازة'])
            ->assertCreated()->assertJson(['date' => '2026-11-12', 'reason' => 'إجازة', 'visits_count' => 0])->json('id');

        $this->postJson('/api/closed-days', ['date' => '2026-11-12'])->assertStatus(422);
        $this->postJson('/api/closed-days', ['date' => '2020-01-01'])->assertStatus(422);
        $this->getJson('/api/closed-days')->assertOk()->assertJsonFragment(['date' => '2026-11-12']);
        $this->getJson('/api/public/closed-days')->assertOk()->assertJsonFragment(['date' => '2026-11-12', 'reason' => 'إجازة']);

        $this->deleteJson("/api/closed-days/{$id}")->assertNoContent();
        $this->assertFalse(ClosedDay::isClosed('2026-11-12'));
    }

    public function test_closing_a_day_reports_visits_already_booked(): void
    {
        $this->actingAsRole('admin');
        $client = Client::factory()->create();
        Visit::create(['client_id' => $client->id, 'visit_date' => '2026-11-13', 'status' => 'confirmed']);
        Visit::create(['client_id' => $client->id, 'visit_date' => '2026-11-13', 'status' => 'declined']);

        $this->postJson('/api/closed-days', ['date' => '2026-11-13'])->assertCreated()->assertJsonPath('visits_count', 1);
    }

    public function test_non_admin_cannot_manage_closed_days(): void
    {
        $this->actingAsRole('staff');

        $this->postJson('/api/closed-days', ['date' => '2026-11-12'])->assertForbidden();
    }

    public function test_website_cannot_book_a_visit_on_a_closed_day(): void
    {
        ClosedDay::create(['date' => '2026-11-14', 'reason' => 'إجازة']);
        $before = Visit::count();

        $this->websitePost('2026-11-14')->assertStatus(422)->assertJsonPath('code', 'day_closed');
        $this->assertSame($before, Visit::count());

        $this->websitePost('2026-11-15')->assertCreated();
    }

    public function test_staff_can_still_register_a_visit_on_a_closed_day(): void
    {
        $this->actingAsRole('admin');
        ClosedDay::create(['date' => '2026-11-14']);

        $this->postJson('/api/visits', [
            'client_id' => Client::factory()->create()->id,
            'visit_date' => '2026-11-14',
        ])->assertCreated();
    }
}
