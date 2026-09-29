<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BookingController extends Controller
{
    public function index(Request $request)
    {
        $query = Booking::whereHas('client')->with([
            'client', 'dress', 'dress2', 'dress3', 'fittings',
            ...\App\Models\Client::appendedRelations('client'),
        ]);

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        if ($clientId = $request->input('client_id')) {
            $query->where('client_id', $clientId);
        }

        if ($date = $request->input('date')) {
            $query->where(function ($q) use ($date) {
                $q->whereDate('pickup_scheduled_on', $date)
                  ->orWhere(function ($sub) use ($date) {
                      $sub->whereNull('pickup_scheduled_on')
                          ->whereDate('event_date', $date);
                  });
            });
        }

        if ($startDate = ($request->input('start_date') ?: $request->input('date_from'))) {
            $query->where(function ($q) use ($startDate) {
                $q->where('pickup_scheduled_on', '>=', $startDate)
                  ->orWhere(function ($sub) use ($startDate) {
                      $sub->whereNull('pickup_scheduled_on')
                          ->where('event_date', '>=', $startDate);
                  });
            });
        }

        if ($endDate = ($request->input('end_date') ?: $request->input('date_to'))) {
            $query->where(function ($q) use ($endDate) {
                $q->where('pickup_scheduled_on', '<=', $endDate)
                  ->orWhere(function ($sub) use ($endDate) {
                      $sub->whereNull('pickup_scheduled_on')
                          ->where('event_date', '<=', $endDate);
                  });
            });
        }

        $bookings = $query->latest()->paginate($request->input('per_page', 25));

        // Dynamically compute conflict/available dates for each dress option
        $conflicts = Booking::conflictDatesFor($bookings->getCollection());
        $bookings->getCollection()->transform(function ($booking) use ($conflicts) {
            $booking->client?->hideAppendedRelations();
            $booking->dress_1_conflict_date = $conflicts[$booking->id][1];
            $booking->dress_2_conflict_date = $conflicts[$booking->id][2];
            $booking->dress_3_conflict_date = $conflicts[$booking->id][3];
            return $booking;
        });

        return response()->json($bookings);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'client_id' => 'required|exists:clients,id',
            'dress_id' => 'required|exists:dresses,id',
            'dress_2_id' => 'nullable|exists:dresses,id',
            'dress_3_id' => 'nullable|exists:dresses,id',
            'booking_date' => 'required|date',
            'event_date' => 'required|date',
            'pickup_scheduled_on' => 'nullable|date',
            'return_scheduled_on' => 'nullable|date',
            'status' => 'nullable|in:pending,confirmed,picked_up,returned,cancelled',
            'total_amount' => 'required|numeric|min:0',
            'deposit_amount' => 'nullable|numeric|min:0',
            'insurance_amount' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
            'sales_name' => 'nullable|string|max:255',
            'payment_method' => 'nullable|string',
            'is_override' => 'nullable|boolean',
            'force_override' => 'nullable|boolean',
            'receipt' => 'nullable',
            'receipt_image' => 'nullable',
        ]);

        $status = $request->input('status', 'pending');
        $forceOverride = $request->boolean('force_override') || $request->boolean('is_override');

        if (($status === 'confirmed' || $status === 'picked_up') && !$forceOverride) {
            $conflict1 = Booking::checkDressAvailability(
                $request->input('client_id'),
                $request->input('dress_id'),
                $request->input('event_date')
            );

            $conflict2 = $request->filled('dress_2_id') ? Booking::checkDressAvailability(
                $request->input('client_id'),
                $request->input('dress_2_id'),
                $request->input('event_date')
            ) : null;

            if ($conflict1 || $conflict2) {
                $errorMsg = $conflict1 ? "الفستان الأول غير متوفر في هذه الفترة: {$conflict1}" : '';
                if ($conflict2) {
                    $errorMsg .= ($errorMsg ? ' | ' : '') . "الفستان الثاني غير متوفر في هذه الفترة: {$conflict2}";
                }

                return response()->json([
                    'errors' => [
                        'event_date' => [$errorMsg]
                    ],
                    'message' => $errorMsg,
                    'conflict_dress_1' => $conflict1,
                    'conflict_dress_2' => $conflict2,
                    'available_date' => $conflict1 ?: $conflict2
                ], 422);
            }
        }

        if ($forceOverride) {
            $validated['is_override'] = true;
        }

        $receiptPath = self::saveReceipt($request, 'receipt') ?? self::saveReceipt($request, 'receipt_image');
        if ($receiptPath) {
            $validated['receipt_path'] = $receiptPath;
        }

        unset($validated['force_override']);

        if (empty($validated['pickup_scheduled_on']) || empty($validated['return_scheduled_on'])) {
            $clientModel = \App\Models\Client::find($validated['client_id']);
            $scheduled = Booking::calculateScheduledDates($validated['event_date'] ?? null, $clientModel->city ?? null);
            if (empty($validated['pickup_scheduled_on'])) {
                $validated['pickup_scheduled_on'] = $scheduled['pickup_date'];
            }
            if (empty($validated['return_scheduled_on'])) {
                $validated['return_scheduled_on'] = $scheduled['return_date'];
            }
        }

        $booking = Booking::create($validated);

        // Record revenue deposit if provided
        $payments = $request->input('payments');
        if (is_array($payments) && count($payments) > 0) {
            foreach ($payments as $p) {
                $amt = floatval($p['amount'] ?? 0);
                $pm = $p['payment_method'] ?? 'cash';
                $rowReceipt = !empty($p['receipt_image'])
                    ? self::saveReceiptData($p['receipt_image'])
                    : (!empty($p['receipt']) ? self::saveReceiptData($p['receipt']) : $receiptPath);

                if ($amt > 0) {
                    \App\Models\Revenue::create([
                        'booking_id' => $booking->id,
                        'type' => 'deposit',
                        'amount' => $amt,
                        'payment_method' => $pm,
                        'payment_date' => $booking->booking_date ?: now()->toDateString(),
                        'notes' => 'عربون حجز فستان للعروس: ' . ($booking->client->name ?? ''),
                        'receipt_path' => $rowReceipt,
                    ]);
                }
            }
        } elseif (($booking->deposit_amount ?? 0) > 0) {
            \App\Models\Revenue::create([
                'booking_id' => $booking->id,
                'type' => 'deposit',
                'amount' => $booking->deposit_amount,
                'payment_method' => $booking->payment_method ?: 'cash',
                'payment_date' => $booking->booking_date ?: now()->toDateString(),
                'notes' => 'عربون حجز فستان للعروس: ' . ($booking->client->name ?? ''),
                'receipt_path' => $receiptPath,
            ]);
        }

        // Create new booking notification
        \App\Models\Notification::create([
            'type' => 'new_appointment',
            'title' => 'طلب حجز جديد',
            'message' => 'تم إرسال طلب موعد حجز جديد من العميل للعروس: ' . ($booking->client->name ?? 'غير معروف') . ' للفستان: ' . ($booking->dress->name ?? 'غير معروف'),
            'related_type' => 'booking',
            'related_id' => $booking->id
        ]);

        $loaded = $booking->load(['client', 'dress', 'dress2', 'dress3']);
        $loaded->dress_1_conflict_date = $this->checkDressAvailability($loaded->client_id, $loaded->dress_id, $loaded->event_date, $loaded->id);
        $loaded->dress_2_conflict_date = $loaded->dress_2_id ? $this->checkDressAvailability($loaded->client_id, $loaded->dress_2_id, $loaded->event_date, $loaded->id) : null;
        $loaded->dress_3_conflict_date = $loaded->dress_3_id ? $this->checkDressAvailability($loaded->client_id, $loaded->dress_3_id, $loaded->event_date, $loaded->id) : null;

        return response()->json($loaded, 201);
    }

    public function show(Booking $booking)
    {
        $booking->load(['client', 'dress', 'dress2', 'dress3', 'fittings', 'revenues']);
        $booking->dress_1_conflict_date = $this->checkDressAvailability($booking->client_id, $booking->dress_id, $booking->event_date, $booking->id);
        $booking->dress_2_conflict_date = $booking->dress_2_id ? $this->checkDressAvailability($booking->client_id, $booking->dress_2_id, $booking->event_date, $booking->id) : null;
        $booking->dress_3_conflict_date = $booking->dress_3_id ? $this->checkDressAvailability($booking->client_id, $booking->dress_3_id, $booking->event_date, $booking->id) : null;

        return response()->json($booking);
    }

    public function update(Request $request, Booking $booking): JsonResponse
    {
        $validated = $request->validate([
            'client_id' => 'sometimes|required|exists:clients,id',
            'dress_id' => 'sometimes|required|exists:dresses,id',
            'dress_2_id' => 'nullable|exists:dresses,id',
            'dress_3_id' => 'nullable|exists:dresses,id',
            'booking_date' => 'sometimes|required|date',
            'event_date' => 'sometimes|required|date',
            'pickup_scheduled_on' => 'nullable|date',
            'return_scheduled_on' => 'nullable|date',
            'status' => 'nullable|in:pending,confirmed,picked_up,returned,cancelled',
            'total_amount' => 'sometimes|required|numeric|min:0',
            'deposit_amount' => 'nullable|numeric|min:0',
            'insurance_amount' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
            'sales_name' => 'nullable|string|max:255',
            'payment_method' => 'nullable|string',
            'is_override' => 'nullable|boolean',
            'force_override' => 'nullable|boolean',
            'receipt' => 'nullable',
            'receipt_image' => 'nullable',
        ]);

        $clientId = $request->input('client_id', $booking->client_id);
        $dressId = $request->input('dress_id', $booking->dress_id);
        $dress2Id = $request->has('dress_2_id') ? $request->input('dress_2_id') : $booking->dress_2_id;
        $eventDate = $request->input('event_date', $booking->event_date);
        $status = $request->input('status', $booking->status);
        $forceOverride = $request->boolean('force_override') || $request->boolean('is_override');

        if (($status === 'confirmed' || $status === 'picked_up') && !$forceOverride) {
            $conflict1 = Booking::checkDressAvailability(
                $clientId,
                $dressId,
                $eventDate,
                $booking->id
            );

            $conflict2 = $dress2Id ? Booking::checkDressAvailability(
                $clientId,
                $dress2Id,
                $eventDate,
                $booking->id
            ) : null;

            if ($conflict1 || $conflict2) {
                $errorMsg = $conflict1 ? "الفستان الأول غير متوفر في هذه الفترة: {$conflict1}" : '';
                if ($conflict2) {
                    $errorMsg .= ($errorMsg ? ' | ' : '') . "الفستان الثاني غير متوفر في هذه الفترة: {$conflict2}";
                }

                return response()->json([
                    'errors' => [
                        'event_date' => [$errorMsg]
                    ],
                    'message' => $errorMsg,
                    'conflict_dress_1' => $conflict1,
                    'conflict_dress_2' => $conflict2,
                    'available_date' => $conflict1 ?: $conflict2
                ], 422);
            }
        }

        if ($forceOverride) {
            $validated['is_override'] = true;
        }

        $receiptPath = self::saveReceipt($request, 'receipt') ?? self::saveReceipt($request, 'receipt_image');
        if ($receiptPath) {
            $validated['receipt_path'] = $receiptPath;
        }

        unset($validated['force_override']);

        if (array_key_exists('event_date', $validated) && empty($validated['pickup_scheduled_on']) && empty($booking->pickup_scheduled_on)) {
            $clientModel = $booking->client ?? \App\Models\Client::find($clientId);
            $scheduled = Booking::calculateScheduledDates($validated['event_date'], $clientModel ? $clientModel->city : null);
            if (empty($validated['pickup_scheduled_on'])) {
                $validated['pickup_scheduled_on'] = $scheduled['pickup_date'];
            }
            if (empty($validated['return_scheduled_on'])) {
                $validated['return_scheduled_on'] = $scheduled['return_date'];
            }
        }

        $booking->update($validated);

        // Keep the bride's wedding date in sync with the booking's event date
        if (array_key_exists('event_date', $validated) && $booking->client) {
            $booking->client->syncWeddingDateFrom($booking);
        }

        // Sync deposit payments if provided
        $depositPayments = $request->input('payments') ?? $request->input('deposit_payments');
        if (is_array($depositPayments)) {
            $booking->revenues()->where('type', 'deposit')->delete();
            foreach ($depositPayments as $dp) {
                $dpAmt = floatval($dp['amount'] ?? 0);
                $dpMethod = $dp['payment_method'] ?? 'cash';
                $rowReceipt = !empty($dp['receipt_image'])
                    ? self::saveReceiptData($dp['receipt_image'])
                    : (!empty($dp['receipt']) ? self::saveReceiptData($dp['receipt']) : $receiptPath);

                if ($dpAmt > 0) {
                    \App\Models\Revenue::create([
                        'booking_id' => $booking->id,
                        'type' => 'deposit',
                        'amount' => $dpAmt,
                        'payment_method' => $dpMethod,
                        'payment_date' => $booking->booking_date ?: now()->toDateString(),
                        'notes' => 'عربون حجز فستان للعروس: ' . ($booking->client->name ?? ''),
                        'receipt_path' => $rowReceipt,
                    ]);
                }
            }
        }

        // Sync insurance payments if provided
        $insurancePayments = $request->input('insurance_payments');
        if (is_array($insurancePayments)) {
            $booking->revenues()->where('type', 'insurance')->delete();
            foreach ($insurancePayments as $ip) {
                $ipAmt = floatval($ip['amount'] ?? 0);
                $ipMethod = $ip['payment_method'] ?? 'cash';
                $rowReceipt = !empty($ip['receipt_image'])
                    ? self::saveReceiptData($ip['receipt_image'])
                    : (!empty($ip['receipt']) ? self::saveReceiptData($ip['receipt']) : $receiptPath);

                if ($ipAmt > 0) {
                    \App\Models\Revenue::create([
                        'booking_id' => $booking->id,
                        'type' => 'insurance',
                        'amount' => $ipAmt,
                        'payment_method' => $ipMethod,
                        'payment_date' => now()->toDateString(),
                        'notes' => 'تأمين الفستان للعروس: ' . ($booking->client->name ?? ''),
                        'receipt_path' => $rowReceipt,
                    ]);
                }
            }
        }

        // Sync balance payments if provided
        $balancePayments = $request->input('balance_payments');
        if (is_array($balancePayments)) {
            $booking->revenues()->where('type', 'balance')->delete();
            foreach ($balancePayments as $bp) {
                $bpAmt = floatval($bp['amount'] ?? 0);
                $bpMethod = $bp['payment_method'] ?? 'cash';
                $rowReceipt = !empty($bp['receipt_image'])
                    ? self::saveReceiptData($bp['receipt_image'])
                    : (!empty($bp['receipt']) ? self::saveReceiptData($bp['receipt']) : $receiptPath);

                if ($bpAmt > 0) {
                    \App\Models\Revenue::create([
                        'booking_id' => $booking->id,
                        'type' => 'balance',
                        'amount' => $bpAmt,
                        'payment_method' => $bpMethod,
                        'payment_date' => now()->toDateString(),
                        'notes' => 'دفعة استلام الفستان للعروس: ' . ($booking->client->name ?? ''),
                        'receipt_path' => $rowReceipt,
                    ]);
                }
            }
        }

        $loaded = $booking->load(['client', 'dress', 'dress2', 'dress3', 'revenues']);
        $loaded->dress_1_conflict_date = $this->checkDressAvailability($loaded->client_id, $loaded->dress_id, $loaded->event_date, $loaded->id);
        $loaded->dress_2_conflict_date = $loaded->dress_2_id ? $this->checkDressAvailability($loaded->client_id, $loaded->dress_2_id, $loaded->event_date, $loaded->id) : null;
        $loaded->dress_3_conflict_date = $loaded->dress_3_id ? $this->checkDressAvailability($loaded->client_id, $loaded->dress_3_id, $loaded->event_date, $loaded->id) : null;

        return response()->json($loaded);
    }

    public function destroy(Booking $booking): JsonResponse
    {
        $booking->delete();

        return response()->json(['message' => 'Booking deleted']);
    }

    private function checkDressAvailability($clientId, $dressId, $eventDate, $excludeBookingId = null)
    {
        return Booking::checkDressAvailability($clientId, $dressId, $eventDate, $excludeBookingId);
    }

    public function publicStore(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'client_id' => 'nullable|integer|exists:clients,id',
            'client_name' => ['nullable', 'string', 'max:255', 'regex:/^[\pL\s\.\'\-]+$/u'],
            'client_phone' => ['nullable', 'string', 'max:50', 'regex:/^\+?[0-9\s\-\(\)]+$/'],
            'client_email' => 'nullable|email|max:255',
            'phone' => ['nullable', 'string', 'max:50', 'regex:/^\+?[0-9\s\-\(\)]+$/'],
            'email' => 'nullable|email|max:255',
            'client_address' => 'nullable|string',
            'client_city' => 'nullable|string|max:100',
            'dress_id' => 'nullable|exists:dresses,id',
            'dress_2_id' => 'nullable|exists:dresses,id',
            'dress_3_id' => 'nullable|exists:dresses,id',
            'dress_ids' => 'nullable|array|max:3',
            'dress_ids.*' => 'integer|exists:dresses,id',
            'booking_date' => 'nullable|date',
            'visit_date' => 'nullable|date|after_or_equal:today',
            'event_date' => 'nullable|date|after_or_equal:today',
            'wedding_date' => 'nullable|date|after_or_equal:today',
            'total_amount' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
            'time_slot' => 'nullable|string|max:50',
            'payment_method' => 'nullable|string',
            'receipt' => 'nullable',
            'receipt_image' => 'nullable',
        ]);

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

        // 1. Find or create the client (bride) automatically
        $client = null;
        if (!empty($validated['client_id'])) {
            $client = \App\Models\Client::find($validated['client_id']);
        }
        if (!$client && ($phone || $email)) {
            $client = \App\Models\Client::where(function($q) use ($phone, $email) {
                if ($phone) $q->whereIn('phone', array_filter([$phone, \App\Services\PhoneNumberService::normalizeMobile($phone), \App\Services\PhoneNumberService::localForm($phone)]));
                if ($email) $q->orWhere('email', $email);
            })->first();
        }
        if (!$client) {
            $client = \App\Models\Client::create([
                'name' => $validated['client_name'] ?? 'Bride User',
                'phone' => $phone ?? '0000000000',
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
                return response()->json(['message' => 'صيغة وقت الزيارة غير صحيحة', 'code' => 'invalid_slot'], 422);
            }
            // Visit slots are local shop time
            if (\Carbon\Carbon::parse($bookingDate . ' ' . $timeSlot, 'Africa/Cairo')->isPast()) {
                return response()->json([
                    'message' => 'عذراً، هذا الموعد قد مضى. يرجى اختيار وقت لاحق.',
                    'code' => 'slot_in_past',
                ], 422);
            }
            
            // Check visit limit of 4 per 30 mins
            $existingCount = \App\Models\Visit::whereDate('visit_date', $bookingDate)
                ->where('status', '!=', 'declined')->where('time_slot', $timeSlot)
                ->count();

            if ($existingCount >= 4) {
                return response()->json([
                    'message' => 'عذراً، هذا الوقت ممتلئ بالكامل (الحد الأقصى 4 زيارات). يرجى اختيار وقت آخر.',
                    'code' => 'slot_full',
                ], 422);
            }
        }

        // Re-check the dresses at submit time: another bride may have booked one since the cart was checked
        $availability = \App\Services\DressAvailabilityService::check(
            \App\Models\Dress::whereIn('id', $dressIds)->get(),
            $bookingDate,
            $validated['wedding_date'] ?? $validated['event_date'] ?? null,
            $client->city ?? $validated['client_city'] ?? null,
            $client->id
        );
        $blocking = collect($availability['dresses'])->filter(fn($r) =>
            ($r['wedding_date'] && !$r['wedding_date']['available'])
            || ($r['visit_date'] && ($r['visit_date']['reason_code'] ?? null) === 'booked')
        );
        if ($blocking->isNotEmpty()) {
            return response()->json([
                'message' => 'بعض الفساتين غير متاحة في التواريخ المختارة',
                'code' => 'dresses_unavailable',
                'availability' => \App\Services\DressAvailabilityService::publicView($availability),
            ], 422);
        }
        // Same phone number already had a visit before, even under another registration or name:
        // never auto-confirm, the employee reviews her previous visit and decides
        $previousVisit = self::previousVisitOfSamePhone($phone ?? $client->phone);
        $isRepeatRequest = $previousVisit !== null;

        // Every dress is free on both dates: no employee review needed
        $autoConfirm = !$isRepeatRequest && !empty($dressIds) && $timeSlot && $availability['all_available'];

        \Illuminate\Support\Facades\DB::beginTransaction();
        try {
            // Keep the wedding date on the bride; it drives the dress availability check
            if (!empty($validated['wedding_date']) || !empty($validated['event_date'])) {
                $client->update(['wedding_date' => $eventDate]);
            }

            // A website request is only a try-on visit: no booking is created until the bride chooses a dress
            $dressNames = \App\Models\Dress::whereIn('id', $dressIds)->pluck('name')->implode(', ');
            $visitNotes = trim(($validated['notes'] ?? '') . ($dressNames ? " | الفساتين المهتمة بها: " . $dressNames : ''));

            $visit = \App\Models\Visit::create([
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
                    : ($autoConfirm ? 'زيارة مؤكدة تلقائياً من الموقع — أرسل رسالة التأكيد' : 'طلب موعد زيارة جديد من الموقع يحتاج مراجعة'),
                'message' => 'العروس: ' . $client->name . ' — موعد الزيارة: ' . $bookingDate . ' ' . ($validated['time_slot'] ?? 'غير محدد'),
                'related_type' => 'visit',
                'related_id' => $visit->id
            ]);

            \Illuminate\Support\Facades\DB::commit();

            return response()->json([
                'message' => 'Appointment request received successfully',
                'client' => $client,
                'visit' => $visit->load('requestedDresses'),
                'auto_confirmed' => $autoConfirm,
            ], 201);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\DB::rollBack();
            \Illuminate\Support\Facades\Log::error('Error creating public booking: ' . $e->getMessage());

            return response()->json([
                'message' => 'حدث خطأ أثناء حفظ طلب الموعد، يرجى المحاولة مرة أخرى',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /** Latest visit of any bride registered with the same phone number (in any stored format) */
    private static function previousVisitOfSamePhone(?string $phone): ?\App\Models\Visit
    {
        $key = \App\Services\PhoneNumberService::matchKey($phone);
        $digits = preg_replace('/\D/', '', $key);
        if (strlen($digits) < 8 || preg_match('/^0+$/', $digits)) {
            return null;
        }

        // Narrow by the last 8 digits in SQL (older rows keep mixed formats), then compare the normalized numbers
        $clientIds = \App\Models\Client::whereRaw(
                "REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '(', ''), ')', ''), '+', '') LIKE ?",
                ['%' . substr($digits, -8)]
            )
            ->get(['id', 'phone'])
            ->filter(fn($c) => \App\Services\PhoneNumberService::matchKey($c->phone) === $key)
            ->pluck('id');

        if ($clientIds->isEmpty()) {
            return null;
        }

        return \App\Models\Visit::whereIn('client_id', $clientIds)->latest('visit_date')->latest('id')->first();
    }
}
