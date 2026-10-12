<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Client;
use App\Models\Dress;
use App\Models\Revenue;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Artisan;
use Tests\TestCase;

class AuditDataCommandTest extends TestCase
{
    use DatabaseTransactions;

    public function test_audit_reports_bad_rows_without_changing_them()
    {
        $client = Client::create(['name' => 'Audit Bride', 'phone' => '01077777777', 'city' => 'القاهرة']);
        $booking = Booking::create([
            'client_id' => $client->id,
            'dress_id' => Dress::factory()->create()->id,
            'booking_date' => '2026-09-20',
            'event_date' => '2026-08-15',
            'status' => 'confirmed',
            'total_amount' => 60000,
        ]);
        Revenue::create(['booking_id' => $booking->id, 'type' => 'deposit', 'amount' => 65000, 'payment_method' => 'cash', 'payment_date' => '2026-09-20']);

        Artisan::call('data:audit', ['--limit' => 100000]);
        $lines = collect(explode("\n", Artisan::output()));
        $row = fn(string $label) => $lines->first(fn($l) => str_contains($l, $label)) ?? '';

        $this->assertMatchesRegularExpression("/\\b{$booking->id}\\b/", $row('تاريخ الحجز بعد تاريخ الفرح'));
        $this->assertMatchesRegularExpression("/\\b{$booking->id}\\b/", $row('أكبر من قيمة الحجز'));
        $this->assertSame('2026-09-20', $booking->fresh()->booking_date->toDateString());
    }
}
