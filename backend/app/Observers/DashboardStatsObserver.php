<?php

namespace App\Observers;

use Illuminate\Support\Facades\Cache;

class DashboardStatsObserver
{
    protected function clearCache()
    {
        Cache::flush(); // Flush cache since we don't know the exact key the user used
    }

    public function created($model)
    {
        $this->clearCache();
    }

    public function updated($model)
    {
        $this->clearCache();
    }

    public function deleted($model)
    {
        $this->clearCache();
    }

    public function restored($model)
    {
        $this->clearCache();
    }

    public function forceDeleted($model)
    {
        $this->clearCache();
    }
}
