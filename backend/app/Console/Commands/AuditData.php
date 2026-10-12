<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Read-only data health check for the data the reports rely on (bookings, payments, visits, brides).
 * Prints each problem with how many rows have it and their ids; nothing is changed.
 */
class AuditData extends Command
{
    protected $signature = 'data:audit {--limit=30 : Max ids shown per check}';
    protected $description = 'Read-only check of bookings, payments, visits and brides for data that makes reports wrong';

    private const ACTIVE = ['pending', 'confirmed', 'picked_up'];
    private const RENT = ['deposit', 'balance'];
    private const INCOMING = ['deposit', 'balance', 'insurance', 'security_deposit', 'fitting_fee'];
    private const REFUNDS = ['insurance_refund', 'deposit_refund'];

    private array $rows = [];

    public function handle(): int
    {
        $today = now()->toDateString();
        $notCancelled = fn() => DB::table('bookings')->where('status', '!=', 'cancelled');
        $paidRent = DB::table('revenues')->selectRaw('booking_id, SUM(amount) AS paid')
            ->whereIn('type', self::RENT)->groupBy('booking_id');

        // ---------- Bookings ----------
        $this->check('حجوزات تاريخ الحجز بعد تاريخ الفرح', $notCancelled()->whereColumn('booking_date', '>', 'event_date'));
        $this->check('حجوزات بدون تاريخ حجز', $notCancelled()->whereNull('booking_date'));
        $this->check('حجوزات بدون تاريخ فرح', $notCancelled()->whereNull('event_date'));
        $this->check('حجوزات تاريخ الحجز في المستقبل', $notCancelled()->where('booking_date', '>', $today));
        $this->check('حجوزات قيمتها صفر', $notCancelled()->where('total_amount', '<=', 0));
        $this->check('حجوزات المدفوع (عربون + باقي) أكبر من قيمة الحجز',
            $notCancelled()->joinSub($paidRent, 'p', 'p.booking_id', '=', 'bookings.id')
                ->whereColumn('p.paid', '>', 'bookings.total_amount'));
        $this->check('حجوزات اتسلمت أو رجعت وعليها باقي فلوس',
            DB::table('bookings')->whereIn('status', ['picked_up', 'returned'])->where('total_amount', '>', 0)
                ->leftJoinSub($paidRent, 'p', 'p.booking_id', '=', 'bookings.id')
                ->whereRaw('COALESCE(p.paid, 0) < bookings.total_amount'));
        $this->check('حجوزات ميعاد الاستلام بعد الفرح أو الإرجاع قبل الفرح',
            $notCancelled()->where(fn($q) => $q->whereColumn('pickup_scheduled_on', '>', 'event_date')
                ->orWhereColumn('return_scheduled_on', '<', 'event_date')));
        $this->check('حجوزات فاتت (الإرجاع المفروض عدى) ولسه معلّقة أو مؤكدة',
            DB::table('bookings')->whereIn('status', ['pending', 'confirmed'])->where('return_scheduled_on', '<', $today));
        $this->check('حجوزات ملغية بدون تاريخ إلغاء', DB::table('bookings')->where('status', 'cancelled')->whereNull('cancelled_at'));
        $this->check('حجوزات بدون عروسة', DB::table('bookings')->whereNotIn('client_id', DB::table('clients')->select('id')));
        $this->check('حجوزات بدون فستان أو فستانها اتمسح', $notCancelled()->where(fn($q) => $q->whereNull('dress_id')
            ->orWhereNotIn('dress_id', DB::table('dresses')->select('id'))));
        $this->check('عرايس عليهم أكتر من حجز شغال', DB::table('bookings')->whereIn('status', self::ACTIVE)
            ->select('client_id AS id')->groupBy('client_id')->havingRaw('COUNT(*) > 1'), 'client');
        $this->overlappingDresses();

        // ---------- Payments ----------
        $this->check('دفعات بدون تاريخ دفع', DB::table('revenues')->whereNull('payment_date'), 'revenue');
        $this->check('دفعات تاريخها في المستقبل', DB::table('revenues')->where('payment_date', '>', $today), 'revenue');
        $this->check('دفعات واردة بقيمة صفر أو سالبة', DB::table('revenues')->whereIn('type', self::INCOMING)->where('amount', '<=', 0), 'revenue');
        $this->check('استردادات بقيمة موجبة (المفروض سالبة)', DB::table('revenues')->whereIn('type', self::REFUNDS)->where('amount', '>', 0), 'revenue');
        $this->check('عربون أو باقي من غير حجز', DB::table('revenues')->whereIn('type', self::RENT)->whereNull('booking_id'), 'revenue');
        $this->check('عربون تاريخه قبل تاريخ الحجز',
            DB::table('revenues')->join('bookings', 'bookings.id', '=', 'revenues.booking_id')
                ->where('revenues.type', 'deposit')->whereColumn('revenues.payment_date', '<', 'bookings.booking_date')
                ->select('revenues.id'), 'revenue');
        $this->check('دفعات مكررة (نفس الحجز والنوع والمبلغ واليوم)',
            DB::table('revenues')->whereNotNull('booking_id')
                ->selectRaw('MIN(id) AS id')->groupBy('booking_id', 'type', 'amount', 'payment_date')->havingRaw('COUNT(*) > 1'), 'revenue');

        // ---------- Visits ----------
        $this->check('زيارات بدون تاريخ', DB::table('visits')->whereNull('visit_date'), 'visit');
        $this->check('زيارات عدى ميعادها ولسه مفتوحة (معلّقة/مؤكدة/وصلت)',
            DB::table('visits')->whereIn('status', ['pending', 'confirmed', 'arrived'])->where('visit_date', '<', $today), 'visit');
        $this->check('زيارات حالتها "حجزت" والعروسة مالهاش حجز',
            DB::table('visits')->where('status', 'booked')
                ->whereNotIn('client_id', DB::table('bookings')->select('client_id')), 'visit');
        $this->check('زيارات بدون عروسة', DB::table('visits')->whereNotIn('client_id', DB::table('clients')->select('id')), 'visit');

        // ---------- Brides ----------
        $this->check('عرايس رقم التليفون مكرر', DB::table('clients')->whereNotNull('phone')->where('phone', '!=', '')
            ->selectRaw('MIN(id) AS id')->groupBy('phone')->havingRaw('COUNT(*) > 1'), 'client');
        $this->check('عرايس تاريخ فرحهم مختلف عن تاريخ الفرح في حجزهم الشغال',
            DB::table('clients')->join('bookings', 'bookings.client_id', '=', 'clients.id')
                ->whereIn('bookings.status', self::ACTIVE)->whereNotNull('clients.wedding_date')
                ->whereRaw('DATE(clients.wedding_date) != DATE(bookings.event_date)')
                ->select('clients.id')->distinct(), 'client');

        $this->table(['#', 'الفحص', 'النوع', 'العدد', 'الأرقام (ids)'], $this->rows);
        $problems = collect($this->rows)->where(3, '>', 0)->count();
        $this->info($problems ? "{$problems} فحص فيهم مشاكل من " . count($this->rows) : 'كل الفحوصات سليمة');

        return self::SUCCESS;
    }

    /** Same dress in two active bookings whose pickup → return periods overlap */
    private function overlappingDresses(): void
    {
        $rows = DB::table('bookings')->whereIn('status', ['confirmed', 'picked_up'])
            ->whereNotNull('pickup_scheduled_on')->whereNotNull('return_scheduled_on')
            ->get(['id', 'dress_id', 'dress_2_id', 'dress_3_id', 'pickup_scheduled_on', 'return_scheduled_on']);

        $byDress = [];
        foreach ($rows as $b) {
            foreach (array_unique(array_filter([$b->dress_id, $b->dress_2_id, $b->dress_3_id])) as $dressId) {
                $byDress[$dressId][] = $b;
            }
        }

        $pairs = [];
        foreach ($byDress as $dressId => $bookings) {
            usort($bookings, fn($a, $b) => strcmp($a->pickup_scheduled_on, $b->pickup_scheduled_on));
            for ($i = 0; $i < count($bookings); $i++) {
                for ($j = $i + 1; $j < count($bookings) && $bookings[$j]->pickup_scheduled_on <= $bookings[$i]->return_scheduled_on; $j++) {
                    $pairs[] = "{$bookings[$i]->id}+{$bookings[$j]->id}";
                }
            }
        }

        $this->addRow('فستان محجوز لعروستين في نفس الفترة', 'booking pairs', collect($pairs));
    }

    private function check(string $label, $query, string $entity = 'booking'): void
    {
        $ids = $query->pluck($entity === 'booking' ? 'bookings.id' : 'id');
        $this->addRow($label, $entity, $ids);
    }

    private function addRow(string $label, string $entity, Collection $ids): void
    {
        $limit = (int) $this->option('limit');
        $shown = $ids->take($limit)->implode(',');
        if ($ids->count() > $limit) {
            $shown .= ' …';
        }
        $this->rows[] = [count($this->rows) + 1, $label, $entity, $ids->count(), $shown ?: '—'];
    }
}
