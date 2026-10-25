<?php

namespace App\Console\Commands;

use App\Services\DuePaymentReminders;
use Illuminate\Console\Command;

class DressPaymentReminders extends Command
{
    protected $signature = 'dress-payments:remind';
    protected $description = 'Notify finance staff about dress purchase payments due tomorrow, today or overdue';

    public function handle(DuePaymentReminders $reminders)
    {
        $this->info('Created ' . $reminders->generate() . ' payment reminders.');
    }
}
