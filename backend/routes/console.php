<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote')->hourly();

// Automatically prune activity logs older than 6 months (180 days) every day at midnight
Schedule::command('activity-logs:prune --days=180')->dailyAt('00:00');

