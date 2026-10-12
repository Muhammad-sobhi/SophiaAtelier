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
    protected $signature = 'data:audit {--limit=30 : Max ids shown per check} {--show= : Check number to print in detail}';
    protected $description = 'Read-only check of bookings, payments, visits and brides for data that makes reports wrong';

    private const ACTIVE = ['pending', 'confirmed', 'picked_up'];
    private const RENT = ['deposit', 'balance'];
    private const INCOMING = ['deposit', 'balance', 'insurance', 'security_deposit', 'fitting_fee'];
    private const REFUNDS = ['insurance_refund', 'deposit_refund'];

    private array $rows = [];
    private array $found = [];

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
        $this->check('دفعات مكررة (نفس الحجز والنوع والمبلغ واليوم وطريقة الدفع)',
            DB::table('revenues AS r')->join('revenues AS r2', fn($j) => $j->on('r2.booking_id', '=', 'r.booking_id')
                ->on('r2.type', '=', 'r.type')->on('r2.amount', '=', 'r.amount')
                ->on('r2.payment_date', '=', 'r.payment_date')->on('r2.payment_method', '=', 'r.payment_method')
                ->on('r2.id', '!=', 'r.id'))
                ->select('r.id')->distinct()->orderBy('r.id'), 'revenue');

        // ---------- Visits ----------
        $this->check('زيارات بدون تاريخ', DB::table('visits')->whereNull('visit_date'), 'visit');
        $this->check('زيارات عدى ميعادها ولسه مفتوحة (معلّقة/مؤكدة/وصلت)',
            DB::table('visits')->whereIn('status', ['pending', 'confirmed', 'arrived'])->where('visit_date', '<', $today), 'visit');
        $this->check('زيارات حالتها "حجزت" والعروسة مالهاش حجز',
            DB::table('visits')->where('status', 'booked')
                ->whereNotIn('client_id', DB::table('bookings')->select('client_id')), 'visit');
        $this->check('زيارات بدون عروسة', DB::table('visits')->whereNotIn('client_id', DB::table('clients')->select('id')), 'visit');

        // ---------- Brides ----------
        $this->check('عرايس رقم التليفون مكرر', DB::table('clients AS c')
            ->join('clients AS c2', fn($j) => $j->on('c2.phone', '=', 'c.phone')->on('c2.id', '!=', 'c.id'))
            ->where('c.phone', '!=', '')->select('c.id')->distinct()->orderBy('c.id'), 'client');
        $this->check('عرايس تاريخ فرحهم مختلف عن تاريخ الفرح في حجزهم الشغال',
            DB::table('clients')->join('bookings', 'bookings.client_id', '=', 'clients.id')
                ->whereIn('bookings.status', self::ACTIVE)->whereNotNull('clients.wedding_date')
                ->whereRaw('DATE(clients.wedding_date) != DATE(bookings.event_date)')
                ->select('clients.id')->distinct(), 'client');

        $this->table(['#', 'الفحص', 'النوع', 'العدد', 'الأرقام (ids)'], $this->rows);
        $problems = collect($this->rows)->where(3, '>', 0)->count();
        $this->info($problems ? "{$problems} فحص فيهم مشاكل من " . count($this->rows) : 'كل الفحوصات سليمة');

        if ($show = (int) $this->option('show')) {
            $this->details($show);
        }

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

        $this->addRow('فستان محجوز لعروستين في نفس الفترة', 'booking', collect($pairs)->flatMap(fn($p) => explode('+', $p))->unique()->values(), collect($pairs));
    }

    private function check(string $label, $query, string $entity = 'booking'): void
    {
        $ids = $query->pluck($entity === 'booking' ? 'bookings.id' : 'id');
        $this->addRow($label, $entity, $ids);
    }

    /** $display: what the summary lists when it differs from the detail ids (e.g. booking pairs) */
    private function addRow(string $label, string $entity, Collection $ids, ?Collection $display = null): void
    {
        $display ??= $ids;
        $limit = (int) $this->option('limit');
        $shown = $display->take($limit)->implode(',');
        if ($display->count() > $limit) {
            $shown .= ' …';
        }
        $this->found[count($this->rows) + 1] = [$label, $entity, $ids];
        $this->rows[] = [count($this->rows) + 1, $label, $entity, $display->count(), $shown ?: '—'];
    }

    /** Every row of one check, with the fields needed to judge and fix it */
    private function details(int $number): void
    {
        if (!isset($this->found[$number])) {
            $this->error("مفيش فحص رقم {$number}");
            return;
        }
        [$label, $entity, $ids] = $this->found[$number];
        $this->line('');
        $this->info("#{$number} {$label} ({$ids->count()})");
        if ($ids->isEmpty()) {
            return;
        }

        if ($entity === 'booking') {
            $paid = fn(array $types) => DB::table('revenues')->selectRaw('COALESCE(SUM(amount), 0)')
                ->whereColumn('booking_id', 'b.id')->whereIn('type', $types);
            $rows = DB::table('bookings AS b')->leftJoin('clients AS c', 'c.id', '=', 'b.client_id')
                ->whereIn('b.id', $ids)->orderBy('b.id')
                ->select('b.id', 'c.name', 'b.status', 'b.booking_date', 'b.event_date', 'b.pickup_scheduled_on', 'b.return_scheduled_on', 'b.total_amount')
                ->selectSub($paid(self::RENT), 'paid_rent')
                ->selectSub($paid(['insurance', 'security_deposit']), 'insurance')
                ->selectRaw('DATE(b.created_at) AS created')
                ->get();
            $headers = ['id', 'العروسة', 'الحالة', 'الحجز', 'الفرح', 'الاستلام', 'الإرجاع', 'القيمة', 'مدفوع إيجار', 'تأمين', 'اتسجل'];
        } elseif ($entity === 'revenue') {
            $rows = DB::table('revenues AS r')->leftJoin('bookings AS b', 'b.id', '=', 'r.booking_id')
                ->leftJoin('clients AS c', 'c.id', '=', 'b.client_id')
                ->whereIn('r.id', $ids)->orderBy('r.booking_id')->orderBy('r.type')->orderBy('r.id')
                ->selectRaw("r.id, r.booking_id, c.name, r.type, r.amount, r.payment_method, r.payment_date, DATE_FORMAT(r.created_at, '%Y-%m-%d %H:%i:%s') AS created, LEFT(r.notes, 45) AS notes")
                ->get();
            $headers = ['id', 'الحجز', 'العروسة', 'النوع', 'المبلغ', 'الطريقة', 'تاريخ الدفع', 'اتسجل', 'ملاحظات'];
        } elseif ($entity === 'visit') {
            $rows = DB::table('visits AS v')->leftJoin('clients AS c', 'c.id', '=', 'v.client_id')
                ->whereIn('v.id', $ids)->orderBy('v.visit_date')
                ->select('v.id', 'c.name', 'c.phone', 'v.status', 'v.visit_date', 'v.source')
                ->selectRaw('DATE(v.created_at) AS created')
                ->get();
            $headers = ['id', 'العروسة', 'التليفون', 'الحالة', 'الزيارة', 'المصدر', 'اتسجلت'];
        } else {
            $rows = DB::table('clients AS c')->whereIn('c.id', $ids)->orderBy('c.phone')->orderBy('c.id')
                ->select('c.id', 'c.name', 'c.phone', 'c.wedding_date')
                ->selectSub(DB::table('bookings')->selectRaw('COUNT(*)')->whereColumn('client_id', 'c.id'), 'bookings')
                ->selectSub(DB::table('visits')->selectRaw('COUNT(*)')->whereColumn('client_id', 'c.id'), 'visits')
                ->selectRaw('DATE(c.created_at) AS created')
                ->get();
            $headers = ['id', 'الاسم', 'التليفون', 'الفرح', 'حجوزات', 'زيارات', 'اتسجلت'];
        }

        $this->table($headers, $rows->map(fn($r) => (array) $r)->all());
    }
}
