<?php

namespace App\Services;

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

        if ($latestBooking->status === 'returned') return 'returned';
        if (in_array($latestBooking->status, ['picked_up', 'out'])) return 'picked_up';

        $fittingsList = $client->relationLoaded('fittings') ? $client->fittings : $client->fittings()->get();
        if ($fittingsList->count() > 0) {
            $hasPendingFitting = $fittingsList->contains(fn($f) => $f->status !== 'completed');
            if ($hasPendingFitting) {
                return 'fitting';
            }
        }

        $today = Carbon::today()->format('Y-m-d');
        $pickupDate = $latestBooking->pickup_scheduled_on;
        $returnDate = $latestBooking->return_scheduled_on;

        if ($returnDate && $returnDate < $today) {
            return 'returned';
        }

        if ($pickupDate && $pickupDate <= $today) {
            return 'picked_up';
        }

        return 'booking';
    }
}
