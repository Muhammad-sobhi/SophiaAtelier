<?php

namespace Database\Seeders;

use App\Models\ActivityLog;
use App\Models\Booking;
use App\Models\Client;
use App\Models\Fitting;
use App\Models\Revenue;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class ActivityLogSeeder extends Seeder
{
    public function run(): void
    {
        $count = 0;

        // 1. Seed from Clients
        foreach (Client::latest()->take(60)->get() as $c) {
            ActivityLog::create([
                'user_id' => 1,
                'employee_name' => 'مدير النظام',
                'action' => 'تسجيل عميلة جديدة',
                'entity_type' => 'Client',
                'entity_id' => $c->id,
                'summary' => ['description' => 'إضافة العروسة ' . $c->name . ($c->phone ? ' (' . $c->phone . ')' : '')],
                'ip' => '127.0.0.1',
                'created_at' => $c->created_at ?: now()->subDays(rand(1, 30)),
            ]);
            $count++;
        }

        // 2. Seed from Bookings
        foreach (Booking::with(['client', 'dress'])->latest()->take(60)->get() as $b) {
            ActivityLog::create([
                'user_id' => 1,
                'employee_name' => $b->sales_associate ?: 'مدير النظام',
                'action' => 'حجز فستان',
                'entity_type' => 'Booking',
                'entity_id' => $b->id,
                'summary' => ['description' => 'حجز فستان ' . ($b->dress?->name ?: '') . ' للعروسة ' . ($b->client?->name ?: '')],
                'ip' => '127.0.0.1',
                'created_at' => $b->booking_date ? Carbon::parse($b->booking_date) : ($b->created_at ?: now()->subDays(rand(1, 20))),
            ]);
            $count++;
        }

        // 3. Seed from Revenues
        foreach (Revenue::with('booking.client')->latest()->take(60)->get() as $r) {
            ActivityLog::create([
                'user_id' => 1,
                'employee_name' => 'مدير النظام',
                'action' => 'تسجيل دفعة إيراد',
                'entity_type' => 'Revenue',
                'entity_id' => $r->id,
                'summary' => ['description' => 'استلام مبلغ ' . number_format($r->amount) . ' ج.م (' . ($r->payment_method ?: 'كاش') . ') للعروسة ' . ($r->booking?->client?->name ?: '')],
                'ip' => '127.0.0.1',
                'created_at' => $r->payment_date ? Carbon::parse($r->payment_date) : ($r->created_at ?: now()->subDays(rand(1, 15))),
            ]);
            $count++;
        }

        // 4. Seed from Fittings
        foreach (Fitting::with(['booking.client'])->latest()->take(20)->get() as $f) {
            ActivityLog::create([
                'user_id' => 1,
                'employee_name' => $f->sales_name ?: 'مسؤولة البروفات',
                'action' => 'جدولة بروفة قياس',
                'entity_type' => 'Fitting',
                'entity_id' => $f->id,
                'summary' => ['description' => $f->type . ' للعروسة ' . ($f->booking?->client?->name ?: $f->client_name)],
                'ip' => '127.0.0.1',
                'created_at' => $f->fitting_date ? Carbon::parse($f->fitting_date) : ($f->created_at ?: now()->subDays(rand(1, 10))),
            ]);
            $count++;
        }

        $this->command->info("Successfully seeded {$count} activity logs!");
    }
}
