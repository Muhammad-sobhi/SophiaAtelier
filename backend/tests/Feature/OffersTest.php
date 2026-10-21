<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Category;
use App\Models\Dress;
use App\Models\Employee;
use App\Models\User;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class OffersTest extends TestCase
{
    private function actingAsAdmin(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
    }

    private function offer(array $overrides = []): array
    {
        $today = now('Africa/Cairo');

        return array_merge([
            'name' => 'White Friday',
            'name_ar' => 'الجمعة البيضاء',
            'type' => 'percentage',
            'value' => 20,
            'scope' => 'all',
            'banner_text_ar' => 'خصم 20% على فساتين الزفاف',
            'starts_at' => $today->copy()->subDay()->toDateString(),
            'ends_at' => $today->copy()->addDays(5)->toDateString(),
        ], $overrides);
    }

    public function test_admin_creates_a_running_offer_that_the_website_sees(): void
    {
        $this->actingAsAdmin();

        $this->postJson('/api/offers', $this->offer())
            ->assertCreated()
            ->assertJson(['name' => 'White Friday', 'status' => 'running', 'dress_ids' => []]);

        $this->getJson('/api/public/offers')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.value', 20)
            ->assertJsonPath('0.dress_ids', null)
            ->assertJsonMissingPath('0.is_active');
    }

    public function test_scheduled_and_disabled_offers_stay_off_the_website(): void
    {
        $this->actingAsAdmin();
        $nextMonth = now('Africa/Cairo')->addMonth();

        $this->postJson('/api/offers', $this->offer([
            'starts_at' => $nextMonth->toDateString(),
            'ends_at' => $nextMonth->copy()->addDays(3)->toDateString(),
        ]))->assertCreated()->assertJsonPath('status', 'scheduled');
        $this->postJson('/api/offers', $this->offer(['is_active' => false]))
            ->assertCreated()->assertJsonPath('status', 'disabled');

        $this->getJson('/api/public/offers')->assertOk()->assertJsonCount(0);
    }

    public function test_offer_scoped_to_picked_dresses_or_a_category_lists_only_those_dresses(): void
    {
        $this->actingAsAdmin();
        $category = Category::factory()->create();
        $inCategory = Dress::factory()->create(['category_id' => $category->id]);
        [$picked, $other] = Dress::factory()->count(2)->create();

        $this->postJson('/api/offers', $this->offer([
            'type' => 'perk', 'value' => null, 'perk_ar' => 'تجربة مجانية',
            'scope' => 'dresses', 'dress_ids' => [$picked->id],
        ]))->assertCreated()->assertJsonPath('dress_ids', [$picked->id]);
        $this->postJson('/api/offers', $this->offer(['scope' => 'category', 'scope_id' => $category->id]))->assertCreated();

        $public = collect($this->getJson('/api/public/offers')->assertOk()->json());
        $this->assertEqualsCanonicalizing(
            [[$picked->id], [$inCategory->id]],
            $public->pluck('dress_ids')->all()
        );
        $this->assertNull($public->firstWhere('type', 'perk')['value']);
        $this->assertNotContains($other->id, $public->pluck('dress_ids')->flatten()->all());
    }

    public function test_partial_update_toggles_an_offer_and_refreshes_the_website(): void
    {
        $this->actingAsAdmin();
        $id = $this->postJson('/api/offers', $this->offer())->json('id');
        $this->getJson('/api/public/offers')->assertJsonCount(1);

        $this->putJson("/api/offers/{$id}", ['is_active' => false])
            ->assertOk()->assertJson(['status' => 'disabled', 'value' => '20.00']);

        $this->getJson('/api/public/offers')->assertJsonCount(0);
    }

    public function test_invalid_offers_are_rejected(): void
    {
        $this->actingAsAdmin();

        $this->postJson('/api/offers', $this->offer(['value' => 150]))->assertJsonValidationErrors('value');
        $this->postJson('/api/offers', $this->offer(['value' => null]))->assertJsonValidationErrors('value');
        $this->postJson('/api/offers', $this->offer(['type' => 'perk', 'value' => null]))->assertJsonValidationErrors('perk_ar');
        $this->postJson('/api/offers', $this->offer(['scope' => 'dresses']))->assertJsonValidationErrors('dress_ids');
        $this->postJson('/api/offers', $this->offer(['scope' => 'category', 'scope_id' => 999]))->assertJsonValidationErrors('scope_id');
        $this->postJson('/api/offers', $this->offer(['ends_at' => '2020-01-01']))->assertJsonValidationErrors('ends_at');
    }

    public function test_offer_list_reports_bookings_and_discounts_without_cancelled_ones(): void
    {
        $this->actingAsAdmin();
        $id = $this->postJson('/api/offers', $this->offer())
            ->assertCreated()->assertJson(['bookings_count' => 0, 'discount_total' => 0])->json('id');

        $booking = fn (string $status, float $discount) => Booking::factory()->create([
            'offer_id' => $id, 'discount_amount' => $discount, 'status' => $status,
        ]);
        $booking('confirmed', 2400);
        $booking('picked_up', 600);
        $booking('cancelled', 1000);

        $row = collect($this->getJson('/api/offers')->assertOk()->json())->firstWhere('id', $id);
        $this->assertSame(2, $row['bookings_count']);
        $this->assertEquals(3000, $row['discount_total']);

        $this->putJson("/api/offers/{$id}", ['is_active' => false])
            ->assertOk()->assertJson(['bookings_count' => 2, 'discount_total' => 3000]);
    }

    public function test_staff_without_the_offers_page_cannot_manage_offers(): void
    {
        $user = User::factory()->create(['role' => 'staff']);
        Employee::create(['name' => 'Staff', 'email' => $user->email, 'permissions' => ['/dashboard/dresses']]);
        Sanctum::actingAs($user);

        $this->getJson('/api/offers')->assertForbidden();
        $this->postJson('/api/offers', $this->offer())->assertForbidden();
    }
}
