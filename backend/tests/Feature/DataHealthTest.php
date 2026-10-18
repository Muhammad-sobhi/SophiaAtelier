<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Client;
use App\Models\Dress;
use App\Models\Revenue;
use App\Models\User;
use App\Models\Visit;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DataHealthTest extends TestCase
{
    use DatabaseTransactions;

    public function test_only_admins_can_use_it()
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'staff']));
        $this->getJson('/api/data-health')->assertForbidden();
        $this->postJson('/api/data-health/merge-clients', [])->assertForbidden();
    }

    public function test_lists_checks_and_shows_rows_of_one()
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
        $client = Client::create(['name' => 'Late Bride', 'phone' => '01044440001', 'city' => 'القاهرة']);
        $booking = Booking::create(['client_id' => $client->id, 'dress_id' => Dress::factory()->create()->id,
            'booking_date' => '2026-09-20', 'event_date' => '2026-08-15', 'status' => 'returned', 'total_amount' => 1000]);

        $summary = collect($this->getJson('/api/data-health')->assertOk()->json())->keyBy('key');
        $this->assertGreaterThanOrEqual(1, $summary['booking_after_wedding']['count']);
        $this->assertArrayNotHasKey('ids', $summary['booking_after_wedding']);

        $check = $this->getJson('/api/data-health/booking_after_wedding')->assertOk()->json();
        $row = collect($check['rows'])->firstWhere('id', $booking->id);
        $this->assertSame('Late Bride', $row['client_name']);
        $this->assertSame($client->id, $row['client_id']);

        $this->getJson('/api/data-health/not_a_check')->assertNotFound();
    }

    public function test_fixing_a_returned_booking_clears_the_check()
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
        $client = Client::create(['name' => 'Old Bride', 'phone' => '01044440002', 'city' => 'القاهرة']);
        $booking = Booking::create(['client_id' => $client->id, 'dress_id' => Dress::factory()->create()->id,
            'booking_date' => '2026-09-20', 'event_date' => '2026-08-15', 'status' => 'returned', 'total_amount' => 1000]);

        // A booking date after the wedding is refused
        $this->putJson("/api/bookings/{$booking->id}", ['booking_date' => '2026-08-20'])->assertStatus(422);

        $this->putJson("/api/bookings/{$booking->id}", ['booking_date' => '2026-06-01'])->assertOk();
        $this->assertSame('returned', $booking->fresh()->status);
        $ids = collect($this->getJson('/api/data-health/booking_after_wedding')->json('rows'))->pluck('id');
        $this->assertNotContains($booking->id, $ids);

        // Payment-only edits of a booking still go through
        $this->putJson("/api/bookings/{$booking->id}", ['total_amount' => 1200])->assertOk();
    }

    private function booking(Client $client, string $bookingDate, string $createdAt): Booking
    {
        $booking = Booking::create(['client_id' => $client->id, 'dress_id' => Dress::factory()->create()->id,
            'booking_date' => $bookingDate, 'event_date' => '2026-12-15', 'status' => 'confirmed', 'total_amount' => 1000]);
        $booking->forceFill(['created_at' => $createdAt])->saveQuietly();

        return $booking;
    }

    private function checkIds(string $check): \Illuminate\Support\Collection
    {
        return collect($this->getJson("/api/data-health/{$check}")->assertOk()->json('rows'))->pluck('id');
    }

    public function test_booking_date_after_the_shop_day_it_was_recorded()
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
        $client = Client::create(['name' => 'Edited Bride', 'phone' => '01044440010', 'city' => 'القاهرة']);
        // Old edit bug: recorded 8 Sep, date overwritten with the edit day
        $overwritten = $this->booking($client, '2026-10-03', '2026-09-08 20:16:40');
        // Recorded 23:37 UTC on 6 Sep = 7 Sep in the shop, so 7 Sep is right
        $lateNight = $this->booking($client, '2026-09-07', '2026-09-06 23:37:50');
        $sameDay = $this->booking($client, '2026-09-08', '2026-09-08 10:00:00');

        $ids = $this->checkIds('booking_date_after_created');
        $this->assertTrue($ids->contains($overwritten->id));
        $this->assertFalse($ids->contains($lateNight->id));
        $this->assertFalse($ids->contains($sameDay->id));
    }

    public function test_booking_date_not_on_the_booked_visit_day_until_fixed_or_confirmed()
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
        $late = Client::create(['name' => 'Late Entry', 'phone' => '01044440011', 'city' => 'القاهرة']);
        Visit::create(['client_id' => $late->id, 'visit_date' => '2026-10-03', 'status' => 'booked']);
        $lateBooking = $this->booking($late, '2026-10-05', '2026-10-05 20:00:00');

        $sameDay = Client::create(['name' => 'Same Day', 'phone' => '01044440012', 'city' => 'القاهرة']);
        Visit::create(['client_id' => $sameDay->id, 'visit_date' => '2026-10-03', 'status' => 'booked']);
        $sameDayBooking = $this->booking($sameDay, '2026-10-03', '2026-10-03 12:00:00');

        $rows = collect($this->getJson('/api/data-health/booking_date_not_visit_day')->assertOk()->json('rows'))->keyBy('id');
        $this->assertSame('2026-10-03', $rows[$lateBooking->id]['visit_date']);
        $this->assertArrayNotHasKey($sameDayBooking->id, $rows);

        // She really booked on the written day
        $this->postJson('/api/data-health/confirm-booking-date', ['booking_id' => $lateBooking->id])->assertOk();
        $this->assertFalse($this->checkIds('booking_date_not_visit_day')->contains($lateBooking->id));
        $this->assertSame('2026-10-05', $lateBooking->fresh()->booking_date->toDateString());

        // Or the admin sets the visit day
        $other = Client::create(['name' => 'Fixed Bride', 'phone' => '01044440013', 'city' => 'القاهرة']);
        Visit::create(['client_id' => $other->id, 'visit_date' => '2026-10-04', 'status' => 'booked']);
        $fixed = $this->booking($other, '2026-10-06', '2026-10-06 12:00:00');
        $this->assertTrue($this->checkIds('booking_date_not_visit_day')->contains($fixed->id));
        $this->putJson("/api/bookings/{$fixed->id}", ['booking_date' => '2026-10-04'])->assertOk();
        $this->assertFalse($this->checkIds('booking_date_not_visit_day')->contains($fixed->id));
    }

    public function test_confirm_booking_date_is_admin_only()
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'staff']));
        $this->postJson('/api/data-health/confirm-booking-date', ['booking_id' => 1])->assertForbidden();
    }

    public function test_merge_moves_everything_to_the_kept_bride()
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
        $keep = Client::create(['name' => 'هدير حمدى', 'phone' => '01094481868', 'city' => 'القاهرة']);
        $dup = Client::create(['name' => 'Hadeer Hamdy', 'phone' => '01094481868', 'city' => 'القاهرة',
            'email' => 'hadeer@example.com', 'notes' => 'from website']);
        $visit = Visit::create(['client_id' => $dup->id, 'visit_date' => '2026-10-01', 'status' => 'done', 'source' => 'website']);
        $fee = Revenue::create(['visit_id' => $visit->id, 'type' => 'fitting_fee', 'amount' => 200, 'payment_method' => 'cash', 'payment_date' => '2026-10-01']);
        $booking = Booking::create(['client_id' => $dup->id, 'dress_id' => Dress::factory()->create()->id,
            'booking_date' => '2026-10-01', 'event_date' => '2026-11-21', 'status' => 'confirmed', 'total_amount' => 5000]);

        $missDress = Dress::factory()->create();
        foreach ([$keep, $dup] as $c) {
            \DB::table('dress_demand_misses')->insert(['dress_id' => $missDress->id, 'client_id' => $c->id, 'wedding_date' => '2026-11-21', 'created_at' => now(), 'updated_at' => now()]);
        }

        $this->postJson('/api/data-health/merge-clients', ['keep_id' => $keep->id, 'merge_ids' => [$keep->id]])->assertStatus(422);
        $this->postJson('/api/data-health/merge-clients', ['keep_id' => $keep->id, 'merge_ids' => [$dup->id]])->assertOk();

        $this->assertNull(Client::withTrashed()->find($dup->id));
        $this->assertSame($keep->id, $visit->fresh()->client_id);
        $this->assertSame($keep->id, $booking->fresh()->client_id);
        $this->assertSame($visit->id, $fee->fresh()->visit_id);
        $this->assertSame(1, \DB::table('dress_demand_misses')->where('dress_id', $missDress->id)->where('client_id', $keep->id)->count());
        $keep->refresh();
        $this->assertSame('هدير حمدى', $keep->name);
        $this->assertSame('hadeer@example.com', $keep->email);
        $this->assertSame('from website', $keep->notes);
    }

    public function test_close_visits_only_closes_past_open_ones()
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
        $client = Client::create(['name' => 'Visitor', 'phone' => '01044440002', 'city' => 'القاهرة']);
        $past = Visit::create(['client_id' => $client->id, 'visit_date' => now()->subDays(5)->toDateString(), 'status' => 'pending', 'source' => 'walkin']);
        $future = Visit::create(['client_id' => $client->id, 'visit_date' => now()->addDays(5)->toDateString(), 'status' => 'pending', 'source' => 'walkin']);
        $booked = Visit::create(['client_id' => $client->id, 'visit_date' => now()->subDays(6)->toDateString(), 'status' => 'booked', 'source' => 'walkin']);

        $this->postJson('/api/data-health/close-visits', ['ids' => [$past->id, $future->id, $booked->id], 'status' => 'no_show'])
            ->assertOk()->assertJsonPath('closed', 1);

        $this->assertSame('no_show', $past->fresh()->status);
        $this->assertSame('pending', $future->fresh()->status);
        $this->assertSame('booked', $booked->fresh()->status);
        $this->postJson('/api/data-health/close-visits', ['ids' => [$past->id], 'status' => 'booked'])->assertStatus(422);
    }
}
