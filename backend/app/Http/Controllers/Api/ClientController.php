<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\Booking;
use App\Models\Fitting;
use App\Models\Visit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ClientController extends Controller
{
    public function index(Request $request)
    {
        $query = Client::withCount(['visits', 'bookings'])->with([
            'visits' => function ($q) {
                $q->latest();
            },
            'visits.requestedDresses.images',
            'visits.triedDresses',
            'visits.bookedDresses',
            'visits.previousVisit:id,client_id,visit_date,time_slot,status,source',
            'visits.previousVisit.client:id,name,phone',
            'visits.previousVisit.triedDresses',
            'bookings' => function ($q) {
                $q->latest()->latest('id');
            },
            'bookings.dress.accessories',
            'bookings.dress.images',
            'bookings.dress2.accessories',
            'bookings.dress2.images',
            'bookings.dress3.accessories',
            'bookings.dress3.images',
            'bookings.revenues',
            'fittings'
        ]);

        if ($search = trim($request->input('search', ''))) {
            $cleanSearch = str_replace(['%', '_'], ['\%', '\_'], $search);
            // Phones are stored as +<country><number>: a local number typed with its leading 0 still matches
            $phoneSearch = preg_match('/^0\d{3,}$/', $search) ? ltrim($search, '0') : $cleanSearch;
            $query->where(function ($q) use ($cleanSearch, $phoneSearch) {
                $q->where('name', 'like', "%{$cleanSearch}%")
                    ->orWhere('phone', 'like', "%{$phoneSearch}%")
                    ->orWhere('phone2', 'like', "%{$phoneSearch}%")
                    ->orWhere('city', 'like', "%{$cleanSearch}%")
                    ->orWhere('address', 'like', "%{$cleanSearch}%");
            });
        }

        if ($city = $request->input('city')) {
            if ($city !== 'all') {
                $cleanCity = str_replace(['%', '_'], ['\%', '\_'], $city);
                $query->where(function ($q) use ($cleanCity) {
                    $q->where('city', $cleanCity)
                        ->orWhere('address', 'like', "%{$cleanCity}%");
                });
            }
        }

        if ($source = $request->input('source')) {
            if ($source !== 'all') {
                if (in_array($source, ['instagram', 'انستجرام', 'انستقرام'])) {
                    $query->whereIn('source', ['instagram', 'انستجرام', 'انستقرام']);
                } else {
                    $query->where('source', $source);
                }
            }
        }

        $dateFilter = $request->input('date') ?: $request->input('wedding_date');
        if ($dateFilter) {
            if (strlen($dateFilter) === 7) { // Month format: YYYY-MM
                $query->where(function ($q) use ($dateFilter) {
                    $q->whereHas('bookings', function ($b) use ($dateFilter) {
                        $b->where('pickup_scheduled_on', 'like', "{$dateFilter}%")
                          ->orWhere(function ($sub) use ($dateFilter) {
                              $sub->whereNull('pickup_scheduled_on')
                                  ->where('event_date', 'like', "{$dateFilter}%");
                          });
                    })->orWhere(function ($c) use ($dateFilter) {
                        $c->doesntHave('bookings')
                          ->where('wedding_date', 'like', "{$dateFilter}%");
                    });
                });
            } else { // Date format: YYYY-MM-DD
                $query->where(function ($q) use ($dateFilter) {
                    $q->whereHas('bookings', function ($b) use ($dateFilter) {
                        $b->whereDate('pickup_scheduled_on', $dateFilter)
                          ->orWhere(function ($sub) use ($dateFilter) {
                              $sub->whereNull('pickup_scheduled_on')
                                  ->whereDate('event_date', $dateFilter);
                          });
                    })->orWhere(function ($c) use ($dateFilter) {
                        $c->doesntHave('bookings')
                          ->whereDate('wedding_date', $dateFilter);
                    });
                });
            }
        }

        if ($dateFrom = $request->input('date_from')) {
            $query->where(function ($q) use ($dateFrom) {
                $q->whereHas('bookings', function ($b) use ($dateFrom) {
                    $b->whereDate('pickup_scheduled_on', '>=', $dateFrom)
                      ->orWhere(function ($sub) use ($dateFrom) {
                          $sub->whereNull('pickup_scheduled_on')
                              ->whereDate('event_date', '>=', $dateFrom);
                      });
                })->orWhere(function ($c) use ($dateFrom) {
                    $c->doesntHave('bookings')
                      ->whereDate('wedding_date', '>=', $dateFrom);
                });
            });
        }

        if ($dateTo = $request->input('date_to')) {
            $query->where(function ($q) use ($dateTo) {
                $q->whereHas('bookings', function ($b) use ($dateTo) {
                    $b->whereDate('pickup_scheduled_on', '<=', $dateTo)
                      ->orWhere(function ($sub) use ($dateTo) {
                          $sub->whereNull('pickup_scheduled_on')
                              ->whereDate('event_date', '<=', $dateTo);
                      });
                })->orWhere(function ($c) use ($dateTo) {
                    $c->doesntHave('bookings')
                      ->whereDate('wedding_date', '<=', $dateTo);
                });
            });
        }

        $perPage = (int) $request->input('per_page', 20);
        if ($perPage < 1) {
            $perPage = 20;
        }

        $paginator = $query->latest()->paginate($perPage);
        $result = $paginator->toArray();
        $result['stats'] = [
            'total_brides' => Client::count(),
            'with_wedding_date' => Client::whereNotNull('wedding_date')->count(),
            'with_bookings' => Client::has('bookings')->count(),
        ];

        return response()->json($result);
    }

    public function findClient(Request $request): JsonResponse
    {
        $request->validate([
            'client_id' => 'nullable|integer',
            'phone' => ['nullable', 'string', 'max:30', 'regex:/^\+?[0-9\s\-\(\)]+$/'],
            'email' => 'nullable|email|max:255',
        ], [
            'phone.regex' => 'رقم الهاتف يجب أن يحتوي على أرقام فقط.',
            'email.email' => 'يرجى إدخال بريد إلكتروني صالح.',
        ]);

        $clientId = $request->input('client_id');
        $rawPhone = $request->input('phone');
        $rawEmail = $request->input('email');

        if ($clientId) {
            $client = Client::with(['visits.requestedDresses.images', 'visits.triedDresses', 'visits.bookedDresses', 'fittings', 'bookings.dress.images', 'bookings.dress2.images', 'bookings.dress3.images', 'bookings.revenues'])->find($clientId);
            if ($client) {
                return response()->json($client);
            }
        }

        if (!$rawPhone && !$rawEmail) {
            return response()->json([
                'message' => 'يرجى إدخال رقم الهاتف أو البريد الإلكتروني للبحث'
            ], 422);
        }

        $cleanPhone = $rawPhone ? preg_replace('/[^\d]/', '', $rawPhone) : null;
        $cleanEmail = $rawEmail ? strtolower(trim($rawEmail)) : null;

        if ($rawPhone && strlen($cleanPhone) < 8) {
            return response()->json([
                'message' => 'يرجى إدخال رقم هاتف صحيح مكون من 8 أرقام على الأقل'
            ], 422);
        }

        $phoneVariants = [];
        if ($cleanPhone) {
            $rawNoZero = ltrim($cleanPhone, '0');
            $phoneVariants = array_unique(array_filter([
                $rawPhone,
                $cleanPhone,
                '+' . $cleanPhone,
                $rawNoZero,
                '0' . $rawNoZero,
                '+20' . $rawNoZero,
                '20' . $rawNoZero,
                '+2' . '0' . $rawNoZero,
                \App\Services\PhoneNumberService::normalizeMobile($rawPhone),
                \App\Services\PhoneNumberService::localForm($rawPhone),
            ]));
        }

        $query = Client::query();

        if ($cleanPhone && $cleanEmail) {
            $query->where(function ($q) use ($phoneVariants, $cleanEmail) {
                $q->whereIn('phone', $phoneVariants)
                    ->orWhereIn('phone2', $phoneVariants)
                    ->orWhere('email', $cleanEmail);
            });
        } elseif ($cleanPhone) {
            $query->where(function ($q) use ($phoneVariants) {
                $q->whereIn('phone', $phoneVariants)
                    ->orWhereIn('phone2', $phoneVariants);
            });
        } elseif ($cleanEmail) {
            $query->where('email', $cleanEmail);
        }

        $client = $query->with(['visits.requestedDresses.images', 'visits.triedDresses', 'visits.bookedDresses', 'fittings', 'bookings.dress.images', 'bookings.dress2.images', 'bookings.dress3.images', 'bookings.revenues'])->first();

        if (!$client) {
            return response()->json([
                'message' => 'لم يتم العثور على سجل مبيعات أو حجز مرتبط بهذه البيانات.'
            ], 404);
        }

        return response()->json($client);
    }

    public function show(Client $client): JsonResponse
    {
        $client->loadMissing([
            'visits' => function ($q) {
                $q->latest(); },
            'visits.requestedDresses.images',
            'visits.triedDresses',
            'visits.bookedDresses',
            'visits.previousVisit:id,client_id,visit_date,time_slot,status,source',
            'visits.previousVisit.client:id,name,phone',
            'visits.previousVisit.triedDresses',
            'bookings' => function ($q) {
                $q->latest()->latest('id'); },
            'bookings.dress.accessories',
            'bookings.dress.images',
            'bookings.dress2.accessories',
            'bookings.dress2.images',
            'bookings.dress3.accessories',
            'bookings.dress3.images',
            'bookings.revenues',
            'fittings',
        ]);

        return response()->json($client);
    }

    public function store(\App\Http\Requests\StoreClientRequest $request): JsonResponse
    {
        $validated = $request->validated();

        if ($request->hasFile('image')) {
            $path = $request->file('image')->store('clients', 'public');
            $validated['image_path'] = $path;
        }

        if (empty($validated['city']) && !empty($validated['address'])) {
            $validated['city'] = $validated['address'];
        }

        $dressIds = array_values(array_unique(array_filter([
            $validated['dress_id'] ?? null, $validated['dress_2_id'] ?? null, $validated['dress_3_id'] ?? null,
        ])));

        // A visit (dated today when only dresses are sent) may be at most 3 months before the wedding
        Visit::assertVisitWindow($validated['visit_date'] ?? ($dressIds ? now()->toDateString() : null), $validated['wedding_date'] ?? null);

        // Check visit time slot limit before creating anything
        $normalizedTimeSlot = null;
        if (!empty($validated['visit_time']) && !empty($validated['visit_date'])) {
            $normalizedTimeSlot = \App\Http\Controllers\Api\VisitController::normalizeTimeSlot($validated['visit_time']);
            
            $existingCount = \App\Models\Visit::whereDate('visit_date', $validated['visit_date'])
                ->where('status', '!=', 'declined')->where('time_slot', $normalizedTimeSlot)
                ->count();
                
            if ($existingCount >= 4) {
                return response()->json([
                    'message' => 'عذراً، هذا الوقت ممتلئ بالكامل (الحد الأقصى 4 زيارات). يرجى اختيار وقت آخر.'
                ], 422);
            }
        }

        $client = Client::create($validated);

        // Auto-calculate scheduled dates if wedding_date is present and dates were not passed
        if (!empty($validated['wedding_date'])) {
            $scheduled = \App\Models\Booking::calculateScheduledDates($validated['wedding_date'], $client->city);
            if (empty($validated['pickup_scheduled_on'])) {
                $validated['pickup_scheduled_on'] = $scheduled['pickup_date'];
            }
            if (empty($validated['return_scheduled_on'])) {
                $validated['return_scheduled_on'] = $scheduled['return_date'];
            }
        }

        if (!empty($validated['visit_date']) || $dressIds) {
            $validated['visit_date'] = $validated['visit_date'] ?? now()->toDateString();
            // Registered by staff (shop / phone / chat): the dresses to try go on the visit, which is confirmed
            // by that employee. Website requests go through the public booking endpoint instead.
            $visit = $client->visits()->create([
                'visit_date' => $validated['visit_date'],
                'time_slot' => $normalizedTimeSlot,
                'trying_fee' => array_key_exists('trying_fee', $validated)
                    ? (float) $validated['trying_fee']
                    : \App\Models\Dress::whereIn('id', $dressIds)->sum('trying_fee'),
                'source' => in_array($client->source, Visit::SOURCES) ? $client->source : 'walkin',
                'sales_name' => $validated['sales_name'] ?? null,
                'notes' => 'تم تسجيل الزيارة من الداشبورد',
            ]);
            $visit->requestedDresses()->syncWithPivotValues($dressIds, ['type' => 'requested']);
            if ($request->user()) {
                $visit->markConfirmed($request->user()->id);
            }

            if (isset($validated['tried_dresses'])) {
                $visit->triedDresses()->syncWithPivotValues($validated['tried_dresses'], ['type' => 'tried']);
            }
            if (isset($validated['booked_dresses'])) {
                $visit->bookedDresses()->syncWithPivotValues($validated['booked_dresses'], ['type' => 'booked']);
            }
        }

        return response()->json($client, 201);
    }

    public function update(\App\Http\Requests\UpdateClientRequest $request, Client $client): JsonResponse
    {
        $validated = $request->validated();

        if ($request->hasFile('image')) {
            if ($client->image_path) {
                Storage::disk('public')->delete($client->image_path);
            }
            $path = $request->file('image')->store('clients', 'public');
            $validated['image_path'] = $path;
        }

        if (array_key_exists('address', $validated) && empty($validated['city'])) {
            $validated['city'] = $validated['address'];
        }

        // A new visit date, or a new wedding date, must keep the visit at most 3 months before the wedding.
        // Unchanged dates are not re-checked so other bride details can still be edited.
        $weddingDate = array_key_exists('wedding_date', $validated) ? $validated['wedding_date'] : $client->wedding_date;
        $weddingChanged = !empty($validated['wedding_date'])
            && \Carbon\Carbon::parse($validated['wedding_date'])->toDateString() !== $client->wedding_date;
        $newVisitDate = !empty($validated['visit_date'])
            && !$client->visits()->whereDate('visit_date', $validated['visit_date'])->exists();
        if ($weddingChanged || $newVisitDate) {
            $visitDate = $validated['visit_date']
                ?? $client->visits()->whereIn('status', Visit::OPEN_STATUSES)->latest()->latest('id')->first()?->visit_date;
            Visit::assertVisitWindow($visitDate, $weddingDate, $newVisitDate ? 'visit_date' : 'wedding_date');
        }

        // Check visit time slot limit before updating anything
        $normalizedTimeSlot = null;
        if (!empty($validated['visit_date']) && !empty($validated['visit_time'])) {
            $normalizedTimeSlot = \App\Http\Controllers\Api\VisitController::normalizeTimeSlot($validated['visit_time']);
            
            $visitQuery = \App\Models\Visit::whereDate('visit_date', $validated['visit_date'])
                ->where('status', '!=', 'declined')->where('time_slot', $normalizedTimeSlot);
            
            $existingVisit = $client->visits()->whereDate('visit_date', $validated['visit_date'])->first();
            if ($existingVisit) {
                $visitQuery->where('id', '!=', $existingVisit->id);
            }
            
            if ($visitQuery->count() >= 4) {
                return response()->json([
                    'message' => 'عذراً، هذا الوقت ممتلئ بالكامل (الحد الأقصى 4 زيارات). يرجى اختيار وقت آخر.'
                ], 422);
            }
        }

        $client->update($validated);

        // Recalculate pickup/return only when the wedding date actually changed (or none were set),
        // so manually edited scheduled dates are not silently overwritten.
        $latestBookingBeforeUpdate = $client->bookings()->latest()->latest('id')->first();
        $weddingDateChanged = !$latestBookingBeforeUpdate
            || !$latestBookingBeforeUpdate->event_date
            || empty($latestBookingBeforeUpdate->return_scheduled_on)
            || (!empty($validated['wedding_date']) && $latestBookingBeforeUpdate->event_date->format('Y-m-d') !== \Carbon\Carbon::parse($validated['wedding_date'])->format('Y-m-d'));
        if (array_key_exists('wedding_date', $validated) && !empty($validated['wedding_date']) && empty($validated['pickup_scheduled_on']) && $weddingDateChanged) {
            $scheduled = \App\Models\Booking::calculateScheduledDates($validated['wedding_date'], $client->city);
            $validated['pickup_scheduled_on'] = $scheduled['pickup_date'];
            $validated['return_scheduled_on'] = $scheduled['return_date'];
        }

        if (array_key_exists('dress_id', $validated) || array_key_exists('dress_2_id', $validated) || array_key_exists('dress_3_id', $validated) || array_key_exists('pickup_scheduled_on', $validated) || array_key_exists('return_scheduled_on', $validated) || array_key_exists('wedding_date', $validated)) {
            $booking = $client->bookings()->latest()->latest('id')->first();
            // Cancelled / returned bookings are history and are never edited from here
            if ($booking && in_array($booking->status, ['cancelled', 'returned'])) {
                $booking = null;
            }
            $hasActiveBooking = $booking && $booking->status !== 'pending';
            if ($booking && ($hasActiveBooking || !$this->syncOpenVisitDresses($client, $validated))) {
                $bookingUpdates = [];
                if (array_key_exists('wedding_date', $validated)) $bookingUpdates['event_date'] = $validated['wedding_date'];
                if (array_key_exists('dress_id', $validated)) $bookingUpdates['dress_id'] = $validated['dress_id'];
                if (array_key_exists('dress_2_id', $validated)) $bookingUpdates['dress_2_id'] = $validated['dress_2_id'];
                if (array_key_exists('dress_3_id', $validated)) $bookingUpdates['dress_3_id'] = $validated['dress_3_id'];
                if (array_key_exists('pickup_scheduled_on', $validated)) $bookingUpdates['pickup_scheduled_on'] = $validated['pickup_scheduled_on'];
                if (array_key_exists('return_scheduled_on', $validated)) $bookingUpdates['return_scheduled_on'] = $validated['return_scheduled_on'];
                if (!empty($bookingUpdates)) {
                    $booking->update($bookingUpdates);
                }
            } elseif (!$booking) {
                // No booking yet: the chosen dresses are the ones she wants to try on her visit
                $this->syncOpenVisitDresses($client, $validated);
            }
        }

        if (!empty($validated['visit_date'])) {
            $visit = $client->visits()->whereDate('visit_date', $validated['visit_date'])->first();
            if (!$visit) {
                $visit = $client->visits()->create([
                    'visit_date' => $validated['visit_date'],
                    'status' => 'pending',
                    'source' => $client->source ?: 'website',
                    'notes' => 'تمت الإضافة من تعديل العروس',
                ]);
            }
            
            $visitUpdates = [];
            if (array_key_exists('visit_time', $validated)) $visitUpdates['time_slot'] = $normalizedTimeSlot;
            if (array_key_exists('sales_name', $validated)) $visitUpdates['sales_name'] = $validated['sales_name'];
            if (!empty($visitUpdates)) {
                $visit->update($visitUpdates);
            }
            
            if (array_key_exists('tried_dresses', $validated)) {
                $visit->triedDresses()->syncWithPivotValues($validated['tried_dresses'] ?? [], ['type' => 'tried']);
            }
            if (array_key_exists('booked_dresses', $validated)) {
                $visit->bookedDresses()->syncWithPivotValues($validated['booked_dresses'] ?? [], ['type' => 'booked']);
            }
        }

        return response()->json($client);
    }

    /** Put the dresses from a client form on her open visit. Returns false when no dress fields were sent. */
    private function syncOpenVisitDresses(Client $client, array $validated): bool
    {
        if (!array_key_exists('dress_id', $validated) && !array_key_exists('dress_2_id', $validated) && !array_key_exists('dress_3_id', $validated)) {
            return false;
        }
        $visit = $client->visits()->whereIn('status', Visit::OPEN_STATUSES)->latest()->latest('id')->first();
        if (!$visit) {
            return false;
        }
        $dressIds = array_values(array_unique(array_filter([
            $validated['dress_id'] ?? null, $validated['dress_2_id'] ?? null, $validated['dress_3_id'] ?? null,
        ])));
        $visit->requestedDresses()->syncWithPivotValues($dressIds, ['type' => 'requested']);

        return true;
    }

    public function destroy(Client $client): JsonResponse
    {
        \Illuminate\Support\Facades\DB::transaction(function () use ($client) {
            // Delete client image from storage
            if ($client->image_path) {
                \Illuminate\Support\Facades\Storage::disk('public')->delete($client->image_path);
            }

            // Get all booking IDs for this client
            $bookingIds = $client->bookings()->pluck('id')->toArray();

            if (!empty($bookingIds)) {
                // Delete booking receipt and bill images from storage
                $bookingFiles = \App\Models\Booking::whereIn('id', $bookingIds)->get(['receipt_path', 'bill_image_path']);
                $receipts = $bookingFiles->pluck('receipt_path')
                    ->merge($bookingFiles->pluck('bill_image_path'))
                    ->filter();
                foreach ($receipts as $receipt) {
                    \Illuminate\Support\Facades\Storage::disk('public')->delete($receipt);
                }

                // Hard delete revenues related to these bookings
                \App\Models\Revenue::whereIn('booking_id', $bookingIds)->delete();

                // Hard delete tasks related to these bookings
                \App\Models\Task::whereIn('booking_id', $bookingIds)->delete();

                // Hard delete fittings related to these bookings
                \App\Models\Fitting::whereIn('booking_id', $bookingIds)->delete();

                // Delete notifications related to bookings
                \App\Models\Notification::where('related_type', 'booking')
                    ->whereIn('related_id', $bookingIds)
                    ->forceDelete();

                // Delete finance transactions related to bookings
                \App\Models\FinanceTransaction::where('reference_type', 'booking')
                    ->whereIn('reference_id', $bookingIds)
                    ->delete();

                // Permanently delete bookings
                \App\Models\Booking::whereIn('id', $bookingIds)->delete();
            }

            // Hard delete all visits
            $client->visits()->delete();

            // Delete notifications related to this client
            \App\Models\Notification::where('related_type', 'client')
                ->where('related_id', $client->id)
                ->forceDelete();

            // Delete finance transactions related to client
            \App\Models\FinanceTransaction::where('reference_type', 'client')
                ->where('reference_id', $client->id)
                ->delete();

            // Delete activity logs related to client or bookings
            \App\Models\ActivityLog::where(function ($q) use ($client, $bookingIds) {
                $q->whereIn('entity_type', ['client', 'Client'])->where('entity_id', $client->id);
                if (!empty($bookingIds)) {
                    $q->orWhere(function ($sub) use ($bookingIds) {
                        $sub->whereIn('entity_type', ['booking', 'Booking'])->whereIn('entity_id', $bookingIds);
                    });
                }
            })->delete();

            // Permanently force delete the client record
            $client->forceDelete();
        });

        return response()->json([
            'success' => true,
            'message' => 'تم مسح العروس وكافة بياناتها وسجلاتها نهائياً من النظام'
        ]);
    }

    /**
     * PUT /api/clients/{client}/stage-action
     * Perform a stage action: schedule_fitting, confirm_booking, mark_picked_up, mark_returned
     */
    public function stageAction(Request $request, Client $client): JsonResponse
    {
        $request->validate([
            'action' => 'required|string|in:confirm_visit,close_visit,schedule_fitting,confirm_booking,end_fitting,mark_picked_up,mark_returned,pay_remaining,cancel_booking',
            'phone' => 'nullable|string|max:50',
            'phone2' => 'nullable|string|max:50',
            'dress_id' => 'nullable|integer|exists:dresses,id',
            'dress_2_id' => 'nullable|integer|exists:dresses,id',
            'dress_3_id' => 'nullable|integer|exists:dresses,id',
            'fitting_date' => 'nullable|date',
            'fitting_time' => 'nullable|string|max:20',
            'visit_date' => 'nullable|date',
            'visit_time' => 'nullable|string|max:50',
            'event_date' => 'nullable|date',
            'pickup_scheduled_on' => 'nullable|date',
            'return_scheduled_on' => 'nullable|date',
            'pickup_date' => 'nullable|date',
            'return_date' => 'nullable|date',
            'total_amount' => 'nullable|numeric|min:0',
            'deposit_amount' => 'nullable|numeric|min:0',
            'insurance_amount' => 'nullable|numeric|min:0',
            'trying_fee' => 'nullable|numeric|min:0',
            'amount' => 'nullable|numeric|min:0',
            'payment_method' => 'nullable|string|max:50',
            'payments' => 'nullable|array',
            'insurance_payments' => 'nullable|array',
            'sales_name' => 'nullable|string|max:255',
            'is_override' => 'nullable|boolean',
            'force_override' => 'nullable|boolean',
            'notes' => 'nullable|string|max:1000',
            'receipt' => 'nullable',
            'receipt_image' => 'nullable',
            'insurance_refund' => 'nullable|numeric|min:0',
            'insurance_refund_method' => 'nullable|string|max:50',
            'insurance_refund_receipt' => 'nullable',
            'cancellation_reason' => 'required_if:action,cancel_booking|nullable|string|in:' . implode(',', array_keys(Booking::CANCELLATION_REASONS)),
            'cancellation_note' => 'required_if:cancellation_reason,other|nullable|string|max:1000',
            'deposit_refund' => 'nullable|numeric|min:0',
            'deposit_refund_method' => 'nullable|string|max:50',
            'deposit_refund_receipt' => 'nullable',
            'refund_date' => 'nullable|date',
            'payment_date' => 'nullable|date',
            'visit_status' => 'required_if:action,close_visit|nullable|string|in:arrived,done,no_show,declined',
            'visit_source' => 'nullable|string|in:' . implode(',', Visit::SOURCES),
            'tried_dresses' => 'nullable|array|max:3',
            'tried_dresses.*' => 'integer|exists:dresses,id',
        ]);

        $action = $request->input('action');
        switch ($action) {
            case 'confirm_visit':
                // Confirm the bride's open visit request (or register a walk-in visit) without
                // overwriting the date/time she asked for unless the employee changed them
                $visit = $client->visits()->whereIn('status', Visit::OPEN_STATUSES)->latest()->latest('id')->first();
                Visit::assertVisitWindow(
                    $request->input('visit_date') ?: ($visit?->visit_date ?? now()->toDateString()),
                    $request->input('event_date') ?: $client->wedding_date
                );
                $visitTime = $request->filled('visit_time') ? VisitController::normalizeTimeSlot($request->input('visit_time')) : null;

                $visitData = array_filter([
                    'visit_date' => $request->input('visit_date'),
                    'time_slot' => $visitTime,
                    'sales_name' => $request->input('sales_name'),
                ], fn($v) => $v !== null && $v !== '');
                if ($request->has('trying_fee')) {
                    $visitData['trying_fee'] = floatval($request->input('trying_fee', 0));
                }

                if ($visit) {
                    // A new date/time means the bride must get a new WhatsApp confirmation
                    $rescheduled = (isset($visitData['visit_date']) && $visitData['visit_date'] !== $visit->visit_date?->toDateString())
                        || (isset($visitData['time_slot']) && $visitData['time_slot'] !== $visit->time_slot);
                    if ($rescheduled) {
                        $visitData['confirmation_sent_at'] = null;
                    }
                    $visit->update($visitData);
                } else {
                    // Visit registered by staff (in the shop, by phone or chat)
                    $visit = Visit::create($visitData + [
                        'client_id' => $client->id,
                        'visit_date' => now()->toDateString(),
                        'source' => $request->input('visit_source') ?: 'walkin',
                        'notes' => 'تم تسجيل الزيارة من الداشبورد',
                    ]);
                }
                $visit->markConfirmed($request->user()?->id);

                if ($request->filled('event_date')) {
                    $client->update(['wedding_date' => $request->input('event_date')]);
                }

                // The dresses to try live on the visit itself; a booking is only created when she chooses
                if ($request->hasAny(['dress_id', 'dress_2_id', 'dress_3_id'])) {
                    $dressIds = array_values(array_unique(array_filter([
                        $request->input('dress_id'), $request->input('dress_2_id'), $request->input('dress_3_id'),
                    ])));
                    $visit->requestedDresses()->syncWithPivotValues($dressIds, ['type' => 'requested']);
                }
                break;

            case 'close_visit':
                // After the try-on: she arrived, left without choosing (done), or did not show up; or the request was declined
                $visit = $client->visits()->whereIn('status', Visit::OPEN_STATUSES)->latest()->latest('id')->first();
                if (!$visit) {
                    return response()->json(['message' => 'لا توجد زيارة مفتوحة لهذه العروس'], 422);
                }
                $visit->update(['status' => $request->input('visit_status')]);
                if ($request->has('tried_dresses')) {
                    $visit->triedDresses()->syncWithPivotValues($request->input('tried_dresses', []), ['type' => 'tried']);
                }
                break;

            case 'schedule_fitting':
                // Create a fitting record via the latest booking
                $booking = $client->bookings()->latest()->latest('id')->first();
                $dressId = $request->input('dress_id') ?: ($booking ? $booking->dress_id : null);
                if (!$dressId) {
                    $dressId = \App\Models\Dress::value('id');
                }
                $fittingDate = $request->input('fitting_date', now()->addDays(3)->toDateString());

                // Check if dress is booked/out on the proposed fitting date
                if ($dressId) {
                    $conflict = \App\Models\Booking::isDressOutOnDate($dressId, $fittingDate, $client->id);
                    if ($conflict) {
                        return response()->json([
                            'message' => "الفستان غير متوفر للبروفة في هذا التاريخ لأنه خارج مع عميلة أخرى من {$conflict}"
                        ], 422);
                    }
                }

                if (!$booking) {
                    $defaultDressId = $dressId ?: \App\Models\Dress::value('id');
                    // Create a default booking first if none exists
                    $booking = Booking::create([
                        'client_id' => $client->id,
                        'dress_id' => $defaultDressId,
                        'booking_date' => now()->toDateString(),
                        'event_date' => $request->input('event_date', $client->wedding_date ?: now()->addMonths(2)->toDateString()),
                        'status' => 'pending',
                        'total_amount' => 0,
                    ]);
                    $booking->update([
                        'dress_id' => $defaultDressId,
                        'status' => 'confirmed'
                    ]);
                }

                Fitting::create([
                    'booking_id' => $booking->id,
                    'fitting_date' => $request->input('fitting_date', now()->addDays(3)->toDateString()),
                    'status' => 'scheduled',
                    'sales_name' => $request->input('sales_name'),
                    'additional_notes' => 'الوقت: ' . $request->input('fitting_time', '01:00 م') . ' | ' . $request->input('notes', ''),
                ]);

                // Mark any active visits for the client as done
                $client->visits()->where('status', '!=', 'done')->update(['status' => 'done']);

                $tryingFee = floatval($request->input('trying_fee', 0));
                $payments = $request->input('payments');
                $receiptPath = self::saveReceipt($request, 'receipt') ?? self::saveReceipt($request, 'receipt_image');

                if (is_array($payments) && count($payments) > 0) {
                    foreach ($payments as $p) {
                        $pAmt = floatval($p['amount'] ?? 0);
                        $pMethod = $p['payment_method'] ?? 'cash';
                        if ($pAmt > 0) {
                            \App\Models\Revenue::create([
                                'booking_id' => $booking->id,
                                'type' => 'fitting_fee',
                                'amount' => $pAmt,
                                'payment_method' => $pMethod,
                                'payment_date' => now()->toDateString(),
                                'notes' => 'رسوم تجربة وقياس للفستان للعروس: ' . $client->name,
                                'receipt_path' => $receiptPath,
                            ]);
                        }
                    }
                } elseif ($tryingFee > 0) {
                    \App\Models\Revenue::create([
                        'booking_id' => $booking->id,
                        'type' => 'fitting_fee',
                        'amount' => $tryingFee,
                        'payment_method' => $request->input('payment_method', 'cash'),
                        'payment_date' => now()->toDateString(),
                        'notes' => 'رسوم تجربة وقياس للفستان',
                        'receipt_path' => $receiptPath,
                    ]);
                }
                break;

            case 'confirm_booking':
                $clientUpdates = [];
                if ($request->filled('phone')) {
                    $clientUpdates['phone'] = $request->input('phone');
                }
                if ($request->has('phone2')) {
                    $clientUpdates['phone2'] = $request->input('phone2');
                }
                if (!empty($clientUpdates)) {
                    $client->update($clientUpdates);
                }

                // Edit the current booking; a cancelled or finished one is history and starts a new booking
                $booking = $client->bookings()->latest()->latest('id')->first();
                if (!$booking || in_array($booking->status, ['cancelled', 'returned'])) {
                    $booking = new \App\Models\Booking();
                    $booking->client_id = $client->id;
                }

                $dressId = $request->input('dress_id');
                $dress2Id = $request->input('dress_2_id');
                $dress3Id = $request->input('dress_3_id');
                $eventDate = $request->input('event_date', $client->wedding_date);
                $forceOverride = ($request->boolean('force_override') || $request->boolean('is_override')) && $request->user()->role === 'admin';

                // Validate availability for both dresses if not force override
                if (!$forceOverride) {
                    $conflicts = array_merge(
                        \App\Services\DressAvailabilityService::getConflicts($client->id, $dressId, $eventDate, $booking->id),
                        $dress2Id ? \App\Services\DressAvailabilityService::getConflicts($client->id, $dress2Id, $eventDate, $booking->id) : [],
                        $dress3Id ? \App\Services\DressAvailabilityService::getConflicts($client->id, $dress3Id, $eventDate, $booking->id) : []
                    );

                    if (!empty($conflicts)) {
                        return response()->json([
                            'error' => 'الفستان غير متوفر في هذه الفترة',
                            'conflicts' => $conflicts
                        ], 422);
                    }
                }

                $booking->dress_id = $dressId;
                $booking->dress_2_id = $dress2Id;
                $booking->dress_3_id = $dress3Id;
                $booking->sales_name = $request->input('sales_name');
                $booking->is_override = $forceOverride;
                $booking->booking_date = now()->toDateString();
                $booking->event_date = $eventDate;

                // Handle pickup and return dates
                if ($request->filled('pickup_scheduled_on')) {
                    $booking->pickup_scheduled_on = $request->input('pickup_scheduled_on');
                } elseif ($request->filled('pickup_date')) {
                    $booking->pickup_scheduled_on = $request->input('pickup_date');
                }

                if ($request->filled('return_scheduled_on')) {
                    $booking->return_scheduled_on = $request->input('return_scheduled_on');
                } elseif ($request->filled('return_date')) {
                    $booking->return_scheduled_on = $request->input('return_date');
                }

                if (empty($booking->pickup_scheduled_on) || empty($booking->return_scheduled_on)) {
                    $scheduled = \App\Models\Booking::calculateScheduledDates($eventDate, $client->city);
                    if (empty($booking->pickup_scheduled_on)) {
                        $booking->pickup_scheduled_on = $scheduled['pickup_date'];
                    }
                    if (empty($booking->return_scheduled_on)) {
                        $booking->return_scheduled_on = $scheduled['return_date'];
                    }
                }

                $booking->total_amount = floatval($request->input('total_amount', 0));
                $booking->deposit_amount = floatval($request->input('deposit_amount', 0));
                $booking->insurance_amount = floatval($request->input('insurance_amount', 5000));
                $booking->status = 'confirmed';
                $booking->notes = $request->input('notes');
                if ($request->input('payment_method')) {
                    $booking->payment_method = $request->input('payment_method');
                }

                $receiptPath = self::saveReceipt($request, 'receipt') ?? self::saveReceipt($request, 'receipt_image');
                if ($receiptPath) {
                    $booking->receipt_path = $receiptPath;
                }

                $booking->save();

                // Keep the bride's wedding date in sync with the booking's event date
                $client->syncWeddingDateFrom($booking);

                // The try-on visit ends with this booking
                $bookedVisit = $client->visits()->whereIn('status', Visit::OPEN_STATUSES)->latest()->latest('id')->first();
                if ($bookedVisit) {
                    $bookedVisit->update(['status' => 'booked']);
                    $bookedVisit->bookedDresses()->syncWithPivotValues(array_values(array_filter([$dressId, $dress2Id, $dress3Id])), ['type' => 'booked']);
                }

                $payments = $request->input('payments');
                // Clean up previous deposit revenues for this booking to prevent duplicate entries when editing
                $booking->revenues()->where('type', 'deposit')->delete();

                if (is_array($payments) && count($payments) > 0) {
                    $totalDeposit = 0;
                    $methods = [];
                    foreach ($payments as $p) {
                        $pAmt = floatval($p['amount'] ?? 0);
                        $pMethod = $p['payment_method'] ?? 'cash';
                        $rowReceipt = !empty($p['receipt_image'])
                            ? self::saveReceiptData($p['receipt_image'])
                            : (!empty($p['receipt']) ? self::saveReceiptData($p['receipt']) : $receiptPath);

                        if ($pAmt > 0) {
                            $totalDeposit += $pAmt;
                            $methods[] = $pMethod;
                            \App\Models\Revenue::create([
                                'booking_id' => $booking->id,
                                'type' => 'deposit',
                                'amount' => $pAmt,
                                'payment_method' => $pMethod,
                                'payment_date' => now()->toDateString(),
                                'notes' => 'عربون حجز فستان من رحلة العروس' . ($booking->sales_name ? ' (السيلز: ' . $booking->sales_name . ')' : ''),
                                'receipt_path' => $rowReceipt,
                            ]);
                        }
                    }
                    if ($totalDeposit > 0) {
                        $booking->deposit_amount = $totalDeposit;
                        $booking->payment_method = count(array_unique($methods)) > 1 ? 'multiple' : ($methods[0] ?? 'cash');
                        $booking->save();
                    }
                } else {
                    $deposit = floatval($request->input('deposit_amount', 0));
                    if ($deposit > 0) {
                        \App\Models\Revenue::create([
                            'booking_id' => $booking->id,
                            'type' => 'deposit',
                            'amount' => $deposit,
                            'payment_method' => $request->input('payment_method', 'cash'),
                            'payment_date' => now()->toDateString(),
                            'notes' => 'عربون حجز فستان من رحلة العروس' . ($booking->sales_name ? ' (السيلز: ' . $booking->sales_name . ')' : ''),
                            'receipt_path' => $receiptPath,
                        ]);
                    }
                }
                break;

            case 'end_fitting':
                $fittings = $client->fittings()->get();
                $endFittingSalesName = $request->input('sales_name');
                if ($fittings->count() === 0) {
                    $booking = $client->bookings()->latest()->latest('id')->first();
                    if ($booking) {
                        Fitting::create([
                            'booking_id' => $booking->id,
                            'fitting_date' => now()->toDateString(),
                            'status' => 'completed',
                            'sales_name' => $endFittingSalesName,
                            'additional_notes' => 'تم إنهاء البروفات وتحويل العروس لمرحلة الاستلام',
                        ]);
                    }
                } else {
                    foreach ($fittings as $f) {
                        $f->update([
                            'status' => 'completed',
                            'sales_name' => $endFittingSalesName ?: $f->sales_name,
                        ]);
                    }
                }
                break;

            case 'mark_picked_up':
                $booking = $client->bookings()->latest()->latest('id')->first();
                if ($booking) {
                    $updateData = [
                        'status' => 'picked_up',
                    ];
                    if ($request->filled('total_amount')) {
                        $updateData['total_amount'] = floatval($request->input('total_amount'));
                    }
                    if ($request->has('deposit_amount')) {
                        $updateData['deposit_amount'] = floatval($request->input('deposit_amount'));
                    }
                    if ($request->has('insurance_amount')) {
                        $updateData['insurance_amount'] = floatval($request->input('insurance_amount'));
                    }
                    if ($request->has('sales_name')) {
                        $updateData['pickup_sales_name'] = $request->input('sales_name');
                    }
                    if ($request->filled('pickup_scheduled_on')) {
                        $updateData['pickup_scheduled_on'] = $request->input('pickup_scheduled_on');
                    } elseif ($request->filled('pickup_date')) {
                        $updateData['pickup_scheduled_on'] = $request->input('pickup_date');
                    }
                    if ($request->filled('return_scheduled_on')) {
                        $updateData['return_scheduled_on'] = $request->input('return_scheduled_on');
                    } elseif ($request->filled('return_date')) {
                        $updateData['return_scheduled_on'] = $request->input('return_date');
                    }
                    $booking->update($updateData);

                    // Sync deposit payments if provided
                    $depositPayments = $request->input('deposit_payments');
                    if (is_array($depositPayments)) {
                        $booking->revenues()->where('type', 'deposit')->delete();
                        foreach ($depositPayments as $dp) {
                            $dpAmt = floatval($dp['amount'] ?? 0);
                            $dpMethod = $dp['payment_method'] ?? 'cash';
                            if ($dpAmt > 0) {
                                \App\Models\Revenue::create([
                                    'booking_id' => $booking->id,
                                    'type' => 'deposit',
                                    'amount' => $dpAmt,
                                    'payment_method' => $dpMethod,
                                    'payment_date' => $booking->booking_date ?: now()->toDateString(),
                                    'notes' => 'عربون حجز فستان للعروس: ' . $client->name,
                                ]);
                            }
                        }
                    }

                    if ($booking->dress) {
                        $booking->dress->update(['status' => 'out']);
                    }
                    if ($booking->dress2) {
                        $booking->dress2->update(['status' => 'out']);
                    }

                    $receiptPath = self::saveReceipt($request, 'receipt') ?? self::saveReceipt($request, 'receipt_image');

                    // Pickup money is dated on the actual pickup day chosen by staff (not the day the form was saved)
                    $pickupPaymentDate = ($request->input('pickup_date') ?: $request->input('pickup_scheduled_on'))
                        ? \Carbon\Carbon::parse($request->input('pickup_date') ?: $request->input('pickup_scheduled_on'))->toDateString()
                        : now()->toDateString();

                    // 1. Record balance payment(s)
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
                                    'payment_date' => $pickupPaymentDate,
                                    'notes' => 'دفعة استلام الفستان النهائية للعروس: ' . $client->name,
                                    'receipt_path' => $rowReceipt,
                                ]);
                            }
                        }
                    }

                    // 2. Record insurance security deposit payment(s)
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
                                    'payment_date' => $pickupPaymentDate,
                                    'notes' => 'تأمين الفستان المسترد للعروس: ' . $client->name,
                                    'receipt_path' => $rowReceipt,
                                ]);
                            }
                        }
                    }
                }
                break;

            case 'mark_returned':
                $booking = $client->bookings()->latest()->latest('id')->first();
                if ($booking) {
                    $returnUpdate = ['status' => 'returned'];
                    if ($request->has('sales_name')) {
                        $returnUpdate['return_sales_name'] = $request->input('sales_name');
                    }
                    if ($request->has('insurance_amount')) {
                        $returnUpdate['insurance_amount'] = floatval($request->input('insurance_amount'));
                    }
                    if ($request->filled('return_date')) {
                        $returnUpdate['return_scheduled_on'] = $request->input('return_date');
                    } elseif ($request->filled('return_scheduled_on')) {
                        $returnUpdate['return_scheduled_on'] = $request->input('return_scheduled_on');
                    }
                    $booking->update($returnUpdate);
                    // Returned dresses are available again; cleaning is handled outside the system
                    if ($booking->dress) $booking->dress->update(['status' => 'available']);
                    if ($booking->dress2) $booking->dress2->update(['status' => 'available']);
                    if ($booking->dress3) $booking->dress3->update(['status' => 'available']);

                    // Return: write one insurance refund revenue = amount staff entered
                    $damageDeduction = floatval($request->input('damage_deduction', 0));
                    $maxRefund = max(0, floatval($booking->insurance_amount ?? 0) - $damageDeduction);
                    $refundAmount = min(
                        $maxRefund,
                        floatval($request->input('insurance_refund', $maxRefund))
                    );

                    // Settlement is dated on the actual return day (not the day the form was saved)
                    $settlementDate = $request->filled('return_date')
                        ? \Carbon\Carbon::parse($request->input('return_date'))->toDateString()
                        : now()->toDateString();

                    // Editing an existing return replaces its settlement instead of duplicating it
                    $previousSettlement = $booking->revenues()->whereIn('type', ['insurance_refund', 'damage_fee'])->get();
                    $previousRefundReceipt = optional($previousSettlement->firstWhere('type', 'insurance_refund'))->receipt_path;
                    $booking->revenues()->whereIn('type', ['insurance_refund', 'damage_fee'])->delete();

                    $insuranceRev = $booking->revenues()
                        ->where('notes', 'like', '%تأمين%')
                        ->latest()
                        ->first();

                    $insuranceMethod = $insuranceRev ? $insuranceRev->payment_method : 'cash';

                    // Damage deduction kept from the insurance -> recorded as its own damage_fee income
                    if ($damageDeduction > 0) {
                        \App\Models\Revenue::create([
                            'booking_id' => $booking->id,
                            'type' => 'damage_fee',
                            'amount' => $damageDeduction,
                            'payment_method' => $insuranceMethod,
                            'payment_date' => $settlementDate,
                            'notes' => 'خصم تلفيات من التأمين' . ($request->filled('damage_notes') ? ' - ' . $request->input('damage_notes') : ''),
                        ]);
                    }

                    if ($refundAmount > 0) {
                        $paymentMethod = $request->input('insurance_refund_method')
                            ?: $insuranceMethod;

                        $receiptPath = self::saveReceipt($request, 'insurance_refund_receipt')
                            ?? self::saveReceiptData($request->input('insurance_refund_receipt'))
                            ?? $previousRefundReceipt;

                        \App\Models\Revenue::create([
                            'booking_id' => $booking->id,
                            'type' => 'insurance_refund',
                            'amount' => -$refundAmount,
                            'payment_method' => $paymentMethod,
                            'payment_date' => $settlementDate,
                            'notes' => 'استرداد تأمين' . ($request->filled('notes') ? ' - ' . $request->input('notes') : ''),
                            'receipt_path' => $receiptPath,
                        ]);
                    }
                }
                break;

            case 'pay_remaining':
                $booking = $client->bookings()->latest()->latest('id')->first();
                if ($booking) {
                    $receiptPath = self::saveReceipt($request, 'receipt') ?? self::saveReceipt($request, 'receipt_image');
                    $payments = $request->input('payments');
                    $paidOn = $request->filled('payment_date')
                        ? \Carbon\Carbon::parse($request->input('payment_date'))->toDateString()
                        : now()->toDateString();

                    if (is_array($payments) && count($payments) > 0) {
                        foreach ($payments as $p) {
                            $pAmt = floatval($p['amount'] ?? 0);
                            $pMethod = $p['payment_method'] ?? 'cash';
                            $rowReceipt = !empty($p['receipt_image'])
                                ? self::saveReceiptData($p['receipt_image'])
                                : (!empty($p['receipt']) ? self::saveReceiptData($p['receipt']) : $receiptPath);

                            if ($pAmt > 0) {
                                \App\Models\Revenue::create([
                                    'booking_id' => $booking->id,
                                    'type' => 'balance',
                                    'amount' => $pAmt,
                                    'payment_method' => $pMethod,
                                    'payment_date' => $paidOn,
                                    'notes' => 'سداد باقي حساب الفستان للعروس: ' . $client->name . ($request->input('notes') ? ' - ' . $request->input('notes') : ''),
                                    'receipt_path' => $rowReceipt,
                                ]);
                            }
                        }
                    } else {
                        $payAmount = floatval($request->input('amount', 0));
                        if ($payAmount > 0) {
                            \App\Models\Revenue::create([
                                'booking_id' => $booking->id,
                                'type' => 'balance',
                                'amount' => $payAmount,
                                'payment_method' => $request->input('payment_method', 'cash'),
                                'payment_date' => $paidOn,
                                'notes' => 'سداد باقي حساب الفستان للعروس: ' . $client->name . ($request->input('notes') ? ' - ' . $request->input('notes') : ''),
                                'receipt_path' => $receiptPath,
                            ]);
                        }
                    }

                    // Handle insurance payments if provided
                    $insurancePayments = $request->input('insurance_payments');
                    if (is_array($insurancePayments) && count($insurancePayments) > 0) {
                        $totalInsurance = 0;
                        foreach ($insurancePayments as $ip) {
                            $iAmt = floatval($ip['amount'] ?? 0);
                            $iMethod = $ip['payment_method'] ?? 'cash';
                            $iReceipt = !empty($ip['receipt_image'])
                                ? self::saveReceiptData($ip['receipt_image'])
                                : (!empty($ip['receipt']) ? self::saveReceiptData($ip['receipt']) : null);

                            if ($iAmt > 0) {
                                \App\Models\Revenue::create([
                                    'booking_id' => $booking->id,
                                    'type' => 'security_deposit',
                                    'amount' => $iAmt,
                                    'payment_method' => $iMethod,
                                    'payment_date' => $paidOn,
                                    'notes' => 'تأمين مسترد للعروس: ' . $client->name . ' (يُسترد عند إعادة الفستان)',
                                    'receipt_path' => $iReceipt,
                                ]);
                                $totalInsurance += $iAmt;
                            }
                        }
                        // Update booking's insurance_amount if it differs
                        if ($totalInsurance > 0) {
                            $booking->insurance_amount = $totalInsurance;
                            $booking->save();
                        }
                    }
                }
                break;

            case 'cancel_booking':
                $booking = $client->bookings()->latest()->latest('id')->first();
                if (!$booking || $booking->status !== 'confirmed') {
                    return response()->json([
                        'message' => 'لا يمكن إلغاء الحجز: لا يوجد حجز مؤكد لم يتم تسليم فستانه بعد'
                    ], 422);
                }

                $revenues = $booking->revenues()->get();
                $paidRent = (float) $revenues->whereIn('type', ['deposit', 'balance'])->sum('amount');
                $paidInsurance = (float) $revenues->whereIn('type', ['insurance', 'security_deposit'])->sum('amount');
                $depositRefund = round(floatval($request->input('deposit_refund', 0)), 2);
                $insuranceRefund = round(floatval($request->input('insurance_refund', 0)), 2);

                if ($depositRefund > round($paidRent, 2)) {
                    return response()->json(['message' => 'مبلغ رد العربون أكبر من المدفوع (' . $paidRent . ' ج.م)'], 422);
                }
                if ($insuranceRefund > round($paidInsurance, 2)) {
                    return response()->json(['message' => 'مبلغ رد التأمين أكبر من المدفوع (' . $paidInsurance . ' ج.م)'], 422);
                }

                $stageBefore = $client->current_stage;
                $refundDate = $request->filled('refund_date')
                    ? \Carbon\Carbon::parse($request->input('refund_date'))->toDateString()
                    : now()->toDateString();
                $reasonLabel = Booking::CANCELLATION_REASONS[$request->input('cancellation_reason')];
                $user = $request->user();

                \Illuminate\Support\Facades\DB::transaction(function () use ($request, $client, $booking, $stageBefore, $refundDate, $reasonLabel, $user, $depositRefund, $insuranceRefund) {
                    $booking->update([
                        'status' => 'cancelled',
                        'cancelled_at' => now(),
                        'cancelled_by' => $user?->id,
                        'cancelled_by_name' => $request->input('sales_name') ?: $user?->name,
                        'cancelled_stage' => $stageBefore,
                        'cancellation_reason' => $request->input('cancellation_reason'),
                        'cancellation_note' => $request->input('cancellation_note'),
                    ]);

                    // Close open fittings of this booking
                    Fitting::where('booking_id', $booking->id)
                        ->whereIn('status', ['scheduled', 'rescheduled'])
                        ->update(['status' => 'cancelled']);

                    // Free reserved dresses unless another active booking still holds them
                    foreach (array_filter([$booking->dress_id, $booking->dress_2_id, $booking->dress_3_id]) as $dressId) {
                        $stillHeld = Booking::where('id', '!=', $booking->id)
                            ->whereIn('status', ['confirmed', 'picked_up'])
                            ->where(fn($q) => $q->where('dress_id', $dressId)->orWhere('dress_2_id', $dressId)->orWhere('dress_3_id', $dressId))
                            ->exists();
                        if (!$stillHeld) {
                            \App\Models\Dress::where('id', $dressId)->where('status', 'booked')->update(['status' => 'available']);
                        }
                    }

                    // Refunds are negative revenue rows so finance totals and transactions reflect them
                    $refunds = [
                        ['deposit_refund', $depositRefund, 'deposit_refund_method', 'deposit_refund_receipt', 'رد عربون (إلغاء حجز)'],
                        ['insurance_refund', $insuranceRefund, 'insurance_refund_method', 'insurance_refund_receipt', 'رد تأمين (إلغاء حجز)'],
                    ];
                    foreach ($refunds as [$type, $amount, $methodField, $receiptField, $label]) {
                        if ($amount <= 0) {
                            continue;
                        }
                        \App\Models\Revenue::create([
                            'booking_id' => $booking->id,
                            'type' => $type,
                            'amount' => -$amount,
                            'payment_method' => $request->input($methodField) ?: 'cash',
                            'payment_date' => $refundDate,
                            'notes' => $label . ' للعروس: ' . $client->name . ' - ' . $reasonLabel,
                            'receipt_path' => self::saveReceipt($request, $receiptField),
                        ]);
                    }
                });
                break;

            default:
                return response()->json(['message' => 'Unknown action'], 400);
        }

        // Log the activity
        $actionLabels = [
            'confirm_visit' => 'تأكيد زيارة عروس',
            'close_visit' => 'تحديث نتيجة زيارة عروس',
            'schedule_fitting' => 'جدولة بروفة قياس',
            'confirm_booking' => 'تأكيد حجز فستان',
            'end_fitting' => 'إنهاء بروفات القياس',
            'mark_picked_up' => 'تسليم الفستان للعروس',
            'mark_returned' => 'استلام الفستان وتسوية التأمين',
            'pay_remaining' => 'سداد دفعة مالية',
            'cancel_booking' => 'إلغاء حجز عروس',
        ];
        $actionTitle = $actionLabels[$action] ?? "إجراء مرحلة: {$action}";
        \App\Services\ActivityLogger::log(
            $actionTitle,
            'Client',
            $client->id,
            [
                'bride_name' => $client->name,
                'bride_phone' => $client->phone,
                'sales_name' => $request->input('sales_name'),
                'action_key' => $action,
                'cancellation_reason' => $request->input('cancellation_reason'),
                'deposit_refund' => $action === 'cancel_booking' ? floatval($request->input('deposit_refund', 0)) : null,
                'insurance_refund' => $action === 'cancel_booking' ? floatval($request->input('insurance_refund', 0)) : null,
            ],
            $request->input('sales_name')
        );

        // Refresh and return updated stage
        // Must unset loaded relations so current_stage recomputes from fresh DB data
        $client->unsetRelation('fittings')->unsetRelation('bookings')->unsetRelation('visits');
        $client->refresh();
        return response()->json([
            'message' => 'Action completed',
            'current_stage' => $client->current_stage,
        ]);
    }

    public function revertStage(Request $request, \App\Models\Booking $booking): JsonResponse
    {
        $targetStage = $request->input('target_stage');
        $client = $booking->client;
        
        \DB::beginTransaction();
        try {
            if ($targetStage === 'visit') {
                // Delete everything related to the booking
                $booking->revenues()->delete();
                $booking->fittings()->delete();
                if ($booking->dress) $booking->dress->update(['status' => 'available']);
                if ($booking->dress2) $booking->dress2->update(['status' => 'available']);
                if ($booking->dress3) $booking->dress3->update(['status' => 'available']);
                $booking->delete();

                // The visit that ended with this booking is open again
                $bookedVisit = $client->visits()->where('status', 'booked')->latest()->latest('id')->first();
                if ($bookedVisit) {
                    $bookedVisit->update(['status' => 'arrived']);
                    $bookedVisit->bookedDresses()->detach();
                }
                
                $client->update(['current_stage' => 'visit']);
            } 
            elseif ($targetStage === 'booking') {
                // Keep the booking (deposit remains), but remove fittings and after
                $booking->fittings()->delete();
                $booking->revenues()->whereIn('type', ['fitting_fee', 'balance', 'insurance', 'insurance_refund', 'late_fee', 'damage_fee'])->delete();
                
                if ($booking->dress) $booking->dress->update(['status' => 'available']);
                if ($booking->dress2) $booking->dress2->update(['status' => 'available']);
                
                $booking->update(['status' => 'confirmed']);
                $client->update(['current_stage' => 'booking']);
            }
            elseif ($targetStage === 'fitting') {
                // Keep the fitting, but remove pickup/return data
                $booking->revenues()->whereIn('type', ['balance', 'insurance', 'insurance_refund', 'late_fee', 'damage_fee'])->delete();
                
                if ($booking->dress) $booking->dress->update(['status' => 'available']);
                if ($booking->dress2) $booking->dress2->update(['status' => 'available']);
                
                $booking->update(['status' => 'confirmed']);
                
                // Ensure the booking has a scheduled fitting so stage resolves to 'fitting'
                $latestFitting = $booking->fittings()->latest()->first();
                if ($latestFitting) {
                    $latestFitting->update(['status' => 'scheduled']);
                } else {
                    \App\Models\Fitting::create([
                        'booking_id' => $booking->id,
                        'fitting_date' => now()->addDays(3)->toDateString(),
                        'status' => 'scheduled',
                        'additional_notes' => 'تمت العودة لمرحلة البروفة',
                    ]);
                }
            }
            elseif ($targetStage === 'pickup_pending' || $targetStage === 'unhandover') {
                // Revert from Sub-stage 2 (out/delivered) back to Sub-stage 1 (ready for handover):
                // Reset booking status to confirmed, dresses to available, and remove balance & insurance revenues recorded at pickup
                $booking->revenues()->whereIn('type', ['balance', 'insurance', 'insurance_refund', 'late_fee', 'damage_fee'])->delete();
                $booking->update(['status' => 'confirmed']);
                if ($booking->dress) $booking->dress->update(['status' => 'available']);
                if ($booking->dress2) $booking->dress2->update(['status' => 'available']);
                if ($booking->dress3) $booking->dress3->update(['status' => 'available']);
                // Ensure fittings are marked completed so stage remains picked_up (waiting for handover)
                $booking->fittings()->update(['status' => 'completed']);
                $client->update(['current_stage' => 'picked_up']);
            }
            elseif ($targetStage === 'picked_up') {
                // Keep pickup, remove return data
                $booking->revenues()->whereIn('type', ['insurance_refund', 'late_fee', 'damage_fee'])->delete();
                $booking->update(['status' => 'picked_up']);
                if ($booking->dress) $booking->dress->update(['status' => 'out']);
                if ($booking->dress2) $booking->dress2->update(['status' => 'out']);
                if ($booking->dress3) $booking->dress3->update(['status' => 'out']);
                $client->update(['current_stage' => 'picked_up']);
            }
            
            \DB::commit();
            
            $client->unsetRelation('fittings')->unsetRelation('bookings')->unsetRelation('visits');
            $client->refresh();
            
            return response()->json([
                'message' => 'تم التراجع بنجاح',
                'current_stage' => $client->current_stage
            ]);
        } catch (\Exception $e) {
            \DB::rollBack();
            return response()->json(['message' => 'فشل التراجع: ' . $e->getMessage()], 500);
        }
    }

    public function exportCsv(Request $request)
    {
        $headers = [
            "Content-type" => "text/csv; charset=UTF-8",
            "Content-Disposition" => "attachment; filename=previous_brides_" . date('Y-m-d') . ".csv",
            "Pragma" => "no-cache",
            "Cache-Control" => "must-revalidate, post-check=0, pre-check=0",
            "Expires" => "0"
        ];

        $columns = ['ID', 'Name', 'Phone', 'Email', 'City', 'Address', 'Source', 'Notes', 'Wedding Date', 'Created At'];

        $callback = function () use ($columns) {
            $file = fopen('php://output', 'w');

            // Add UTF-8 BOM for Excel Arabic compatibility
            fprintf($file, chr(0xEF).chr(0xBB).chr(0xBF));
            fputcsv($file, $columns);

            $clients = Client::where('current_stage', 'returned')->orWhere('current_stage', 'archived')->get();
            foreach ($clients as $c) {
                fputcsv($file, [
                    $c->id,
                    $c->name,
                    $c->phone,
                    $c->email,
                    $c->city,
                    $c->address,
                    $c->source,
                    $c->notes,
                    $c->wedding_date,
                    $c->created_at,
                ]);
            }
            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    /** Empty brides template (.xlsx) to fill and import back */
    public function excelTemplate(\App\Services\BridesExcelService $excel)
    {
        $writer = \PhpOffice\PhpSpreadsheet\IOFactory::createWriter($excel->template(), 'Xlsx');

        return response()->streamDownload(fn () => $writer->save('php://output'), 'قالب_العرائس.xlsx', [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    /** Import a filled brides template: each row becomes a bride + booking + her payments */
    public function importExcel(Request $request, \App\Services\BridesExcelService $excel): JsonResponse
    {
        $request->validate([
            'file' => 'required|file|mimes:xlsx|max:10240',
        ]);

        try {
            $result = $excel->import($request->file('file')->getRealPath());
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        } catch (\PhpOffice\PhpSpreadsheet\Reader\Exception $e) {
            return response()->json(['message' => 'تعذر قراءة الملف. تأكد أنه ملف إكسل (xlsx) صحيح.'], 422);
        }

        \App\Services\ActivityLogger::log('استيراد عرائس من إكسل', 'Client', null, [
            'created' => $result['created'],
            'skipped' => count($result['skipped']),
        ]);

        return response()->json($result);
    }
}
