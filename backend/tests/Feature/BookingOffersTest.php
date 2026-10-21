<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Client;
use App\Models\Dress;
use App\Models\Offer;
use App\Models\User;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BookingOffersTest extends TestCase
{
    private Dress $dress;

    private Client $bride;

    protected function setUp(): void
    {
        parent::setUp();
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
        $this->dress = Dress::factory()->create();
        $this->bride = Client::create(['name' => 'Offer Bride', 'phone' => '01033333333', 'city' => 'القاهرة']);
    }

    private function offer(array $overrides = []): Offer
    {
        $today = now('Africa/Cairo');

        return Offer::create(array_merge([
            'name' => 'White Friday',
            'type' => 'percentage',
            'value' => 20,
            'scope' => 'all',
            'starts_at' => $today->copy()->subDay()->toDateString(),
            'ends_at' => $today->copy()->addDays(5)->toDateString(),
        ], $overrides));
    }

    private function confirmBooking(array $data)
    {
        return $this->putJson("/api/clients/{$this->bride->id}/stage-action", array_merge([
            'action' => 'confirm_booking',
            'dress_id' => $this->dress->id,
            'event_date' => '2027-03-10',
        ], $data));
    }

    public function test_journey_booking_records_the_offer_and_its_discount(): void
    {
        $offer = $this->offer();

        // 12,000 rent − 20% = 9,600 paid
        $this->confirmBooking(['total_amount' => 9600, 'offer_id' => $offer->id, 'discount_amount' => 2400])->assertOk();

        $booking = $this->bride->bookings()->first();
        $this->assertSame($offer->id, $booking->offer_id);
        $this->assertEquals(9600, $booking->total_amount);
        $this->assertEquals(2400, $booking->discount_amount);
    }

    public function test_discount_that_does_not_match_the_offer_is_rejected(): void
    {
        $offer = $this->offer();

        $this->confirmBooking(['total_amount' => 9000, 'offer_id' => $offer->id, 'discount_amount' => 3000])
            ->assertJsonValidationErrors('discount_amount');
        $this->assertSame(0, $this->bride->bookings()->count());
    }

    public function test_offer_must_be_running_and_cover_a_booked_dress(): void
    {
        $ended = $this->offer(['starts_at' => '2026-01-01', 'ends_at' => '2026-01-10']);
        $this->confirmBooking(['total_amount' => 9600, 'offer_id' => $ended->id, 'discount_amount' => 2400])
            ->assertJsonValidationErrors('offer_id');

        $otherDress = Dress::factory()->create();
        $picked = $this->offer(['scope' => 'dresses']);
        $picked->dresses()->sync([$otherDress->id]);
        $this->confirmBooking(['total_amount' => 9600, 'offer_id' => $picked->id, 'discount_amount' => 2400])
            ->assertJsonValidationErrors('offer_id');
    }

    public function test_fixed_and_perk_offers(): void
    {
        $fixed = $this->offer(['type' => 'fixed', 'value' => 500]);
        $this->confirmBooking(['total_amount' => 4500, 'offer_id' => $fixed->id, 'discount_amount' => 500])->assertOk();
        $this->assertEquals(500, $this->bride->bookings()->first()->discount_amount);

        // A free perk takes nothing off the price
        $perk = $this->offer(['type' => 'perk', 'value' => null, 'perk_ar' => 'تجربة مجانية']);
        $this->confirmBooking(['total_amount' => 5000, 'offer_id' => $perk->id, 'discount_amount' => 300])->assertOk();
        $booking = $this->bride->bookings()->first();
        $this->assertSame($perk->id, $booking->offer_id);
        $this->assertEquals(0, $booking->discount_amount);
    }

    public function test_edits_without_offer_fields_keep_it_and_an_ended_offer_stays_on_its_booking(): void
    {
        $offer = $this->offer();
        $this->confirmBooking(['total_amount' => 9600, 'offer_id' => $offer->id, 'discount_amount' => 2400])->assertOk();
        $booking = $this->bride->bookings()->first();

        // Payment-only edit from another screen
        $this->putJson("/api/bookings/{$booking->id}", ['deposit_amount' => 3000])->assertOk();
        $this->assertSame($offer->id, $booking->fresh()->offer_id);

        // The offer ends; re-saving the booking with the same offer and discount still works
        $offer->update(['ends_at' => now('Africa/Cairo')->subDay()->toDateString(), 'starts_at' => '2026-01-01']);
        $this->confirmBooking(['total_amount' => 9600, 'offer_id' => $offer->id, 'discount_amount' => 2400])->assertOk();

        // Removing the offer clears the discount
        $this->putJson("/api/bookings/{$booking->id}", ['total_amount' => 12000, 'offer_id' => null])->assertOk();
        $fresh = $booking->fresh();
        $this->assertNull($fresh->offer_id);
        $this->assertEquals(0, $fresh->discount_amount);
    }

    public function test_bookings_api_applies_an_offer_on_create(): void
    {
        $offer = $this->offer();

        $this->postJson('/api/bookings', [
            'client_id' => $this->bride->id,
            'dress_id' => $this->dress->id,
            'booking_date' => now()->toDateString(),
            'event_date' => '2027-03-10',
            'total_amount' => 8000,
            'offer_id' => $offer->id,
            'discount_amount' => 2000,
        ])->assertCreated()->assertJson(['offer_id' => $offer->id, 'discount_amount' => '2000.00']);

        $this->assertSame(1, Booking::where('offer_id', $offer->id)->count());
    }

    public function test_deleting_an_offer_keeps_its_bookings(): void
    {
        $offer = $this->offer();
        $this->confirmBooking(['total_amount' => 9600, 'offer_id' => $offer->id, 'discount_amount' => 2400])->assertOk();

        $this->deleteJson("/api/offers/{$offer->id}")->assertOk();

        $booking = $this->bride->bookings()->first();
        $this->assertNull($booking->offer_id);
        $this->assertEquals(9600, $booking->total_amount);
    }
}
