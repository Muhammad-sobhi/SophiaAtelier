<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Client;
use App\Models\Dress;
use App\Models\Fitting;
use App\Models\User;
use App\Models\Visit;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CalendarEventsTest extends TestCase
{
    use DatabaseTransactions;

    private function makeBooking(Client $client, array $attrs = []): Booking
    {
        return Booking::create($attrs + [
            'client_id' => $client->id,
            'dress_id' => Dress::factory()->create()->id,
            'booking_date' => '2099-03-05',
            'event_date' => '2099-03-20',
            'status' => 'confirmed',
            'total_amount' => 10000,
        ]);
    }

    private function eventsFor(int $clientId, string $start = '2099-03-01', string $end = '2099-03-31'): array
    {
        $events = $this->getJson("/api/calendar/events?start_date={$start}&end_date={$end}")
            ->assertOk()
            ->json('events');

        return collect($events)->where('client_id', $clientId)
            ->map(fn ($e) => $e['type'] . '@' . $e['date'])
            ->sort()->values()->all();
    }

    public function test_each_appointment_is_one_event_on_its_own_date()
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
        $client = Client::create(['name' => 'Bride ' . uniqid(), 'phone' => '01000000000', 'city' => 'القاهرة']);

        Visit::create(['client_id' => $client->id, 'visit_date' => '2099-03-02', 'status' => 'done']);
        // Visit that produced the booking is shown only as the booking
        Visit::create(['client_id' => $client->id, 'visit_date' => '2099-03-05', 'status' => 'booked']);
        $booking = $this->makeBooking($client);
        Fitting::create(['booking_id' => $booking->id, 'fitting_date' => '2099-03-12', 'status' => 'scheduled']);

        // Cairo: pickup 1 day before the wedding, return 1 day after
        $this->assertSame([
            'booking@2099-03-05',
            'fitting@2099-03-12',
            'pickup@2099-03-19',
            'return@2099-03-21',
            'visit@2099-03-02',
        ], $this->eventsFor($client->id));
    }

    public function test_cancelled_bookings_and_their_fittings_are_excluded()
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
        $client = Client::create(['name' => 'Bride ' . uniqid(), 'phone' => '01000000000', 'city' => 'القاهرة']);

        $cancelled = $this->makeBooking($client, ['status' => 'cancelled', 'booking_date' => '2099-03-01']);
        Fitting::create(['booking_id' => $cancelled->id, 'fitting_date' => '2099-03-10', 'status' => 'scheduled']);
        $this->makeBooking($client, [
            'booking_date' => '2099-03-03',
            'pickup_scheduled_on' => '2099-03-18',
            'return_scheduled_on' => '2099-03-22',
        ]);

        $this->assertSame([
            'booking@2099-03-03',
            'pickup@2099-03-18',
            'return@2099-03-22',
        ], $this->eventsFor($client->id));
    }

    public function test_range_only_returns_events_inside_it()
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
        $client = Client::create(['name' => 'Bride ' . uniqid(), 'phone' => '01000000000', 'city' => 'القاهرة']);
        $this->makeBooking($client, ['booking_date' => '2099-02-25', 'event_date' => '2099-03-01']);

        // Pickup falls on Feb 28 (derived from the wedding date), return on Mar 2
        $this->assertSame(['return@2099-03-02'], $this->eventsFor($client->id));
        $this->assertSame(['booking@2099-02-25', 'pickup@2099-02-28'], $this->eventsFor($client->id, '2099-02-01', '2099-02-28'));
    }

    public function test_months_counts_events_per_type()
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
        $client = Client::create(['name' => 'Bride ' . uniqid(), 'phone' => '01000000000', 'city' => 'القاهرة']);
        $this->makeBooking($client, ['booking_date' => '2099-07-05', 'event_date' => '2099-07-20']);

        $month = collect($this->getJson('/api/calendar/months')->assertOk()->json('months'))
            ->firstWhere('month', '2099-07');

        $this->assertSame(['booking' => 1, 'pickup' => 1, 'return' => 1], collect($month['counts'])->sortKeys()->all());
    }

    public function test_invalid_range_is_rejected()
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));

        $this->getJson('/api/calendar/events?start_date=2099-03-31&end_date=2099-03-01')->assertStatus(422);
        $this->getJson('/api/calendar/events?start_date=bad')->assertStatus(422);
    }
}
