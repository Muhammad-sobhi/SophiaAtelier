<?php

namespace App\Console\Commands;

use App\Models\Booking;
use App\Models\Client;
use Illuminate\Console\Command;

class FixScheduledDates extends Command
{
    protected $signature = 'bookings:fix-scheduled-dates {--apply : Write the corrected dates (default is a dry run)}';
    protected $description = 'Sync brides\' wedding dates with their latest booking and repair pickup/return dates saved with the old off-by-one default';

    public function handle()
    {
        $apply = (bool) $this->option('apply');

        // 1. Stored wedding date that no longer matches the latest booking's event date
        $weddingRows = [];
        $clients = Client::whereNotNull('wedding_date')->with('bookings')->orderBy('id')->get();
        foreach ($clients as $client) {
            $booking = $client->bookings->sortByDesc('id')->first();
            $eventDate = $booking && $booking->event_date ? $booking->event_date->toDateString() : null;
            if (!$eventDate || $client->wedding_date === $eventDate) {
                continue;
            }
            $weddingRows[] = [$client->id, $client->name, $client->wedding_date, $eventDate];
            if ($apply) {
                $client->update(['wedding_date' => $eventDate]);
            }
        }

        // 2. Pickup/return dates equal to what the old dashboard default produced in Egypt's timezone
        //    (return = event day, pickup = one day too early). Manually edited dates don't match and are kept.
        $scheduleRows = [];
        $bookings = Booking::with('client')->whereNotNull('event_date')->orderBy('id')->get();
        foreach ($bookings as $booking) {
            $event = $booking->event_date->copy();
            $correct = Booking::calculateScheduledDates($event->toDateString(), $booking->client->city ?? null);
            $buggyPickup = \Carbon\Carbon::parse($correct['pickup_date'])->subDay()->toDateString();
            $buggyReturn = $event->toDateString();

            $pickup = $booking->pickup_scheduled_on ? $booking->pickup_scheduled_on->toDateString() : null;
            $return = $booking->return_scheduled_on ? $booking->return_scheduled_on->toDateString() : null;

            $updates = [];
            if ($pickup === $buggyPickup) {
                $updates['pickup_scheduled_on'] = $correct['pickup_date'];
            }
            if ($return === $buggyReturn) {
                $updates['return_scheduled_on'] = $correct['return_date'];
            }
            if (!$updates) {
                continue;
            }

            $scheduleRows[] = [
                $booking->id,
                $booking->client->name ?? '-',
                $booking->status,
                $event->toDateString(),
                $pickup . (isset($updates['pickup_scheduled_on']) ? ' → ' . $updates['pickup_scheduled_on'] : ''),
                $return . (isset($updates['return_scheduled_on']) ? ' → ' . $updates['return_scheduled_on'] : ''),
            ];
            if ($apply) {
                $booking->update($updates);
            }
        }

        if ($weddingRows) {
            $this->table(['client_id', 'bride', 'wedding_date', 'booking_event_date'], $weddingRows);
        }
        if ($scheduleRows) {
            $this->table(['booking_id', 'bride', 'status', 'event_date', 'pickup', 'return'], $scheduleRows);
        }

        $verb = $apply ? 'Updated' : 'Would update';
        $this->info("{$verb} " . count($weddingRows) . ' wedding date(s) and ' . count($scheduleRows) . ' booking schedule(s).' . ($apply ? '' : ' Run with --apply to save.'));

        return self::SUCCESS;
    }
}
