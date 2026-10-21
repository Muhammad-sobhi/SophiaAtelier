<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\Booking;
use App\Models\Visit;
use App\Services\BrideJourneyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ClientController extends Controller
{
    public function index(Request $request)
    {
        // summary=1: what the dashboard board needs per bride (stage, dates, dress names), without
        // the dresses' images/accessories and payments that only the opened bride's popup reads
        $query = $request->boolean('summary') ? Client::withCount(['visits', 'bookings'])->with([
            'visits' => function ($q) {
                $q->latest();
            },
            'bookings' => function ($q) {
                $q->latest()->latest('id');
            },
            'bookings.dress:id,code,name,trying_fee',
            'bookings.dress2:id,code,name',
            'bookings.dress3:id,code,name',
            'fittings',
        ]) : Client::withCount(['visits', 'bookings'])->with([
            'visits' => function ($q) {
                $q->latest();
            },
            'visits.requestedDresses.images',
            'visits.triedDresses',
            'visits.bookedDresses',
            'visits.revenues',
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
        $perPage = min($perPage, 1000);

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
            'phone' => ['nullable', 'string', 'max:30', 'regex:/^\+?[0-9\s\-\(\)]+$/'],
            'email' => 'nullable|email|max:255',
        ], [
            'phone.regex' => 'رقم الهاتف يجب أن يحتوي على أرقام فقط.',
            'email.email' => 'يرجى إدخال بريد إلكتروني صالح.',
        ]);

        // Looked up by the bride's own phone / email only: an id would let anyone read every bride's record
        $rawPhone = $request->input('phone');
        $rawEmail = $request->input('email');

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

        $client = $query->first();

        if (!$client) {
            return response()->json([
                'message' => 'لم يتم العثور على سجل مبيعات أو حجز مرتبط بهذه البيانات.'
            ], 404);
        }

        return response()->json($this->trackingView($client));
    }

    /**
     * What the website's "track my order" page shows the bride: her own journey only, without
     * address, notes, payments, receipts or employee names.
     */
    private function trackingView(Client $client): array
    {
        $client->load(['visits', 'fittings', 'bookings.dress.images', 'bookings.dress2.images', 'bookings.dress3.images']);
        $dress = fn($d) => $d ? [
            'id' => $d->id, 'code' => $d->code, 'name' => $d->name, 'name_ar' => $d->name_ar, 'status' => $d->status,
            'images' => $d->images->map(fn($i) => ['id' => $i->id, 'image_path' => $i->image_path, 'is_primary' => $i->is_primary])->values(),
        ] : null;
        $date = fn($v) => $v ? substr((string) $v, 0, 10) : null;

        return [
            'id' => $client->id,
            'name' => $client->name,
            'phone' => $client->phone,
            'email' => $client->email,
            'city' => $client->city,
            'wedding_date' => $client->wedding_date,
            'current_stage' => $client->current_stage,
            'journey_step' => \App\Services\StageComputer::journeyStep($client),
            // Latest first, as the track page shows the newest visit / booking
            'visits' => $client->visits->sortByDesc(fn($v) => [$v->visit_date?->toDateString(), $v->id])->map(fn($v) => [
                'id' => $v->id, 'visit_date' => $date($v->visit_date), 'time_slot' => $v->time_slot, 'status' => $v->status,
            ])->values(),
            // Fittings are optional extras shown as information: oldest first, without cancelled ones
            'fittings' => $client->fittings->where('status', '!=', 'cancelled')->sortBy(fn($f) => [$f->fitting_date?->toDateString(), $f->id])->map(fn($f) => [
                'id' => $f->id, 'booking_id' => $f->booking_id, 'fitting_date' => $date($f->fitting_date), 'status' => $f->status,
            ])->values(),
            'bookings' => $client->bookings->sortByDesc('id')->map(fn($b) => [
                'id' => $b->id, 'status' => $b->status,
                'booking_date' => $date($b->booking_date), 'event_date' => $date($b->event_date),
                'pickup_scheduled_on' => $date($b->pickup_scheduled_on), 'return_scheduled_on' => $date($b->return_scheduled_on),
                'total_amount' => $b->total_amount, 'deposit_amount' => $b->deposit_amount,
                'dress' => $dress($b->dress), 'dress2' => $dress($b->dress2), 'dress3' => $dress($b->dress3),
            ])->values(),
        ];
    }

    public function show(Client $client): JsonResponse
    {
        $client->loadMissing([
            'visits' => function ($q) {
                $q->latest(); },
            'visits.requestedDresses.images',
            'visits.triedDresses',
            'visits.bookedDresses',
            'visits.revenues',
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
        $isPublic = $request->is('api/public/*');

        // The website registers the bride only: fees, dresses, sales names and dates are set by staff
        if ($isPublic) {
            $validated = \Illuminate\Support\Arr::only($validated, ['name', 'phone', 'phone2', 'email', 'address', 'city', 'wedding_date', 'notes']);
            $validated['source'] = 'website';
        }

        if (!$isPublic && $request->hasFile('image')) {
            $path = $request->file('image')->store('clients', 'public');
            \App\Services\ImageOptimizer::optimize($path);
            $validated['image_path'] = $path;
        }

        if (empty($validated['city']) && !empty($validated['address'])) {
            $validated['city'] = $validated['address'];
        }

        $dressIds = array_values(array_unique(array_filter([
            $validated['dress_id'] ?? null, $validated['dress_2_id'] ?? null, $validated['dress_3_id'] ?? null,
        ])));

        // A visit (dated today when only dresses are sent) may be at most 4 months before the wedding
        Visit::assertVisitWindow($validated['visit_date'] ?? ($dressIds ? now()->toDateString() : null), $validated['wedding_date'] ?? null);

        // The public registration may not request a visit on a day closed by the admin
        if ($isPublic && \App\Models\ClosedDay::isClosed($validated['visit_date'] ?? null)) {
            return response()->json([
                'message' => \App\Models\ClosedDay::closedMessage($validated['visit_date']),
                'code' => 'day_closed',
            ], 422);
        }

        $normalizedTimeSlot = null;
        if (!empty($validated['visit_time']) && !empty($validated['visit_date'])) {
            $normalizedTimeSlot = \App\Http\Controllers\Api\VisitController::normalizeTimeSlot($validated['visit_time']);
        }

        // The slot's room is checked under its lock, and the bride + visit are saved together:
        // a full slot leaves no bride without her visit
        $client = Visit::inSlot($validated['visit_date'] ?? null, $normalizedTimeSlot, fn() => \Illuminate\Support\Facades\DB::transaction(
            fn() => $this->createClientWithVisit($request, $validated, $dressIds, $normalizedTimeSlot)
        ));

        return response()->json($isPublic ? $this->trackingView($client) : $client, 201);
    }

    /** Creates the bride and, when a visit date or dresses were given, her visit (see store) */
    private function createClientWithVisit(Request $request, array $validated, array $dressIds, ?string $normalizedTimeSlot): Client
    {
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

        return $client;
    }

    public function update(\App\Http\Requests\UpdateClientRequest $request, Client $client): JsonResponse
    {
        $validated = $request->validated();

        if ($request->hasFile('image')) {
            if ($client->image_path) {
                Storage::disk('public')->delete($client->image_path);
            }
            $path = $request->file('image')->store('clients', 'public');
            \App\Services\ImageOptimizer::optimize($path);
            $validated['image_path'] = $path;
        }

        if (array_key_exists('address', $validated) && empty($validated['city'])) {
            $validated['city'] = $validated['address'];
        }

        // A new visit date, or a new wedding date, must keep the visit at most 4 months before the wedding.
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

        $normalizedTimeSlot = null;
        $existingVisit = null;
        if (!empty($validated['visit_date']) && !empty($validated['visit_time'])) {
            $normalizedTimeSlot = \App\Http\Controllers\Api\VisitController::normalizeTimeSlot($validated['visit_time']);
            $existingVisit = $client->visits()->whereDate('visit_date', $validated['visit_date'])->first();
        }

        // The slot's room is checked (without her own visit) under its lock, and nothing is saved when it is full
        Visit::inSlot($validated['visit_date'] ?? null, $normalizedTimeSlot, fn() => \Illuminate\Support\Facades\DB::transaction(
            fn() => $this->applyClientUpdate($client, $validated, $normalizedTimeSlot)
        ), $existingVisit?->id);

        return response()->json($client);
    }

    /** Saves the bride and the booking / visit fields sent with her (see update) */
    private function applyClientUpdate(Client $client, array $validated, ?string $normalizedTimeSlot): void
    {
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
    public function stageAction(Request $request, Client $client, BrideJourneyService $journey): JsonResponse
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
            // "Today" in Cairo: the server clock is UTC, which is still yesterday after midnight in Egypt
            'booking_date' => 'nullable|date|before_or_equal:' . now('Africa/Cairo')->toDateString(),
            'pickup_scheduled_on' => 'nullable|date',
            'return_scheduled_on' => 'nullable|date',
            'pickup_date' => 'nullable|date',
            'return_date' => 'nullable|date',
            'total_amount' => 'nullable|numeric|min:0',
            'deposit_amount' => 'nullable|numeric|min:0',
            'insurance_amount' => 'nullable|numeric|min:0',
            'offer_id' => 'nullable|integer',
            'discount_amount' => 'nullable|numeric|min:0',
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

        $journey->run($request->input('action'), $client, $request);

        // Refresh and return updated stage
        // Must unset loaded relations so current_stage recomputes from fresh DB data
        $client->unsetRelation('fittings')->unsetRelation('bookings')->unsetRelation('visits');
        $client->refresh();
        return response()->json([
            'message' => 'Action completed',
            'current_stage' => $client->current_stage,
        ]);
    }

    public function revertStage(Request $request, \App\Models\Booking $booking, BrideJourneyService $journey): JsonResponse
    {
        $client = $booking->client;

        try {
            $journey->revert($booking, $request->input('target_stage'));

            $client->unsetRelation('fittings')->unsetRelation('bookings')->unsetRelation('visits');
            $client->refresh();

            return response()->json([
                'message' => 'تم التراجع بنجاح',
                'current_stage' => $client->current_stage
            ]);
        } catch (\Exception $e) {
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
