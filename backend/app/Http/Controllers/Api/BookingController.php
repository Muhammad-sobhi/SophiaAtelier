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
        $query = Booking::whereHas('client')->with(['client', 'dress', 'dress2', 'dress3', 'fittings']);

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        if ($clientId = $request->input('client_id')) {
            $query->where('client_id', $clientId);
        }

        if ($startDate = $request->input('start_date')) {
            $query->where('booking_date', '>=', $startDate);
        }

        if ($endDate = $request->input('end_date')) {
            $query->where('booking_date', '<=', $endDate);
        }

        $bookings = $query->latest()->paginate($request->input('per_page', 25));

        // Dynamically compute conflict/available dates for each dress option
        $bookings->getCollection()->transform(function ($booking) {
            $booking->dress_1_conflict_date = $this->checkDressAvailability($booking->client_id, $booking->dress_id, $booking->event_date, $booking->id);
            $booking->dress_2_conflict_date = $booking->dress_2_id ? $this->checkDressAvailability($booking->client_id, $booking->dress_2_id, $booking->event_date, $booking->id) : null;
            $booking->dress_3_conflict_date = $booking->dress_3_id ? $this->checkDressAvailability($booking->client_id, $booking->dress_3_id, $booking->event_date, $booking->id) : null;
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
        $booking = Booking::create($validated);

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
        $booking->update($validated);

        $loaded = $booking->load(['client', 'dress', 'dress2', 'dress3']);
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
            'dress_ids' => 'nullable|array',
            'booking_date' => 'nullable|date',
            'visit_date' => 'nullable|date',
            'event_date' => 'nullable|date',
            'wedding_date' => 'nullable|date',
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

        // Resolve dress IDs
        $dressId = $validated['dress_id'] ?? null;
        $dress2Id = $validated['dress_2_id'] ?? null;
        $dress3Id = $validated['dress_3_id'] ?? null;

        if (!empty($validated['dress_ids']) && is_array($validated['dress_ids'])) {
            $dressId = $validated['dress_ids'][0] ?? $dressId;
            $dress2Id = $validated['dress_ids'][1] ?? $dress2Id;
            $dress3Id = $validated['dress_ids'][2] ?? $dress3Id;
        }

        if (!$dressId) {
            $firstDress = \App\Models\Dress::first();
            $dressId = $firstDress ? $firstDress->id : 1;
        }

        // 1. Find or create the client (bride) automatically
        $client = null;
        if (!empty($validated['client_id'])) {
            $client = \App\Models\Client::find($validated['client_id']);
        }
        if (!$client && ($phone || $email)) {
            $client = \App\Models\Client::where(function($q) use ($phone, $email) {
                if ($phone) $q->where('phone', $phone);
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
            
            // Check visit limit of 4 per 30 mins
            $existingCount = \App\Models\Visit::whereDate('visit_date', $bookingDate)
                ->where('time_slot', $timeSlot)
                ->count();

            if ($existingCount >= 4) {
                return response()->json([
                    'message' => 'عذراً، هذا الوقت ممتلئ بالكامل (الحد الأقصى 4 زيارات). يرجى اختيار وقت آخر.'
                ], 422);
            }
        }

        \Illuminate\Support\Facades\DB::beginTransaction();
        try {
            // 2. Create the Visit record to start the journey from the visit stage
            $dressesList = [];
            if ($dressId) $dressesList[] = \App\Models\Dress::find($dressId)->name ?? '';
            if ($dress2Id) $dressesList[] = \App\Models\Dress::find($dress2Id)->name ?? '';
            if ($dress3Id) $dressesList[] = \App\Models\Dress::find($dress3Id)->name ?? '';
            $dressesStr = implode(', ', array_filter($dressesList));

            $visitNotes = trim(($validated['notes'] ?? '') . " | الفساتين المهتمة بها: " . $dressesStr);

            $visit = \App\Models\Visit::create([
                'client_id' => $client->id,
                'visit_date' => $bookingDate,
                'status' => 'pending', // Waiting for staff confirmation
                'source' => 'website',
                'notes' => $visitNotes,
                'time_slot' => $timeSlot,
            ]);

            $receiptPath = self::saveReceipt($request, 'receipt') ?? self::saveReceipt($request, 'receipt_image');

            // Also create a pending booking record so it can be confirmed later in stage 2
            $booking = Booking::create([
                'client_id' => $client->id,
                'dress_id' => $dressId,
                'dress_2_id' => $dress2Id,
                'dress_3_id' => $dress3Id,
                'booking_date' => $bookingDate,
                'event_date' => $eventDate,
                'status' => 'pending',
                'total_amount' => $validated['total_amount'] ?? 0,
                'notes' => $validated['notes'],
                'payment_method' => $validated['payment_method'] ?? null,
                'receipt_path' => $receiptPath,
            ]);

            // Create new booking notification
            \App\Models\Notification::create([
                'type' => 'new_appointment',
                'title' => 'طلب موعد زيارة جديد من الموقع',
                'message' => 'تم إرسال طلب موعد زيارة جديد من العروس: ' . $client->name . ' لفترة: ' . ($validated['time_slot'] ?? 'غير محدد'),
                'related_type' => 'booking',
                'related_id' => $booking->id
            ]);

            \Illuminate\Support\Facades\DB::commit();

            return response()->json([
                'message' => 'Appointment request received successfully',
                'client' => $client,
                'visit' => $visit,
                'booking' => $booking
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
}
