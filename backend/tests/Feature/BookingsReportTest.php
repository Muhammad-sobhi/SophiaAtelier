<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Client;
use App\Models\Dress;
use App\Models\Revenue;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BookingsReportTest extends TestCase
{
    use DatabaseTransactions;

    private function makeBooking(string $bookingDate, array $payments = [], string $status = 'confirmed', ?Dress $dress2 = null, string $eventDate = '2099-06-20'): Booking
    {
        $client = Client::create(['name' => 'Bride ' . uniqid(), 'phone' => '01000000000', 'city' => 'القاهرة']);
        $booking = Booking::create([
            'client_id' => $client->id,
            'dress_id' => Dress::factory()->create()->id,
            'dress_2_id' => $dress2?->id,
            'booking_date' => $bookingDate,
            'event_date' => $eventDate,
            'status' => $status,
            'total_amount' => 10000,
        ]);
        foreach ($payments as $type => $amount) {
            Revenue::create(['booking_id' => $booking->id, 'type' => $type, 'amount' => $amount, 'payment_method' => 'cash', 'payment_date' => $bookingDate]);
        }

        return $booking;
    }

    public function test_month_report_groups_by_booking_day_and_computes_paid_and_remaining()
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));

        $this->makeBooking('2099-03-05', ['deposit' => 2000, 'balance' => 1000, 'insurance' => 5000], 'confirmed', Dress::factory()->create());
        $this->makeBooking('2099-03-05');
        $this->makeBooking('2099-03-10', ['deposit' => 4000]);
        $this->makeBooking('2099-03-12', ['deposit' => 9000], 'cancelled');
        $this->makeBooking('2099-04-01', ['deposit' => 1000]);

        $res = $this->getJson('/api/reports/bookings?month=2099-03')->assertOk();

        $res->assertJsonPath('summary.count', 3)
            ->assertJsonPath('summary.sure_count', 2)
            ->assertJsonPath('summary.unsure_count', 1);
        $this->assertEquals(30000, $res->json('summary.total_amount'));
        $this->assertEquals(7000, $res->json('summary.paid'));
        $this->assertEquals(23000, $res->json('summary.remaining'));

        $days = $res->json('days');
        $this->assertSame(['2099-03-10', '2099-03-05'], array_column($days, 'date'));
        $this->assertSame(2, $days[1]['count']);
        $this->assertEquals(3000, $days[1]['paid']);
        $this->assertEquals(17000, $days[1]['remaining']);

        $paidBooking = collect($days[1]['bookings'])->firstWhere('paid', 3000);
        $this->assertTrue($paidBooking['is_sure']);
        $this->assertCount(2, $paidBooking['dresses']);
        $this->assertSame('2099-06-20', $paidBooking['event_date']);
    }

    public function test_certainty_filter_returns_only_sure_or_unsure_bookings()
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));

        $this->makeBooking('2099-03-05', ['deposit' => 2000]);
        $this->makeBooking('2099-03-06');

        $this->getJson('/api/reports/bookings?month=2099-03&certainty=sure')->assertOk()
            ->assertJsonPath('summary.count', 1)
            ->assertJsonPath('days.0.bookings.0.is_sure', true);

        $this->getJson('/api/reports/bookings?month=2099-03&certainty=unsure')->assertOk()
            ->assertJsonPath('summary.count', 1)
            ->assertJsonPath('days.0.bookings.0.is_sure', false);

        $this->getJson('/api/reports/bookings?month=bad')->assertStatus(422);
    }

    public function test_wedding_date_mode_groups_by_event_day_in_upcoming_order()
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));

        $this->makeBooking('2099-01-05', ['deposit' => 2000], 'confirmed', null, '2099-07-20');
        $this->makeBooking('2099-02-10', [], 'confirmed', null, '2099-07-03');
        $this->makeBooking('2099-02-11', ['deposit' => 5000], 'cancelled', null, '2099-07-03');
        $this->makeBooking('2099-02-12', [], 'confirmed', null, '2099-08-01');

        $res = $this->getJson('/api/reports/bookings?month=2099-07&date_by=event')->assertOk()
            ->assertJsonPath('date_by', 'event')
            ->assertJsonPath('summary.count', 2)
            ->assertJsonPath('summary.sure_count', 1);
        $this->assertSame(['2099-07-03', '2099-07-20'], array_column($res->json('days'), 'date'));
        $this->assertSame('2099-02-10', $res->json('days.0.bookings.0.booking_date'));

        // Booking-date mode remains the default
        $this->getJson('/api/reports/bookings?month=2099-07')->assertOk()
            ->assertJsonPath('date_by', 'booking')
            ->assertJsonPath('summary.count', 0);
        $this->getJson('/api/reports/bookings?month=2099-07&date_by=bad')->assertStatus(422);
    }
}
