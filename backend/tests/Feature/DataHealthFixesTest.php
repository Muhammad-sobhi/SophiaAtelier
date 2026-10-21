<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Client;
use App\Models\Dress;
use App\Models\Revenue;
use App\Models\User;
use App\Models\Visit;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Every fix offered on the data-health page, sent exactly as the page sends it:
 * the change is saved, the row leaves its check (the counter drops) and the reports show the new data.
 */
class DataHealthFixesTest extends TestCase
{

    protected function setUp(): void
    {
        parent::setUp();
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
    }

    private function booking(array $attrs = []): Booking
    {
        static $n = 0;
        $client = Client::create(['name' => 'Bride ' . ++$n, 'phone' => '0105555' . str_pad($n, 4, '0', STR_PAD_LEFT), 'city' => 'القاهرة']);

        return Booking::create($attrs + [
            'client_id' => $client->id, 'dress_id' => Dress::factory()->create()->id, 'status' => 'returned',
            'booking_date' => '2026-06-01', 'event_date' => '2026-08-15',
            'pickup_scheduled_on' => '2026-08-14', 'return_scheduled_on' => '2026-08-16', 'total_amount' => 5000,
        ]);
    }

    private function pay(Booking $b, string $type, float $amount, ?string $date = '2026-06-01'): Revenue
    {
        return Revenue::create(['booking_id' => $b->id, 'type' => $type, 'amount' => $amount, 'payment_method' => 'cash', 'payment_date' => $date]);
    }

    private function flagged(string $check): array
    {
        $count = collect($this->getJson('/api/data-health')->assertOk()->json())->firstWhere('key', $check)['count'];
        $ids = collect($this->getJson("/api/data-health/{$check}")->assertOk()->json('rows'))->pluck('id')->all();
        $this->assertCount($count, $ids, "counter of {$check} matches its rows");

        return $ids;
    }

    private function bookingReportRow(Booking $b, string $month): ?array
    {
        return collect($this->getJson("/api/reports/bookings?month={$month}")->assertOk()->json('days'))
            ->flatMap(fn($d) => $d['bookings'])->firstWhere('booking_id', $b->id);
    }

    public function test_booking_after_wedding_fixed_by_booking_date()
    {
        $b = $this->booking(['booking_date' => '2026-09-20', 'event_date' => '2026-08-15']);
        $this->assertContains($b->id, $this->flagged('booking_after_wedding'));
        $this->assertNotNull($this->bookingReportRow($b, '2026-09'));

        $this->putJson("/api/bookings/{$b->id}", ['booking_date' => '2026-06-10'])->assertOk();

        $this->assertNotContains($b->id, $this->flagged('booking_after_wedding'));
        $this->assertNull($this->bookingReportRow($b, '2026-09'));
        $this->assertSame('2026-06-10', $this->bookingReportRow($b, '2026-06')['booking_date']);
        $this->assertSame('returned', $b->fresh()->status);
    }

    public function test_booking_after_wedding_fixed_by_event_date()
    {
        $b = $this->booking(['booking_date' => '2026-07-01', 'event_date' => '2026-06-15',
            'pickup_scheduled_on' => '2026-06-14', 'return_scheduled_on' => '2026-06-16']);

        $this->putJson("/api/bookings/{$b->id}", ['event_date' => '2026-07-20'])->assertOk();

        $this->assertNotContains($b->id, $this->flagged('booking_after_wedding'));
        $this->assertSame('2026-07-20', $this->bookingReportRow($b, '2026-07')['event_date']);
        $this->assertSame('2026-07-20', substr((string) $b->client->fresh()->wedding_date, 0, 10));
    }

    // booking_date / event_date / payment_date are NOT NULL columns, so the "no date" checks can't be hit
    public function test_future_booking_date_fixed()
    {
        $future = $this->booking(['booking_date' => now()->addDays(5)->toDateString(), 'event_date' => now()->addDays(40)->toDateString(),
            'pickup_scheduled_on' => now()->addDays(39)->toDateString(), 'return_scheduled_on' => now()->addDays(41)->toDateString(), 'status' => 'confirmed']);
        $this->assertContains($future->id, $this->flagged('booking_future_date'));

        $this->putJson("/api/bookings/{$future->id}", ['booking_date' => now()->toDateString()])->assertOk();

        $this->assertNotContains($future->id, $this->flagged('booking_future_date'));
        $this->assertNotNull($this->bookingReportRow($future, now()->format('Y-m')));
    }

    public function test_zero_total_fixed_even_when_the_dress_overlaps_another_booking()
    {
        $b = $this->booking(['total_amount' => 0, 'status' => 'confirmed']);
        // Another active booking of the same dress on the same days must not block a price fix
        $this->booking(['dress_id' => $b->dress_id, 'status' => 'confirmed']);
        $this->assertContains($b->id, $this->flagged('booking_zero_total'));

        $this->putJson("/api/bookings/{$b->id}", ['total_amount' => 4500])->assertOk();

        $this->assertNotContains($b->id, $this->flagged('booking_zero_total'));
        $this->assertEquals(4500, $this->bookingReportRow($b, '2026-06')['total_amount']);

        // Moving a booking onto a dress that is already booked on those days is still refused
        $other = $this->booking(['status' => 'confirmed']);
        $this->putJson("/api/bookings/{$other->id}", ['dress_id' => $b->dress_id])->assertStatus(422);
    }

    public function test_unpaid_after_return_fixed_by_recording_the_balance()
    {
        $b = $this->booking();
        $this->pay($b, 'deposit', 2000);
        $this->assertContains($b->id, $this->flagged('booking_unpaid_after_pickup'));
        $this->assertEquals(3000, $this->bookingReportRow($b, '2026-06')['remaining']);

        // Payments screen → add payment (type balance)
        $this->postJson('/api/revenues', ['booking_id' => $b->id, 'type' => 'balance', 'amount' => 3000,
            'payment_method' => 'cash', 'payment_date' => '2026-08-14', 'notes' => 'سداد دفعة'])->assertCreated();

        $this->assertNotContains($b->id, $this->flagged('booking_unpaid_after_pickup'));
        $row = $this->bookingReportRow($b, '2026-06');
        $this->assertEquals(5000, $row['paid']);
        $this->assertEquals(0, $row['remaining']);
    }

    public function test_unpaid_after_return_fixed_by_a_discount_on_the_total()
    {
        $b = $this->booking();
        $this->pay($b, 'deposit', 4500);

        // Payments screen → save prices
        $this->putJson("/api/bookings/{$b->id}", ['total_amount' => 4500, 'insurance_amount' => 0])->assertOk();

        $this->assertNotContains($b->id, $this->flagged('booking_unpaid_after_pickup'));
        $this->assertEquals(0, $this->bookingReportRow($b, '2026-06')['remaining']);
    }

    public function test_overpaid_fixed_by_deleting_the_duplicate_payment()
    {
        $b = $this->booking();
        $this->pay($b, 'deposit', 3000);
        $dup = $this->pay($b, 'balance', 3000);
        $this->pay($b, 'balance', 2000);
        $this->assertContains($b->id, $this->flagged('booking_overpaid'));

        $this->deleteJson("/api/revenues/{$dup->id}")->assertOk();

        $this->assertNotContains($b->id, $this->flagged('booking_overpaid'));
        $this->assertEquals(5000, $this->bookingReportRow($b, '2026-06')['paid']);
    }

    public function test_bad_schedule_fixed_by_pickup_and_return_dates()
    {
        $b = $this->booking(['pickup_scheduled_on' => '2026-08-20', 'return_scheduled_on' => '2026-08-10']);
        $this->assertContains($b->id, $this->flagged('booking_bad_schedule'));

        $this->putJson("/api/bookings/{$b->id}", ['pickup_scheduled_on' => '2026-08-14', 'return_scheduled_on' => '2026-08-16'])->assertOk();

        $this->assertNotContains($b->id, $this->flagged('booking_bad_schedule'));
    }

    public function test_duplicate_booking_deleted_with_its_payments()
    {
        $b = $this->booking();
        $dup = Booking::create($b->only(['client_id', 'dress_id', 'status', 'booking_date', 'event_date', 'pickup_scheduled_on', 'return_scheduled_on', 'total_amount']));
        $this->pay($dup, 'deposit', 5000);
        $this->assertContains($dup->id, $this->flagged('booking_duplicate'));

        $this->deleteJson("/api/bookings/{$dup->id}")->assertOk();

        $this->assertNotContains($b->id, $this->flagged('booking_duplicate'));
        $this->assertNull($this->bookingReportRow($dup, '2026-06'));
        $this->assertSame(0, Revenue::where('booking_id', $dup->id)->count());
        $this->assertNotContains($dup->id, $this->flagged('revenue_rent_no_booking'));
    }

    public function test_payment_date_and_amount_fixes()
    {
        $b = $this->booking(['booking_date' => '2026-06-10']);
        $early = $this->pay($b, 'deposit', 1000, '2026-06-01');
        $future = $this->pay($b, 'balance', 1000, now()->addDays(3)->toDateString());
        $zero = $this->pay($b, 'balance', 0);
        $this->assertContains($early->id, $this->flagged('revenue_deposit_before_booking'));
        $this->assertContains($future->id, $this->flagged('revenue_future'));
        $this->assertContains($zero->id, $this->flagged('revenue_non_positive'));

        $this->putJson("/api/revenues/{$early->id}", ['payment_date' => '2026-06-10'])->assertOk();
        $this->putJson("/api/revenues/{$future->id}", ['payment_date' => now()->toDateString()])->assertOk();
        $this->putJson("/api/revenues/{$zero->id}", ['amount' => 3000])->assertOk();

        $this->assertNotContains($early->id, $this->flagged('revenue_deposit_before_booking'));
        $this->assertNotContains($future->id, $this->flagged('revenue_future'));
        $this->assertNotContains($zero->id, $this->flagged('revenue_non_positive'));
        $this->assertEquals(5000, $this->bookingReportRow($b, '2026-06')['paid']);
    }

    public function test_stale_visits_closed_and_orphan_visit_deleted()
    {
        $client = Client::create(['name' => 'Visit Bride', 'phone' => '01055559999', 'city' => 'القاهرة']);
        $open = Visit::create(['client_id' => $client->id, 'visit_date' => '2026-09-01', 'status' => 'confirmed']);
        $this->assertContains($open->id, $this->flagged('visit_stale_open'));
        $visitsBefore = $this->getJson('/api/reports/visits?from=2026-09-01&to=2026-09-30')->assertOk()->json();

        $this->postJson('/api/data-health/close-visits', ['ids' => [$open->id], 'status' => 'done'])->assertOk();

        $this->assertNotContains($open->id, $this->flagged('visit_stale_open'));
        $this->assertNotEquals($visitsBefore, $this->getJson('/api/reports/visits?from=2026-09-01&to=2026-09-30')->json());

        $client->forceDelete();
        $orphan = Visit::create(['client_id' => Client::create(['name' => 'Gone', 'phone' => '01055558888', 'city' => 'القاهرة'])->id,
            'visit_date' => '2026-09-02', 'status' => 'done']);
        $orphan->client->delete();
        $this->assertContains($orphan->id, $this->flagged('visit_no_client'));

        $this->deleteJson("/api/visits/{$orphan->id}")->assertOk();

        $this->assertNotContains($orphan->id, $this->flagged('visit_no_client'));
    }
}
