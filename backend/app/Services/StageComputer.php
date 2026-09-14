<?php

namespace App\Services;

use App\Models\Client;

class StageComputer
{
    public static function compute(Client $client): string
    {
        $bookingsList = $client->relationLoaded('bookings') ? $client->bookings : $client->bookings()->get();
        $latestBooking = $bookingsList->sortByDesc('id')->first();

        if ($client->journey_mode === 'legacy') {
            return LegacyStageResolver::resolve($client, $latestBooking);
        }

        return LiveStageResolver::resolve($client, $latestBooking);
    }
}

