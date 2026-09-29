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
        
        $isCairoOrGiza = \App\Models\Booking::isCairoCity($city);
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

    /** Availability of each dress requested in a visit (dashboard view, includes other brides' names) */
    public static function forVisit(\App\Models\Visit $visit): array
    {
        $visit->loadMissing(['client', 'requestedDresses.images']);
        $client = $visit->client;

        return self::check(
            $visit->requestedDresses,
            $visit->visit_date?->toDateString(),
            $client?->wedding_date,
            $client?->city,
            $client?->id
        )['dresses'];
    }

    /**
     * Availability of dresses on two dates:
     *  - visit (try-on) date: is the dress in the shop that day, and if not, from when
     *  - wedding date: is the dress free for the bride's pickup → return window, and if not, from which wedding date
     * Also suggests the earliest try-on date on which all the dresses are in the shop.
     *
     * @param \Illuminate\Support\Collection $dresses Dress models
     */
    public static function check($dresses, ?string $visitDate, ?string $weddingDate, ?string $city, ?int $excludeClientId = null): array
    {
        if ($dresses->isEmpty()) {
            return ['dresses' => [], 'suggested_visit_date' => null, 'all_available' => false];
        }

        $visitDay = $visitDate ? Carbon::parse($visitDate)->startOfDay() : null;
        $weddingWindow = $weddingDate ? Booking::calculateScheduledDates($weddingDate, $city) : null;
        if (!$weddingWindow || !$weddingWindow['pickup_date']) {
            $weddingWindow = null;
        }

        $windowsByDress = self::blockingWindows($dresses->pluck('id')->all(), $excludeClientId);

        $rows = $dresses->map(function ($dress) use ($visitDay, $weddingDate, $weddingWindow, $windowsByDress) {
            $windows = $windowsByDress[$dress->id] ?? [];

            return [
                'dress_id' => $dress->id,
                'name' => $dress->name,
                'name_ar' => $dress->name_ar,
                'code' => $dress->code,
                'size' => $dress->size,
                'trying_fee' => (float) ($dress->trying_fee ?? 0),
                'image_path' => $dress->relationLoaded('images') ? $dress->images->sortByDesc('is_primary')->first()?->image_path : null,
                'dress_status' => $dress->status,
                'visit_date' => $visitDay ? self::visitDateAvailability($dress, $visitDay, $windows) : null,
                'wedding_date' => $weddingWindow ? self::weddingDateAvailability($weddingDate, $weddingWindow, $windows) : null,
            ];
        })->values()->all();

        $allAvailable = collect($rows)->every(fn($r) => ($r['visit_date']['available'] ?? false) && ($r['wedding_date']['available'] ?? false));

        return [
            'dresses' => $rows,
            'suggested_visit_date' => $visitDay ? self::suggestVisitDate($visitDay, $windowsByDress)?->toDateString() : null,
            'all_available' => $allAvailable,
        ];
    }

    /** Remember dresses a bride wanted that were booked on her wedding date (one row per dress/bride/date) */
    public static function recordDemandMisses(int $clientId, string $weddingDate, array $rows): void
    {
        $now = now();
        $misses = collect($rows)
            ->filter(fn($r) => $r['wedding_date'] && !$r['wedding_date']['available'])
            ->map(fn($r) => [
                'dress_id' => $r['dress_id'],
                'client_id' => $clientId,
                'wedding_date' => Carbon::parse($weddingDate)->toDateString(),
                'available_from' => $r['wedding_date']['available_from'],
                'created_at' => $now,
                'updated_at' => $now,
            ])->values()->all();

        if ($misses) {
            \Illuminate\Support\Facades\DB::table('dress_demand_misses')
                ->upsert($misses, ['dress_id', 'client_id', 'wedding_date'], ['available_from', 'updated_at']);
        }
    }

    /** Same result without other brides' details or internal wording (safe for the public website) */
    public static function publicView(array $result): array
    {
        $result['dresses'] = array_map(function ($row) {
            unset($row['dress_status'], $row['size']);
            if ($row['visit_date']) {
                unset($row['visit_date']['reason']);
            }
            if ($row['wedding_date']) {
                unset($row['wedding_date']['conflicts']);
            }
            return $row;
        }, $result['dresses']);

        return $result;
    }

    /**
     * Pickup → return windows of other brides' active bookings, grouped by dress id.
     * A picked-up dress past its return date stays blocked until today (it is still out).
     */
    private static function blockingWindows(array $dressIds, ?int $excludeClientId): array
    {
        $bookings = Booking::with('client:id,name,city')
            ->where(function ($q) use ($dressIds) {
                $q->whereIn('dress_id', $dressIds)
                  ->orWhereIn('dress_2_id', $dressIds)
                  ->orWhereIn('dress_3_id', $dressIds);
            })
            ->whereIn('status', ['confirmed', 'picked_up'])
            ->when($excludeClientId, fn($q) => $q->where('client_id', '!=', $excludeClientId))
            ->get();

        $today = Carbon::today();
        $windows = [];
        foreach ($bookings as $b) {
            $pickup = $b->pickup_scheduled_on;
            $return = $b->return_scheduled_on;
            if (!$pickup || !$return) {
                $scheduled = Booking::calculateScheduledDates($b->event_date?->toDateString(), $b->client?->city);
                $pickup = $pickup ?: $scheduled['pickup_date'];
                $return = $return ?: $scheduled['return_date'];
            }
            if (!$pickup || !$return) {
                continue;
            }

            $start = Carbon::parse($pickup)->startOfDay();
            $end = Carbon::parse($return)->startOfDay();
            $overdue = $b->status === 'picked_up' && $end->lt($today);
            if ($overdue) {
                $end = $today->copy();
            }

            $window = [
                'start' => $start,
                'end' => $end,
                'overdue' => $overdue,
                'client_name' => $b->client->name ?? null,
                'event_date' => $b->event_date?->toDateString(),
            ];
            foreach (array_unique(array_filter([$b->dress_id, $b->dress_2_id, $b->dress_3_id])) as $id) {
                if (in_array($id, $dressIds)) {
                    $windows[$id][] = $window;
                }
            }
        }

        return $windows;
    }

    private static function visitDateAvailability($dress, Carbon $visitDate, array $windows): array
    {
        // Dress is with another bride and past its return date: unknown until it comes back
        foreach ($windows as $w) {
            if ($w['overdue']) {
                return [
                    'available' => false,
                    'reason_code' => 'overdue',
                    'reason' => 'مع عروس أخرى ومتأخر في الإرجاع',
                    'available_from' => null,
                ];
            }
        }

        // Walk forward through (possibly back-to-back) booking windows to the first free day
        $candidate = $visitDate->copy();
        $blockedBy = null;
        do {
            $moved = false;
            foreach ($windows as $w) {
                if ($candidate->between($w['start'], $w['end'])) {
                    $blockedBy ??= $w;
                    $candidate = $w['end']->copy()->addDay();
                    $moved = true;
                }
            }
        } while ($moved);

        if ($blockedBy) {
            return [
                'available' => false,
                'reason_code' => 'booked',
                'reason' => 'محجوز لعروس أخرى من ' . $blockedBy['start']->toDateString() . ' إلى ' . $blockedBy['end']->toDateString(),
                'available_from' => $candidate->toDateString(),
            ];
        }

        return ['available' => true, 'reason_code' => null, 'reason' => null, 'available_from' => null];
    }

    private static function weddingDateAvailability(string $weddingDate, array $weddingWindow, array $windows): array
    {
        $wedding = Carbon::parse($weddingDate)->startOfDay();
        $start = Carbon::parse($weddingWindow['pickup_date'])->startOfDay();
        $end = Carbon::parse($weddingWindow['return_date'])->startOfDay();
        $daysBefore = (int) $start->diffInDays($wedding);
        $daysAfter = (int) $wedding->diffInDays($end);

        $conflicts = [];
        foreach ($windows as $w) {
            if ($start->lte($w['end']) && $end->gte($w['start'])) {
                $conflicts[] = [
                    'client_name' => $w['client_name'],
                    'event_date' => $w['event_date'],
                    'from' => $w['start']->toDateString(),
                    'to' => $w['end']->toDateString(),
                ];
            }
        }

        // Earliest later wedding date whose pickup → return window is free
        $availableFrom = null;
        if ($conflicts) {
            $candidate = $wedding->copy();
            do {
                $moved = false;
                $cStart = $candidate->copy()->subDays($daysBefore);
                $cEnd = $candidate->copy()->addDays($daysAfter);
                foreach ($windows as $w) {
                    if ($cStart->lte($w['end']) && $cEnd->gte($w['start'])) {
                        $candidate = $w['end']->copy()->addDays($daysBefore + 1);
                        $moved = true;
                        break;
                    }
                }
            } while ($moved);
            $availableFrom = $candidate->toDateString();
        }

        return [
            'date' => $weddingDate,
            'available' => empty($conflicts),
            'available_from' => $availableFrom,
            'conflicts' => $conflicts,
        ];
    }

    /** Earliest day on/after $from when none of the dresses is out with another bride */
    private static function suggestVisitDate(Carbon $from, array $windowsByDress): ?Carbon
    {
        $windows = array_merge(...array_values($windowsByDress ?: [[]]));
        if (collect($windows)->contains('overdue', true)) {
            return null;
        }

        $candidate = $from->copy();
        do {
            $moved = false;
            foreach ($windows as $w) {
                if ($candidate->between($w['start'], $w['end'])) {
                    $candidate = $w['end']->copy()->addDay();
                    $moved = true;
                }
            }
        } while ($moved);

        return $candidate;
    }
}
