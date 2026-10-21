<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Client;
use App\Models\Dress;
use App\Models\Fitting;
use Tests\TestCase;

/** The step the website's "track my order" page shows the bride */
class TrackingJourneyStepTest extends TestCase
{
    private Client $client;

    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo(\Carbon\Carbon::parse('2026-10-01 10:00', 'Africa/Cairo'));
        $this->client = Client::create(['name' => 'Track Bride', 'phone' => '01012340000', 'city' => 'القاهرة']);
    }

    private function book(array $attributes = []): Booking
    {
        return Booking::create($attributes + [
            'client_id' => $this->client->id,
            'dress_id' => Dress::factory()->create()->id,
            'booking_date' => '2026-09-01',
            'event_date' => '2026-12-20',
            'pickup_scheduled_on' => '2026-12-19',
            'return_scheduled_on' => '2026-12-21',
            'status' => 'confirmed',
            'total_amount' => 10000,
        ]);
    }

    private function track(): array
    {
        return $this->postJson('/api/public/find-client', ['phone' => '01012340000'])->assertOk()->json();
    }

    public function test_without_a_booking_she_is_at_the_visit_step(): void
    {
        $this->assertSame('visit', $this->track()['journey_step']);
    }

    public function test_a_confirmed_booking_far_from_pickup_is_the_booking_step(): void
    {
        $this->book();
        $this->assertSame('booking', $this->track()['journey_step']);
    }

    public function test_fittings_never_change_the_step_and_are_listed_without_cancelled_ones(): void
    {
        $booking = $this->book();
        Fitting::create(['booking_id' => $booking->id, 'fitting_date' => '2026-10-20', 'status' => 'scheduled']);
        Fitting::create(['booking_id' => $booking->id, 'fitting_date' => '2026-10-10', 'status' => 'completed']);
        Fitting::create(['booking_id' => $booking->id, 'fitting_date' => '2026-10-15', 'status' => 'cancelled']);

        $data = $this->track();
        $this->assertSame('booking', $data['journey_step']);
        $this->assertSame(['2026-10-10', '2026-10-20'], array_column($data['fittings'], 'fitting_date'));
    }

    public function test_pickup_within_15_days_is_the_pickup_step(): void
    {
        $this->book(['event_date' => '2026-10-10', 'pickup_scheduled_on' => '2026-10-09', 'return_scheduled_on' => '2026-10-11']);

        $data = $this->track();
        $this->assertSame('pickup', $data['journey_step']);
        $this->assertSame('2026-10-09', $data['bookings'][0]['pickup_scheduled_on']);
    }

    public function test_a_dress_out_with_her_is_not_shown_as_returned(): void
    {
        $this->book(['status' => 'picked_up', 'event_date' => '2026-10-02', 'pickup_scheduled_on' => '2026-10-01', 'return_scheduled_on' => '2026-10-03']);

        $data = $this->track();
        $this->assertSame('returned', $data['current_stage']);
        $this->assertSame('with_bride', $data['journey_step']);
        $this->assertSame('2026-10-03', $data['bookings'][0]['return_scheduled_on']);
    }

    public function test_returned_dress_and_the_archive_are_the_returned_step(): void
    {
        $booking = $this->book(['status' => 'returned', 'event_date' => '2026-09-28', 'pickup_scheduled_on' => '2026-09-27', 'return_scheduled_on' => '2026-09-29']);
        $this->assertSame('returned', $this->track()['journey_step']);

        $booking->update(['return_scheduled_on' => '2026-08-01']);
        $data = $this->track();
        $this->assertSame('completed', $data['current_stage']);
        $this->assertSame('returned', $data['journey_step']);
    }

    public function test_a_cancelled_booking_is_its_own_step(): void
    {
        $this->book(['status' => 'cancelled', 'cancelled_at' => now()]);
        $this->assertSame('cancelled', $this->track()['journey_step']);
    }

    public function test_the_latest_booking_comes_first(): void
    {
        $this->book(['status' => 'cancelled', 'cancelled_at' => now()->subMonth()]);
        $latest = $this->book();

        $this->assertSame($latest->id, $this->track()['bookings'][0]['id']);
    }
}
