<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Visit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CalendarController extends Controller
{
    /**
     * Return merged visits + bookings as calendar events.
     * GET /api/calendar/events?start_date=2026-07-01&end_date=2026-07-31
     */
    public function events(Request $request): JsonResponse
    {
        $startDate = $request->input('start_date', now()->startOfMonth()->toDateString());
        $endDate = $request->input('end_date', now()->endOfMonth()->toDateString());

        // Fetch visits in date range
        $visits = Visit::with(['client.bookings.dress', 'client.bookings.dress2', 'client.bookings.dress3'])
            ->whereBetween('visit_date', [$startDate, $endDate])
            ->get()
            ->map(function ($visit) {
                $cairoAliases = ['القاهرة', 'الجيزة', 'cairo', 'giza', '6 أكتوبر', 'حلوان', 'المعادي', 'مدينة نصر', 'التجمع'];
                $clientCity = $visit->client->city ?? $visit->client->address ?? '';
                $isCairo = collect($cairoAliases)->contains(fn ($alias) => str_contains(mb_strtolower($clientCity), mb_strtolower($alias)));

                $booking = null;
                if ($visit->client && $visit->client->bookings) {
                    // Try to match the booking_date with the visit_date
                    $booking = $visit->client->bookings->first(function ($b) use ($visit) {
                        return explode(' ', $b->getRawOriginal('booking_date'))[0] === explode(' ', $visit->getRawOriginal('visit_date'))[0];
                    });
                    // Fallback to the first booking if no date match
                    if (!$booking) {
                        $booking = $visit->client->bookings->first();
                    }
                }

                return [
                    'id' => 'visit-' . $visit->id,
                    'type' => 'visit',
                    'date' => explode(' ', $visit->getRawOriginal('visit_date'))[0],
                    'client_id' => $visit->client_id,
                    'client_name' => $visit->client->name ?? '-',
                    'client_phone' => $visit->client->phone ?? '',
                    'client_city' => $clientCity,
                    'is_cairo' => $isCairo,
                    'status' => $visit->status,
                    'notes' => $visit->notes,
                    'dress_name' => $booking->dress->name ?? null,
                    'dress_id' => $booking ? $booking->dress_id : null,
                    'dress_2_name' => $booking->dress2->name ?? null,
                    'dress_2_id' => $booking ? $booking->dress_2_id : null,
                    'dress_3_name' => $booking->dress3->name ?? null,
                    'dress_3_id' => $booking ? $booking->dress_3_id : null,
                    'dress_1_conflict_date' => $booking ? Booking::checkDressAvailability($booking->client_id, $booking->dress_id, $booking->event_date, $booking->id) : null,
                    'dress_2_conflict_date' => ($booking && $booking->dress_2_id) ? Booking::checkDressAvailability($booking->client_id, $booking->dress_2_id, $booking->event_date, $booking->id) : null,
                    'dress_3_conflict_date' => ($booking && $booking->dress_3_id) ? Booking::checkDressAvailability($booking->client_id, $booking->dress_3_id, $booking->event_date, $booking->id) : null,
                    'booking_id' => $booking ? $booking->id : null,
                ];
            });

        // Fetch bookings in date range (by booking_date or event_date)
        $bookings = Booking::with(['client.visits', 'dress', 'dress2', 'dress3'])
            ->where(function ($q) use ($startDate, $endDate) {
                $q->whereBetween('booking_date', [$startDate, $endDate])
                  ->orWhereBetween('event_date', [$startDate, $endDate]);
            })
            ->get()
            ->map(function ($booking) {
                $cairoAliases = ['القاهرة', 'الجيزة', 'cairo', 'giza', '6 أكتوبر', 'حلوان', 'المعادي', 'مدينة نصر', 'التجمع'];
                $clientCity = $booking->client->city ?? $booking->client->address ?? '';
                $isCairo = collect($cairoAliases)->contains(fn ($alias) => str_contains(mb_strtolower($clientCity), mb_strtolower($alias)));

                $hasFittings = $booking->fittings()->exists();
                $fittingsCompleted = $hasFittings && !$booking->fittings()->where('fittings.status', '!=', 'completed')->exists();

                $type = 'booking';
                $eventDateStr = explode(' ', $booking->getRawOriginal('event_date'))[0];
                $date = $eventDateStr;

                if ($fittingsCompleted) {
                    $type = 'pickup';
                    $weddingDate = \Carbon\Carbon::parse($eventDateStr);
                    $pickupDaysBefore = $isCairo ? 1 : 2;
                    $date = $weddingDate->subDays($pickupDaysBefore)->toDateString();
                }

                $bookingDateOnly = explode(' ', $booking->getRawOriginal('booking_date'))[0];
                $timeSlot = null;
                if ($booking->client) {
                    $visit = $booking->client->visits->first(function ($v) use ($bookingDateOnly) {
                        return explode(' ', $v->getRawOriginal('visit_date'))[0] === $bookingDateOnly;
                    });
                    if ($visit) {
                        $timeSlot = $visit->time_slot;
                    }
                }

                return [
                    'id' => 'booking-' . $booking->id,
                    'type' => $type,
                    'date' => $date,
                    'event_date' => $eventDateStr,
                    'booking_date' => $bookingDateOnly,
                    'time_slot' => $timeSlot,
                    'client_id' => $booking->client_id,
                    'client_name' => $booking->client->name ?? '-',
                    'client_phone' => $booking->client->phone ?? '',
                    'client_city' => $clientCity,
                    'is_cairo' => $isCairo,
                    'status' => $booking->status,
                    'notes' => $booking->notes,
                    'total_amount' => $booking->total_amount,
                    'deposit_amount' => $booking->deposit_amount,
                    'dress_name' => $booking->dress->name ?? '-',
                    'dress_id' => $booking->dress_id,
                    'dress_2_name' => $booking->dress2->name ?? null,
                    'dress_2_id' => $booking->dress_2_id,
                    'dress_3_name' => $booking->dress3->name ?? null,
                    'dress_3_id' => $booking->dress_3_id,
                    'dress_1_conflict_date' => Booking::checkDressAvailability($booking->client_id, $booking->dress_id, $booking->event_date, $booking->id),
                    'dress_2_conflict_date' => $booking->dress_2_id ? Booking::checkDressAvailability($booking->client_id, $booking->dress_2_id, $booking->event_date, $booking->id) : null,
                    'dress_3_conflict_date' => $booking->dress_3_id ? Booking::checkDressAvailability($booking->client_id, $booking->dress_3_id, $booking->event_date, $booking->id) : null,
                    'total_amount' => (float) $booking->total_amount,
                    'deposit_amount' => (float) $booking->deposit_amount,
                    'trying_fee' => (float) ($booking->dress->trying_fee ?? 0),
                    'fittings_completed' => $fittingsCompleted,
                ];
            });

        // Fetch fittings in date range
        $fittings = \App\Models\Fitting::with(['booking.client', 'booking.dress'])
            ->whereBetween('fitting_date', [$startDate, $endDate])
            ->get()
            ->map(function ($fitting) {
                $client = $fitting->booking->client ?? null;
                $clientName = $client->name ?? '-';
                $clientPhone = $client->phone ?? '';
                $clientCity = $client->city ?? $client->address ?? '';
                
                $cairoAliases = ['القاهرة', 'الجيزة', 'cairo', 'giza', '6 أكتوبر', 'حلوان', 'المعادي', 'مدينة نصر', 'التجمع'];
                $isCairo = collect($cairoAliases)->contains(fn ($alias) => str_contains(mb_strtolower($clientCity), mb_strtolower($alias)));

                return [
                    'id' => 'fitting-' . $fitting->id,
                    'type' => 'fitting',
                    'date' => explode(' ', $fitting->getRawOriginal('fitting_date'))[0],
                    'client_id' => $client->id ?? 0,
                    'client_name' => $clientName . ' (بروفة فستان)',
                    'client_phone' => $clientPhone,
                    'client_city' => $clientCity,
                    'is_cairo' => $isCairo,
                    'status' => $fitting->status,
                    'notes' => $fitting->additional_notes ?? 'موعد بروفة قياس وتعديل للفستان.',
                    'dress_name' => $fitting->booking->dress->name ?? null,
                ];
            });

        $events = $visits->concat($bookings)->concat($fittings)->sortBy('date')->values();

        return response()->json([
            'events' => $events,
            'total_visits' => $visits->count(),
            'total_bookings' => $bookings->count(),
        ]);
    }
}
