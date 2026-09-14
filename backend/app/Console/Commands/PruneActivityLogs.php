<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\ActivityLog;
use Carbon\Carbon;

class PruneActivityLogs extends Command
{
    protected $signature = 'activity-logs:prune {--days=180 : The number of days to keep logs}';
    protected $description = 'Prune activity logs older than a specific number of days';

    public function handle()
    {
        $days = $this->option('days');
        $date = Carbon::now()->subDays($days);

        $count = ActivityLog::where('created_at', '<', $date)->delete();

        $this->info("Pruned {$count} activity logs older than {$days} days.");
    }
}
