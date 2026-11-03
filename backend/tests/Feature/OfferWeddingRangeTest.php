<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Dress;
use App\Models\Offer;
use App\Models\User;
use App\Models\Visit;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * An offer with a wedding range (White Friday 6–8 Nov for December–March weddings): it shows on the
 * website from visible_from, lets visits on its days go past the 4-month rule for its dresses, and its
 * discount is only for weddings in the range.
 */
class OfferWeddingRangeTest extends TestCase
{
    private Dress $offerDress;

    private Dress $otherDress;

    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo(\Carbon\Carbon::parse('2026-11-03 12:00', 'Africa/Cairo'));
        $this->offerDress = Dress::factory()->create(['is_website_visible' => true]);
        $this->otherDress = Dress::factory()->create(['is_website_visible' => true]);
    }

    private function whiteFriday(array $overrides = []): Offer
    {
        $offer = Offer::create(array_merge([
            'name' => 'White Friday',
            'type' => 'perk',
            'perk_ar' => 'الأسعار داخل الأتيليه فقط',
            'scope' => 'dresses',
            'terms_ar' => "مسموح بدخول فردين فقط مع العروسة\nمسموح بالتصوير",
            'starts_at' => '2026-11-06',
            'ends_at' => '2026-11-08',
            'visible_from' => '2026-11-01',
            'wedding_from' => '2026-12-01',
            'wedding_until' => '2027-03-31',
        ], $overrides));
        $offer->dresses()->sync([$this->offerDress->id]);

        return $offer;
    }

    private function websitePost(int $dressId, string $visitDate, string $weddingDate)
    {
        return $this->postJson('/api/public/bookings', [
            'client_name' => 'Offer Bride',
            'client_phone' => '010' . random_int(10000000, 99999999),
            'client_city' => 'القاهرة',
            'visit_date' => $visitDate,
            'time_slot' => '02:30 PM',
            'wedding_date' => $weddingDate,
            'dress_ids' => [$dressId],
        ]);
    }

    public function test_announced_offer_shows_on_the_website_with_its_dates_and_terms(): void
    {
        $this->whiteFriday();
        $this->whiteFriday(['visible_from' => null]);

        $this->getJson('/api/public/offers')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.starts_at', '2026-11-06')
            ->assertJsonPath('0.wedding_from', '2026-12-01')
            ->assertJsonPath('0.wedding_until', '2027-03-31')
            ->assertJsonPath('0.terms_ar', "مسموح بدخول فردين فقط مع العروسة\nمسموح بالتصوير")
            ->assertJsonPath('0.dress_ids', [$this->offerDress->id]);
    }

    public function test_offer_days_let_a_march_wedding_book_an_offer_dress(): void
    {
        $this->whiteFriday();

        $this->assertNull(Visit::visitWindowError('2026-11-07', '2027-03-20', [$this->offerDress->id]));
        $this->assertNotNull(Visit::visitWindowError('2026-11-07', '2027-03-20', [$this->otherDress->id]));
        // Outside the offer days, or a wedding after its range, keeps the 4-month rule
        $this->assertNotNull(Visit::visitWindowError('2026-11-05', '2027-03-20', [$this->offerDress->id]));
        $this->assertNotNull(Visit::visitWindowError('2026-11-07', '2027-04-10', [$this->offerDress->id]));

        $this->websitePost($this->offerDress->id, '2026-11-07', '2027-03-20')->assertCreated();
        $this->websitePost($this->otherDress->id, '2026-11-07', '2027-03-20')
            ->assertStatus(422)->assertJsonPath('code', 'visit_too_early');

        $this->postJson('/api/public/availability', [
            'dress_ids' => [$this->offerDress->id], 'visit_date' => '2026-11-08', 'wedding_date' => '2027-03-31',
        ])->assertOk()->assertJsonPath('visit_window_error', null);
    }

    public function test_disabled_offer_or_one_without_a_wedding_range_keeps_the_rule(): void
    {
        $this->whiteFriday(['is_active' => false]);
        $this->whiteFriday(['wedding_from' => null, 'wedding_until' => null]);

        $this->assertNotNull(Visit::visitWindowError('2026-11-07', '2027-03-20', [$this->offerDress->id]));
    }

    public function test_offer_discount_is_only_for_weddings_in_its_range(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
        $this->travelTo(\Carbon\Carbon::parse('2026-11-07 12:00', 'Africa/Cairo'));
        $offer = $this->whiteFriday();
        $book = fn (Client $bride, string $weddingDate) => $this->putJson("/api/clients/{$bride->id}/stage-action", [
            'action' => 'confirm_booking',
            'dress_id' => $this->offerDress->id,
            'event_date' => $weddingDate,
            'total_amount' => 10000,
            'offer_id' => $offer->id,
            'discount_amount' => 0,
        ]);

        $november = Client::create(['name' => 'November Bride', 'phone' => '01055555551', 'city' => 'القاهرة']);
        $book($november, '2026-11-25')->assertJsonValidationErrors('offer_id');
        $this->assertSame(0, $november->bookings()->count());

        $march = Client::create(['name' => 'March Bride', 'phone' => '01055555552', 'city' => 'القاهرة']);
        $book($march, '2027-03-20')->assertOk();
        $this->assertSame($offer->id, $march->bookings()->first()->offer_id);
    }

    public function test_offer_dates_are_validated(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
        $base = [
            'name' => 'White Friday', 'type' => 'perk', 'perk_ar' => 'داخل الأتيليه', 'scope' => 'all',
            'starts_at' => '2026-11-06', 'ends_at' => '2026-11-08',
        ];

        $this->postJson('/api/offers', [...$base, 'visible_from' => '2026-11-07'])->assertJsonValidationErrors('visible_from');
        $this->postJson('/api/offers', [...$base, 'wedding_from' => '2027-03-31', 'wedding_until' => '2026-12-01'])
            ->assertJsonValidationErrors('wedding_until');
        $this->postJson('/api/offers', [...$base, 'visible_from' => '2026-11-01', 'wedding_until' => '2027-03-31'])
            ->assertCreated()->assertJsonPath('visible_from', '2026-11-01')->assertJsonPath('status', 'scheduled')
            ->assertJsonPath('on_website', true);
    }
}
