<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Fitting;
use App\Models\Visit;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class CalendarController extends Controller
{
    /**
     * One event per real appointment: visit, booking, fitting, pickup (to the bride) or return (from the bride).
     * Cancelled bookings, their fittings and cancelled visits are excluded.
     * GET /api/calendar/events?start_date=2026-07-01&end_date=2026-07-31
     */
    public function events(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'start_date' => 'nullable|date_format:Y-m-d',
            'end_date' => 'nullable|date_format:Y-m-d|after_or_equal:start_date',
        ]);
        $start = $validated['start_date'] ?? now()->startOfMonth()->toDateString();
        $end = $validated['end_date'] ?? now()->endOfMonth()->toDateString();

        return response()->json([
            'events' => $this->collectEvents($start, $end)->sortBy('date')->values(),
        ]);
    }

    /**
     * Event counts per month and type, for the calendar's month quick-filter.
     * GET /api/calendar/months
     */
    public function months(): JsonResponse
    {
        $months = $this->collectEvents(null, null)
            ->groupBy(fn ($e) => substr($e['date'], 0, 7))
            ->map(fn ($items, $month) => ['month' => $month, 'counts' => $items->countBy('type')])
            ->sortKeys()
            ->values();

        return response()->json(['months' => $months]);
    }

    /** All events inside [start, end], or every event when no range is given */
    private function collectEvents(?string $start, ?string $end): Collection
    {
        $endOfDay = $end ? $end . ' 23:59:59' : null;
        $inRange = fn (?string $d) => $d && (!$start || ($d >= $start && $d <= $end));
        $dateOnly = fn ($raw) => $raw ? substr((string) $raw, 0, 10) : null;

        $bookings = Booking::whereHas('client')
            ->with(['client:id,name,phone,city,address', 'dress:id,name,code'])
            ->where('status', '!=', 'cancelled')
            ->when($start, function ($q) use ($start, $endOfDay) {
                // Pickup/return fall back to dates derived from event_date (at most 2 days away)
                $q->where(function ($q) use ($start, $endOfDay) {
                    $q->whereBetween('booking_date', [$start, $endOfDay])
                      ->orWhereBetween('pickup_scheduled_on', [$start, $endOfDay])
                      ->orWhereBetween('return_scheduled_on', [$start, $endOfDay])
                      ->orWhereBetween('event_date', [
                          Carbon::parse($start)->subDays(3)->toDateString(),
                          Carbon::parse($endOfDay)->addDays(3)->toDateTimeString(),
                      ]);
                });
            })
            ->get();

        $events = collect();
        $bookingDays = [];

        foreach ($bookings as $booking) {
            $city = $booking->client->city ?? $booking->client->address ?? '';
            $eventDate = $dateOnly($booking->getRawOriginal('event_date'));
            $scheduled = Booking::calculateScheduledDates($eventDate, $city);
            $base = [
                'client_id' => $booking->client_id,
                'client_name' => $booking->client->name,
                'client_phone' => $booking->client->phone ?? '',
                'booking_id' => $booking->id,
                'dress_name' => $booking->dress->name ?? null,
                'event_date' => $eventDate,
                'status' => $booking->status,
            ];

            $dates = [
                'booking' => $dateOnly($booking->getRawOriginal('booking_date')),
                'pickup' => $dateOnly($booking->getRawOriginal('pickup_scheduled_on')) ?: $scheduled['pickup_date'],
                'return' => $dateOnly($booking->getRawOriginal('return_scheduled_on')) ?: $scheduled['return_date'],
            ];
            foreach ($dates as $type => $date) {
                if ($inRange($date)) {
                    $events->push(['id' => "{$type}-{$booking->id}", 'type' => $type, 'date' => $date] + $base);
                }
            }
            if ($dates['booking']) {
                $bookingDays[$booking->client_id . '|' . $dates['booking']] = true;
            }
        }

        $visits = Visit::whereHas('client')
            ->with('client:id,name,phone')
            ->where('status', '!=', 'cancelled')
            ->when($start, fn ($q) => $q->whereBetween('visit_date', [$start, $endOfDay]))
            ->get();

        foreach ($visits as $visit) {
            $date = $dateOnly($visit->getRawOriginal('visit_date'));
            // The visit that ended in a booking is already shown as that booking
            if (!$date || isset($bookingDays[$visit->client_id . '|' . $date])) {
                continue;
            }
            $events->push([
                'id' => 'visit-' . $visit->id,
                'type' => 'visit',
                'date' => $date,
                'client_id' => $visit->client_id,
                'client_name' => $visit->client->name,
                'client_phone' => $visit->client->phone ?? '',
                'booking_id' => null,
                'dress_name' => null,
                'event_date' => null,
                'status' => $visit->status,
            ]);
        }

        $fittings = Fitting::whereHas('booking', fn ($q) => $q->where('status', '!=', 'cancelled')->whereHas('client'))
            ->with(['booking.client:id,name,phone', 'booking.dress:id,name'])
            ->where('status', '!=', 'cancelled')
            ->when($start, fn ($q) => $q->whereBetween('fitting_date', [$start, $endOfDay]))
            ->get();

        foreach ($fittings as $fitting) {
            $date = $dateOnly($fitting->getRawOriginal('fitting_date'));
            if (!$date) {
                continue;
            }
            $events->push([
                'id' => 'fitting-' . $fitting->id,
                'type' => 'fitting',
                'date' => $date,
                'client_id' => $fitting->booking->client_id,
                'client_name' => $fitting->booking->client->name,
                'client_phone' => $fitting->booking->client->phone ?? '',
                'booking_id' => $fitting->booking_id,
                'dress_name' => $fitting->booking->dress->name ?? null,
                'event_date' => $dateOnly($fitting->booking->getRawOriginal('event_date')),
                'status' => $fitting->status,
            ]);
        }

        return $events;
    }
}
