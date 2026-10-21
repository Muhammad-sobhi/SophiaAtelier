<?php

namespace App\Services;

use App\Exceptions\ActionRejected;
use App\Http\Controllers\Api\VisitController;
use App\Models\Client;
use App\Models\Visit;
use Illuminate\Support\Facades\DB;

/**
 * A try-on visit requested from the website: finds or registers the bride, checks the day, slot and
 * dresses, and creates the visit (confirmed automatically for a first-time bride). A request that
 * cannot be taken throws ActionRejected with the code the website shows a message for.
 */
class WebsiteVisitService
{
    /** @return array{client: Client, visit: Visit, auto_confirmed: bool} */
    public function request(array $validated): array
    {
        // Normalize parameters
        $phone = $validated['client_phone'] ?? $validated['phone'] ?? null;
        $email = $validated['client_email'] ?? $validated['email'] ?? null;
        $bookingDate = $validated['visit_date'] ?? $validated['booking_date'] ?? now()->toDateString();
        $eventDate = $validated['wedding_date'] ?? $validated['event_date'] ?? $bookingDate;

        // Dresses the bride wants to try (max 3), in the order she picked them
        $dressIds = !empty($validated['dress_ids'])
            ? $validated['dress_ids']
            : array_filter([$validated['dress_id'] ?? null, $validated['dress_2_id'] ?? null, $validated['dress_3_id'] ?? null]);
        $dressIds = array_slice(array_values(array_unique(array_map('intval', $dressIds))), 0, 3);

        // Availability is checked on the wedding date too, so both are needed before a visit can be requested
        if (empty($dressIds) || (empty($validated['wedding_date']) && empty($validated['event_date']))) {
            throw new ActionRejected([
                'message' => 'يرجى اختيار فستان واحد على الأقل وتحديد تاريخ الزفاف',
                'code' => 'missing_dresses_or_wedding_date',
            ]);
        }

        // Days closed by the admin do not take website visits (staff can still register one)
        if (\App\Models\ClosedDay::isClosed($bookingDate)) {
            throw new ActionRejected([
                'message' => \App\Models\ClosedDay::closedMessage($bookingDate),
                'code' => 'day_closed',
            ]);
        }

        if ($windowError = Visit::visitWindowError($bookingDate, $eventDate)) {
            throw new ActionRejected([
                'message' => $windowError['message'],
                'code' => 'visit_too_early',
                'earliest_visit_date' => $windowError['earliest_visit_date'],
            ]);
        }

        // A real mobile is needed to reach the bride and to tell one bride from another
        if (!$phone || !PhoneNumberService::matchKey($phone)) {
            throw new ActionRejected(['message' => 'يرجى إدخال رقم موبايل صحيح', 'code' => 'phone_required']);
        }

        // 1. Find or create the client (bride) automatically. A client_id from the browser is only trusted
        // when it belongs to the same phone, so a request cannot be attached to another bride's record.
        $client = null;
        if (!empty($validated['client_id'])) {
            $candidate = Client::find($validated['client_id']);
            if ($candidate && PhoneNumberService::matchKey($candidate->phone) === PhoneNumberService::matchKey($phone)) {
                $client = $candidate;
            }
        }
        if (!$client) {
            $client = Client::where(function($q) use ($phone, $email) {
                if ($phone) $q->whereIn('phone', array_filter([$phone, PhoneNumberService::normalizeMobile($phone), PhoneNumberService::localForm($phone)]));
                if ($email) $q->orWhere('email', $email);
            })->first();
        }
        if (!$client) {
            if (empty($validated['client_name'])) {
                throw new ActionRejected(['message' => 'يرجى إدخال اسم العروس', 'code' => 'name_required']);
            }
            $client = Client::create([
                'name' => $validated['client_name'],
                'phone' => $phone,
                'email' => $email,
                'address' => $validated['client_address'] ?? '',
                'city' => $validated['client_city'] ?? 'Cairo',
                'source' => 'website',
            ]);
        }

        // Normalize time slot
        $timeSlot = null;
        if (!empty($validated['time_slot'])) {
            $timeSlot = VisitController::normalizeTimeSlot($validated['time_slot']);

            if (!preg_match('/^\d{2}:\d{2}$/', $timeSlot)) {
                throw new ActionRejected(['message' => 'صيغة وقت الزيارة غير صحيحة', 'code' => 'invalid_slot']);
            }
            // Visit slots are local shop time
            if (\Carbon\Carbon::parse($bookingDate . ' ' . $timeSlot, 'Africa/Cairo')->isPast()) {
                throw new ActionRejected([
                    'message' => 'عذراً، هذا الموعد قد مضى. يرجى اختيار وقت لاحق.',
                    'code' => 'slot_in_past',
                ]);
            }
            // The slot's room (4 visits per 30 minutes) is checked under its lock in Visit::inSlot
        }

        // Re-check the dresses at submit time: another bride may have booked one since the cart was checked
        $availability = DressAvailabilityService::check(
            \App\Models\Dress::whereIn('id', $dressIds)->get(),
            $bookingDate,
            $validated['wedding_date'] ?? $validated['event_date'] ?? null,
            $client->city ?? $validated['client_city'] ?? null,
            $client->id
        );
        $blocking = collect($availability['dresses'])->filter(fn($r) =>
            ($r['wedding_date'] && !$r['wedding_date']['available'])
            || ($r['visit_date'] && !$r['visit_date']['available'])
        );
        if ($blocking->isNotEmpty()) {
            throw new ActionRejected([
                'message' => 'بعض الفساتين غير متاحة في التواريخ المختارة',
                'code' => 'dresses_unavailable',
                'availability' => DressAvailabilityService::publicView($availability),
            ]);
        }
        // One request at a time per phone, so a double tap or a retry cannot slip past the open-visit check below
        $phoneKey = PhoneNumberService::matchKey($phone ?? $client->phone);
        $lock = \Illuminate\Support\Facades\Cache::lock('public-visit:' . ($phoneKey ?: 'client-' . $client->id), 10);
        if (!$lock->get()) {
            throw new ActionRejected([
                'message' => 'طلبك قيد الإرسال بالفعل، يرجى الانتظار لحظات',
                'code' => 'request_in_progress',
            ], 429);
        }

        try {
            return Visit::inSlot($bookingDate, $timeSlot,
                fn() => $this->createVisit($validated, $client, $phone, $bookingDate, $eventDate, $timeSlot, $dressIds));
        } finally {
            $lock->release();
        }
    }

    private function createVisit(array $validated, Client $client, ?string $phone, string $bookingDate, string $eventDate, ?string $timeSlot, array $dressIds): array
    {
        $samePhoneClientIds = self::clientIdsWithSamePhone($phone ?? $client->phone)->push($client->id)->unique();

        // She already has an upcoming visit (same phone, any registration): the website does not add another one,
        // changes go through the staff
        $openVisit = Visit::whereIn('client_id', $samePhoneClientIds)
            ->whereIn('status', Visit::OPEN_STATUSES)
            ->whereDate('visit_date', '>=', now('Africa/Cairo')->toDateString())
            ->orderBy('visit_date')->first();
        if ($openVisit) {
            throw new ActionRejected([
                'message' => 'لديكِ موعد زيارة قائم بالفعل بتاريخ ' . $openVisit->visit_date->toDateString() . '. للتعديل يرجى التواصل معنا.',
                'code' => 'visit_already_booked',
                'visit_date' => $openVisit->visit_date->toDateString(),
                'time_slot' => $openVisit->time_slot,
            ]);
        }

        // Same phone number already had a visit before, even under another registration or name:
        // never auto-confirm, the employee reviews her previous visit and decides
        $previousVisit = Visit::whereIn('client_id', $samePhoneClientIds)->latest('visit_date')->latest('id')->first();
        $isRepeatRequest = $previousVisit !== null;

        // First-time brides are confirmed automatically (unavailable dresses were already refused above)
        $autoConfirm = !$isRepeatRequest;

        DB::beginTransaction();
        try {
            // Keep the wedding date on the bride; it drives the dress availability check
            if (!empty($validated['wedding_date']) || !empty($validated['event_date'])) {
                $client->update(['wedding_date' => $eventDate]);
            }

            // A website request is only a try-on visit: no booking is created until the bride chooses a dress
            $dressNames = \App\Models\Dress::whereIn('id', $dressIds)->pluck('name')->implode(', ');
            $visitNotes = trim(($validated['notes'] ?? '') . ($dressNames ? " | الفساتين المهتمة بها: " . $dressNames : ''));

            $visit = Visit::create([
                'client_id' => $client->id,
                'visit_date' => $bookingDate,
                'status' => 'pending', // Waiting for staff confirmation
                'source' => 'website',
                'previous_visit_id' => $previousVisit?->id,
                'notes' => $visitNotes,
                'time_slot' => $timeSlot,
                'trying_fee' => \App\Models\Dress::whereIn('id', $dressIds)->sum('trying_fee'),
            ]);
            $visit->requestedDresses()->syncWithPivotValues($dressIds, ['type' => 'requested']);
            if ($autoConfirm) {
                $visit->markConfirmed(null);
            }

            \App\Models\Notification::create([
                'type' => 'new_appointment',
                'title' => $isRepeatRequest
                    ? '⚠️ طلب زيارة متكرر — العروس زارت من قبل، راجع قبل التأكيد'
                    : 'زيارة مؤكدة تلقائياً من الموقع — أرسل رسالة التأكيد',
                'message' => 'العروس: ' . $client->name . ' — موعد الزيارة: ' . $bookingDate . ' ' . ($validated['time_slot'] ?? 'غير محدد'),
                'related_type' => 'visit',
                'related_id' => $visit->id
            ]);

            DB::commit();

            return [
                'client' => $client,
                'visit' => $visit->load('requestedDresses'),
                'auto_confirmed' => $autoConfirm,
            ];
        } catch (\Throwable $e) {
            DB::rollBack();
            \Illuminate\Support\Facades\Log::error('Error creating public booking: ' . $e->getMessage());

            throw new ActionRejected([
                'message' => 'حدث خطأ أثناء حفظ طلب الموعد، يرجى المحاولة مرة أخرى',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /** Ids of every bride registered with the same phone number (in any stored format) */
    private static function clientIdsWithSamePhone(?string $phone): \Illuminate\Support\Collection
    {
        $key = PhoneNumberService::matchKey($phone);
        $digits = preg_replace('/\D/', '', $key);
        if (strlen($digits) < 8 || preg_match('/^0+$/', $digits)) {
            return collect();
        }

        // Narrow by the last 8 digits in SQL (older rows keep mixed formats), then compare the normalized numbers
        return Client::whereRaw(
                "REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '(', ''), ')', ''), '+', '') LIKE ?",
                ['%' . substr($digits, -8)]
            )
            ->get(['id', 'phone'])
            ->filter(fn($c) => PhoneNumberService::matchKey($c->phone) === $key)
            ->pluck('id');
    }
}
