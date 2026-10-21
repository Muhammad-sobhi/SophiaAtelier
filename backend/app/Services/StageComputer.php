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

    /**
     * The step the bride sees on the website (visit -> booking -> pickup -> return). The dashboard stages
     * are columns, not events: "returned" also holds brides who still have the dress, and "completed" is
     * the archive. Fittings are optional and never a step.
     *
     * @return string visit | booking | pickup | with_bride | returned | cancelled
     */
    public static function journeyStep(Client $client): string
    {
        $stage = $client->current_stage;
        $bookingsList = $client->relationLoaded('bookings') ? $client->bookings : $client->bookings()->get();
        $latestBooking = $bookingsList->sortByDesc('id')->first();

        return match ($stage) {
            'booking' => 'booking',
            'picked_up' => 'pickup',
            'returned' => $latestBooking?->status === 'returned' ? 'returned' : 'with_bride',
            'completed' => 'returned',
            'cancelled' => 'cancelled',
            default => 'visit',
        };
    }
}
