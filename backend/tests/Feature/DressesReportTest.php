<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Client;
use App\Models\Dress;
use App\Models\User;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DressesReportTest extends TestCase
{

    private function book(array $dressIds, string $status, string $bookingDate = '2099-03-05', string $eventDate = '2099-06-20'): void
    {
        $client = Client::create(['name' => 'Bride ' . uniqid(), 'phone' => '01000000000', 'city' => 'القاهرة']);
        Booking::create([
            'client_id' => $client->id,
            'dress_id' => $dressIds[0],
            'dress_2_id' => $dressIds[1] ?? null,
            'booking_date' => $bookingDate,
            'event_date' => $eventDate,
            'status' => $status,
            'total_amount' => 10000,
        ]);
    }

    public function test_dresses_with_open_bookings_show_as_booked_or_out_even_when_stored_status_is_available()
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
        $before = $this->getJson('/api/reports/dresses?sort=all')->assertOk()->json('status_counts');

        $booked = Dress::factory()->create(['status' => 'available']);
        $second = Dress::factory()->create(['status' => 'available']);
        $out = Dress::factory()->create(['status' => 'available']);
        $returned = Dress::factory()->create(['status' => 'available']);
        $cancelled = Dress::factory()->create(['status' => 'available']);
        $this->book([$booked->id, $second->id], 'confirmed');
        $this->book([$out->id], 'confirmed');
        $this->book([$out->id], 'picked_up');
        $this->book([$returned->id], 'returned');
        $this->book([$cancelled->id], 'cancelled');

        $res = $this->getJson('/api/reports/dresses?sort=all')->assertOk();
        $status = collect($res->json('dresses'))->pluck('status', 'id');

        $this->assertSame('booked', $status[$booked->id]);
        $this->assertSame('booked', $status[$second->id]);
        $this->assertSame('out', $status[$out->id]);
        $this->assertSame('available', $status[$returned->id]);
        $this->assertSame('available', $status[$cancelled->id]);

        $after = $res->json('status_counts');
        $this->assertSame($before['booked'] + 2, $after['booked']);
        $this->assertSame($before['out'] + 1, $after['out']);
        $this->assertSame($before['ready'] + 2, $after['ready']);
    }

    public function test_multi_dress_booking_amount_is_split_by_each_dress_rental_price()
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
        // Booking total is 10000 (see book()); prices 6000 + 2000 → 7500 / 2500
        $expensive = Dress::factory()->create(['rental_price' => 6000]);
        $cheap = Dress::factory()->create(['rental_price' => 2000]);
        $this->book([$expensive->id, $cheap->id], 'confirmed');
        // A dress without a rental price falls back to an equal split
        $priced = Dress::factory()->create(['rental_price' => 6000]);
        $unpriced = Dress::factory()->create(['rental_price' => 0]);
        $this->book([$priced->id, $unpriced->id], 'confirmed');

        $revenue = collect($this->getJson('/api/reports/dresses?sort=all')->assertOk()->json('dresses'))->pluck('total_revenue', 'id');

        $this->assertEquals(7500, $revenue[$expensive->id]);
        $this->assertEquals(2500, $revenue[$cheap->id]);
        $this->assertEquals(5000, $revenue[$priced->id]);
        $this->assertEquals(5000, $revenue[$unpriced->id]);
    }

    public function test_period_can_filter_by_wedding_date_instead_of_booking_date()
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
        $dress = Dress::factory()->create();
        // Booked in March for a June wedding
        $this->book([$dress->id], 'confirmed', '2099-03-05', '2099-06-20');

        $timesBooked = fn(string $query) => collect($this->getJson('/api/reports/dresses?sort=all&' . $query)->assertOk()->json('dresses'))
            ->firstWhere('id', $dress->id)['times_booked'];

        $this->assertSame(1, $timesBooked('from_date=2099-03-01&to_date=2099-03-31'));
        $this->assertSame(0, $timesBooked('from_date=2099-06-01&to_date=2099-06-30'));
        $this->assertSame(1, $timesBooked('from_date=2099-06-01&to_date=2099-06-30&date_by=event'));
        $this->assertSame(0, $timesBooked('from_date=2099-03-01&to_date=2099-03-31&date_by=event'));
        $this->getJson('/api/reports/dresses?date_by=wrong')->assertStatus(422);
    }

    public function test_home_dresses_strip_shows_dresses_with_open_bookings_as_booked()
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
        $booked = Dress::factory()->create(['status' => 'available']);
        $free = Dress::factory()->create(['status' => 'available']);
        $returned = Dress::factory()->create(['status' => 'available']);
        $this->book([$booked->id], 'confirmed');
        $this->book([$returned->id], 'returned');

        $stage = collect($this->getJson('/api/dashboard/dresses-summary')->assertOk()->json())->pluck('current_stage', 'id');

        $this->assertSame('booked', $stage[$booked->id]);
        $this->assertSame('ready', $stage[$free->id]);
        $this->assertSame('ready', $stage[$returned->id]);
    }
}
