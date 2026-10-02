<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Client;
use App\Models\Dress;
use App\Models\User;
use App\Models\Visit;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/** A visit may be at most 3 months (counted by day) before the wedding */
class VisitWindowTest extends TestCase
{
    use DatabaseTransactions;

    private function websitePost(int $dressId, string $visitDate, string $weddingDate)
    {
        return $this->postJson('/api/public/bookings', [
            'client_name' => 'Window Bride',
            'client_phone' => '010' . random_int(10000000, 99999999),
            'client_city' => 'القاهرة',
            'visit_date' => $visitDate,
            'time_slot' => '02:30 PM',
            'wedding_date' => $weddingDate,
            'dress_ids' => [$dressId],
        ]);
    }

    public function test_window_is_counted_by_day_and_clamps_short_months(): void
    {
        $this->assertNull(Visit::visitWindowError('2026-10-15', '2027-01-15'));
        $this->assertSame('2026-10-15', Visit::visitWindowError('2026-10-14', '2027-01-15')['earliest_visit_date']);
        $this->assertSame('2027-02-28', Visit::visitWindowError('2027-02-27', '2027-05-31')['earliest_visit_date']);
        $this->assertNull(Visit::visitWindowError('2027-02-28', '2027-05-31'));
        $this->assertNull(Visit::visitWindowError(null, '2027-05-31'));
    }

    public function test_website_rejects_visit_more_than_three_months_before_wedding(): void
    {
        $dress = Dress::factory()->create();
        $before = Visit::count();

        $this->websitePost($dress->id, '2026-12-14', '2027-03-15')
            ->assertStatus(422)
            ->assertJsonPath('code', 'visit_too_early')
            ->assertJsonPath('earliest_visit_date', '2026-12-15');
        $this->assertSame($before, Visit::count());

        $this->websitePost($dress->id, '2026-12-15', '2027-03-15')->assertCreated();
    }

    public function test_public_availability_reports_the_window(): void
    {
        $dress = Dress::factory()->create(['is_website_visible' => true]);

        $this->postJson('/api/public/availability', ['dress_ids' => [$dress->id], 'visit_date' => '2026-12-14', 'wedding_date' => '2027-03-15'])
            ->assertOk()->assertJsonPath('visit_window_error.earliest_visit_date', '2026-12-15');
        $this->postJson('/api/public/availability', ['dress_ids' => [$dress->id], 'visit_date' => '2026-12-15', 'wedding_date' => '2027-03-15'])
            ->assertOk()->assertJsonPath('visit_window_error', null);
    }

    public function test_dashboard_rejects_new_bride_and_visits_too_early(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
        $dress = Dress::factory()->create();

        $this->postJson('/api/clients', [
            'name' => 'Early Bride', 'phone' => '01077777771', 'source' => 'walkin',
            'visit_date' => '2026-12-14', 'wedding_date' => '2027-03-15', 'dress_id' => $dress->id,
        ])->assertStatus(422)->assertJsonValidationErrors('visit_date');
        $this->assertNull(Client::where('phone', '01077777771')->first());

        $client = Client::create(['name' => 'Bride', 'phone' => '01077777772', 'city' => 'القاهرة', 'wedding_date' => '2027-03-15']);
        $this->postJson('/api/visits', ['client_id' => $client->id, 'visit_date' => '2026-12-14'])
            ->assertStatus(422)->assertJsonValidationErrors('visit_date');
        $visit = $this->postJson('/api/visits', ['client_id' => $client->id, 'visit_date' => '2026-12-20'])->assertCreated()->json();

        $this->putJson("/api/visits/{$visit['id']}", ['visit_date' => '2026-12-01'])->assertStatus(422);
        $this->putJson("/api/clients/{$client->id}/stage-action", ['action' => 'confirm_visit', 'visit_date' => '2026-12-01'])
            ->assertStatus(422)->assertJsonValidationErrors('visit_date');
        $this->putJson("/api/clients/{$client->id}/stage-action", ['action' => 'confirm_visit', 'visit_date' => '2026-12-16'])->assertOk();
    }

    public function test_moving_the_wedding_date_away_from_an_open_visit_is_rejected(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
        $dress = Dress::factory()->create();
        $client = Client::create(['name' => 'Bride', 'phone' => '01077777773', 'city' => 'القاهرة', 'wedding_date' => '2027-01-10']);
        Visit::create(['client_id' => $client->id, 'visit_date' => '2026-11-01', 'status' => 'confirmed', 'source' => 'walkin']);

        $this->putJson("/api/clients/{$client->id}", ['name' => 'Bride', 'phone' => '01077777773', 'wedding_date' => '2027-03-10'])
            ->assertStatus(422)->assertJsonValidationErrors('wedding_date');
        $this->putJson("/api/clients/{$client->id}", ['name' => 'Bride Renamed', 'phone' => '01077777773', 'wedding_date' => '2027-01-10'])
            ->assertOk();

        $booking = Booking::create([
            'client_id' => $client->id, 'dress_id' => $dress->id, 'booking_date' => '2026-10-01',
            'event_date' => '2027-01-10', 'status' => 'pending', 'total_amount' => 0,
        ]);
        $this->putJson("/api/bookings/{$booking->id}", ['event_date' => '2027-03-10'])
            ->assertStatus(422)->assertJsonValidationErrors('event_date');
    }
}
