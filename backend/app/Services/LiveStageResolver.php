<?php

namespace App\Services;

use App\Models\Client;

class LiveStageResolver
{
    public static function resolve(Client $client, $latestBooking): string
    {
        if (!$latestBooking) {
            $visitsCount = $client->relationLoaded('visits') ? $client->visits->count() : $client->visits()->count();
            return $visitsCount > 0 ? 'visit' : 'visit';
        }

        if ($latestBooking->status === 'returned') return 'returned';
        if (in_array($latestBooking->status, ['picked_up', 'out'])) return 'picked_up';

        $fittingsList = $client->relationLoaded('fittings') ? $client->fittings : $client->fittings()->get();
        if ($fittingsList->count() > 0) {
            $hasPendingFitting = $fittingsList->contains(fn($f) => $f->status !== 'completed');
            if ($hasPendingFitting) {
                return 'fitting';
            }
            // All fittings are completed -> advance to pickup
            return 'picked_up';
        }

        return 'booking';
    }
}

