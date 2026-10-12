<?php

namespace App\Services;

use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Read-only checks for data that makes the reports wrong (bookings, payments, visits, brides).
 * Shared by the `data:audit` command and the admin data-health page. Nothing here changes data.
 */
class DataAuditService
{
    private const ACTIVE = ['pending', 'confirmed', 'picked_up'];
    private const RENT = ['deposit', 'balance'];
    private const INCOMING = ['deposit', 'balance', 'insurance', 'security_deposit', 'fitting_fee'];
    private const REFUNDS = ['insurance_refund', 'deposit_refund'];

    /**
     * key => [group, entity, label, hint, ids()]. The order is the check number shown by the command,
     * so new checks are only appended.
     */
    public function definitions(): array
    {
        $today = now()->toDateString();
        $notCancelled = fn() => DB::table('bookings')->where('status', '!=', 'cancelled');
        $paidRent = fn() => DB::table('revenues')->selectRaw('booking_id, SUM(amount) AS paid')
            ->whereIn('type', self::RENT)->groupBy('booking_id');
        $aliveClients = fn() => DB::table('clients')->whereNull('deleted_at')->select('id');
        $bookingIds = fn($q) => fn() => $q()->pluck('bookings.id');
        $ids = fn($q) => fn() => $q()->pluck('id');

        return [
            'booking_after_wedding' => ['bookings', 'booking', 'حجوزات تاريخ الحجز بعد تاريخ الفرح',
                'افتح العروسة وعدّل "تاريخ الحجز" للتاريخ الحقيقي من تعديل الحجز.',
                $bookingIds(fn() => $notCancelled()->whereColumn('booking_date', '>', 'event_date'))],
            'booking_no_date' => ['bookings', 'booking', 'حجوزات بدون تاريخ حجز', 'افتح العروسة وحدد تاريخ الحجز.',
                $bookingIds(fn() => $notCancelled()->whereNull('booking_date'))],
            'booking_no_event' => ['bookings', 'booking', 'حجوزات بدون تاريخ فرح', 'افتح العروسة وحدد تاريخ الفرح.',
                $bookingIds(fn() => $notCancelled()->whereNull('event_date'))],
            'booking_future_date' => ['bookings', 'booking', 'حجوزات تاريخ الحجز في المستقبل', 'افتح العروسة وصحح تاريخ الحجز.',
                $bookingIds(fn() => $notCancelled()->where('booking_date', '>', $today))],
            'booking_zero_total' => ['bookings', 'booking', 'حجوزات قيمتها صفر',
                'لو حجز حقيقي: افتح العروسة واكتب قيمة الإيجار. لو مش حجز حقيقي: احذفه.',
                $bookingIds(fn() => $notCancelled()->where('total_amount', '<=', 0))],
            'booking_overpaid' => ['bookings', 'booking', 'حجوزات المدفوع (عربون + باقي) أكبر من قيمة الحجز',
                'راجع الدفعات: غالباً دفعة متسجلة مرتين أو تأمين متسجل كباقي. احذف الدفعة الغلط أو صحح قيمة الحجز.',
                $bookingIds(fn() => $notCancelled()->joinSub($paidRent(), 'p', 'p.booking_id', '=', 'bookings.id')
                    ->whereColumn('p.paid', '>', 'bookings.total_amount'))],
            'booking_unpaid_after_pickup' => ['bookings', 'booking', 'حجوزات اتسلمت أو رجعت وعليها باقي فلوس',
                'لو العروسة دفعت: سجل الدفعة من كارت العروسة. لو فيه خصم: صحح قيمة الحجز.',
                $bookingIds(fn() => DB::table('bookings')->whereIn('status', ['picked_up', 'returned'])->where('total_amount', '>', 0)
                    ->leftJoinSub($paidRent(), 'p', 'p.booking_id', '=', 'bookings.id')
                    ->whereRaw('COALESCE(p.paid, 0) < bookings.total_amount'))],
            'booking_bad_schedule' => ['bookings', 'booking', 'حجوزات ميعاد الاستلام بعد الفرح أو الإرجاع قبل الفرح',
                'افتح العروسة وصحح مواعيد الاستلام والإرجاع.',
                $bookingIds(fn() => $notCancelled()->where(fn($q) => $q->whereColumn('pickup_scheduled_on', '>', 'event_date')
                    ->orWhereColumn('return_scheduled_on', '<', 'event_date')))],
            'booking_stale_open' => ['bookings', 'booking', 'حجوزات فاتت (الإرجاع المفروض عدى) ولسه معلّقة أو مؤكدة',
                'افتح العروسة وكمّل المراحل (استلام / إرجاع) أو ألغِ الحجز.',
                $bookingIds(fn() => DB::table('bookings')->whereIn('status', ['pending', 'confirmed'])->where('return_scheduled_on', '<', $today))],
            'booking_cancelled_no_date' => ['bookings', 'booking', 'حجوزات ملغية بدون تاريخ إلغاء', 'مش بتظهر في تقرير الإلغاءات بالفترة. للمراجعة فقط.',
                $bookingIds(fn() => DB::table('bookings')->where('status', 'cancelled')->whereNull('cancelled_at'))],
            'booking_no_client' => ['bookings', 'booking', 'حجوزات بدون عروسة (أو عروستها اتمسحت)', 'الحجز ملوش عروسة: احذفه.',
                $bookingIds(fn() => DB::table('bookings')->whereNotIn('client_id', $aliveClients()))],
            'booking_no_dress' => ['bookings', 'booking', 'حجوزات بدون فستان أو فستانها اتمسح', 'افتح العروسة واختار الفستان الصح.',
                $bookingIds(fn() => $notCancelled()->where(fn($q) => $q->whereNull('dress_id')
                    ->orWhereNotIn('dress_id', DB::table('dresses')->whereNull('deleted_at')->select('id'))))],
            'client_many_active' => ['brides', 'client', 'عرايس عليهم أكتر من حجز شغال', 'افتح العروسة: لو حجز متكرر احذفه، لو اتلغى سجّل الإلغاء.',
                fn() => DB::table('bookings')->whereIn('status', self::ACTIVE)->whereIn('client_id', $aliveClients())
                    ->groupBy('client_id')->havingRaw('COUNT(*) > 1')->pluck('client_id')],
            'dress_overlap' => ['bookings', 'booking', 'فستان محجوز لعروستين في نفس الفترة', 'غيّر الفستان أو المواعيد لواحدة منهم.',
                fn() => $this->overlappingDressBookings()],

            'revenue_no_date' => ['payments', 'revenue', 'دفعات بدون تاريخ دفع', 'الدفعة مش هتظهر في المالية بالتاريخ. صححها من كارت العروسة.',
                $ids(fn() => DB::table('revenues')->whereNull('payment_date'))],
            'revenue_future' => ['payments', 'revenue', 'دفعات تاريخها في المستقبل', 'صحح تاريخ الدفعة من كارت العروسة.',
                $ids(fn() => DB::table('revenues')->where('payment_date', '>', $today))],
            'revenue_non_positive' => ['payments', 'revenue', 'دفعات واردة بقيمة صفر أو سالبة', 'احذف الدفعة لو مالهاش لازمة.',
                $ids(fn() => DB::table('revenues')->whereIn('type', self::INCOMING)->where('amount', '<=', 0))],
            'revenue_positive_refund' => ['payments', 'revenue', 'استردادات بقيمة موجبة (المفروض سالبة)', 'الاسترداد بيتحسب دخل بدل مصروف. احذفه وسجله تاني.',
                $ids(fn() => DB::table('revenues')->whereIn('type', self::REFUNDS)->where('amount', '>', 0))],
            'revenue_rent_no_booking' => ['payments', 'revenue', 'عربون أو باقي من غير حجز', 'الدفعة مش مربوطة بحجز. احذفها لو مكررة.',
                $ids(fn() => DB::table('revenues')->whereIn('type', self::RENT)->whereNull('booking_id'))],
            'revenue_deposit_before_booking' => ['payments', 'revenue', 'عربون تاريخه قبل تاريخ الحجز', 'صحح تاريخ الحجز أو تاريخ العربون.',
                fn() => DB::table('revenues')->join('bookings', 'bookings.id', '=', 'revenues.booking_id')
                    ->where('revenues.type', 'deposit')->whereColumn('revenues.payment_date', '<', 'bookings.booking_date')
                    ->pluck('revenues.id')],
            'revenue_duplicate' => ['payments', 'revenue', 'دفعات مكررة (نفس الحجز والنوع والمبلغ واليوم وطريقة الدفع)',
                'لو اتسجلت في نفس الثانية غالباً دفعة متقسمة (حد إنستاباي) وسليمة. لو في أوقات مختلفة والمدفوع زاد عن المطلوب: احذف الأحدث.',
                fn() => DB::table('revenues AS r')->join('revenues AS r2', fn($j) => $j->on('r2.booking_id', '=', 'r.booking_id')
                    ->on('r2.type', '=', 'r.type')->on('r2.amount', '=', 'r.amount')
                    ->on('r2.payment_date', '=', 'r.payment_date')->on('r2.payment_method', '=', 'r.payment_method')
                    ->on('r2.id', '!=', 'r.id'))
                    ->distinct()->orderBy('r.id')->pluck('r.id')],

            'visit_no_date' => ['visits', 'visit', 'زيارات بدون تاريخ', 'افتح العروسة وحدد تاريخ الزيارة أو احذفها.',
                $ids(fn() => DB::table('visits')->whereNull('visit_date'))],
            'visit_stale_open' => ['visits', 'visit', 'زيارات عدى ميعادها ولسه مفتوحة (معلّقة/مؤكدة/وصلت)',
                'اقفل كل زيارة: "حضرت" لو جت، "ماجتش" لو ماجتش. بتأثر على نسبة الحضور في تقرير الزيارات.',
                fn() => DB::table('visits')->whereIn('status', ['pending', 'confirmed', 'arrived'])->where('visit_date', '<', $today)
                    ->orderBy('visit_date')->pluck('id')],
            'visit_booked_no_booking' => ['visits', 'visit', 'زيارات حالتها "حجزت" والعروسة مالهاش حجز', 'افتح العروسة: سجّل الحجز أو غيّر حالة الزيارة.',
                $ids(fn() => DB::table('visits')->where('status', 'booked')->whereNotIn('client_id', DB::table('bookings')->select('client_id')))],
            'visit_no_client' => ['visits', 'visit', 'زيارات بدون عروسة (أو عروستها اتمسحت)', 'احذف الزيارة.',
                $ids(fn() => DB::table('visits')->whereNotIn('client_id', $aliveClients()))],

            'client_duplicate_phone' => ['brides', 'client', 'عرايس رقم التليفون مكرر',
                'لو نفس العروسة متسجلة مرتين: اختار السجل الأساسي و"ادمج" الباقي فيه. لو عرايس مختلفين على رقم وهمي: سيبهم أو صحح الرقم.',
                fn() => DB::table('clients AS c')
                    ->join('clients AS c2', fn($j) => $j->on('c2.phone', '=', 'c.phone')->on('c2.id', '!=', 'c.id')->whereNull('c2.deleted_at'))
                    ->whereNull('c.deleted_at')->where('c.phone', '!=', '')->distinct()->orderBy('c.id')->pluck('c.id')],
            'client_wedding_mismatch' => ['brides', 'client', 'عرايس تاريخ فرحهم مختلف عن تاريخ الفرح في حجزهم الشغال', 'افتح العروسة وصحح تاريخ الفرح.',
                fn() => DB::table('clients')->join('bookings', 'bookings.client_id', '=', 'clients.id')
                    ->whereNull('clients.deleted_at')->whereIn('bookings.status', self::ACTIVE)->whereNotNull('clients.wedding_date')
                    ->whereRaw('DATE(clients.wedding_date) != DATE(bookings.event_date)')
                    ->distinct()->pluck('clients.id')],
            'booking_duplicate' => ['bookings', 'booking', 'حجوزات مكررة (نفس العروسة والتليفون وتاريخ الفرح والفستان)',
                'نفس الحجز متسجل أكتر من مرة (غالباً استيراد إكسل مرتين). سيب الأقدم واحذف الباقي.',
                fn() => $this->duplicateBookingIds()],
        ];
    }

    /** Every check with its number and how many rows it found */
    public function summary(): array
    {
        $number = 0;

        return collect($this->definitions())->map(function ($def, $key) use (&$number) {
            [$group, $entity, $label, $hint, $ids] = $def;

            return ['number' => ++$number, 'key' => $key, 'group' => $group, 'entity' => $entity,
                'label' => $label, 'hint' => $hint, 'ids' => $ids()->values()];
        })->values()->all();
    }

    public function exists(string $key): bool
    {
        return array_key_exists($key, $this->definitions());
    }

    /** One check with all its rows and the fields needed to judge and fix them */
    public function check(string $key): array
    {
        [$group, $entity, $label, $hint, $ids] = $this->definitions()[$key];
        $ids = $ids()->values();

        return ['key' => $key, 'group' => $group, 'entity' => $entity, 'label' => $label, 'hint' => $hint,
            'count' => $ids->count(), 'rows' => $this->rows($entity, $ids)];
    }

    public function rows(string $entity, Collection $ids): Collection
    {
        if ($ids->isEmpty()) {
            return collect();
        }

        return match ($entity) {
            'booking' => $this->bookingRows($ids),
            'revenue' => $this->revenueRows($ids),
            'visit' => $this->visitRows($ids),
            default => $this->clientRows($ids),
        };
    }

    private function bookingRows(Collection $ids): Collection
    {
        $paid = fn(array $types) => DB::table('revenues')->selectRaw('COALESCE(SUM(amount), 0)')
            ->whereColumn('booking_id', 'b.id')->whereIn('type', $types);
        $dressName = fn(string $column) => DB::table('dresses')->selectRaw("CONCAT(name, IF(code IS NULL OR code = '', '', CONCAT(' (', code, ')')))")
            ->whereColumn('id', "b.{$column}");

        return DB::table('bookings AS b')->leftJoin('clients AS c', 'c.id', '=', 'b.client_id')
            ->whereIn('b.id', $ids)->orderBy('b.id')
            ->select('b.id', 'b.client_id', 'c.name AS client_name', 'c.phone', 'b.status', 'b.booking_date', 'b.event_date',
                'b.pickup_scheduled_on', 'b.return_scheduled_on', 'b.total_amount')
            ->selectSub($dressName('dress_id'), 'dress')
            ->selectSub($dressName('dress_2_id'), 'dress_2')
            ->selectSub($dressName('dress_3_id'), 'dress_3')
            ->selectSub($paid(self::RENT), 'paid_rent')
            ->selectSub($paid(['insurance', 'security_deposit']), 'insurance')
            ->selectRaw("DATE_FORMAT(b.created_at, '%Y-%m-%d %H:%i') AS created")
            ->get();
    }

    private function revenueRows(Collection $ids): Collection
    {
        return DB::table('revenues AS r')->leftJoin('bookings AS b', 'b.id', '=', 'r.booking_id')
            ->leftJoin('visits AS v', 'v.id', '=', 'r.visit_id')
            ->leftJoin('clients AS c', 'c.id', '=', DB::raw('COALESCE(b.client_id, v.client_id)'))
            ->whereIn('r.id', $ids)->orderBy('r.booking_id')->orderBy('r.type')->orderBy('r.id')
            ->select('r.id', 'r.booking_id', 'c.id AS client_id', 'c.name AS client_name', 'r.type', 'r.amount',
                'r.payment_method', 'r.payment_date', 'r.notes', 'b.total_amount')
            ->selectRaw("DATE_FORMAT(r.created_at, '%Y-%m-%d %H:%i:%s') AS created")
            ->get();
    }

    private function visitRows(Collection $ids): Collection
    {
        return DB::table('visits AS v')->leftJoin('clients AS c', 'c.id', '=', 'v.client_id')
            ->whereIn('v.id', $ids)->orderBy('v.visit_date')->orderBy('v.id')
            ->select('v.id', 'v.client_id', 'c.name AS client_name', 'c.phone', 'v.status', 'v.visit_date', 'v.time_slot', 'v.source')
            ->selectRaw('DATE(v.created_at) AS created')
            ->get();
    }

    private function clientRows(Collection $ids): Collection
    {
        return DB::table('clients AS c')->whereIn('c.id', $ids)->orderBy('c.phone')->orderBy('c.id')
            ->select('c.id', 'c.id AS client_id', 'c.name AS client_name', 'c.phone', 'c.wedding_date', 'c.source')
            ->selectSub(DB::table('bookings')->selectRaw('COUNT(*)')->whereColumn('client_id', 'c.id'), 'bookings_count')
            ->selectSub(DB::table('bookings')->selectRaw('COUNT(*)')->whereColumn('client_id', 'c.id')->whereIn('status', self::ACTIVE), 'active_bookings')
            ->selectSub(DB::table('visits')->selectRaw('COUNT(*)')->whereColumn('client_id', 'c.id'), 'visits_count')
            ->selectRaw('DATE(c.created_at) AS created')
            ->get();
    }

    /** Same dress in two active bookings whose pickup → return periods overlap */
    private function overlappingDressBookings(): Collection
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

        $ids = [];
        foreach ($byDress as $bookings) {
            usort($bookings, fn($a, $b) => strcmp($a->pickup_scheduled_on, $b->pickup_scheduled_on));
            for ($i = 0; $i < count($bookings); $i++) {
                for ($j = $i + 1; $j < count($bookings) && $bookings[$j]->pickup_scheduled_on <= $bookings[$i]->return_scheduled_on; $j++) {
                    array_push($ids, $bookings[$i]->id, $bookings[$j]->id);
                }
            }
        }

        return collect($ids)->unique()->sort()->values();
    }

    /** Every booking of a group with the same bride name, phone, wedding date and dresses */
    public function duplicateBookingGroups(): Collection
    {
        return DB::table('bookings AS b')->join('clients AS c', 'c.id', '=', 'b.client_id')
            ->whereNull('c.deleted_at')->where('b.status', '!=', 'cancelled')->orderBy('b.id')
            ->get(['b.id', 'b.client_id', 'c.name', 'c.phone', 'b.event_date', 'b.dress_id', 'b.dress_2_id', 'b.dress_3_id', 'b.total_amount'])
            ->groupBy(fn($b) => implode('|', [trim($b->name), $b->phone, substr($b->event_date, 0, 10), $b->dress_id, $b->dress_2_id, $b->dress_3_id]))
            ->filter(fn($group) => $group->count() > 1)
            ->values();
    }

    private function duplicateBookingIds(): Collection
    {
        return $this->duplicateBookingGroups()->flatten(1)->pluck('id')->sort()->values();
    }
}
