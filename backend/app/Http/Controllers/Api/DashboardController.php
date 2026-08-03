<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Client;
use App\Models\Dress;
use App\Models\Fitting;
use App\Models\Revenue;
use App\Models\Task;
use App\Models\Visit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function index(): JsonResponse
    {
        $today = Carbon::today();

        return response()->json([
            'today_visits' => Visit::whereDate('visit_date', $today)->count(),
            'today_fittings' => Fitting::whereDate('fitting_date', $today)->count(),
            'dresses_out' => Dress::where('status', 'out')->count(),
            'dresses_in_maintenance' => Dress::where('status', 'maintenance')->count(),
            'total_clients' => Client::count(),
            'total_dresses' => Dress::count(),
            'pending_tasks' => Task::where('status', '!=', 'completed')->count(),
            'cash_balance' => (float) Revenue::sum('amount'),
        ]);
    }

    public function executive(): JsonResponse
    {
        $now = Carbon::now();
        $startOfMonth = $now->copy()->startOfMonth();
        $endOfMonth = $now->copy()->endOfMonth();

        $revenueThisMonth = Revenue::whereBetween('payment_date', [$startOfMonth, $endOfMonth])->sum('amount');

        $totalBookings = Booking::whereBetween('booking_date', [$startOfMonth, $endOfMonth])->count();
        $confirmedBookings = Booking::whereBetween('booking_date', [$startOfMonth, $endOfMonth])
            ->whereIn('status', ['confirmed', 'picked_up', 'returned'])
            ->count();
        $conversionRate = $totalBookings > 0 ? round(($confirmedBookings / $totalBookings) * 100, 1) : 0;

        $bestDresses = Dress::with('category')
            ->withCount('bookings')
            ->orderByDesc('bookings_count')
            ->take(5)
            ->get();

        $alerts = [];

        $outDressesCount = Dress::where('status', 'out')->count();
        if ($outDressesCount > 0) {
            $alerts[] = "{$outDressesCount} dress(es) currently out on rental.";
        }

        $overdueTasks = Task::where('status', '!=', 'completed')
            ->where('due_date', '<', $now->toDateString())
            ->count();
        if ($overdueTasks > 0) {
            $alerts[] = "{$overdueTasks} task(s) overdue.";
        }

        return response()->json([
            'revenue_this_month' => (float) $revenueThisMonth,
            'conversion_rate' => $conversionRate,
            'best_dresses' => $bestDresses,
            'alerts' => $alerts,
        ]);
    }

    /**
     * GET /api/dashboard/brides-summary
     * Returns all brides with computed current_stage & key info for the chip strip.
     */
    public function bridesSummary(): JsonResponse
    {
        $clients = Client::has('bookings')
        ->orHas('visits')
        ->withCount(['visits', 'bookings'])
        ->with(['visits' => function ($q) {
            $q->latest('visit_date')->limit(1);
        }, 'bookings' => function ($q) {
            $q->with([
                'dress.accessories',
                'dress2.accessories',
                'dress3.accessories',
                'revenues'
            ])->latest();
        }, 'fittings'])
        ->get()
        ->map(function ($client) {
            $latestVisit = $client->visits->first();
            $latestBooking = $client->bookings->first();
 
            // Extract relevant date for sorting (pickup_date > event_date > wedding_date > visit_date > booking_date)
            $relevantDate = null;
            if ($latestBooking) {
                if (preg_match('/يوم الاستلام:\s*(\d{4}-\d{2}-\d{2})/', $latestBooking->notes ?? '', $m)) {
                    $relevantDate = $m[1];
                }
                if (!$relevantDate && $latestBooking->event_date) {
                    $relevantDate = \Carbon\Carbon::parse($latestBooking->event_date)->format('Y-m-d');
                }
                if (!$relevantDate && $latestBooking->booking_date) {
                    $relevantDate = \Carbon\Carbon::parse($latestBooking->booking_date)->format('Y-m-d');
                }
            }
            if (!$relevantDate && $client->wedding_date) {
                $relevantDate = \Carbon\Carbon::parse($client->wedding_date)->format('Y-m-d');
            }
            if (!$relevantDate && $latestVisit?->visit_date) {
                $relevantDate = \Carbon\Carbon::parse($latestVisit->visit_date)->format('Y-m-d');
            }
            if (!$relevantDate && $client->created_at) {
                $relevantDate = $client->created_at->format('Y-m-d');
            }

            return [
                'id' => $client->id,
                'name' => $client->name,
                'phone' => $client->phone ?? '',
                'city' => $client->city ?? $client->address ?? '',
                'source' => $client->source ?? '',
                'image_path' => $client->image_path,
                'current_stage' => $client->current_stage,
                'latest_visit_date' => $latestVisit?->visit_date?->toDateString(),
                'latest_booking_status' => $latestBooking?->status,
                'latest_dress_name' => $latestBooking?->dress?->name,
                'notes' => $client->notes ?? '',
                'created_at' => $client->created_at->toDateString(),
                'relevant_date' => $relevantDate,
                'bookings' => $client->bookings,
            ];
        })
        ->sortBy(function ($client) {
            return $client['relevant_date'] ?? '9999-12-31';
        })
        ->values();

        return response()->json($clients);
    }

    /**
     * GET /api/dashboard/dresses-summary
     * Returns all dresses with computed stage & key info for the chip strip.
     */
    public function dressesSummary(): JsonResponse
    {
        $dresses = Dress::with(['images', 'category', 'designer', 'bookings' => function ($q) {
            $q->latest()->limit(1);
        }])
        ->latest()
        ->get()
        ->map(function ($dress) {
            $primaryImage = $dress->images->where('is_primary', true)->first()
                ?? $dress->images->first();

            // Compute dress lifecycle stage
            $stage = 'ready';
            if (in_array($dress->status, ['cleaning', 'dry_clean'])) {
                $stage = 'dry_clean';
            } elseif (in_array($dress->status, ['booked', 'out'])) {
                $stage = 'booked';
            } elseif ($dress->status === 'maintenance') {
                $stage = 'dry_clean'; // maintenance maps to dry_clean stage
            }

            return [
                'id' => $dress->id,
                'name' => $dress->name,
                'size' => $dress->size ?? '',
                'color' => $dress->color ?? '',
                'rental_price' => (float) $dress->rental_price,
                'trying_fee' => (float) ($dress->trying_fee ?? 0),
                'current_stage' => $stage,
                'status' => $dress->status,
                'image_path' => $primaryImage?->image_path,
                'category' => $dress->category?->name ?? '',
                'designer' => $dress->designer?->name ?? '',
                'latest_booking_client' => $dress->bookings->first()?->client?->name,
            ];
        });

        return response()->json($dresses);
    }
}

