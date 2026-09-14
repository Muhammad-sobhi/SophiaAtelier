<?php

namespace App\Services;

use App\Models\Client;
use App\Models\Booking;
use Carbon\Carbon;

class DressAvailabilityService
{
    /**
     * Returns an array of conflicting booking records
     */
    public static function getConflicts($clientId, $dressId, $eventDate, $excludeBookingId = null): array
    {
        if (!$dressId || !$eventDate) return [];

        $client = Client::find($clientId);
        $city = $client ? ($client->city ?? 'Cairo') : 'Cairo';
        
        $isCairoOrGiza = (! $city || stripos($city, 'cairo') !== false || stripos($city, 'giza') !== false || $city === 'القاهرة' || $city === 'الجيزة');
        $daysBefore = $isCairoOrGiza ? 2 : 3;
        $daysAfter = 1;

        $proposedWedding = Carbon::parse($eventDate);
        $proposedStart = $proposedWedding->copy()->subDays($daysBefore)->startOfDay();
        $proposedEnd = $proposedWedding->copy()->addDays($daysAfter)->endOfDay();

        $query = Booking::with('client')
            ->where(function ($q) use ($dressId) {
                $q->where('dress_id', $dressId)
                  ->orWhere('dress_2_id', $dressId)
                  ->orWhere('dress_3_id', $dressId);
            })
            ->whereIn('status', ['confirmed', 'picked_up', 'out']); // usually returned means it's back, but wait...
            
        if ($excludeBookingId) {
            $query->where('id', '!=', $excludeBookingId);
        }

        $existingBookings = $query->get();
        $conflicts = [];

        foreach ($existingBookings as $eb) {
            // Use explicit scheduled dates if they exist, else fallback to city-based calculation
            if ($eb->pickup_scheduled_on && $eb->return_scheduled_on) {
                $exStart = Carbon::parse($eb->pickup_scheduled_on)->startOfDay();
                $exEnd = Carbon::parse($eb->return_scheduled_on)->endOfDay();
            } else {
                $exClient = $eb->client;
                $exCity = $exClient ? ($exClient->city ?? 'Cairo') : 'Cairo';
                $exIsCairoOrGiza = (! $exCity || stripos($exCity, 'cairo') !== false || stripos($exCity, 'giza') !== false || $exCity === 'القاهرة' || $exCity === 'الجيزة');
                $exDaysBefore = $exIsCairoOrGiza ? 2 : 3;
                $exDaysAfter = 1;

                $exWedding = Carbon::parse($eb->event_date);
                $exStart = $exWedding->copy()->subDays($exDaysBefore)->startOfDay();
                $exEnd = $exWedding->copy()->addDays($exDaysAfter)->endOfDay();
            }

            if ($proposedStart->lte($exEnd) && $proposedEnd->gte($exStart)) {
                $conflicts[] = [
                    'client_name' => $eb->client ? $eb->client->name : 'Unknown',
                    'stage' => $eb->client ? $eb->client->current_stage : 'Unknown',
                    'event_date' => $eb->event_date,
                    'pickup_scheduled_on' => $eb->pickup_scheduled_on ?? $exStart->format('Y-m-d'),
                    'return_scheduled_on' => $eb->return_scheduled_on ?? $exEnd->format('Y-m-d'),
                    'booking_status' => $eb->status
                ];
            }
        }

        return $conflicts;
    }
}

