<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\Client;
use Carbon\Carbon;

class LegacyStageResolver
{
    public static function resolve(Client $client, $latestBooking): string
    {
        if (!$latestBooking || in_array($latestBooking->status, ['pending', 'cancelled'])) {
            $visitsCount = $client->relationLoaded('visits') ? $client->visits->count() : $client->visits()->count();
            return 'visit';
        }

        if ($latestBooking->status === 'returned') {
            $returnDate = $latestBooking->return_scheduled_on
                ? Carbon::parse($latestBooking->return_scheduled_on)->format('Y-m-d')
                : Carbon::parse($latestBooking->updated_at)->format('Y-m-d');

            $returnMonth = Carbon::parse($returnDate)->format('Y-m');
            $currentMonth = Carbon::today()->format('Y-m');

            if ($returnMonth < $currentMonth) {
                return 'completed';
            }

            return 'returned';
        }

        if (in_array($latestBooking->status, ['picked_up', 'out'])) {
            return 'returned';
        }

        $pickupDate = $latestBooking->pickup_scheduled_on ? Carbon::parse($latestBooking->pickup_scheduled_on)->format('Y-m-d') : null;
        if (!$pickupDate && $latestBooking->event_date) {
            $scheduled = Booking::calculateScheduledDates($latestBooking->event_date, $client->city);
            $pickupDate = $scheduled['pickup_date'] ?? null;
        }

        $threshold = Carbon::today()->addDays(15)->format('Y-m-d');
        if ($pickupDate && $pickupDate <= $threshold) {
            return 'picked_up';
        }

        return 'booking';
    }
}
