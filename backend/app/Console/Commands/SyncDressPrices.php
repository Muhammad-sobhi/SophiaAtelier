<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Dress;
use App\Models\Expense;

class SyncDressPrices extends Command
{
    protected $signature = 'app:sync-dress-prices';
    protected $description = 'Sync purchase prices between expenses table and dresses table';

    public function handle()
    {
        $this->info('Starting purchase price synchronization...');

        $expenses = Expense::where('category', 'purchase')
            ->orWhere('description', 'LIKE', 'شراء فستان%')
            ->get();

        $count = 0;
        foreach ($expenses as $expense) {
            $parts = explode('شراء فستان:', $expense->description);
            $dressName = trim(end($parts));
            if (!$dressName) continue;

            $dress = Dress::where('name', 'LIKE', '%' . $dressName . '%')->first();
            if ($dress) {
                if ($dress->purchase_price != $expense->amount) {
                    $this->info("Updating dress '{$dress->name}' purchase price from {$dress->purchase_price} to {$expense->amount}");
                    $dress->update(['purchase_price' => $expense->amount]);
                    $count++;
                }
            }
        }

        $this->info("Done! Synced {$count} dress purchase prices.");
        return 0;
    }
}
