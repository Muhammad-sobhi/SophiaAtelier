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
            'visits.triedDresses',
            'visits.bookedDresses',
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
            $query->where(function ($q) use ($cleanSearch) {
                $q->where('name', 'like', "%{$cleanSearch}%")
                    ->orWhere('phone', 'like', "%{$cleanSearch}%")
                    ->orWhere('phone2', 'like', "%{$cleanSearch}%")
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
            $client = Client::with(['visits.triedDresses', 'visits.bookedDresses', 'fittings', 'bookings.dress.images', 'bookings.dress2.images', 'bookings.dress3.images', 'bookings.revenues'])->find($clientId);
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

        $client = $query->with(['visits.triedDresses', 'visits.bookedDresses', 'fittings', 'bookings.dress.images', 'bookings.dress2.images', 'bookings.dress3.images', 'bookings.revenues'])->first();

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
            'visits.triedDresses',
            'visits.bookedDresses',
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

        // Check visit time slot limit before creating anything
        $normalizedTimeSlot = null;
        if (!empty($validated['visit_time']) && !empty($validated['visit_date'])) {
            $normalizedTimeSlot = \App\Http\Controllers\Api\VisitController::normalizeTimeSlot($validated['visit_time']);
            
            $existingCount = \App\Models\Visit::whereDate('visit_date', $validated['visit_date'])
                ->where('time_slot', $normalizedTimeSlot)
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

        if (!empty($validated['dress_id'])) {
            $client->bookings()->create([
                'dress_id' => $validated['dress_id'] ?? null,
                'dress_2_id' => $validated['dress_2_id'] ?? null,
                'dress_3_id' => $validated['dress_3_id'] ?? null,
                'booking_date' => $validated['visit_date'] ?? now()->toDateString(),
                'event_date' => $validated['wedding_date'] ?? null,
                'pickup_scheduled_on' => $validated['pickup_scheduled_on'] ?? null,
                'return_scheduled_on' => $validated['return_scheduled_on'] ?? null,
                'status' => 'pending',
                'total_amount' => 0,
                'notes' => 'تم تحديد الفساتين ومواعيد الاستلام والإرجاع عند إنشاء العروس',
            ]);
        }

        if (!empty($validated['visit_date'])) {
            $visit = $client->visits()->create([
                'visit_date' => $validated['visit_date'],
                'time_slot' => $normalizedTimeSlot,
                'status' => 'pending',
                'source' => $client->source ?: 'website',
                'sales_name' => $validated['sales_name'] ?? null,
                'notes' => 'موعد زيارة مبدئي',
            ]);

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

        // Check visit time slot limit before updating anything
        $normalizedTimeSlot = null;
        if (!empty($validated['visit_date']) && !empty($validated['visit_time'])) {
            $normalizedTimeSlot = \App\Http\Controllers\Api\VisitController::normalizeTimeSlot($validated['visit_time']);
            
            $visitQuery = \App\Models\Visit::whereDate('visit_date', $validated['visit_date'])
                ->where('time_slot', $normalizedTimeSlot);
            
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
            if ($booking) {
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
            } elseif (!empty($validated['dress_id'])) {
                $client->bookings()->create([
                    'dress_id' => $validated['dress_id'] ?? null,
                    'dress_2_id' => $validated['dress_2_id'] ?? null,
                    'dress_3_id' => $validated['dress_3_id'] ?? null,
                    'booking_date' => $validated['visit_date'] ?? now()->toDateString(),
                    'event_date' => $validated['wedding_date'] ?? null,
                    'pickup_scheduled_on' => $validated['pickup_scheduled_on'] ?? null,
                    'return_scheduled_on' => $validated['return_scheduled_on'] ?? null,
                    'status' => 'pending',
                    'total_amount' => 0,
                    'notes' => 'تم تحديد الفساتين ومواعيد الاستلام والإرجاع عند تعديل بيانات العروس',
                ]);
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
                // Delete booking receipt images from storage
                $receipts = \App\Models\Booking::whereIn('id', $bookingIds)
                    ->pluck('receipt_path')
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
            'action' => 'required|string|in:confirm_visit,schedule_fitting,confirm_booking,end_fitting,mark_picked_up,mark_returned,pay_remaining',
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
        ]);

        $action = $request->input('action');
        switch ($action) {
            case 'confirm_visit':
                $visit = $client->visits()->latest()->first();
                $visitSalesName = $request->input('sales_name');
                $visitDate = $request->input('visit_date', now()->toDateString());
                $visitTime = $request->input('visit_time');

                if ($visit) {
                    $visit->update([
                        'status' => 'confirmed',
                        'sales_name' => $visitSalesName ?: $visit->sales_name,
                        'visit_date' => $visitDate ?: $visit->visit_date,
                        'time_slot' => $visitTime ?: $visit->time_slot,
                    ]);
                } else {
                    \App\Models\Visit::create([
                        'client_id' => $client->id,
                        'visit_date' => $visitDate,
                        'time_slot' => $visitTime,
                        'status' => 'confirmed',
                        'source' => $client->source ?: 'website',
                        'sales_name' => $visitSalesName,
                        'notes' => 'تم تأكيد موعد الزيارة'
                    ]);
                }

                // Associate or update up to 3 interested dresses in a pending booking
                $dressId = $request->input('dress_id');
                $dress2Id = $request->input('dress_2_id');
                $dress3Id = $request->input('dress_3_id');
                if ($dressId || $dress2Id || $dress3Id) {
                    $booking = $client->bookings()->latest()->latest('id')->first();
                    if ($booking) {
                        $booking->update([
                            'dress_id' => $dressId ?: $booking->dress_id,
                            'dress_2_id' => $dress2Id,
                            'dress_3_id' => $dress3Id,
                            'event_date' => $request->input('event_date') ?: ($client->wedding_date ?: $booking->event_date),
                        ]);
                    } else {
                        $client->bookings()->create([
                            'dress_id' => $dressId,
                            'dress_2_id' => $dress2Id,
                            'dress_3_id' => $dress3Id,
                            'booking_date' => $visitDate,
                            'event_date' => $request->input('event_date', $client->wedding_date),
                            'status' => 'pending',
                            'total_amount' => 0,
                            'notes' => 'تم تسجيل الفساتين المراد تجربتها',
                        ]);
                    }
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

                // Get or create booking
                $booking = $client->bookings()->latest()->latest('id')->first();
                if (!$booking) {
                    $booking = new \App\Models\Booking();
                    $booking->client_id = $client->id;
                }

                $dressId = $request->input('dress_id');
                $dress2Id = $request->input('dress_2_id');
                $eventDate = $request->input('event_date', $client->wedding_date);
                $forceOverride = ($request->boolean('force_override') || $request->boolean('is_override')) && $request->user()->role === 'admin';

                // Validate availability for both dresses if not force override
                if (!$forceOverride) {
                    $conflicts = array_merge(
                        \App\Services\DressAvailabilityService::getConflicts($client->id, $dressId, $eventDate, $booking->id),
                        $dress2Id ? \App\Services\DressAvailabilityService::getConflicts($client->id, $dress2Id, $eventDate, $booking->id) : []
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
                                    'payment_date' => now()->toDateString(),
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
                                    'payment_date' => now()->toDateString(),
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
                    // Mark all dresses for dry clean
                    if ($booking->dress) $booking->dress->update(['status' => 'cleaning']);
                    if ($booking->dress2) $booking->dress2->update(['status' => 'cleaning']);
                    if ($booking->dress3) $booking->dress3->update(['status' => 'cleaning']);

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
                                    'payment_date' => now()->toDateString(),
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
                                'payment_date' => now()->toDateString(),
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
                                    'payment_date' => now()->toDateString(),
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

            default:
                return response()->json(['message' => 'Unknown action'], 400);
        }

        // Log the activity
        $actionLabels = [
            'confirm_visit' => 'تأكيد زيارة عروس',
            'schedule_fitting' => 'جدولة بروفة قياس',
            'confirm_booking' => 'تأكيد حجز فستان',
            'end_fitting' => 'إنهاء بروفات القياس',
            'mark_picked_up' => 'تسليم الفستان للعروس',
            'mark_returned' => 'استلام الفستان وتسوية التأمين',
            'pay_remaining' => 'سداد دفعة مالية',
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
                $booking->delete();
                
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
}
