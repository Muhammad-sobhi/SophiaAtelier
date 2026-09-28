<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\Client;
use Carbon\Carbon;

class LiveStageResolver
{
    public static function resolve(Client $client, $latestBooking): string
    {
        if ($latestBooking && $latestBooking->status === 'cancelled' && !self::hasVisitAfterCancel($client, $latestBooking)) {
            return 'cancelled';
        }

        if (!$latestBooking || in_array($latestBooking->status, ['pending', 'cancelled'])) {
            $visitsCount = $client->relationLoaded('visits') ? $client->visits->count() : $client->visits()->count();
            return 'visit';
        }

        // Returned: stays in the return stage for 15 days after the actual return, then moves to the archive
        if ($latestBooking->status === 'returned') {
            return $latestBooking->isArchivedReturn() ? 'completed' : 'returned';
        }

        // 2. Dress is out with the bride -> awaiting return
        if (in_array($latestBooking->status, ['picked_up', 'out'])) {
            return 'returned';
        }

        // 3. Confirmed booking with scheduled pickup
        $pickupDate = $latestBooking->pickup_scheduled_on ? Carbon::parse($latestBooking->pickup_scheduled_on)->format('Y-m-d') : null;

        if (!$pickupDate && $latestBooking->event_date) {
            $scheduled = Booking::calculateScheduledDates($latestBooking->event_date, $client->city);
            $pickupDate = $scheduled['pickup_date'] ?? null;
        }

        // 15-day window: appears in pickup stage when within 15 days of pickup date
        $threshold = Carbon::today()->addDays(15)->format('Y-m-d');
        if ($pickupDate && $pickupDate <= $threshold) {
            return 'picked_up';
        }

        // More than 15 days until pickup date -> booking stage
        return 'booking';
    }

    /** A cancelled bride who came back for a new visit is treated as a visit again */
    private static function hasVisitAfterCancel(Client $client, $booking): bool
    {
        $cancelledAt = $booking->cancelled_at ?? $booking->updated_at;
        if (!$cancelledAt) {
            return false;
        }
        $visits = $client->relationLoaded('visits') ? $client->visits : $client->visits()->get();
        return $visits->contains(fn($v) => $v->created_at && Carbon::parse($v->created_at)->gt(Carbon::parse($cancelledAt)));
    }
}
