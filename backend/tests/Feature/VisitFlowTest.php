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

class VisitFlowTest extends TestCase
{
    use DatabaseTransactions;

    private function websiteRequest(array $dressIds, string $visitDate, string $weddingDate, string $phone = '01099999999'): Visit
    {
        $this->websitePost($dressIds, $visitDate, $weddingDate, $phone)->assertCreated();

        return Visit::latest('id')->first();
    }

    private function websitePost(array $dressIds, string $visitDate, string $weddingDate, string $phone = '01099999999')
    {
        return $this->postJson('/api/public/bookings', [
            'client_name' => 'Website Bride',
            'client_phone' => $phone,
            'client_city' => 'القاهرة',
            'visit_date' => $visitDate,
            'time_slot' => '02:30 PM',
            'wedding_date' => $weddingDate,
            'dress_ids' => $dressIds,
        ]);
    }

    private function bookFor(Dress $dress, string $pickup, string $return, string $status = 'confirmed'): Booking
    {
        $other = Client::create(['name' => 'Other Bride', 'phone' => '0101' . random_int(1000000, 9999999), 'city' => 'القاهرة']);

        return Booking::create([
            'client_id' => $other->id,
            'dress_id' => $dress->id,
            'booking_date' => '2026-09-01',
            'event_date' => \Carbon\Carbon::parse($pickup)->addDay()->toDateString(),
            'pickup_scheduled_on' => $pickup,
            'return_scheduled_on' => $return,
            'status' => $status,
            'total_amount' => 0,
        ]);
    }

    public function test_website_request_with_all_dresses_free_is_auto_confirmed_without_booking(): void
    {
        $dresses = Dress::factory()->count(3)->create(['trying_fee' => 150]);
        $visit = $this->websiteRequest($dresses->pluck('id')->all(), '2026-11-01', '2026-12-10');

        $this->assertSame('confirmed', $visit->status);
        $this->assertTrue($visit->auto_confirmed);
        $this->assertNotNull($visit->confirmed_at);
        $this->assertNull($visit->confirmed_by);
        $this->assertNull($visit->confirmation_sent_at);
        $this->assertSame('14:30', $visit->time_slot);
        $this->assertEquals(450, $visit->trying_fee);
        $this->assertEqualsCanonicalizing($dresses->pluck('id')->all(), $visit->requestedDresses->pluck('id')->all());
        $this->assertSame(0, Booking::where('client_id', $visit->client_id)->count());
        $this->assertSame('2026-12-10', $visit->client->wedding_date);
        $this->assertSame('visit', $visit->client->current_stage);
    }

    public function test_repeat_website_request_waits_for_employee(): void
    {
        $dress = Dress::factory()->create();
        $first = $this->websiteRequest([$dress->id], '2026-11-01', '2026-12-10');

        $response = $this->websitePost([$dress->id], '2026-11-05', '2026-12-10')->assertCreated();
        $repeat = Visit::latest('id')->first();

        $this->assertSame('confirmed', $first->status);
        $this->assertFalse($response->json('auto_confirmed'));
        $this->assertSame('pending', $repeat->status);
        $this->assertSame($first->id, $repeat->previous_visit_id);
    }

    public function test_website_request_is_rejected_when_a_dress_is_out_on_her_visit_date(): void
    {
        $dress = Dress::factory()->create();
        $this->bookFor($dress, '2026-10-31', '2026-11-02');
        $before = Visit::count();

        $this->websitePost([$dress->id], '2026-11-01', '2027-01-10')
            ->assertStatus(422)->assertJsonPath('code', 'dresses_unavailable');
        $this->assertSame($before, Visit::count());
    }

    public function test_website_request_needs_dresses_and_wedding_date(): void
    {
        $this->postJson('/api/public/bookings', [
            'client_name' => 'No Date Bride', 'client_phone' => '01066666666',
            'visit_date' => '2026-11-01', 'time_slot' => '02:30 PM', 'dress_ids' => [Dress::factory()->create()->id],
        ])->assertStatus(422)->assertJsonPath('code', 'missing_dresses_or_wedding_date');
    }

    public function test_returned_dresses_become_available_without_cleaning_task(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
        $dress = Dress::factory()->create(['status' => 'out']);
        $booking = $this->bookFor($dress, '2026-11-01', '2026-11-03', 'picked_up');

        $this->putJson("/api/clients/{$booking->client_id}/stage-action", ['action' => 'mark_returned'])->assertOk();

        $this->assertSame('returned', $booking->fresh()->status);
        $this->assertSame('available', $dress->fresh()->status);
        $this->assertSame(0, \App\Models\Task::where('booking_id', $booking->id)->count());
    }

    public function test_website_request_is_rejected_when_a_dress_is_booked_on_her_dates(): void
    {
        $dress = Dress::factory()->create();
        $this->bookFor($dress, '2026-12-09', '2026-12-11');
        $before = Visit::count();

        $response = $this->websitePost([$dress->id], '2026-11-01', '2026-12-10')->assertStatus(422);

        $this->assertSame('dresses_unavailable', $response->json('code'));
        $this->assertSame('2026-12-13', $response->json('availability.dresses.0.wedding_date.available_from'));
        $this->assertArrayNotHasKey('conflicts', $response->json('availability.dresses.0.wedding_date'));
        $this->assertSame($before, Visit::count());
    }

    public function test_website_request_for_a_past_slot_is_rejected(): void
    {
        $dress = Dress::factory()->create();
        $this->postJson('/api/public/bookings', [
            'client_name' => 'Late Bride', 'client_phone' => '01088888888',
            'visit_date' => now('Africa/Cairo')->toDateString(), 'time_slot' => '12:00 AM',
            'wedding_date' => '2026-12-10', 'dress_ids' => [$dress->id],
        ])->assertStatus(422)->assertJsonPath('code', 'slot_in_past');
    }

    public function test_public_availability_hides_other_brides_and_logs_lost_demand(): void
    {
        $busy = Dress::factory()->create();
        $free = Dress::factory()->create();
        $this->bookFor($busy, '2026-11-01', '2026-11-03');
        $bride = Client::create(['name' => 'Shopping Bride', 'phone' => '01077777777', 'city' => 'القاهرة']);

        $response = $this->postJson('/api/public/availability', [
            'dress_ids' => [$busy->id, $free->id],
            'visit_date' => '2026-11-02',
            'wedding_date' => '2026-11-03',
            'client_id' => $bride->id,
        ])->assertOk();

        $rows = collect($response->json('dresses'))->keyBy('dress_id');
        $this->assertFalse($rows[$busy->id]['visit_date']['available']);
        $this->assertSame('booked', $rows[$busy->id]['visit_date']['reason_code']);
        $this->assertArrayNotHasKey('reason', $rows[$busy->id]['visit_date']);
        $this->assertFalse($rows[$busy->id]['wedding_date']['available']);
        $this->assertSame('2026-11-05', $rows[$busy->id]['wedding_date']['available_from']);
        $this->assertTrue($rows[$free->id]['wedding_date']['available']);
        $this->assertSame('2026-11-04', $response->json('suggested_visit_date'));
        $this->assertStringNotContainsString('Other Bride', $response->getContent());

        $this->assertDatabaseHas('dress_demand_misses', ['dress_id' => $busy->id, 'client_id' => $bride->id, 'wedding_date' => '2026-11-03']);
        $this->assertDatabaseMissing('dress_demand_misses', ['dress_id' => $free->id, 'client_id' => $bride->id]);
    }

    public function test_guests_do_not_get_booking_details_from_the_dress_list(): void
    {
        $dress = Dress::factory()->create(['purchase_price' => 9000]);
        $this->bookFor($dress, '2026-11-01', '2026-11-03');

        $guest = $this->getJson("/api/dresses/{$dress->id}")->assertOk();
        $this->assertArrayNotHasKey('bookings', $guest->json());
        $this->assertArrayNotHasKey('purchase_price', $guest->json());

        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
        $this->assertCount(1, $this->getJson("/api/dresses/{$dress->id}")->json('bookings'));
    }

    public function test_shop_registration_creates_confirmed_visit_with_dresses_and_no_booking(): void
    {
        $employee = User::factory()->create(['role' => 'admin']);
        Sanctum::actingAs($employee);
        $dresses = Dress::factory()->count(2)->create(['trying_fee' => 100]);

        $client = $this->postJson('/api/clients', [
            'name' => 'Walk In Bride',
            'phone' => '01066666666',
            'source' => 'walkin',
            'visit_date' => '2026-10-10',
            'visit_time' => '04:00 م',
            'wedding_date' => '2026-12-01',
            'dress_id' => $dresses[0]->id,
            'dress_2_id' => $dresses[1]->id,
        ])->assertCreated()->json();

        $visit = Visit::where('client_id', $client['id'])->sole();
        $this->assertSame('confirmed', $visit->status);
        $this->assertSame($employee->id, $visit->confirmed_by);
        $this->assertFalse($visit->auto_confirmed);
        $this->assertSame('walkin', $visit->source);
        $this->assertSame('16:00', $visit->time_slot);
        $this->assertEquals(200, $visit->trying_fee);
        $this->assertCount(2, $visit->requestedDresses);
        $this->assertSame(0, Booking::where('client_id', $client['id'])->count());
    }

    public function test_rescheduling_requires_a_new_whatsapp_confirmation(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
        $dress = Dress::factory()->create();
        $visit = $this->websiteRequest([$dress->id], '2026-11-01', '2026-12-10');

        $this->postJson("/api/visits/{$visit->id}/confirmation-sent")->assertOk();
        $this->assertNotNull($visit->fresh()->confirmation_sent_at);

        $this->putJson("/api/clients/{$visit->client_id}/stage-action", ['action' => 'confirm_visit', 'visit_date' => '2026-11-01'])->assertOk();
        $this->assertNotNull($visit->fresh()->confirmation_sent_at, 'same date keeps the sent flag');

        $this->putJson("/api/clients/{$visit->client_id}/stage-action", ['action' => 'confirm_visit', 'visit_date' => '2026-11-04'])->assertOk();
        $this->assertNull($visit->fresh()->confirmation_sent_at);
        $this->assertTrue($visit->fresh()->auto_confirmed, 'original confirmation is kept');
    }

    public function test_visits_report_counts_the_funnel(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
        $dresses = Dress::factory()->count(2)->create();
        $booked = $this->websiteRequest([$dresses[0]->id], '2031-03-02', '2031-06-01');
        $noShow = $this->websiteRequest([$dresses[1]->id], '2031-03-03', '2031-06-02', '01055555555');
        $this->putJson("/api/clients/{$booked->client_id}/stage-action", [
            'action' => 'confirm_booking', 'dress_id' => $dresses[0]->id, 'event_date' => '2031-06-01', 'total_amount' => 1000,
        ])->assertOk();
        $this->putJson("/api/clients/{$noShow->client_id}/stage-action", ['action' => 'close_visit', 'visit_status' => 'no_show'])->assertOk();

        $report = $this->getJson('/api/reports/visits?from=2031-03-01&to=2031-03-31')->assertOk()->json();

        $this->assertSame(2, $report['funnel']['requests']);
        $this->assertSame(2, $report['funnel']['auto_confirmed']);
        $this->assertSame(1, $report['funnel']['booked']);
        $this->assertSame(1, $report['funnel']['no_show']);
        $this->assertEquals(50, $report['no_show']['rate']);
        $this->assertSame('website', $report['sources'][0]['source']);
        $this->assertSame(1, collect($report['dresses'])->firstWhere('dress_id', $dresses[0]->id)['booked']);
    }

    public function test_confirm_visit_keeps_requested_date_and_stores_changes(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
        $dress = Dress::factory()->create();
        // A repeat request stays pending until an employee confirms it
        $this->websiteRequest([$dress->id], '2026-10-20', '2026-12-10');
        $visit = $this->websiteRequest([$dress->id], '2026-11-01', '2026-12-10');
        $this->assertSame('pending', $visit->status);

        // Confirming without a date must not move the visit to today
        $this->putJson("/api/clients/{$visit->client_id}/stage-action", ['action' => 'confirm_visit'])->assertOk();
        $visit->refresh();
        $this->assertSame('confirmed', $visit->status);
        $this->assertSame('2026-11-01', $visit->visit_date->toDateString());
        $this->assertSame('14:30', $visit->time_slot);

        $other = Dress::factory()->create();
        $this->putJson("/api/clients/{$visit->client_id}/stage-action", [
            'action' => 'confirm_visit',
            'visit_date' => '2026-11-03',
            'visit_time' => '05:00 م',
            'trying_fee' => 0,
            'dress_id' => $dress->id,
            'dress_2_id' => $other->id,
        ])->assertOk();
        $visit->refresh();
        $this->assertSame('2026-11-03', $visit->visit_date->toDateString());
        $this->assertSame('17:00', $visit->time_slot);
        $this->assertEquals(0, $visit->trying_fee);
        $this->assertCount(2, $visit->requestedDresses);
        $this->assertSame(2, Visit::where('client_id', $visit->client_id)->count(), 'no extra visit is created');
        $this->assertSame(0, Booking::where('client_id', $visit->client_id)->count());
    }

    public function test_availability_reports_visit_date_and_wedding_date_conflicts(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
        $busy = Dress::factory()->create(['status' => 'available']);
        $free = Dress::factory()->create(['status' => 'available']);

        $otherBride = Client::create(['name' => 'Other Bride', 'phone' => '01011111111', 'city' => 'القاهرة']);
        Booking::create([
            'client_id' => $otherBride->id,
            'dress_id' => $busy->id,
            'booking_date' => '2026-10-01',
            'event_date' => '2026-11-02',
            'pickup_scheduled_on' => '2026-11-01',
            'return_scheduled_on' => '2026-11-03',
            'status' => 'confirmed',
            'total_amount' => 0,
        ]);

        // Try-on on 2026-11-02 (inside the other bride's window), wedding on 2026-11-03 (overlaps it too)
        // The website refuses booked dresses, so the employee registers this visit
        $bride = Client::create(['name' => 'Shop Bride', 'phone' => '01033333333', 'city' => 'القاهرة', 'wedding_date' => '2026-11-03']);
        $visit = Visit::create(['client_id' => $bride->id, 'visit_date' => '2026-11-02', 'status' => 'pending', 'source' => 'walkin']);
        $visit->requestedDresses()->syncWithPivotValues([$busy->id, $free->id], ['type' => 'requested']);

        $rows = collect($this->getJson("/api/visits/{$visit->id}/availability")->assertOk()->json())->keyBy('dress_id');

        $this->assertFalse($rows[$busy->id]['visit_date']['available']);
        $this->assertSame('2026-11-04', $rows[$busy->id]['visit_date']['available_from']);
        $this->assertFalse($rows[$busy->id]['wedding_date']['available']);
        $this->assertSame('Other Bride', $rows[$busy->id]['wedding_date']['conflicts'][0]['client_name']);

        $this->assertTrue($rows[$free->id]['visit_date']['available']);
        $this->assertTrue($rows[$free->id]['wedding_date']['available']);
    }

    public function test_booking_three_dresses_closes_the_visit(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
        $dresses = Dress::factory()->count(3)->create();
        $visit = $this->websiteRequest($dresses->pluck('id')->all(), '2026-11-01', '2026-12-10');

        $this->putJson("/api/clients/{$visit->client_id}/stage-action", [
            'action' => 'confirm_booking',
            'dress_id' => $dresses[0]->id,
            'dress_2_id' => $dresses[1]->id,
            'dress_3_id' => $dresses[2]->id,
            'event_date' => '2026-12-10',
            'total_amount' => 9000,
            'deposit_amount' => 0,
        ])->assertOk();

        $booking = Booking::where('client_id', $visit->client_id)->sole();
        $this->assertSame('confirmed', $booking->status);
        $this->assertSame($dresses[2]->id, $booking->dress_3_id);

        $visit->refresh();
        $this->assertSame('booked', $visit->status);
        $this->assertCount(3, $visit->bookedDresses);
        $this->assertCount(3, $visit->requestedDresses);
    }

    public function test_booking_after_cancellation_creates_a_new_booking(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
        $dress = Dress::factory()->create();
        $client = Client::create(['name' => 'Returning Bride', 'phone' => '01022222222', 'city' => 'القاهرة']);
        $cancelled = Booking::create([
            'client_id' => $client->id,
            'dress_id' => $dress->id,
            'booking_date' => '2026-09-01',
            'event_date' => '2026-10-10',
            'status' => 'cancelled',
            'total_amount' => 5000,
        ]);

        $this->putJson("/api/clients/{$client->id}/stage-action", [
            'action' => 'confirm_booking',
            'dress_id' => $dress->id,
            'event_date' => '2026-12-20',
            'total_amount' => 6000,
        ])->assertOk();

        $this->assertSame('cancelled', $cancelled->fresh()->status);
        $this->assertSame(2, Booking::where('client_id', $client->id)->count());
    }

    public function test_close_visit_records_outcome_and_tried_dresses(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
        $dresses = Dress::factory()->count(2)->create();
        $visit = $this->websiteRequest($dresses->pluck('id')->all(), '2026-11-01', '2026-12-10');

        $this->putJson("/api/clients/{$visit->client_id}/stage-action", [
            'action' => 'close_visit',
            'visit_status' => 'done',
            'tried_dresses' => [$dresses[0]->id],
        ])->assertOk();

        $visit->refresh();
        $this->assertSame('done', $visit->status);
        $this->assertSame([$dresses[0]->id], $visit->triedDresses->pluck('id')->all());
        $this->assertCount(2, $visit->requestedDresses);

        // Nothing open anymore
        $this->putJson("/api/clients/{$visit->client_id}/stage-action", [
            'action' => 'close_visit',
            'visit_status' => 'no_show',
        ])->assertStatus(422);
    }
}
