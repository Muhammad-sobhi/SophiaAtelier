<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Client;

class RecomputeLegacyStages extends Command
{
    protected $signature = 'brides:recompute-legacy-stages';
    protected $description = 'Recompute stages for legacy brides based on scheduled dates';

    public function handle()
    {
        $clients = Client::where('journey_mode', 'legacy')->get();
        $this->info("Recomputing stages for {$clients->count()} legacy brides...");

        foreach ($clients as $client) {
            // By retrieving them, the StageComputer will compute the stage on the fly!
            // Wait, "current_stage" is dynamic via StageComputer, it's not a database column.
            // Oh right, `current_stage` is an attribute! We don't need to recompute anything in the DB 
            // unless we want to populate `pickup_scheduled_on` and `return_scheduled_on` from their notes?
            // The plan says: "Artisan brides:recompute-legacy-stages for existing imported rows."
            
            $booking = $client->bookings()->latest()->first();
            if ($booking && $booking->notes) {
                $notes = $booking->notes;
                
                if (preg_match('/(?:يوم|ميعاد)\s*الاستلام:\s*(\d{4}-\d{2}-\d{2})/u', $notes, $m)) {
                    $booking->pickup_scheduled_on = $m[1];
                }
                if (preg_match('/(?:يوم|ميعاد)\s*التسليم:\s*(\d{4}-\d{2}-\d{2})/u', $notes, $m)) {
                    $booking->return_scheduled_on = $m[1];
                }
                
                if ($booking->isDirty(['pickup_scheduled_on', 'return_scheduled_on'])) {
                    $booking->save();
                }
            }
        }

        $this->info('Done!');
    }
}

