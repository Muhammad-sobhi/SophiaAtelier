<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Services\BookingOfferService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

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

        $bookings = $query->latest()->paginate(min(max((int) $request->input('per_page', 25), 1), 1000));

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
            'offer_id' => 'nullable|integer',
            'discount_amount' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
            'sales_name' => 'nullable|string|max:255',
            'payment_method' => 'nullable|string',
            'is_override' => 'nullable|boolean',
            'force_override' => 'nullable|boolean',
            'receipt' => 'nullable',
            'receipt_image' => 'nullable',
        ]);

        $validated = $this->withOffer($request, $validated, [
            $validated['dress_id'], $validated['dress_2_id'] ?? null, $validated['dress_3_id'] ?? null,
        ], (float) $validated['total_amount']);

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
            'offer_id' => 'nullable|integer',
            'discount_amount' => 'nullable|numeric|min:0',
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
        $dress3Id = $request->has('dress_3_id') ? $request->input('dress_3_id') : $booking->dress_3_id;
        $validated = $this->withOffer($request, $validated, [$dressId, $dress2Id, $dress3Id],
            (float) ($validated['total_amount'] ?? $booking->total_amount), $booking);
        $eventDate = $request->input('event_date', $booking->event_date);
        $status = $request->input('status', $booking->status);
        $forceOverride = $request->boolean('force_override') || $request->boolean('is_override');

        // Only when a date is being changed, so payment-only edits of old bad rows still go through
        $bookingDate = $request->input('booking_date', $booking->booking_date);
        if ($request->hasAny(['booking_date', 'event_date']) && $bookingDate && $eventDate
            && \Carbon\Carbon::parse($bookingDate)->toDateString() > \Carbon\Carbon::parse($eventDate)->toDateString()) {
            return response()->json(['message' => 'تاريخ الحجز لا يمكن أن يكون بعد تاريخ الفرح',
                'errors' => ['booking_date' => ['تاريخ الحجز لا يمكن أن يكون بعد تاريخ الفرح']]], 422);
        }

        // A new wedding date must keep the bride's open visit at most 4 months before it
        if (isset($validated['event_date'])
            && \Carbon\Carbon::parse($validated['event_date'])->toDateString() !== $booking->event_date?->toDateString()) {
            $openVisit = \App\Models\Visit::where('client_id', $clientId)
                ->whereIn('status', \App\Models\Visit::OPEN_STATUSES)->latest()->latest('id')->first();
            \App\Models\Visit::assertVisitWindow($openVisit?->visit_date, $validated['event_date'], 'event_date');
        }

        // Availability only depends on the dresses, the wedding date and the status, so a price or
        // booking-date fix of a booking whose dress overlaps another one is not blocked
        $day = fn($d) => $d ? \Carbon\Carbon::parse($d)->toDateString() : null;
        $availabilityChanged = $clientId != $booking->client_id || $dressId != $booking->dress_id
            || $dress2Id != $booking->dress_2_id || $status !== $booking->status
            || $day($eventDate) !== $day($booking->event_date);

        if ($availabilityChanged && ($status === 'confirmed' || $status === 'picked_up') && !$forceOverride) {
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

    /** Shop bill covering all of the booking's payments (one image per booking, replaced on re-upload) */
    public function uploadBillImage(Request $request, Booking $booking): JsonResponse
    {
        $request->validate([
            'image' => 'required|image|mimes:jpeg,png,jpg,webp|max:10240',
        ]);

        $oldPath = $booking->bill_image_path;
        $booking->update([
            'bill_image_path' => $request->file('image')->store('bills', 'public'),
        ]);
        if ($oldPath) {
            Storage::disk('public')->delete($oldPath);
        }

        return response()->json(['bill_image_path' => $booking->bill_image_path]);
    }

    public function deleteBillImage(Booking $booking): JsonResponse
    {
        if ($booking->bill_image_path) {
            Storage::disk('public')->delete($booking->bill_image_path);
            $booking->update(['bill_image_path' => null]);
        }

        return response()->json(['bill_image_path' => null]);
    }

    public function destroy(Booking $booking): JsonResponse
    {
        if ($booking->bill_image_path) {
            Storage::disk('public')->delete($booking->bill_image_path);
        }
        $booking->delete();

        return response()->json(['message' => 'Booking deleted']);
    }

    /**
     * Checks the offer applied in the form (only when the request sends offer_id; payment-only
     * edits leave the booking's offer untouched).
     */
    private function withOffer(Request $request, array $validated, array $dressIds, float $netTotal, ?Booking $existing = null): array
    {
        unset($validated['offer_id'], $validated['discount_amount']);
        if (! $request->has('offer_id')) {
            return $validated;
        }

        return [...$validated, ...app(BookingOfferService::class)->resolve(
            $request->integer('offer_id') ?: null,
            (float) $request->input('discount_amount', 0),
            $netTotal,
            $dressIds,
            $existing
        )];
    }

    private function checkDressAvailability($clientId, $dressId, $eventDate, $excludeBookingId = null)
    {
        return Booking::checkDressAvailability($clientId, $dressId, $eventDate, $excludeBookingId);
    }

    public function publicStore(Request $request, \App\Services\WebsiteVisitService $websiteVisits): JsonResponse
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

        $result = $websiteVisits->request($validated);

        return response()->json(['message' => 'Appointment request received successfully'] + $result, 201);
    }
}
