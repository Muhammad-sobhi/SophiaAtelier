<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Client;
use App\Models\Dress;
use App\Models\Employee;
use App\Models\Expense;
use App\Models\Revenue;
use App\Models\User;
use App\Models\Visit;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SecurityHardeningTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo(\Carbon\Carbon::parse('2026-10-01 10:00', 'Africa/Cairo'));
    }

    /** A staff login whose employee record grants the given pages / actions */
    private function staffWith(array $permissions, string $email = 'staff@test.local'): User
    {
        $user = User::factory()->create(['role' => 'staff', 'email' => $email]);
        Employee::create(['name' => 'Staff', 'email' => $email, 'permissions' => $permissions]);
        Sanctum::actingAs($user);

        return $user;
    }

    public function test_storage_route_cannot_leave_the_upload_folders(): void
    {
        foreach (['/api/storage/..%2F..%2F.env', '/api/storage/..%2F..%2Fcomposer.json', '/storage/..%2F..%2F.env'] as $url) {
            $response = $this->get($url)->assertOk();
            $this->assertSame('image/svg+xml', $response->headers->get('Content-Type'), $url);
        }
    }

    public function test_storage_route_still_serves_uploaded_files(): void
    {
        Storage::disk('public')->put('dresses/zz-test-file.png', base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='));

        try {
            $response = $this->get('/api/storage/dresses/zz-test-file.png')->assertOk();
            $this->assertSame('image/png', $response->headers->get('Content-Type'));
        } finally {
            Storage::disk('public')->delete('dresses/zz-test-file.png');
        }
    }

    public function test_release_code_route_is_gone(): void
    {
        $this->getJson('/api/dresses/release-code/DR-1')->assertNotFound();
    }

    public function test_staff_cannot_grant_themselves_full_access_or_change_logins(): void
    {
        $this->staffWith(['/dashboard/employees']);
        $self = Employee::where('email', 'staff@test.local')->first();
        $admin = User::factory()->create(['role' => 'admin', 'email' => 'boss@test.local']);
        $other = Employee::create(['name' => 'Other', 'email' => 'other@test.local', 'password' => 'other-pass']);

        $this->putJson("/api/employees/{$self->id}", ['permissions' => ['*']])->assertForbidden();
        $this->putJson("/api/employees/{$other->id}", ['password' => 'taken-over'])->assertForbidden();
        $this->putJson("/api/employees/{$other->id}", ['email' => 'new@test.local'])->assertForbidden();
        $this->postJson('/api/employees', ['name' => 'Ghost', 'email' => 'ghost@test.local', 'password' => 'ghost-pass', 'permissions' => ['*']])
            ->assertForbidden();
        $this->deleteJson("/api/employees/{$other->id}")->assertForbidden();

        // Other fields of an employee stay editable for staff with the employees page
        $this->putJson("/api/employees/{$other->id}", ['name' => 'Other 2', 'email' => 'other@test.local', 'daily_rate' => 300])->assertOk();

        $this->assertSame('staff', User::where('email', 'staff@test.local')->value('role'));
        $this->assertSame('admin', $admin->refresh()->role);
    }

    public function test_staff_without_employees_page_cannot_edit_employees(): void
    {
        $this->staffWith(['/dashboard/brides']);
        $other = Employee::create(['name' => 'Other']);

        $this->putJson("/api/employees/{$other->id}", ['name' => 'X'])->assertForbidden();
        $this->getJson('/api/employees')->assertOk();
    }

    public function test_admin_can_still_manage_logins_and_is_not_demoted_on_save(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'email' => 'boss@test.local']);
        Sanctum::actingAs($admin);
        $own = Employee::create(['name' => 'Boss', 'email' => 'boss@test.local', 'password' => 'boss-pass-1']);
        $this->assertSame('admin', $admin->refresh()->role);

        $own->update(['name' => 'Boss 2']);
        $this->assertSame('admin', $admin->refresh()->role);

        $emp = Employee::create(['name' => 'Staff', 'email' => 'staff2@test.local']);
        $this->putJson("/api/employees/{$emp->id}", ['password' => 'staff-pass', 'permissions' => ['/dashboard/brides']])->assertOk();
        $this->assertSame('staff', User::where('email', 'staff2@test.local')->value('role'));
    }

    public function test_find_client_needs_her_own_phone_and_returns_only_tracking_data(): void
    {
        $client = Client::create(['name' => 'Bride', 'phone' => '01012345678', 'city' => 'القاهرة', 'address' => 'Secret street 5', 'notes' => 'internal note']);
        Visit::create(['client_id' => $client->id, 'visit_date' => '2026-10-05', 'status' => 'pending', 'source' => 'website', 'notes' => 'staff only', 'sales_name' => 'Mona']);

        $this->postJson('/api/public/find-client', ['client_id' => $client->id])->assertStatus(422);

        $data = $this->postJson('/api/public/find-client', ['phone' => '01012345678'])->assertOk()->json();
        $this->assertSame($client->id, $data['id']);
        $this->assertSame('2026-10-05', $data['visits'][0]['visit_date']);
        $this->assertArrayNotHasKey('address', $data);
        $this->assertArrayNotHasKey('notes', $data);
        $this->assertArrayNotHasKey('notes', $data['visits'][0]);
        $this->assertArrayNotHasKey('sales_name', $data['visits'][0]);
    }

    public function test_guests_see_only_website_dresses_without_internal_fields(): void
    {
        $shown = Dress::factory()->create(['is_website_visible' => true, 'purchase_price' => 9000, 'is_best_seller' => true]);
        $hidden = Dress::factory()->create(['is_website_visible' => false]);

        $ids = collect($this->getJson('/api/dresses?per_page=all')->assertOk()->json())->pluck('id');
        $this->assertTrue($ids->contains($shown->id));
        $this->assertFalse($ids->contains($hidden->id));
        $this->getJson("/api/dresses/{$hidden->id}")->assertNotFound();

        $best = $this->getJson('/api/public/best-sellers')->assertOk()->json();
        $this->assertArrayNotHasKey('purchase_price', $best[0]);

        // Staff still see every dress
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
        $this->assertCount(2, $this->getJson('/api/dresses?per_page=all')->json());
    }

    public function test_public_booking_cannot_be_attached_to_another_bride(): void
    {
        $victim = Client::create(['name' => 'Victim', 'phone' => '01011111111', 'city' => 'القاهرة']);
        $dress = Dress::factory()->create();

        $this->postJson('/api/public/bookings', [
            'client_id' => $victim->id,
            'client_name' => 'Attacker',
            'client_phone' => '01022222222',
            'visit_date' => '2026-10-10',
            'time_slot' => '02:30 PM',
            'wedding_date' => '2026-12-10',
            'dress_ids' => [$dress->id],
        ])->assertCreated();

        $this->assertSame(0, $victim->visits()->count());
        $this->assertSame(1, Client::where('phone', 'like', '%1022222222')->count());
    }

    public function test_public_booking_needs_a_real_phone(): void
    {
        $dress = Dress::factory()->create();

        $this->postJson('/api/public/bookings', [
            'client_name' => 'No Phone',
            'visit_date' => '2026-10-10',
            'wedding_date' => '2026-12-10',
            'dress_ids' => [$dress->id],
        ])->assertStatus(422)->assertJsonPath('code', 'phone_required');
        $this->assertSame(0, Client::count());
    }

    public function test_public_registration_ignores_staff_only_fields(): void
    {
        $dress = Dress::factory()->create();

        $this->postJson('/api/public/register-client', [
            'name' => 'Web Bride',
            'phone' => '01033333333',
            'trying_fee' => 0,
            'sales_name' => 'Fake',
            'booked_dresses' => [$dress->id],
            'dress_id' => $dress->id,
        ])->assertCreated()->assertJsonMissingPath('address');

        $client = Client::where('name', 'Web Bride')->first();
        $this->assertSame('website', $client->source);
        $this->assertSame(0, $client->visits()->count());
    }

    public function test_finance_changes_need_the_finance_or_brides_page(): void
    {
        $expense = Expense::create(['category' => 'other', 'amount' => 100, 'date' => '2026-10-01']);
        $client = Client::create(['name' => 'B', 'phone' => '01044444444']);
        $visit = Visit::create(['client_id' => $client->id, 'visit_date' => '2026-10-01', 'status' => 'done', 'source' => 'walkin']);
        $revenue = Revenue::create(['visit_id' => $visit->id, 'type' => 'fitting_fee', 'amount' => 200, 'payment_method' => 'cash', 'payment_date' => '2026-10-01']);

        $this->staffWith(['/dashboard/tasks']);
        $this->deleteJson("/api/expenses/{$expense->id}")->assertForbidden();
        $this->deleteJson("/api/revenues/{$revenue->id}")->assertForbidden();
        $this->deleteJson("/api/clients/{$client->id}")->assertForbidden();
        $this->getJson('/api/finance/summary')->assertForbidden();
        $this->getJson('/api/reports/visits')->assertForbidden();
        $this->getJson('/api/attendance')->assertForbidden();
        $this->getJson('/api/suppliers')->assertForbidden();

        $this->staffWith(['/dashboard/brides'], 'brides@test.local');
        $this->deleteJson("/api/revenues/{$revenue->id}")->assertOk();
        $this->assertSame(1, Expense::count());
    }

    public function test_split_payments_reject_bad_rows(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
        $client = Client::create(['name' => 'B', 'phone' => '01055555555']);
        $visit = Visit::create(['client_id' => $client->id, 'visit_date' => '2026-10-01', 'status' => 'done', 'source' => 'walkin']);

        $this->postJson('/api/revenues', ['visit_id' => $visit->id, 'payments' => ['oops']])->assertStatus(422);
        $this->postJson('/api/revenues', ['visit_id' => $visit->id, 'payments' => [['amount' => 100], ['amount' => 50]]])->assertCreated();
        $this->assertSame(2, Revenue::count());
    }

    public function test_uploaded_receipt_must_be_an_image(): void
    {
        Storage::fake('public');
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
        $client = Client::create(['name' => 'B', 'phone' => '01066666666']);
        $visit = Visit::create(['client_id' => $client->id, 'visit_date' => '2026-10-01', 'status' => 'done', 'source' => 'walkin']);

        $this->post('/api/revenues', [
            'visit_id' => $visit->id, 'amount' => 100, 'payment_date' => '2026-10-01',
            'receipt' => UploadedFile::fake()->createWithContent('shell.php', '<?php echo 1;'),
        ], ['Accept' => 'application/json'])->assertCreated();
        $this->assertNull(Revenue::latest('id')->first()->receipt_path);

        $this->post('/api/revenues', [
            'visit_id' => $visit->id, 'amount' => 100, 'payment_date' => '2026-10-01',
            'receipt' => UploadedFile::fake()->image('receipt.png'),
        ], ['Accept' => 'application/json'])->assertCreated();
        $path = Revenue::latest('id')->first()->receipt_path;
        $this->assertStringEndsWith('.png', $path);
        Storage::disk('public')->assertExists($path);
    }

    public function test_changing_own_email_keeps_the_employee_record_linked(): void
    {
        $user = $this->staffWith(['/dashboard/brides'], 'old@test.local');

        $this->putJson('/api/auth/profile', ['email' => 'new@test.local'])->assertOk()
            ->assertJsonPath('permissions', ['/dashboard/brides']);
        $this->assertSame('new@test.local', Employee::first()->email);
        $this->assertSame('new@test.local', $user->refresh()->email);
    }

    public function test_page_only_endpoints_need_their_page(): void
    {
        $this->staffWith(['/dashboard/attendance']);

        $this->getJson('/api/revenues')->assertForbidden();
        $this->getJson('/api/tasks')->assertForbidden();
        $this->getJson('/api/reviews')->assertForbidden();
        $this->getJson('/api/contact-messages')->assertForbidden();
        $this->getJson('/api/clients/export-csv')->assertForbidden();
        $this->getJson('/api/client-gallery')->assertForbidden();
        $this->postJson('/api/categories', ['name' => 'X'])->assertForbidden();
        $this->postJson('/api/dresses', ['name' => 'X'])->assertForbidden();
        $this->putJson('/api/whatsapp-templates/welcome', ['content' => 'X'])->assertForbidden();

        // The brides journey and shared lookups stay open to every staff login
        $this->getJson('/api/clients')->assertOk();
        $this->getJson('/api/dresses')->assertOk();
        $this->getJson('/api/whatsapp-templates')->assertOk();
        $this->getJson('/api/leave-requests')->assertOk();
    }

    public function test_page_permission_opens_its_endpoints(): void
    {
        $this->staffWith(['/dashboard/finance', '/dashboard/tasks', '/dashboard/dresses']);

        $this->getJson('/api/revenues')->assertOk();
        $this->getJson('/api/tasks')->assertOk();
        $this->getJson('/api/categories')->assertOk();
        $this->getJson('/api/collections')->assertOk();
    }

    public function test_staff_cannot_take_another_employees_permissions_by_email(): void
    {
        $user = $this->staffWith(['/dashboard/tasks']);
        Employee::create(['name' => 'Manager', 'email' => 'manager@test.local', 'permissions' => ['*']]);

        $this->putJson('/api/auth/profile', ['email' => 'manager@test.local'])->assertUnprocessable();
        $this->assertSame('staff@test.local', $user->refresh()->email);
        $this->assertFalse($user->hasPermission('/dashboard/finance'));
    }
}
