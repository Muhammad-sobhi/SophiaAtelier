<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Client;
use App\Models\Dress;
use App\Models\Revenue;
use Tests\TestCase;

class FixDuplicatesCommandTest extends TestCase
{

    private function booking(string $name, Dress $dress, string $event = '2026-06-10', string $phone = '01034046998'): Booking
    {
        $client = Client::create(['name' => $name, 'phone' => $phone, 'city' => 'القاهرة']);

        return Booking::create(['client_id' => $client->id, 'dress_id' => $dress->id, 'booking_date' => '2026-05-01',
            'event_date' => $event, 'status' => 'returned', 'total_amount' => 10000]);
    }

    private function pay(Booking $b, string $type, float $amount, string $method = 'instapay'): Revenue
    {
        return Revenue::create(['booking_id' => $b->id, 'type' => $type, 'amount' => $amount, 'payment_method' => $method, 'payment_date' => '2026-06-11']);
    }

    public function test_dry_run_changes_nothing_and_apply_removes_only_the_copies()
    {
        $dress = Dress::factory()->create();
        $original = $this->booking('Imported Bride', $dress);
        $copy = $this->booking('Imported Bride', $dress);
        $otherBride = $this->booking('Other Bride', Dress::factory()->create()); // same shared phone, different bride
        $this->pay($original, 'deposit', 2000);
        $this->pay($copy, 'deposit', 2000);

        // One insurance of 5000 refunded twice; two insurances of 5000 refunded three times
        $single = $this->booking('Single', Dress::factory()->create(), '2026-09-03', '01011111111');
        $this->pay($single, 'insurance', 5000);
        $keepRefund = $this->pay($single, 'insurance_refund', -5000);
        $extraRefund = $this->pay($single, 'insurance_refund', -5000);
        $double = $this->booking('Double', Dress::factory()->create(), '2026-09-04', '01022222222');
        $this->pay($double, 'insurance', 10000);
        $doubleRefunds = collect([1, 2, 3])->map(fn() => $this->pay($double, 'insurance_refund', -5000));

        $this->artisan('data:fix-duplicates')->assertSuccessful();
        $this->assertSame(5, Booking::whereIn('id', [$original->id, $copy->id, $otherBride->id, $single->id, $double->id])->count());
        $this->assertSame(5, Revenue::where('type', 'insurance_refund')->whereIn('booking_id', [$single->id, $double->id])->count());

        $this->artisan('data:fix-duplicates', ['--apply' => true, '--except' => (string) $copy->id])->assertSuccessful();
        $this->assertNotNull($copy->fresh(), 'an excepted booking is left alone');

        $this->artisan('data:fix-duplicates', ['--apply' => true])->assertSuccessful();

        $this->assertNotNull($original->fresh());
        $this->assertNull($copy->fresh());
        $this->assertNull(Client::find($copy->client_id), 'the copied bride had nothing else, so she is removed');
        $this->assertNotNull($otherBride->fresh());
        $this->assertSame(1, Revenue::where('booking_id', $original->id)->count());

        $this->assertNotNull($keepRefund->fresh());
        $this->assertNull($extraRefund->fresh());
        $this->assertSame(2, Revenue::where('booking_id', $double->id)->where('type', 'insurance_refund')->count());
        $this->assertNull($doubleRefunds->last()->fresh(), 'the newest copy is the one removed');
    }
}
