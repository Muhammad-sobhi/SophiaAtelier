<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Client;
use App\Models\Dress;
use App\Models\Expense;
use App\Models\Fitting;
use App\Models\Revenue;
use App\Models\Visit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    /** Try-on visits report for a date range (defaults to the current month) */
    public function visits(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'from' => 'nullable|date',
            'to' => 'nullable|date|after_or_equal:from',
        ]);
        $from = $validated['from'] ?? Carbon::now()->startOfMonth()->toDateString();
        $to = $validated['to'] ?? Carbon::now()->endOfMonth()->toDateString();

        return response()->json(\App\Services\VisitReportService::build($from, $to));
    }

    /**
     * GET /api/reports/sales-employees
     * Slim bookings / fittings / visits rows for the sales staff report.
     * Only the columns the report uses are loaded, and client accessors are disabled,
     * so the whole report is a handful of queries instead of several per row.
     */
    public function salesEmployees(\App\Services\SalesNameResolver $sales): JsonResponse
    {
        $noAppends = fn($client) => $client?->setAppends([]);
        // Old rows may spell a sales name differently (e.g. Arabic vs English); report them under the employee name
        $normalize = function ($model, array $columns) use ($sales) {
            foreach ($columns as $column) {
                $model?->setAttribute($column, $sales->normalize($model->getAttribute($column)));
            }
        };

        $bookings = Booking::whereHas('client')
            ->select('id', 'client_id', 'dress_id', 'status', 'sales_name', 'pickup_sales_name', 'return_sales_name',
                'booking_date', 'event_date', 'total_amount', 'deposit_amount', 'created_at')
            ->with(['client:id,name,phone,city', 'dress:id,name,code'])
            ->latest()
            ->get()
            ->each(function (Booking $booking) use ($noAppends, $normalize) {
                $booking->setAppends([]);
                $noAppends($booking->client);
                $normalize($booking, ['sales_name', 'pickup_sales_name', 'return_sales_name']);
            });

        $fittings = Fitting::select('id', 'booking_id', 'status', 'sales_name', 'sales_associate', 'fitting_date',
                'alterations_notes', 'additional_notes', 'created_at')
            ->with(['booking:id,client_id,dress_id,sales_name', 'booking.client:id,name', 'booking.dress:id,name'])
            ->latest('fitting_date')
            ->get()
            ->each(function (Fitting $fitting) use ($noAppends, $normalize) {
                $fitting->booking?->setAppends([]);
                $noAppends($fitting->booking?->client);
                $normalize($fitting, ['sales_name', 'sales_associate']);
                $normalize($fitting->booking, ['sales_name']);
            });

        $visits = Visit::whereHas('client')
            ->select('id', 'client_id', 'status', 'source', 'time_slot', 'visit_date', 'sales_name', 'created_at')
            ->with('client:id,name,phone')
            ->latest('visit_date')
            ->get()
            ->each(function (Visit $visit) use ($noAppends, $normalize) {
                $noAppends($visit->client);
                $normalize($visit, ['sales_name']);
            });

        return response()->json([
            'bookings' => $bookings,
            'fittings' => $fittings,
            'visits' => $visits,
        ]);
    }

    /**
     * GET /api/reports/brides
     * Registration date, source, city and computed journey stage for every bride.
     * Stage relations are eager-loaded so StageComputer doesn't query per client.
     */
    public function brides(): JsonResponse
    {
        $clients = Client::select('id', 'city', 'source', 'journey_mode', 'created_at')
            ->with([
                'bookings:id,client_id,status,event_date,pickup_scheduled_on,return_scheduled_on,cancelled_at,updated_at',
                'visits:id,client_id,created_at',
            ])
            ->latest()
            ->get()
            ->map(fn(Client $client) => [
                'id' => $client->id,
                'created_at' => $client->created_at?->format('Y-m-d'),
                'source' => $client->source,
                'city' => $client->city,
                'current_stage' => \App\Services\StageComputer::compute($client),
            ]);

        return response()->json($clients);
    }

    public function sales(Request $request): JsonResponse
    {
        $period = $request->input('period', 'monthly');
        $now = Carbon::now();

        if ($period === 'daily') {
            $start = $now->copy()->subDays(30);
            $format = 'Y-m-d';
        } elseif ($period === 'weekly') {
            $start = $now->copy()->subWeeks(12);
            $format = 'Y-W';
        } else {
            $start = $now->copy()->subMonths(12);
            $format = 'Y-m';
        }

        $bookings = Booking::where('booking_date', '>=', $start)
            ->select(
                DB::raw("DATE_FORMAT(booking_date, '%Y-%m') as period"),
                DB::raw('COUNT(*) as total'),
                DB::raw('SUM(total_amount) as revenue')
            )
            ->groupBy('period')
            ->orderBy('period')
            ->get();

        return response()->json($bookings);
    }

    public function salesByStage(Request $request): JsonResponse
    {
        $month = $request->input('month', now()->format('Y-m'));
        
        $bookings = \App\Models\Booking::where('created_at', 'like', $month . '%')
            ->select('sales_name', 'status', \DB::raw('count(*) as count'))
            ->groupBy('sales_name', 'status')
            ->get();

        $fittings = \App\Models\Fitting::where('created_at', 'like', $month . '%')
            ->select('sales_name', 'status', \DB::raw('count(*) as count'))
            ->groupBy('sales_name', 'status')
            ->get();
            
        $visits = \App\Models\Visit::where('created_at', 'like', $month . '%')
            ->select('sales_name', 'status', \DB::raw('count(*) as count'))
            ->groupBy('sales_name', 'status')
            ->get();

        return response()->json([
            'bookings' => $bookings,
            'fittings' => $fittings,
            'visits' => $visits,
        ]);
    }

    public function conversion(): JsonResponse
    {
        $totalVisits = Visit::count();
        $bookedVisits = Visit::where('status', 'booked')->count();
        $rate = $totalVisits > 0 ? round(($bookedVisits / $totalVisits) * 100, 1) : 0;

        return response()->json([
            'total_visits' => $totalVisits,
            'booked_visits' => $bookedVisits,
            'conversion_rate' => $rate,
        ]);
    }

    public function topDresses(): JsonResponse
    {
        $dresses = Dress::with('category')
            ->withCount(['bookings', 'visitsAsTried'])
            ->orderByDesc('bookings_count')
            ->take(10)
            ->get();

        return response()->json($dresses);
    }

    public function worstDresses(): JsonResponse
    {
        $dresses = Dress::with('category')
            ->withCount(['bookings', 'visitsAsTried'])
            ->orderBy('bookings_count', 'asc')
            ->take(10)
            ->get();

        return response()->json($dresses);
    }

    public function revenue(Request $request): JsonResponse
    {
        $start = Carbon::now()->startOfMonth();
        $end = Carbon::now()->endOfMonth();

        $totalRevenue = Revenue::whereBetween('payment_date', [$start, $end])->sum('amount');
        $totalExpenses = Expense::whereBetween('date', [$start, $end])->sum('amount');

        $revenueByType = Revenue::whereBetween('payment_date', [$start, $end])
            ->select('type', DB::raw('SUM(amount) as total'))
            ->groupBy('type')
            ->get();

        $expenseByCategory = Expense::whereBetween('date', [$start, $end])
            ->select('category', DB::raw('SUM(amount) as total'))
            ->groupBy('category')
            ->get();

        return response()->json([
            'total_revenue' => (float) $totalRevenue,
            'total_expenses' => (float) $totalExpenses,
            'net' => (float) ($totalRevenue - $totalExpenses),
            'revenue_by_type' => $revenueByType,
            'expense_by_category' => $expenseByCategory,
        ]);
    }

    public function clientSources(): JsonResponse
    {
        $sources = Client::select('source', DB::raw('COUNT(*) as total'))
            ->groupBy('source')
            ->orderByDesc('total')
            ->get();

        return response()->json($sources);
    }

    public function executiveSummary(): JsonResponse
    {
        $now = Carbon::now();
        $start = $now->copy()->startOfMonth();
        $end = $now->copy()->endOfMonth();

        $totalRevenue = Revenue::whereBetween('payment_date', [$start, $end])->sum('amount');
        $totalExpenses = Expense::whereBetween('date', [$start, $end])->sum('amount');
        $totalBookings = Booking::whereBetween('booking_date', [$start, $end])->count();
        $cancelledBookings = Booking::where('status', 'cancelled')->whereBetween('cancelled_at', [$start, $end])->count();
        $totalClients = Client::count();
        $totalDresses = Dress::count();

        $topDresses = Dress::withCount('bookings')->orderByDesc('bookings_count')->take(5)->get();

        return response()->json([
            'period' => $now->format('F Y'),
            'revenue' => (float) $totalRevenue,
            'expenses' => (float) $totalExpenses,
            'net' => (float) ($totalRevenue - $totalExpenses),
            'bookings' => $totalBookings,
            'cancelled_bookings' => $cancelledBookings,
            'total_clients' => $totalClients,
            'total_dresses' => $totalDresses,
            'top_dresses' => $topDresses,
        ]);
    }

    /**
     * GET /api/reports/cancellations
     * Cancelled bookings in a period with what was paid, refunded and kept.
     */
    public function cancellations(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'from_date' => 'nullable|date',
            'to_date' => 'nullable|date',
        ]);

        $query = Booking::where('status', 'cancelled')
            ->with(['client:id,name,phone', 'dress:id,name,code', 'revenues:id,booking_id,type,amount'])
            ->orderByDesc('cancelled_at')
            ->orderByDesc('id');
        if (!empty($validated['from_date'])) {
            $query->whereDate('cancelled_at', '>=', $validated['from_date']);
        }
        if (!empty($validated['to_date'])) {
            $query->whereDate('cancelled_at', '<=', $validated['to_date']);
        }

        $rows = $query->get()->map(function (Booking $booking) {
            $sum = fn(array $types) => round((float) $booking->revenues->whereIn('type', $types)->sum('amount'), 2);
            $paidRent = $sum(['deposit', 'balance']);
            $paidInsurance = $sum(['insurance', 'security_deposit']);
            $depositRefund = abs($sum(['deposit_refund']));
            $insuranceRefund = abs($sum(['insurance_refund']));

            return [
                'booking_id' => $booking->id,
                'client_id' => $booking->client_id,
                'client_name' => $booking->client?->name,
                'client_phone' => $booking->client?->phone,
                'dress_name' => $booking->dress?->name,
                'dress_code' => $booking->dress?->code,
                'event_date' => $booking->event_date?->format('Y-m-d'),
                'cancelled_at' => $booking->cancelled_at?->format('Y-m-d H:i'),
                'cancelled_stage' => $booking->cancelled_stage,
                'cancelled_by_name' => $booking->cancelled_by_name,
                'sales_name' => $booking->sales_name,
                'reason' => $booking->cancellation_reason,
                'reason_label' => Booking::CANCELLATION_REASONS[$booking->cancellation_reason] ?? 'غير محدد',
                'note' => $booking->cancellation_note,
                'paid_rent' => $paidRent,
                'paid_insurance' => $paidInsurance,
                'deposit_refund' => $depositRefund,
                'insurance_refund' => $insuranceRefund,
                'kept_amount' => round(($paidRent - $depositRefund) + ($paidInsurance - $insuranceRefund), 2),
            ];
        });

        $byReason = $rows->groupBy('reason_label')
            ->map(fn($group, $label) => ['reason' => $label, 'count' => $group->count()])
            ->sortByDesc('count')->values();

        $bookingsInPeriod = Booking::whereIn('status', ['confirmed', 'picked_up', 'returned', 'cancelled']);
        if (!empty($validated['from_date'])) {
            $bookingsInPeriod->whereDate('booking_date', '>=', $validated['from_date']);
        }
        if (!empty($validated['to_date'])) {
            $bookingsInPeriod->whereDate('booking_date', '<=', $validated['to_date']);
        }
        $totalBookings = $bookingsInPeriod->count();

        return response()->json([
            'summary' => [
                'count' => $rows->count(),
                'total_bookings' => $totalBookings,
                'cancellation_rate' => $totalBookings > 0 ? round($rows->count() / $totalBookings * 100, 1) : 0,
                'deposit_refunded' => round($rows->sum('deposit_refund'), 2),
                'insurance_refunded' => round($rows->sum('insurance_refund'), 2),
                'kept_amount' => round($rows->sum('kept_amount'), 2),
            ],
            'by_reason' => $byReason,
            'reasons' => Booking::CANCELLATION_REASONS,
            'data' => $rows->values(),
        ]);
    }

    /** Bookings in a month by booking date (default) or wedding date, grouped per day with paid/remaining rent */
    public function bookingsReport(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'month' => 'nullable|date_format:Y-m',
            'date_by' => 'nullable|in:booking,event',
        ]);

        $start = Carbon::createFromFormat('Y-m', $validated['month'] ?? now()->format('Y-m'))->startOfMonth();
        $from = $start->toDateString();
        $to = $start->copy()->endOfMonth()->toDateString();
        $byEvent = ($validated['date_by'] ?? 'booking') === 'event';

        // By booking date, bookings without a booking_date fall back to their creation date (same as the dresses report)
        $bookings = Booking::where('status', '!=', 'cancelled')
            ->when($byEvent, fn($q) => $q->whereBetween('event_date', [$from, $to]))
            ->when(!$byEvent, fn($q) => $q->where(function ($q) use ($from, $to) {
                $q->whereBetween('booking_date', [$from, $to])
                  ->orWhere(function ($sub) use ($from, $to) {
                      $sub->whereNull('booking_date')->whereDate('created_at', '>=', $from)->whereDate('created_at', '<=', $to);
                  });
            }))
            ->with([
                'client:id,name,phone',
                'dress:id,name,code', 'dress2:id,name,code', 'dress3:id,name,code',
                'revenues' => fn($q) => $q->select('id', 'booking_id', 'type', 'amount')->whereIn('type', ['deposit', 'balance']),
            ])
            ->orderByDesc('booking_date')
            ->orderByDesc('id')
            ->get();

        $rows = $bookings->map(function (Booking $booking) {
            $total = round((float) $booking->total_amount, 2);
            $paid = round((float) $booking->revenues->sum('amount'), 2);

            return [
                'booking_id' => $booking->id,
                'client_id' => $booking->client_id,
                'client_name' => $booking->client?->name,
                'client_phone' => $booking->client?->phone,
                'dresses' => collect([$booking->dress, $booking->dress2, $booking->dress3])
                    ->filter()->map(fn($d) => ['name' => $d->name, 'code' => $d->code])->values(),
                'booking_date' => ($booking->booking_date ?? $booking->created_at)->format('Y-m-d'),
                'event_date' => $booking->event_date?->format('Y-m-d'),
                'status' => $booking->status,
                'total_amount' => $total,
                'paid' => $paid,
                'remaining' => max(0, round($total - $paid, 2)),
            ];
        });

        $totals = fn($group) => [
            'count' => $group->count(),
            'total_amount' => round($group->sum('total_amount'), 2),
            'paid' => round($group->sum('paid'), 2),
            'remaining' => round($group->sum('remaining'), 2),
        ];

        // Booking days: latest first. Wedding days: upcoming order (earliest first).
        $days = $rows->groupBy($byEvent ? 'event_date' : 'booking_date');
        $days = ($byEvent ? $days->sortKeys() : $days->sortKeysDesc())
            ->map(fn($group, $date) => ['date' => $date] + $totals($group) + ['bookings' => $group->values()])
            ->values();

        return response()->json([
            'month' => $start->format('Y-m'),
            'date_by' => $byEvent ? 'event' : 'booking',
            'summary' => $totals($rows),
            'days' => $days,
        ]);
    }

    public function dressesReport(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'from_date' => 'nullable|date',
            'to_date' => 'nullable|date',
            'date_by' => 'nullable|in:booking,event',
        ]);
        $fromDate = $validated['from_date'] ?? null;
        $toDate = $validated['to_date'] ?? null;
        $byEvent = ($validated['date_by'] ?? 'booking') === 'event';
        $search = trim($request->input('search', ''));
        $sort = $request->input('sort', 'top'); // 'top' | 'idle' | 'all'

        // 1. Query Bookings in the specified period (or all-time), by wedding date or by booking date.
        // By booking date, bookings without a booking_date fall back to their creation date.
        $bookingQuery = Booking::where('status', '!=', 'cancelled');
        if ($byEvent) {
            $bookingQuery
                ->when($fromDate, fn($q) => $q->whereDate('event_date', '>=', $fromDate))
                ->when($toDate, fn($q) => $q->whereDate('event_date', '<=', $toDate));
        } else {
            if ($fromDate) {
                $bookingQuery->where(function ($q) use ($fromDate) {
                    $q->whereDate('booking_date', '>=', $fromDate)
                      ->orWhere(function ($sub) use ($fromDate) {
                          $sub->whereNull('booking_date')->whereDate('created_at', '>=', $fromDate);
                      });
                });
            }
            if ($toDate) {
                $bookingQuery->where(function ($q) use ($toDate) {
                    $q->whereDate('booking_date', '<=', $toDate)
                      ->orWhere(function ($sub) use ($toDate) {
                          $sub->whereNull('booking_date')->whereDate('created_at', '<=', $toDate);
                      });
                });
            }
        }

        $bookings = $bookingQuery->select('id', 'dress_id', 'dress_2_id', 'dress_3_id', 'total_amount', 'status')->get();

        // Rental prices of every dress on a multi-dress booking (deleted dresses too) to split its amount
        $multiDressIds = $bookings->filter(fn($b) => $b->dress_2_id || $b->dress_3_id)
            ->flatMap(fn($b) => [$b->dress_id, $b->dress_2_id, $b->dress_3_id])
            ->filter()->unique()->values();
        $rentalPrices = $multiDressIds->isEmpty() ? collect()
            : Dress::withTrashed()->whereIn('id', $multiDressIds)->pluck('rental_price', 'id');

        $bookingCounts = [];
        $revenueMap = [];
        $periodBookedDressIds = [];
        $periodOutDressIds = [];

        foreach ($bookings as $b) {
            $dressIds = array_values(array_filter([$b->dress_id, $b->dress_2_id, $b->dress_3_id]));
            $count = count($dressIds);
            if ($count === 0) continue;

            // A booking stores one total: split it by each dress's rental price so the parts still add up
            // to the booking amount. If any dress has no rental price, split it equally.
            $total = floatval($b->total_amount ?? 0);
            $prices = array_map(fn($id) => floatval($rentalPrices[$id] ?? 0), $dressIds);
            $priceSum = array_sum($prices);
            $useRatio = $count > 1 && min($prices) > 0;

            foreach ($dressIds as $i => $dId) {
                $bookingCounts[$dId] = ($bookingCounts[$dId] ?? 0) + 1;
                $amountForDress = $useRatio ? $total * $prices[$i] / $priceSum : $total / $count;
                if ($amountForDress > 0) {
                    $revenueMap[$dId] = ($revenueMap[$dId] ?? 0) + $amountForDress;
                }

                if ($b->status === 'picked_up') {
                    $periodOutDressIds[$dId] = true;
                } else {
                    $periodBookedDressIds[$dId] = true;
                }
            }
        }

        // 2. Query Trials / Fittings in the specified period (visit_dresses type='tried')
        $visitDressesQuery = DB::table('visit_dresses')
            ->join('visits', 'visit_dresses.visit_id', '=', 'visits.id')
            ->where('visit_dresses.type', 'tried');

        if ($fromDate) {
            $visitDressesQuery->where(function ($q) use ($fromDate) {
                $q->whereDate('visits.visit_date', '>=', $fromDate)
                  ->orWhere(function ($sub) use ($fromDate) {
                      $sub->whereNull('visits.visit_date')->whereDate('visits.created_at', '>=', $fromDate);
                  });
            });
        }
        if ($toDate) {
            $visitDressesQuery->where(function ($q) use ($toDate) {
                $q->whereDate('visits.visit_date', '<=', $toDate)
                  ->orWhere(function ($sub) use ($toDate) {
                      $sub->whereNull('visits.visit_date')->whereDate('visits.created_at', '<=', $toDate);
                  });
            });
        }

        $triedCounts = $visitDressesQuery
            ->groupBy('visit_dresses.dress_id')
            ->select('visit_dresses.dress_id', DB::raw('count(*) as count'))
            ->pluck('count', 'dress_id')
            ->toArray();

        // 3. Current state of each dress from its open bookings
        $openStatuses = Dress::openBookingStatuses();
        $statusOf = fn(Dress $dress) => $dress->currentStatus($openStatuses);

        // 4. Status Distribution Cards Calculation
        $totalDressesCount = Dress::count();
        if (!$fromDate && !$toDate) {
            $countsByStatus = Dress::select('id', 'status')->get()->countBy($statusOf);

            $statusCounts = [
                'ready' => $countsByStatus['available'] ?? 0,
                'booked' => $countsByStatus['booked'] ?? 0,
                'out' => $countsByStatus['out'] ?? 0,
            ];
        } else {
            $outCount = count($periodOutDressIds);
            $bookedCount = count(array_diff_key($periodBookedDressIds, $periodOutDressIds));
            $readyCount = max(0, $totalDressesCount - ($bookedCount + $outCount));

            $statusCounts = [
                'ready' => $readyCount,
                'booked' => $bookedCount,
                'out' => $outCount,
            ];
        }

        // 5. Retrieve Dresses and apply search filter
        $dressQuery = Dress::query();
        if ($search !== '') {
            $cleanSearch = str_replace(['%', '_'], ['\\%', '\\_'], $search);
            $dressQuery->where(function ($q) use ($cleanSearch) {
                $q->where('name', 'like', "%{$cleanSearch}%")
                  ->orWhere('name_ar', 'like', "%{$cleanSearch}%")
                  ->orWhere('code', 'like', "%{$cleanSearch}%");
            });
        }

        $dressesList = $dressQuery->get();

        $mapped = $dressesList->map(function ($d) use ($bookingCounts, $revenueMap, $triedCounts, $statusOf) {
            $bCount = $bookingCounts[$d->id] ?? 0;
            $rentalPrice = floatval($d->rental_price ?? 0);
            $rev = $revenueMap[$d->id] ?? ($bCount > 0 ? ($bCount * $rentalPrice) : 0);
            $tCount = $triedCounts[$d->id] ?? 0;

            return [
                'id' => $d->id,
                'name' => $d->name,
                'name_ar' => $d->name_ar,
                'code' => $d->code,
                'image_path' => $d->image_path,
                'rental_price' => $rentalPrice,
                'status' => $statusOf($d),
                'times_booked' => $bCount,
                'times_tried' => $tCount,
                'total_revenue' => round($rev, 2),
            ];
        });

        // 6. Apply sorting
        if ($sort === 'top') {
            $sorted = $mapped->sort(function ($a, $b) {
                if ($b['times_booked'] !== $a['times_booked']) {
                    return $b['times_booked'] <=> $a['times_booked'];
                }
                return $b['total_revenue'] <=> $a['total_revenue'];
            })->values();
        } elseif ($sort === 'idle') {
            $sorted = $mapped->sort(function ($a, $b) {
                if ($a['times_booked'] !== $b['times_booked']) {
                    return $a['times_booked'] <=> $b['times_booked'];
                }
                return $a['total_revenue'] <=> $b['total_revenue'];
            })->values();
        } else {
            $sorted = $mapped->sort(function ($a, $b) {
                return strnatcasecmp((string)$a['code'], (string)$b['code']);
            })->values();
        }

        return response()->json([
            'date_by' => $byEvent ? 'event' : 'booking',
            'status_counts' => $statusCounts,
            'total_dresses' => $sorted->count(),
            'total_bookings' => $sorted->sum('times_booked'),
            'total_revenue' => $sorted->sum('total_revenue'),
            'total_tried' => $sorted->sum('times_tried'),
            'dresses' => $sorted,
        ]);
    }
}

