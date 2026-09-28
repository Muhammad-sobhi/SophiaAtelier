<?php

namespace App\Console\Commands;

use App\Models\Revenue;
use Illuminate\Console\Command;

/**
 * Old pickup payments were saved with the day the form was submitted instead of the
 * pickup date staff chose; re-date them (and return settlements) to the chosen date.
 * Only moves a row back in time (chosen date earlier than the saved date), so data entered
 * ahead of time is left alone.
 */
class FixChosenPaymentDates extends Command
{
    protected $signature = 'revenues:fix-chosen-dates {--apply : Write the corrected dates (default is a dry run)}';
    protected $description = 'Re-date pickup payments and return settlements to the pickup/return date chosen by staff';

    /** revenue type => [notes prefix written by the stage action, booking column holding the chosen date, booking statuses] */
    private const RULES = [
        ['balance', 'دفعة استلام الفستان النهائية', 'pickup_scheduled_on', ['picked_up', 'out', 'returned']],
        ['insurance', 'تأمين الفستان المسترد', 'pickup_scheduled_on', ['picked_up', 'out', 'returned']],
        ['insurance_refund', 'استرداد تأمين', 'return_scheduled_on', ['returned']],
        ['damage_fee', 'خصم تلفيات', 'return_scheduled_on', ['returned']],
    ];

    public function handle()
    {
        $apply = (bool) $this->option('apply');
        $table = [];

        foreach (self::RULES as [$type, $notesPrefix, $dateColumn, $statuses]) {
            $rows = Revenue::with('booking.client:id,name')
                ->where('type', $type)
                ->where('notes', 'like', $notesPrefix . '%')
                ->whereHas('booking', fn ($q) => $q->whereIn('status', $statuses)->whereNotNull($dateColumn))
                ->get();

            foreach ($rows as $rev) {
                $chosen = $rev->booking->{$dateColumn}->toDateString();
                $current = $rev->payment_date?->toDateString();
                if (!$current || $chosen >= $current) {
                    continue;
                }

                $table[] = [$rev->id, $rev->booking->client->name ?? '-', $type, $rev->amount, $current, $chosen];
                if ($apply) {
                    $rev->update(['payment_date' => $chosen]);
                }
            }
        }

        if ($table) {
            $this->table(['revenue_id', 'bride', 'type', 'amount', 'saved_date', 'chosen_date'], $table);
        }
        $this->info(($apply ? 'Updated' : 'Would update') . ' ' . count($table) . ' revenue row(s).' . ($apply ? '' : ' Run with --apply to save.'));

        return self::SUCCESS;
    }
}
