<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Client;
use App\Models\Dress;
use App\Models\Fitting;
use App\Models\Revenue;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CancelBookingTest extends TestCase
{
    use DatabaseTransactions;

    private function bookedBride(string $status = 'confirmed'): array
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));

        $dress = Dress::factory()->create(['status' => 'booked']);
        $client = Client::create(['name' => 'Test Bride', 'phone' => '01000000000', 'city' => 'القاهرة']);
        $booking = Booking::create([
            'client_id' => $client->id,
            'dress_id' => $dress->id,
            'booking_date' => now()->toDateString(),
            'event_date' => now()->addMonths(2)->toDateString(),
            'status' => $status,
            'total_amount' => 10000,
            'deposit_amount' => 3000,
            'insurance_amount' => 5000,
        ]);
        Revenue::create(['booking_id' => $booking->id, 'type' => 'deposit', 'amount' => 3000, 'payment_method' => 'cash', 'payment_date' => now()->toDateString()]);
        Revenue::create(['booking_id' => $booking->id, 'type' => 'insurance', 'amount' => 5000, 'payment_method' => 'cash', 'payment_date' => now()->toDateString()]);

        return [$client, $booking, $dress];
    }

    public function test_cancel_booking_with_partial_refunds_updates_booking_dress_fittings_and_finance()
    {
        [$client, $booking, $dress] = $this->bookedBride();
        $fitting = Fitting::create([
            'booking_id' => $booking->id,
            'client_id' => $client->id,
            'dress_id' => $dress->id,
            'fitting_date' => now()->addDays(5)->toDateString(),
            'status' => 'scheduled',
        ]);

        $this->putJson("/api/clients/{$client->id}/stage-action", [
            'action' => 'cancel_booking',
            'cancellation_reason' => 'wedding_cancelled',
            'cancellation_note' => 'العريس سافر',
            'deposit_refund' => 1000,
            'deposit_refund_method' => 'instapay',
            'insurance_refund' => 5000,
        ])->assertOk()->assertJsonPath('current_stage', 'cancelled');

        $booking->refresh();
        $this->assertSame('cancelled', $booking->status);
        $this->assertSame('wedding_cancelled', $booking->cancellation_reason);
        $this->assertSame('booking', $booking->cancelled_stage);
        $this->assertNotNull($booking->cancelled_at);
        $this->assertSame('available', $dress->fresh()->status);
        $this->assertSame('cancelled', $fitting->fresh()->status);

        $refunds = $booking->revenues()->whereIn('type', ['deposit_refund', 'insurance_refund'])->pluck('amount', 'type');
        $this->assertEquals(-1000, $refunds['deposit_refund']);
        $this->assertEquals(-5000, $refunds['insurance_refund']);
        $this->assertSame('instapay', $booking->revenues()->where('type', 'deposit_refund')->value('payment_method'));

        $report = $this->getJson('/api/reports/cancellations')->assertOk();
        $row = collect($report->json('data'))->firstWhere('booking_id', $booking->id);
        $this->assertEquals(1000, $row['deposit_refund']);
        $this->assertEquals(5000, $row['insurance_refund']);
        $this->assertEquals(2000, $row['kept_amount']);
        $this->assertSame('إلغاء الفرح', $row['reason_label']);
    }

    public function test_insurance_refund_reduces_held_insurance_not_revenue()
    {
        [$client, $booking] = $this->bookedBride();
        $today = now()->toDateString();
        $before = $this->getJson("/api/finance/summary?start_date={$today}&end_date={$today}")->json();

        $this->putJson("/api/clients/{$client->id}/stage-action", [
            'action' => 'cancel_booking',
            'cancellation_reason' => 'financial',
            'deposit_refund' => 0,
            'insurance_refund' => 5000,
        ])->assertOk();

        $after = $this->getJson("/api/finance/summary?start_date={$today}&end_date={$today}")->json();
        $this->assertEquals($before['net_revenue'], $after['net_revenue']);
        $this->assertEquals($before['held_insurances'] - 5000, $after['held_insurances']);
    }

    public function test_refund_above_paid_amount_is_rejected()
    {
        [$client, $booking] = $this->bookedBride();

        $this->putJson("/api/clients/{$client->id}/stage-action", [
            'action' => 'cancel_booking',
            'cancellation_reason' => 'financial',
            'deposit_refund' => 3500,
        ])->assertStatus(422);

        $this->assertSame('confirmed', $booking->fresh()->status);
        $this->assertSame(0, $booking->revenues()->where('type', 'deposit_refund')->count());
    }

    public function test_reason_is_required_and_other_needs_a_note()
    {
        [$client] = $this->bookedBride();

        $this->putJson("/api/clients/{$client->id}/stage-action", ['action' => 'cancel_booking'])
            ->assertStatus(422)->assertJsonValidationErrors('cancellation_reason');

        $this->putJson("/api/clients/{$client->id}/stage-action", ['action' => 'cancel_booking', 'cancellation_reason' => 'other'])
            ->assertStatus(422)->assertJsonValidationErrors('cancellation_note');
    }

    public function test_cannot_cancel_after_dress_was_picked_up()
    {
        [$client, $booking] = $this->bookedBride('picked_up');

        $this->putJson("/api/clients/{$client->id}/stage-action", [
            'action' => 'cancel_booking',
            'cancellation_reason' => 'financial',
        ])->assertStatus(422);

        $this->assertSame('picked_up', $booking->fresh()->status);
    }
}
