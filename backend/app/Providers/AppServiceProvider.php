<?php

namespace App\Providers;

use Illuminate\Support\Carbon;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Carbon::serializeUsing(function (\DateTimeInterface $date) {
            if ($date->format('H:i:s') === '00:00:00') {
                return $date->format('Y-m-d');
            }
            return $date->format('Y-m-d H:i');
        });

        // Register Observers for Cache Invalidation
        \App\Models\Booking::observe(\App\Observers\DashboardStatsObserver::class);
        \App\Models\Fitting::observe(\App\Observers\DashboardStatsObserver::class);
        \App\Models\Visit::observe(\App\Observers\DashboardStatsObserver::class);
        \App\Models\Client::observe(\App\Observers\DashboardStatsObserver::class);
        \App\Models\Dress::observe(\App\Observers\DashboardStatsObserver::class);
        \App\Models\Revenue::observe(\App\Observers\DashboardStatsObserver::class);
        \App\Models\Expense::observe(\App\Observers\DashboardStatsObserver::class);
    }
}
