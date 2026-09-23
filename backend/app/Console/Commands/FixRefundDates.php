<?php

namespace App\Console\Commands;

use App\Models\ActivityLog;
use App\Models\Revenue;
use Illuminate\Console\Command;

class FixRefundDates extends Command
{
    protected $signature = 'revenues:fix-refund-dates {--apply : Write the corrected dates (default is a dry run)}';
    protected $description = 'Re-date insurance refunds / damage fees to the day the dress return was first recorded';

    public function handle()
    {
        $apply = (bool) $this->option('apply');
        $rows = Revenue::with('booking.client')
            ->whereIn('type', ['insurance_refund', 'damage_fee'])
            ->orderBy('id')
            ->get();

        $fixed = 0;
        $table = [];

        foreach ($rows as $rev) {
            $booking = $rev->booking;
            if (!$booking) {
                continue;
            }

            // First "mark_returned" press for this bride after the booking was created
            $log = ActivityLog::where('entity_type', 'Client')
                ->where('entity_id', $booking->client_id)
                ->where('summary->action_key', 'mark_returned')
                ->where('created_at', '>=', $booking->created_at)
                ->orderBy('created_at')
                ->first();

            if (!$log) {
                continue;
            }

            $actual = $log->created_at->copy()->timezone(config('app.timezone'))->toDateString();
            $current = $rev->payment_date ? $rev->payment_date->toDateString() : null;
            if ($current === $actual) {
                continue;
            }

            $table[] = [$rev->id, $booking->client->name ?? '-', $rev->type, $rev->amount, $current, $actual];
            if ($apply) {
                $rev->update(['payment_date' => $actual]);
            }
            $fixed++;
        }

        if ($table) {
            $this->table(['revenue_id', 'bride', 'type', 'amount', 'current_date', 'actual_date'], $table);
        }

        // Several refund rows on one booking = the return was saved more than once (review manually)
        $duplicates = $rows->where('type', 'insurance_refund')->groupBy('booking_id')->filter(fn ($g) => $g->count() > 1);
        foreach ($duplicates as $bookingId => $group) {
            $this->warn("Booking #{$bookingId} has {$group->count()} insurance refund rows: ids " . $group->pluck('id')->implode(', '));
        }

        $this->info(($apply ? 'Updated' : 'Would update') . " {$fixed} revenue row(s)." . ($apply ? '' : ' Run with --apply to save.'));

        return self::SUCCESS;
    }
}
