<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Client;
use App\Models\Dress;
use App\Models\Employee;
use App\Models\User;
use App\Models\Visit;
use App\Services\SalesNameResolver;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SalesNamesTest extends TestCase
{
    use DatabaseTransactions;

    private function seedRows(): array
    {
        Employee::create(['name' => 'zz-lamia', 'sales_aliases' => ['زز لمياء']]);
        $client = Client::create(['name' => 'Alias Bride', 'phone' => '01055550001', 'city' => 'القاهرة']);
        $booking = Booking::create(['client_id' => $client->id, 'dress_id' => Dress::factory()->create()->id,
            'booking_date' => now()->toDateString(), 'event_date' => now()->addMonth()->toDateString(),
            'status' => 'confirmed', 'total_amount' => 1000, 'sales_name' => 'زز لمياء']);
        $booking->forceFill(['pickup_sales_name' => 'ZZ-Lamia'])->save();
        $visit = Visit::create(['client_id' => $client->id, 'visit_date' => now()->toDateString(), 'status' => 'completed',
            'sales_name' => 'زز لمياء', 'source' => 'walkin']);
        return [$booking, $visit];
    }

    public function test_resolver_matches_aliases_case_and_arabic_letter_variants()
    {
        Employee::create(['name' => 'zz-amany', 'sales_aliases' => ['زز أماني']]);
        $sales = new SalesNameResolver();

        $this->assertSame('zz-amany', $sales->resolve(' ZZ-Amany '));
        $this->assertSame('zz-amany', $sales->resolve('زز امانى'));
        $this->assertNull($sales->resolve('zz-nobody'));
        $this->assertSame('zz-nobody', $sales->normalize('zz-nobody'));
    }

    public function test_report_shows_alias_rows_under_the_employee_name()
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
        [$booking, $visit] = $this->seedRows();

        $res = $this->getJson('/api/reports/sales-employees')->assertOk();
        $row = collect($res->json('bookings'))->firstWhere('id', $booking->id);
        $this->assertSame('zz-lamia', $row['sales_name']);
        $this->assertSame('zz-lamia', $row['pickup_sales_name']);
        $this->assertSame('zz-lamia', collect($res->json('visits'))->firstWhere('id', $visit->id)['sales_name']);
    }

    public function test_merge_command_dry_run_then_apply()
    {
        [$booking, $visit] = $this->seedRows();

        $this->artisan('data:merge-sales-names')->assertSuccessful();
        $this->assertSame('زز لمياء', $booking->fresh()->sales_name);

        $this->artisan('data:merge-sales-names', ['--apply' => true])->assertSuccessful();
        $this->assertSame('zz-lamia', $booking->fresh()->sales_name);
        $this->assertSame('zz-lamia', $booking->fresh()->pickup_sales_name);
        $this->assertSame('zz-lamia', $visit->fresh()->sales_name);
    }

    public function test_employee_aliases_can_be_saved()
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
        $employee = Employee::create(['name' => 'zz-shahd']);

        $this->putJson("/api/employees/{$employee->id}", ['sales_aliases' => ['زز شهد']])->assertOk();
        $this->assertSame(['زز شهد'], $employee->fresh()->sales_aliases);
    }
}
