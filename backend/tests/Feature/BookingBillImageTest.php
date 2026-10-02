<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Client;
use App\Models\Dress;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BookingBillImageTest extends TestCase
{
    use DatabaseTransactions;

    private function booking(): Booking
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
        $client = Client::create(['name' => 'Test Bride', 'phone' => '01000000000', 'city' => 'القاهرة']);

        return Booking::create([
            'client_id' => $client->id,
            'dress_id' => Dress::factory()->create(['status' => 'booked'])->id,
            'booking_date' => now()->toDateString(),
            'event_date' => now()->addMonths(2)->toDateString(),
            'status' => 'confirmed',
            'total_amount' => 10000,
        ]);
    }

    public function test_bill_image_can_be_uploaded_replaced_and_deleted()
    {
        Storage::fake('public');
        $booking = $this->booking();

        $first = $this->post("/api/bookings/{$booking->id}/bill-image", ['image' => UploadedFile::fake()->image('bill.jpg')])
            ->assertOk()->json('bill_image_path');
        Storage::disk('public')->assertExists($first);
        $this->assertSame($first, $booking->fresh()->bill_image_path);

        $second = $this->post("/api/bookings/{$booking->id}/bill-image", ['image' => UploadedFile::fake()->image('bill2.png')])
            ->assertOk()->json('bill_image_path');
        Storage::disk('public')->assertMissing($first);
        Storage::disk('public')->assertExists($second);

        $this->getJson("/api/clients/{$booking->client_id}")->assertOk()->assertJsonPath('bookings.0.bill_image_path', $second);

        $this->deleteJson("/api/bookings/{$booking->id}/bill-image")->assertOk();
        Storage::disk('public')->assertMissing($second);
        $this->assertNull($booking->fresh()->bill_image_path);
    }

    public function test_bill_upload_rejects_non_images()
    {
        $booking = $this->booking();

        $this->postJson("/api/bookings/{$booking->id}/bill-image", ['image' => UploadedFile::fake()->create('bill.pdf', 10, 'application/pdf')])
            ->assertUnprocessable();
        $this->assertNull($booking->fresh()->bill_image_path);
    }
}
