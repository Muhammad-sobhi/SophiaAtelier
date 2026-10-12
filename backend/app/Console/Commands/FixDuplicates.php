<?php

namespace App\Console\Commands;

use App\Models\Booking;
use App\Models\Client;
use App\Models\Revenue;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Removes rows that were saved twice:
 *  - bookings imported twice from Excel (same bride, phone, wedding date and dress): the later copy and
 *    its payments are removed, and its bride too when nothing else belongs to her;
 *  - insurance refunds / damage fees saved again when a return was re-saved, beyond the insurance paid.
 */
class FixDuplicates extends Command
{
    protected $signature = 'data:fix-duplicates {--apply : Delete the duplicates (default is a dry run)} {--except= : Comma-separated booking ids to leave for a manual look}';
    protected $description = 'Remove bookings imported twice and insurance refunds saved twice (dry run unless --apply)';

    public function handle(): int
    {
        $apply = (bool) $this->option('apply');

        $except = array_filter(array_map('intval', explode(',', (string) $this->option('except'))));
        $bookings = array_values(array_filter($this->duplicateBookings(), fn($r) => !in_array($r['remove'], $except, true)));
        $refunds = $this->extraRefunds();

        if ($bookings) {
            $this->info('حجوزات مكررة (هيتشال التاني ويفضل الأول):');
            $this->table(['يفضل', 'يتشال', 'العروسة', 'الفرح', 'القيمة', 'مدفوعات هتتشال', 'العروسة هتتشال؟'],
                array_map(fn($r) => [$r['keep'], $r['remove'], $r['name'], $r['event'], $r['total'], $r['payments'], $r['client_removed'] ? 'أيوه' : 'لأ'], $bookings));
        }
        if ($refunds) {
            $this->info('استردادات تأمين / خصومات متسجلة أكتر من مرة (هيتشال الأحدث):');
            $this->table(['revenue', 'الحجز', 'العروسة', 'النوع', 'المبلغ', 'التأمين المدفوع', 'اتسجل'], $refunds);
        }

        $this->line(sprintf('حجوزات مكررة: %d · استردادات زيادة: %d', count($bookings), count($refunds)));
        if (!$apply) {
            $this->warn('Dry run: مفيش حاجة اتمسحت. شغّل الأمر بـ --apply للمسح.');
            return self::SUCCESS;
        }

        DB::transaction(function () use ($bookings, $refunds) {
            Revenue::whereIn('id', array_column($refunds, 0))->delete();
            foreach ($bookings as $row) {
                // Model delete keeps visit trying fees (Booking::deleting); payments, fittings and tasks cascade
                $booking = Booking::find($row['remove']);
                $client = $booking?->client;
                $booking?->delete();
                if ($client && $row['client_removed'] && !$client->bookings()->exists() && !$client->visits()->exists()) {
                    $client->delete();
                }
            }
        });
        $this->info('اتمسحت.');

        return self::SUCCESS;
    }

    /** Later copies of a booking with the same bride name, phone, wedding date and dresses */
    private function duplicateBookings(): array
    {
        $rows = DB::table('bookings AS b')->join('clients AS c', 'c.id', '=', 'b.client_id')
            ->where('b.status', '!=', 'cancelled')
            ->orderBy('b.id')
            ->get(['b.id', 'b.client_id', 'c.name', 'c.phone', 'b.event_date', 'b.dress_id', 'b.dress_2_id', 'b.dress_3_id', 'b.total_amount']);

        $result = [];
        foreach ($rows->groupBy(fn($b) => implode('|', [trim($b->name), $b->phone, substr($b->event_date, 0, 10), $b->dress_id, $b->dress_2_id, $b->dress_3_id])) as $group) {
            $keep = $group->first();
            foreach ($group->slice(1) as $copy) {
                $clientRemoved = $copy->client_id !== $keep->client_id
                    && !DB::table('bookings')->where('client_id', $copy->client_id)->where('id', '!=', $copy->id)->exists()
                    && !DB::table('visits')->where('client_id', $copy->client_id)->exists();
                $result[] = [
                    'keep' => $keep->id,
                    'remove' => $copy->id,
                    'name' => $copy->name,
                    'event' => substr($copy->event_date, 0, 10),
                    'total' => $copy->total_amount,
                    'payments' => DB::table('revenues')->where('booking_id', $copy->id)->whereNull('visit_id')->sum('amount'),
                    'client_removed' => $clientRemoved,
                ];
            }
        }

        return $result;
    }

    /**
     * Refunds + damage fees on a booking can't exceed the insurance paid. While they do, the newest row
     * that has an identical twin (same type, amount, date and method) is the extra copy.
     */
    private function extraRefunds(): array
    {
        $types = ['insurance_refund', 'damage_fee'];
        $bookingIds = Revenue::whereIn('type', $types)->groupBy('booking_id')->havingRaw('COUNT(*) > 1')->pluck('booking_id');

        $result = [];
        foreach ($bookingIds as $bookingId) {
            $paid = (float) Revenue::where('booking_id', $bookingId)->whereIn('type', ['insurance', 'security_deposit'])->sum('amount');
            $rows = Revenue::with('booking.client:id,name')->where('booking_id', $bookingId)->whereIn('type', $types)->get();

            while ($rows->sum(fn($r) => abs($r->amount)) > $paid) {
                $extra = $rows->filter(fn($r) => $rows->filter(fn($o) => $o->id !== $r->id && $o->type === $r->type
                    && (float) $o->amount === (float) $r->amount && $o->payment_method === $r->payment_method
                    && $o->payment_date?->toDateString() === $r->payment_date?->toDateString())->isNotEmpty())
                    ->sortByDesc('id')->first();
                if (!$extra) {
                    break; // over the insurance but no identical copy: needs a manual look
                }
                $result[] = [$extra->id, $bookingId, $extra->booking?->client?->name, $extra->type, $extra->amount, $paid, $extra->created_at->format('Y-m-d H:i')];
                $rows = $rows->reject(fn($r) => $r->id === $extra->id);
            }
        }

        return $result;
    }
}
