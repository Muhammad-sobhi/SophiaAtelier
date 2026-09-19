<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Client;
use App\Models\Dress;
use App\Models\Expense;
use App\Models\Revenue;
use App\Models\Visit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
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
        $totalClients = Client::count();
        $totalDresses = Dress::count();

        $topDresses = Dress::withCount('bookings')->orderByDesc('bookings_count')->take(5)->get();

        return response()->json([
            'period' => $now->format('F Y'),
            'revenue' => (float) $totalRevenue,
            'expenses' => (float) $totalExpenses,
            'net' => (float) ($totalRevenue - $totalExpenses),
            'bookings' => $totalBookings,
            'total_clients' => $totalClients,
            'total_dresses' => $totalDresses,
            'top_dresses' => $topDresses,
        ]);
    }

    public function dressesReport(Request $request): JsonResponse
    {
        $fromDate = $request->filled('from_date') ? $request->input('from_date') : null;
        $toDate = $request->filled('to_date') ? $request->input('to_date') : null;
        $search = trim($request->input('search', ''));
        $sort = $request->input('sort', 'top'); // 'top' | 'idle' | 'all'

        // 1. Query Bookings in the specified period (or all-time)
        $bookingQuery = Booking::where('status', '!=', 'cancelled');
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

        $bookings = $bookingQuery->select('id', 'dress_id', 'dress_2_id', 'dress_3_id', 'total_amount', 'status')->get();

        $bookingCounts = [];
        $revenueMap = [];
        $periodBookedDressIds = [];
        $periodOutDressIds = [];

        foreach ($bookings as $b) {
            $dressIds = array_values(array_filter([$b->dress_id, $b->dress_2_id, $b->dress_3_id]));
            $count = count($dressIds);
            if ($count === 0) continue;

            $total = floatval($b->total_amount ?? 0);
            $amountPerDress = $count > 1 ? ($total / $count) : $total;

            foreach ($dressIds as $dId) {
                $bookingCounts[$dId] = ($bookingCounts[$dId] ?? 0) + 1;
                if ($amountPerDress > 0) {
                    $revenueMap[$dId] = ($revenueMap[$dId] ?? 0) + $amountPerDress;
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

        // 3. Status Distribution Cards Calculation
        $totalDressesCount = Dress::count();
        if (!$fromDate && !$toDate) {
            $countsByStatus = Dress::groupBy('status')
                ->select('status', DB::raw('count(*) as count'))
                ->pluck('count', 'status')
                ->toArray();

            $statusCounts = [
                'ready' => ($countsByStatus['ready'] ?? 0) + ($countsByStatus['available'] ?? 0),
                'booked' => $countsByStatus['booked'] ?? 0,
                'out' => $countsByStatus['out'] ?? 0,
                'cleaning' => ($countsByStatus['cleaning'] ?? 0) + ($countsByStatus['dry_clean'] ?? 0) + ($countsByStatus['maintenance'] ?? 0),
            ];
        } else {
            $outCount = count($periodOutDressIds);
            $bookedCount = count(array_diff_key($periodBookedDressIds, $periodOutDressIds));
            $cleaningCount = Dress::whereIn('status', ['cleaning', 'dry_clean', 'maintenance'])->count();
            $readyCount = max(0, $totalDressesCount - ($bookedCount + $outCount + $cleaningCount));

            $statusCounts = [
                'ready' => $readyCount,
                'booked' => $bookedCount,
                'out' => $outCount,
                'cleaning' => $cleaningCount,
            ];
        }

        // 4. Retrieve Dresses and apply search filter
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

        $mapped = $dressesList->map(function ($d) use ($bookingCounts, $revenueMap, $triedCounts) {
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
                'status' => $d->status,
                'times_booked' => $bCount,
                'times_tried' => $tCount,
                'total_revenue' => round($rev, 2),
            ];
        });

        // 5. Apply sorting
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
            'status_counts' => $statusCounts,
            'total_dresses' => $sorted->count(),
            'total_bookings' => $sorted->sum('times_booked'),
            'total_revenue' => $sorted->sum('total_revenue'),
            'total_tried' => $sorted->sum('times_tried'),
            'dresses' => $sorted,
        ]);
    }
}

