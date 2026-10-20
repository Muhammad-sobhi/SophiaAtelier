<?php

namespace App\Services;

use Carbon\Carbon;
use Illuminate\Database\Query\Builder;
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
    private const SHOP_TIMEZONE = 'Africa/Cairo';
    /** Until this day editing a booking reset its booking date (and deposit date) to the edit day */
    private const EDIT_DATE_BUG_FIXED_ON = '2026-10-12';
    /** A phone shared by more brides than this is a made-up number typed for old brides, not one bride twice */
    private const PLACEHOLDER_PHONE_BRIDES = 3;
    private const PAYMENT_LABELS = ['balance' => 'باقي', 'insurance' => 'تأمين', 'security_deposit' => 'تأمين',
        'fitting_fee' => 'رسوم بروفة', 'insurance_refund' => 'استرداد تأمين', 'deposit_refund' => 'استرداد عربون', 'damage_fee' => 'خصم تلفيات'];

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
                'اضغط "تعديل التواريخ" وصحح تاريخ الحجز أو تاريخ الفرح.',
                $bookingIds(fn() => $notCancelled()->whereColumn('booking_date', '>', 'event_date'))],
            'booking_no_date' => ['bookings', 'booking', 'حجوزات بدون تاريخ حجز', 'اضغط "تعديل تاريخ الحجز" وحدده.',
                $bookingIds(fn() => $notCancelled()->whereNull('booking_date'))],
            'booking_no_event' => ['bookings', 'booking', 'حجوزات بدون تاريخ فرح', 'اضغط "تعديل تاريخ الفرح" وحدده.',
                $bookingIds(fn() => $notCancelled()->whereNull('event_date'))],
            'booking_future_date' => ['bookings', 'booking', 'حجوزات تاريخ الحجز في المستقبل', 'اضغط "تعديل تاريخ الحجز" وصححه.',
                $bookingIds(fn() => $notCancelled()->where('booking_date', '>', $today))],
            'booking_zero_total' => ['bookings', 'booking', 'حجوزات قيمتها صفر',
                'لو حجز حقيقي: اضغط "تعديل قيمة الإيجار" واكتبها. لو مش حجز حقيقي: احذفه.',
                $bookingIds(fn() => $notCancelled()->where('total_amount', '<=', 0))],
            'booking_overpaid' => ['bookings', 'booking', 'حجوزات المدفوع (عربون + باقي) أكبر من قيمة الحجز',
                'اضغط "الدفعات": غالباً دفعة متسجلة مرتين أو تأمين متسجل كباقي. احذف الدفعة الغلط أو صحح قيمة الإيجار.',
                $bookingIds(fn() => $notCancelled()->joinSub($paidRent(), 'p', 'p.booking_id', '=', 'bookings.id')
                    ->whereColumn('p.paid', '>', 'bookings.total_amount'))],
            'booking_unpaid_after_pickup' => ['bookings', 'booking', 'حجوزات اتسلمت أو رجعت وعليها باقي فلوس',
                'اضغط "الدفعات / تسجيل الباقي": لو العروسة دفعت سجّل دفعة "باقي". لو فيه خصم: صحح قيمة الإيجار.',
                $bookingIds(fn() => DB::table('bookings')->whereIn('status', ['picked_up', 'returned'])->where('total_amount', '>', 0)
                    ->leftJoinSub($paidRent(), 'p', 'p.booking_id', '=', 'bookings.id')
                    ->whereRaw('COALESCE(p.paid, 0) < bookings.total_amount'))],
            'booking_bad_schedule' => ['bookings', 'booking', 'حجوزات ميعاد الاستلام بعد الفرح أو الإرجاع قبل الفرح',
                'اضغط "تعديل التواريخ" وصحح مواعيد الاستلام والإرجاع.',
                $bookingIds(fn() => $notCancelled()->where(fn($q) => $q->whereColumn('pickup_scheduled_on', '>', 'event_date')
                    ->orWhereColumn('return_scheduled_on', '<', 'event_date')))],
            'booking_stale_open' => ['bookings', 'booking', 'حجوزات فاتت (الإرجاع المفروض عدى) ولسه معلّقة أو مؤكدة',
                'افتح كرت العروسة وكمّل المراحل (استلام / إرجاع) أو ألغِ الحجز.',
                $bookingIds(fn() => DB::table('bookings')->whereIn('status', ['pending', 'confirmed'])->where('return_scheduled_on', '<', $today))],
            'booking_cancelled_no_date' => ['bookings', 'booking', 'حجوزات ملغية بدون تاريخ إلغاء', 'مش بتظهر في تقرير الإلغاءات بالفترة. للمراجعة فقط.',
                $bookingIds(fn() => DB::table('bookings')->where('status', 'cancelled')->whereNull('cancelled_at'))],
            'booking_no_client' => ['bookings', 'booking', 'حجوزات بدون عروسة (أو عروستها اتمسحت)', 'الحجز ملوش عروسة: احذفه.',
                $bookingIds(fn() => DB::table('bookings')->whereNotIn('client_id', $aliveClients()))],
            'booking_no_dress' => ['bookings', 'booking', 'حجوزات بدون فستان أو فستانها اتمسح', 'افتح كرت العروسة واختار الفستان الصح.',
                $bookingIds(fn() => $notCancelled()->where(fn($q) => $q->whereNull('dress_id')
                    ->orWhereNotIn('dress_id', DB::table('dresses')->whereNull('deleted_at')->select('id'))))],
            'client_many_active' => ['brides', 'client', 'عرايس عليهم أكتر من حجز شغال', 'افتح كرت العروسة: لو حجز متكرر احذفه، لو اتلغى سجّل الإلغاء.',
                fn() => DB::table('bookings')->whereIn('status', self::ACTIVE)->whereIn('client_id', $aliveClients())
                    ->groupBy('client_id')->havingRaw('COUNT(*) > 1')->pluck('client_id')],
            'dress_overlap' => ['bookings', 'booking', 'فستان محجوز لعروستين في نفس الفترة', 'غيّر الفستان أو المواعيد لواحدة منهم.',
                fn() => $this->overlappingDressBookings()],

            'revenue_no_date' => ['payments', 'revenue', 'دفعات بدون تاريخ دفع', 'الدفعة مش هتظهر في المالية بالتاريخ. اضغط "تعديل تاريخ الدفع".',
                $ids(fn() => DB::table('revenues')->whereNull('payment_date'))],
            'revenue_future' => ['payments', 'revenue', 'دفعات تاريخها في المستقبل', 'اضغط "تعديل تاريخ الدفع" وصححه.',
                $ids(fn() => DB::table('revenues')->where('payment_date', '>', $today))],
            'revenue_non_positive' => ['payments', 'revenue', 'دفعات واردة بقيمة صفر أو سالبة', 'احذف الدفعة لو مالهاش لازمة.',
                $ids(fn() => DB::table('revenues')->whereIn('type', self::INCOMING)->where('amount', '<=', 0))],
            'revenue_positive_refund' => ['payments', 'revenue', 'استردادات بقيمة موجبة (المفروض سالبة)', 'الاسترداد بيتحسب دخل بدل مصروف. احذفه وسجله تاني.',
                $ids(fn() => DB::table('revenues')->whereIn('type', self::REFUNDS)->where('amount', '>', 0))],
            'revenue_rent_no_booking' => ['payments', 'revenue', 'عربون أو باقي من غير حجز', 'الدفعة مش مربوطة بحجز. احذفها لو مكررة.',
                $ids(fn() => DB::table('revenues')->whereIn('type', self::RENT)->whereNull('booking_id'))],
            'revenue_deposit_before_booking' => ['payments', 'revenue', 'عربون تاريخه قبل تاريخ الحجز', 'اضغط "تعديل تاريخ الدفع" لتاريخ العربون الصح، أو صحح تاريخ الحجز من فحص الحجوزات.',
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

            'visit_no_date' => ['visits', 'visit', 'زيارات بدون تاريخ', 'افتح كرت العروسة وحدد تاريخ الزيارة أو احذفها.',
                $ids(fn() => DB::table('visits')->whereNull('visit_date'))],
            'visit_stale_open' => ['visits', 'visit', 'زيارات عدى ميعادها ولسه مفتوحة (معلّقة/مؤكدة/وصلت)',
                'اقفل كل زيارة: "حضرت" لو جت، "ماجتش" لو ماجتش. بتأثر على نسبة الحضور في تقرير الزيارات.',
                fn() => DB::table('visits')->whereIn('status', ['pending', 'confirmed', 'arrived'])->where('visit_date', '<', $today)
                    ->orderBy('visit_date')->pluck('id')],
            'visit_booked_no_booking' => ['visits', 'visit', 'زيارات حالتها "حجزت" والعروسة مالهاش حجز', 'افتح كرت العروسة: سجّل الحجز أو غيّر حالة الزيارة.',
                $ids(fn() => DB::table('visits')->where('status', 'booked')->whereNotIn('client_id', DB::table('bookings')->select('client_id')))],
            'visit_no_client' => ['visits', 'visit', 'زيارات بدون عروسة (أو عروستها اتمسحت)', 'احذف الزيارة.',
                $ids(fn() => DB::table('visits')->whereNotIn('client_id', $aliveClients()))],

            'client_duplicate_phone' => ['brides', 'client', 'عرايس رقم التليفون مكرر',
                'لو نفس العروسة متسجلة مرتين: اختار السجل الأساسي و"ادمج" الباقي فيه. لو عرايس مختلفين: سيبهم أو صحح الرقم. '
                    . 'رقم عليه أكتر من ' . self::PLACEHOLDER_PHONE_BRIDES . ' عرايس بيتعتبر رقم وهمي (عرايس قديمة قبل السيستم)، فبيظهر منه بس العرايس اللي بنفس الاسم.',
                fn() => $this->duplicatePhoneGroups()->flatten(1)->pluck('id')->sort()->values()],
            'client_wedding_mismatch' => ['brides', 'client', 'عرايس تاريخ فرحهم مختلف عن تاريخ الفرح في حجزهم الشغال', 'افتح كرت العروسة وصحح تاريخ الفرح.',
                fn() => DB::table('clients')->join('bookings', 'bookings.client_id', '=', 'clients.id')
                    ->whereNull('clients.deleted_at')->whereIn('bookings.status', self::ACTIVE)->whereNotNull('clients.wedding_date')
                    ->whereRaw('DATE(clients.wedding_date) != DATE(bookings.event_date)')
                    ->distinct()->pluck('clients.id')],
            'booking_duplicate' => ['bookings', 'booking', 'حجوزات مكررة (نفس العروسة والتليفون وتاريخ الفرح والفستان)',
                'نفس الحجز متسجل أكتر من مرة (غالباً استيراد إكسل مرتين). سيب الأقدم واحذف الباقي.',
                fn() => $this->duplicateBookingIds()],
            'booking_date_after_created' => ['bookings', 'booking', 'حجوزات تاريخها بعد أول يوم اتأكد فيه الحجز على السيستم',
                'تاريخ الحجز بعد أول مرة الحجز اتأكد فيها على السيستم (عمود "أول تأكيد" بتوقيت مصر، ولو فاضي فعمود "اتسجل"). غالباً من خطأ قديم كان بيغيّر تاريخ الحجز والعربون ليوم أي تعديل. '
                    . 'اتأكد من العقد أو تحويل إنستاباي: لو لقيت اليوم الصح اضغط "تعديل تاريخ الحجز" وصحح العربون من "الدفعات". لو المكتوب صح اضغط "التاريخ صح". لو مش متأكد سيبه.',
                fn() => $this->bookingDateAfterCreatedIds()],
            'booking_date_not_visit_day' => ['bookings', 'booking', 'حجوزات تاريخها مختلف عن يوم الزيارة اللي اتحجز فيها',
                'الزيارة حالتها "حجزت" لكن تاريخ الحجز يوم تاني، فالتقارير بتحسب الحجز في يوم تاني. غالباً الحجز اتسجل على السيستم متأخر. '
                    . 'لو العروسة حجزت يوم الزيارة: اضغط "تعديل تاريخ الحجز". لو حجزت فعلاً في اليوم المكتوب: اضغط "التاريخ صح". لو مش متأكد سيبه.',
                fn() => $this->bookingDateNotVisitDayIds()],
            'booking_date_visit_entered_late' => ['bookings', 'booking', 'حجوزات اتسجلت مع زيارتها في نفس الوقت بعد يوم الزيارة',
                'الزيارة والحجز اتكتبوا على السيستم مع بعض بعد يوم الزيارة، فالحجز أخد يوم الكتابة. غالباً العروسة حجزت يوم الزيارة. '
                    . 'اتأكد من العقد أو تحويل إنستاباي: لو حجزت يوم الزيارة اضغط "تعديل تاريخ الحجز". لو المكتوب صح اضغط "التاريخ صح". لو مش متأكد سيبه.',
                fn() => $this->bookingDateVisitEnteredLateIds()],
            'client_duplicate_name_wedding' => ['brides', 'client', 'عرايس بنفس الاسم ونفس تاريخ الفرح',
                'ممكن تكون نفس العروسة متسجلة مرتين (زي نسخة Legacy من الاستيراد)، وممكن عرايس مختلفين. قارن التليفون والحجوزات: '
                    . 'لو نفس العروسة اختار السجل الأساسي و"ادمج" الباقي فيه. لو مختلفين سيبهم.',
                fn() => $this->duplicateNameWeddingIds()],
            'booking_date_edit_evidence' => ['bookings', 'booking', 'حجوزات تاريخها اتغيّر ليوم تعديل وفيه دليل إنها اتحجزت قبل كده',
                'فيه حاجة اتسجلت للحجز قبل تاريخه (دفعة، بروفة، زيارة "حجزت"، أو أول تأكيد حجز)، فالتاريخ غالباً اتغيّر ليوم تعديل بالخطأ القديم. '
                    . 'عمود "الدليل" بيقول إيه اللي اتسجل وإمتى، و"اليوم المقترح" هو يوم الحجز الأرجح. اضغط "تعديل تاريخ الحجز" (هيتملي باليوم المقترح) وصحح العربون من "الدفعات". '
                    . 'لو المكتوب صح اضغط "التاريخ صح".',
                fn() => $this->editDateEvidence()->keys()->sort()->values()],
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
            'count' => $ids->count(), 'rows' => $this->rows($entity, $ids, $key)];
    }

    public function rows(string $entity, Collection $ids, ?string $key = null): Collection
    {
        if ($ids->isEmpty()) {
            return collect();
        }

        return match ($entity) {
            'booking' => match ($key) {
                'booking_date_after_created' => $this->withFirstConfirmations($this->bookingRows($ids)),
                'booking_date_not_visit_day' => $this->withFirstConfirmations($this->withVisitDays($this->bookingRows($ids), $this->bookedVisitMismatches())),
                'booking_date_visit_entered_late' => $this->withFirstConfirmations($this->withVisitDays($this->bookingRows($ids), $this->visitEnteredLateMismatches())),
                'booking_date_edit_evidence' => $this->withEditDateEvidence($this->withFirstConfirmations($this->bookingRows($ids))),
                default => $this->bookingRows($ids),
            },
            'revenue' => $this->revenueRows($ids),
            'visit' => $this->visitRows($ids),
            default => match ($key) {
                'client_duplicate_name_wedding' => $this->clientRows($ids)->each(fn($c) => $c->group_key = $this->nameWeddingKey($c->client_name, $c->wedding_date)),
                'client_duplicate_phone' => $this->withGroupKeys($this->clientRows($ids), $this->duplicatePhoneGroups()),
                default => $this->clientRows($ids),
            },
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
            ->addSelect('b.created_at AS created')
            ->get()
            ->each(fn($r) => $r->created = $r->created ? $this->shopTime($r->created)->format('Y-m-d H:i') : null);
    }

    /** Adds the visit day(s) a booking row is compared with */
    private function withVisitDays(Collection $rows, Builder $pairs): Collection
    {
        $days = $pairs->whereIn('b.id', $rows->pluck('id'))->get()->groupBy('booking_id');

        return $rows->each(function ($r) use ($days) {
            $r->visit_date = ($days[$r->id] ?? collect())->pluck('visit_date')->unique()->sort()->implode('، ');
        });
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

    /**
     * Booking date after the shop-local day the booking was first confirmed (the "تأكيد حجز فستان" activity log),
     * or the day it was recorded when it has no log (logs started mid-September). Before late September a bride
     * registered with dresses got a pending booking at once, so the record day alone is not the booking day.
     */
    private function bookingDateAfterCreatedIds(): Collection
    {
        $confirmations = $this->confirmationsByClient();

        return DB::table('bookings')->where('status', '!=', 'cancelled')->whereNull('booking_date_confirmed_at')
            ->whereRaw('DATE(booking_date) > DATE(created_at)')
            ->orderBy('id')->get(['id', 'client_id', 'booking_date', 'created_at'])
            ->filter(fn($b) => substr($b->booking_date, 0, 10)
                > ($this->firstConfirmation($b, $confirmations) ?? $this->shopTime($b->created_at))->toDateString())
            ->pluck('id')->values();
    }

    /** Timestamps are stored in the app timezone; the shop works in Cairo time */
    private function shopTime(string $timestamp): Carbon
    {
        return Carbon::parse($timestamp, config('app.timezone'))->setTimezone(self::SHOP_TIMEZONE);
    }

    /** "تأكيد حجز فستان" log times per bride, oldest first */
    private function confirmationsByClient(): Collection
    {
        return DB::table('activity_logs')->whereIn('entity_type', ['Client', 'client'])
            ->where('action', 'تأكيد حجز فستان')->whereNotNull('entity_id')
            ->orderBy('created_at')->get(['entity_id', 'created_at'])
            ->groupBy('entity_id');
    }

    /** The first confirmation of this booking: the bride's first one from (just before) the booking's creation on */
    private function firstConfirmation(object $booking, Collection $confirmations): ?Carbon
    {
        $from = Carbon::parse($booking->created_at)->subMinutes(5)->toDateTimeString();
        $log = ($confirmations[$booking->client_id] ?? collect())->first(fn($l) => $l->created_at >= $from);

        return $log ? $this->shopTime($log->created_at) : null;
    }

    private function withFirstConfirmations(Collection $rows): Collection
    {
        $confirmations = $this->confirmationsByClient();
        $bookings = DB::table('bookings')->whereIn('id', $rows->pluck('id'))->get(['id', 'client_id', 'created_at'])->keyBy('id');

        return $rows->each(function ($r) use ($confirmations, $bookings) {
            $r->first_confirm = $this->firstConfirmation($bookings[$r->id], $confirmations)?->format('Y-m-d H:i');
        });
    }

    /** Visit and booking typed in together (within an hour) after the visit day, the visit closed as attended */
    private function bookingDateVisitEnteredLateIds(): Collection
    {
        return $this->visitEnteredLateMismatches()->get()->pluck('booking_id')->unique()->sort()->values();
    }

    private function visitEnteredLateMismatches(): Builder
    {
        return DB::table('bookings AS b')
            ->join('visits AS v', fn($j) => $j->on('v.client_id', '=', 'b.client_id')->whereIn('v.status', ['done', 'arrived']))
            ->join('clients AS c', 'c.id', '=', 'b.client_id')->whereNull('c.deleted_at')
            ->where('b.status', '!=', 'cancelled')->whereNull('b.booking_date_confirmed_at')
            ->whereNotNull('v.visit_date')
            ->whereRaw('DATE(v.visit_date) < DATE(b.booking_date)')
            ->whereRaw('DATE(v.visit_date) < DATE(v.created_at)')
            ->whereRaw('ABS(TIMESTAMPDIFF(MINUTE, v.created_at, b.created_at)) <= 60')
            ->whereNotExists(fn($q) => $q->from('bookings AS b2')->whereColumn('b2.client_id', 'b.client_id')
                ->where('b2.status', '!=', 'cancelled')->whereRaw('DATE(b2.booking_date) = DATE(v.visit_date)'))
            ->select('b.id AS booking_id', 'v.id AS visit_id', DB::raw('DATE(v.visit_date) AS visit_date'));
    }

    /**
     * Brides sharing a phone, keyed by group. On a placeholder number (shared by many brides) only brides
     * with the same (spelling-normalized) name are grouped, since the rest are different old brides.
     */
    private function duplicatePhoneGroups(): Collection
    {
        return DB::table('clients')->whereNull('deleted_at')->whereNotNull('phone')->where('phone', '!=', '')
            ->whereIn('phone', DB::table('clients')->whereNull('deleted_at')->select('phone')->groupBy('phone')->havingRaw('COUNT(*) > 1'))
            ->orderBy('id')->get(['id', 'name', 'phone'])
            ->groupBy('phone')
            ->flatMap(fn($group, $phone) => $group->count() > self::PLACEHOLDER_PHONE_BRIDES
                ? $group->groupBy(fn($c) => $phone . '|' . $this->normalizedName($c->name))
                : [$phone => $group])
            ->filter(fn($group) => $group->count() > 1);
    }

    private function withGroupKeys(Collection $rows, Collection $groups): Collection
    {
        $keys = $groups->flatMap(fn($group, $key) => $group->mapWithKeys(fn($c) => [$c->id => (string) $key]));

        return $rows->each(fn($r) => $r->group_key = $keys[$r->id] ?? $r->phone);
    }

    /** Brides whose (spelling-normalized) name and wedding date match another bride's */
    private function duplicateNameWeddingIds(): Collection
    {
        return DB::table('clients')->whereNull('deleted_at')->whereNotNull('wedding_date')->where('name', '!=', '')
            ->orderBy('id')->get(['id', 'name', 'wedding_date'])
            ->groupBy(fn($c) => $this->nameWeddingKey($c->name, $c->wedding_date))
            ->filter(fn($group) => $group->count() > 1)
            ->flatten(1)->pluck('id')->sort()->values();
    }

    private function nameWeddingKey(?string $name, ?string $weddingDate): string
    {
        return $this->normalizedName($name) . '|' . substr((string) $weddingDate, 0, 10);
    }

    private function normalizedName(?string $name): string
    {
        return strtr(trim(preg_replace('/\s+/u', ' ', (string) $name)), ['أ' => 'ا', 'إ' => 'ا', 'آ' => 'ا', 'ة' => 'ه', 'ى' => 'ي']);
    }

    /** Bookings whose bride has a visit marked "booked" on a day none of her bookings is dated */
    private function bookingDateNotVisitDayIds(): Collection
    {
        return $this->bookedVisitMismatches()->get()->pluck('booking_id')->unique()->sort()->values();
    }

    private function bookedVisitMismatches(): Builder
    {
        return DB::table('bookings AS b')
            ->join('visits AS v', fn($j) => $j->on('v.client_id', '=', 'b.client_id')->where('v.status', 'booked'))
            ->join('clients AS c', 'c.id', '=', 'b.client_id')->whereNull('c.deleted_at')
            ->where('b.status', '!=', 'cancelled')->whereNull('b.booking_date_confirmed_at')
            ->whereNotNull('v.visit_date')
            ->whereNotExists(fn($q) => $q->from('bookings AS b2')->whereColumn('b2.client_id', 'b.client_id')
                ->where('b2.status', '!=', 'cancelled')->whereRaw('DATE(b2.booking_date) = DATE(v.visit_date)'))
            ->select('b.id AS booking_id', 'v.id AS visit_id', DB::raw('DATE(v.visit_date) AS visit_date'));
    }

    /**
     * Bookings dated on or before the edit-date fix that have proof the bride was booked before the booking date:
     * the old bug moved only the booking date (and the re-created deposit), so payments, fittings, the booked visit
     * and the first confirmation log still carry the real time. booking id => [suggested day|null, evidence, edited].
     * The suggestion is the first confirmation (when logs existed at the booking's creation) or the booked visit day.
     */
    private function editDateEvidence(): Collection
    {
        $bookings = DB::table('bookings AS b')->join('clients AS c', 'c.id', '=', 'b.client_id')->whereNull('c.deleted_at')
            ->where('b.status', '!=', 'cancelled')->whereNull('b.booking_date_confirmed_at')->whereNotNull('b.booking_date')
            ->where('b.booking_date', '<=', self::EDIT_DATE_BUG_FIXED_ON)
            ->orderBy('b.booking_date')->get(['b.id', 'b.client_id', 'b.booking_date', 'b.created_at']);
        if ($bookings->isEmpty()) {
            return collect();
        }

        $ids = $bookings->pluck('id');
        $revenues = DB::table('revenues')->whereIn('booking_id', $ids)->get(['booking_id', 'type', 'payment_date', 'created_at'])->groupBy('booking_id');
        $fittings = DB::table('fittings')->whereIn('booking_id', $ids)->get(['booking_id', 'fitting_date', 'created_at'])->groupBy('booking_id');
        $bookedVisits = DB::table('visits')->where('status', 'booked')->whereNotNull('visit_date')
            ->whereIn('client_id', $bookings->pluck('client_id'))->get(['client_id', 'visit_date'])->groupBy('client_id');
        $confirmations = $this->confirmationsByClient();
        $logsSince = DB::table('activity_logs')->where('action', 'تأكيد حجز فستان')->min('created_at');
        $byClient = $bookings->groupBy('client_id');
        $day = fn(?string $timestamp) => $timestamp ? $this->shopTime($timestamp)->toDateString() : null;
        $earliest = fn(array $days) => ($days = array_filter($days)) ? min($days) : null;

        return $bookings->mapWithKeys(function ($b) use ($revenues, $fittings, $bookedVisits, $confirmations, $logsSince, $byClient, $day, $earliest) {
            $date = substr($b->booking_date, 0, 10);
            $before = fn(?string $d) => $d && $d < $date;
            $proofs = [];   // [day, label, exact]

            // Logs started mid-September: for an older booking its first log may already be an edit
            $confirm = $this->firstConfirmation($b, $confirmations)?->toDateString();
            $logged = $logsSince && $b->created_at >= $logsSince;
            if ($confirm && $logged && !$before($confirm)) {
                return [];   // first confirmed on its booking date: not moved by an edit (late entries have their own checks)
            }
            if ($before($confirm)) {
                $proofs[] = [$confirm, 'أول تأكيد حجز', $logged];
            }

            // A booked visit after the bride's previous booking
            $previous = $byClient[$b->client_id]->where('id', '<', $b->id)->max('booking_date');
            $visit = ($bookedVisits[$b->client_id] ?? collect())->map(fn($v) => substr($v->visit_date, 0, 10))
                ->filter(fn($d) => $before($d) && (!$previous || $d > substr($previous, 0, 10)))->max();
            if ($visit) {
                $proofs[] = [$visit, 'زيارة "حجزت"', true];
            }

            $edited = false;
            foreach ($revenues[$b->id] ?? [] as $r) {
                if ($r->type === 'deposit') {
                    // The edit re-created the deposit on the edit day, after the booking itself was recorded
                    $edited = $edited || ($day($r->created_at) === $date && $r->created_at > Carbon::parse($b->created_at)->addMinutes(10)->toDateTimeString());
                    continue;
                }
                $paid = $earliest([substr((string) $r->payment_date, 0, 10), $day($r->created_at)]);
                if ($before($paid)) {
                    $proofs[] = [$paid, 'دفعة ' . (self::PAYMENT_LABELS[$r->type] ?? $r->type), false];
                }
            }
            foreach ($fittings[$b->id] ?? [] as $f) {
                $fitted = $earliest([substr((string) $f->fitting_date, 0, 10), $day($f->created_at)]);
                if ($before($fitted)) {
                    $proofs[] = [$fitted, 'بروفة', false];
                }
            }

            if (!$proofs) {
                return [];
            }

            usort($proofs, fn($x, $y) => strcmp($x[0], $y[0]));
            $first = $proofs[0][0];
            // The likeliest booking day: an exact proof no later than anything else recorded for the booking
            $suggested = collect($proofs)->first(fn($p) => $p[2] && $p[0] === $first)[0] ?? null;
            $evidence = collect($proofs)->unique(fn($p) => $p[1] . $p[0])->map(fn($p) => "{$p[1]} {$p[0]}")->implode('، ');

            return [$b->id => ['suggested' => $suggested, 'evidence' => $evidence, 'edited' => $edited]];
        });
    }

    private function withEditDateEvidence(Collection $rows): Collection
    {
        $evidence = $this->editDateEvidence();

        return $rows->each(function ($r) use ($evidence) {
            $e = $evidence[$r->id] ?? null;
            $r->suggested_date = $e['suggested'] ?? null;
            $r->evidence = $e ? $e['evidence'] . ($e['edited'] ? ' — العربون اتعمل من جديد يوم تاريخ الحجز (بصمة تعديل)' : '') : null;
        });
    }
}
