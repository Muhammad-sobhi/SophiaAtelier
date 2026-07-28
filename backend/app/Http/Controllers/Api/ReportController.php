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
            ->withCount('bookings')
            ->orderByDesc('bookings_count')
            ->take(10)
            ->get();

        return response()->json($dresses);
    }

    public function worstDresses(): JsonResponse
    {
        $dresses = Dress::with('category')
            ->withCount('bookings')
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
}
