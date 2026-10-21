<?php

namespace Tests\Feature;

use App\Models\ActivityLog;
use App\Models\Booking;
use App\Models\Client;
use App\Models\Dress;
use App\Models\Fitting;
use App\Models\Revenue;
use App\Models\User;
use App\Models\Visit;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Pins down what each bride journey action does, so moving the code cannot change it.
 * Fittings are an option, not a journey stage: with fittings the bride stays in "booking".
 */
class StageActionsTest extends TestCase
{
    private Client $client;
    private Booking $booking;
    private Dress $dress;

    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo(\Carbon\Carbon::parse('2026-10-01 10:00', 'Africa/Cairo'));
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));

        $this->dress = Dress::factory()->create(['status' => 'booked']);
        $this->client = Client::create(['name' => 'Journey Bride', 'phone' => '01000000001', 'city' => 'القاهرة']);
        $this->booking = Booking::create([
            'client_id' => $this->client->id,
            'dress_id' => $this->dress->id,
            'booking_date' => '2026-09-20',
            'event_date' => '2026-11-20',
            'status' => 'confirmed',
            'total_amount' => 10000,
            'deposit_amount' => 3000,
            'insurance_amount' => 5000,
        ]);
        Revenue::create(['booking_id' => $this->booking->id, 'type' => 'deposit', 'amount' => 3000, 'payment_method' => 'cash', 'payment_date' => '2026-09-20']);
    }

    private function act(array $payload)
    {
        return $this->putJson("/api/clients/{$this->client->id}/stage-action", $payload);
    }

    public function test_schedule_fitting_creates_the_fitting_fee_and_closes_visits(): void
    {
        $visit = Visit::create(['client_id' => $this->client->id, 'visit_date' => '2026-09-15', 'status' => 'booked', 'source' => 'walkin']);

        $this->act([
            'action' => 'schedule_fitting', 'fitting_date' => '2026-10-05', 'fitting_time' => '03:00 م',
            'sales_name' => 'Mona', 'notes' => 'bring shoes',
            'payments' => [['amount' => 200, 'payment_method' => 'instapay'], ['amount' => 0]],
        ])->assertOk()->assertJsonPath('message', 'Action completed')->assertJsonPath('current_stage', 'booking');

        $fitting = Fitting::where('booking_id', $this->booking->id)->sole();
        $this->assertSame('2026-10-05', $fitting->fitting_date->toDateString());
        $this->assertSame('scheduled', $fitting->status);
        $this->assertSame('Mona', $fitting->sales_name);
        $this->assertSame('الوقت: 03:00 م | bring shoes', $fitting->additional_notes);
        $this->assertSame('done', $visit->refresh()->status);

        $fee = Revenue::where('type', 'fitting_fee')->sole();
        $this->assertEquals(200, $fee->amount);
        $this->assertSame('instapay', $fee->payment_method);
        $this->assertSame('2026-10-01', $fee->payment_date->toDateString());
        $this->assertSame(1, ActivityLog::where('action', 'جدولة بروفة قياس')->count());
    }

    public function test_schedule_fitting_rejects_a_dress_out_with_another_bride(): void
    {
        $other = Client::create(['name' => 'Other', 'phone' => '01000000002', 'city' => 'القاهرة']);
        $otherDress = Dress::factory()->create();
        Booking::create([
            'client_id' => $other->id, 'dress_id' => $otherDress->id, 'booking_date' => '2026-09-01', 'event_date' => '2026-10-06',
            'pickup_scheduled_on' => '2026-10-04', 'return_scheduled_on' => '2026-10-08', 'status' => 'picked_up', 'total_amount' => 1,
        ]);

        $this->act(['action' => 'schedule_fitting', 'dress_id' => $otherDress->id, 'fitting_date' => '2026-10-05'])
            ->assertStatus(422)->assertJsonStructure(['message']);
        $this->assertSame(0, Fitting::count());
    }

    public function test_end_fitting_completes_every_fitting(): void
    {
        Fitting::create(['booking_id' => $this->booking->id, 'fitting_date' => '2026-10-02', 'status' => 'scheduled', 'sales_name' => 'Old']);
        Fitting::create(['booking_id' => $this->booking->id, 'fitting_date' => '2026-10-04', 'status' => 'rescheduled']);

        $this->act(['action' => 'end_fitting'])->assertOk()->assertJsonPath('current_stage', 'booking');

        $this->assertSame(['completed', 'completed'], Fitting::orderBy('id')->pluck('status')->all());
        $this->assertSame('Old', Fitting::orderBy('id')->first()->sales_name);
    }

    public function test_end_fitting_without_fittings_records_a_completed_one(): void
    {
        $this->act(['action' => 'end_fitting', 'sales_name' => 'Sara'])->assertOk();

        $fitting = Fitting::sole();
        $this->assertSame('completed', $fitting->status);
        $this->assertSame('Sara', $fitting->sales_name);
    }

    public function test_mark_picked_up_takes_the_dress_out_and_records_pickup_money(): void
    {
        Fitting::create(['booking_id' => $this->booking->id, 'fitting_date' => '2026-10-02', 'status' => 'completed']);

        $this->act([
            'action' => 'mark_picked_up', 'total_amount' => 11000, 'sales_name' => 'Hala',
            'pickup_date' => '2026-11-18', 'return_date' => '2026-11-22',
            'balance_payments' => [['amount' => 8000, 'payment_method' => 'cash']],
            'insurance_payments' => [['amount' => 5000, 'payment_method' => 'instapay']],
        ])->assertOk()->assertJsonPath('current_stage', 'returned');

        $booking = $this->booking->refresh();
        $this->assertSame('picked_up', $booking->status);
        $this->assertEquals(11000, $booking->total_amount);
        $this->assertSame('Hala', $booking->pickup_sales_name);
        $this->assertSame('2026-11-18', $booking->pickup_scheduled_on->toDateString());
        $this->assertSame('2026-11-22', $booking->return_scheduled_on->toDateString());
        $this->assertSame('out', $this->dress->refresh()->status);

        $balance = Revenue::where('type', 'balance')->sole();
        $this->assertEquals(8000, $balance->amount);
        $this->assertSame('2026-11-18', $balance->payment_date->toDateString());
        $this->assertSame('instapay', Revenue::where('type', 'insurance')->sole()->payment_method);
        $this->assertSame(1, Revenue::where('type', 'deposit')->count());
    }

    public function test_mark_returned_settles_the_insurance(): void
    {
        $this->booking->update(['status' => 'picked_up']);
        Revenue::create(['booking_id' => $this->booking->id, 'type' => 'insurance', 'amount' => 5000, 'payment_method' => 'instapay', 'payment_date' => '2026-11-18', 'notes' => 'تأمين الفستان']);

        $this->act(['action' => 'mark_returned', 'return_date' => '2026-11-22', 'damage_deduction' => 500, 'insurance_refund' => 4500])
            ->assertOk();

        $this->assertSame('returned', $this->booking->refresh()->status);
        $this->assertSame('available', $this->dress->refresh()->status);
        $this->assertEquals(500, Revenue::where('type', 'damage_fee')->sole()->amount);
        $refund = Revenue::where('type', 'insurance_refund')->sole();
        $this->assertEquals(-4500, $refund->amount);
        $this->assertSame('instapay', $refund->payment_method);
        $this->assertSame('2026-11-22', $refund->payment_date->toDateString());
    }

    public function test_pay_remaining_records_balance_and_security_deposit(): void
    {
        $this->act([
            'action' => 'pay_remaining', 'payment_date' => '2026-10-03', 'notes' => 'part 2',
            'payments' => [['amount' => 2000, 'payment_method' => 'cash'], ['amount' => 1000, 'payment_method' => 'instapay']],
            'insurance_payments' => [['amount' => 4000, 'payment_method' => 'cash']],
        ])->assertOk();

        $this->assertEquals(3000, Revenue::where('type', 'balance')->sum('amount'));
        $this->assertSame(['2026-10-03'], Revenue::where('type', 'balance')->get()->map(fn($r) => $r->payment_date->toDateString())->unique()->values()->all());
        $this->assertStringContainsString('part 2', Revenue::where('type', 'balance')->first()->notes);
        $this->assertEquals(4000, Revenue::where('type', 'security_deposit')->sole()->amount);
        $this->assertEquals(4000, $this->booking->refresh()->insurance_amount);
    }

    public function test_pay_remaining_single_amount(): void
    {
        $this->act(['action' => 'pay_remaining', 'amount' => 1500, 'payment_method' => 'vodafone_cash'])->assertOk();

        $balance = Revenue::where('type', 'balance')->sole();
        $this->assertEquals(1500, $balance->amount);
        $this->assertSame('vodafone_cash', $balance->payment_method);
        $this->assertSame('2026-10-01', $balance->payment_date->toDateString());
    }

    public function test_actions_on_a_bride_without_booking_do_nothing(): void
    {
        $empty = Client::create(['name' => 'No booking', 'phone' => '01000000009']);

        foreach (['mark_picked_up', 'mark_returned', 'pay_remaining'] as $action) {
            $this->putJson("/api/clients/{$empty->id}/stage-action", ['action' => $action, 'amount' => 100])->assertOk();
        }
        $this->assertSame(1, Revenue::count());
        $this->putJson("/api/clients/{$empty->id}/stage-action", ['action' => 'close_visit', 'visit_status' => 'done'])
            ->assertStatus(422);
    }

    public function test_revert_to_booking_drops_fittings_and_later_money(): void
    {
        Fitting::create(['booking_id' => $this->booking->id, 'fitting_date' => '2026-10-02', 'status' => 'completed']);
        Revenue::create(['booking_id' => $this->booking->id, 'type' => 'balance', 'amount' => 7000, 'payment_method' => 'cash', 'payment_date' => '2026-10-02']);
        $this->booking->update(['status' => 'picked_up']);
        $this->dress->update(['status' => 'out']);

        $this->putJson("/api/bookings/{$this->booking->id}/revert-stage", ['target_stage' => 'booking'])
            ->assertOk()->assertJsonPath('message', 'تم التراجع بنجاح')->assertJsonPath('current_stage', 'booking');

        $this->assertSame(0, Fitting::count());
        $this->assertSame(['deposit'], Revenue::pluck('type')->all());
        $this->assertSame('confirmed', $this->booking->refresh()->status);
        $this->assertSame('available', $this->dress->refresh()->status);
    }

    public function test_revert_to_visit_deletes_the_booking_and_reopens_the_visit(): void
    {
        $visit = Visit::create(['client_id' => $this->client->id, 'visit_date' => '2026-09-15', 'status' => 'booked', 'source' => 'walkin']);

        $this->putJson("/api/bookings/{$this->booking->id}/revert-stage", ['target_stage' => 'visit'])->assertOk();

        $this->assertSame(0, Booking::count());
        $this->assertSame(0, Revenue::count());
        $this->assertSame('arrived', $visit->refresh()->status);
    }

    public function test_revert_back_to_picked_up_and_to_pickup_pending(): void
    {
        $this->booking->update(['status' => 'returned']);
        Revenue::create(['booking_id' => $this->booking->id, 'type' => 'insurance_refund', 'amount' => -5000, 'payment_method' => 'cash', 'payment_date' => '2026-11-22']);

        $this->putJson("/api/bookings/{$this->booking->id}/revert-stage", ['target_stage' => 'picked_up'])->assertOk();
        $this->assertSame('picked_up', $this->booking->refresh()->status);
        $this->assertSame('out', $this->dress->refresh()->status);
        $this->assertSame(0, Revenue::where('type', 'insurance_refund')->count());

        Fitting::create(['booking_id' => $this->booking->id, 'fitting_date' => '2026-10-02', 'status' => 'scheduled']);
        $this->putJson("/api/bookings/{$this->booking->id}/revert-stage", ['target_stage' => 'pickup_pending'])->assertOk();
        $this->assertSame('confirmed', $this->booking->refresh()->status);
        $this->assertSame('available', $this->dress->refresh()->status);
        $this->assertSame('completed', Fitting::sole()->status);
    }

    public function test_revert_to_fitting_reopens_or_creates_a_fitting(): void
    {
        $this->booking->update(['status' => 'picked_up']);

        $this->putJson("/api/bookings/{$this->booking->id}/revert-stage", ['target_stage' => 'fitting'])
            ->assertOk()->assertJsonPath('current_stage', 'booking');

        $fitting = Fitting::sole();
        $this->assertSame('scheduled', $fitting->status);
        $this->assertSame('2026-10-04', $fitting->fitting_date->toDateString());
    }
}
