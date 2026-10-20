<?php

namespace App\Console\Commands;

use App\Models\Visit;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Brides with more than one open visit (repeated website requests): the dashboard only works on the latest
 * one, so the older ones stayed on the calendar. They are declined, the latest one is kept.
 */
class CloseDuplicateVisits extends Command
{
    protected $signature = 'data:close-duplicate-visits {--apply : Decline the older open visits (default is a dry run)}';
    protected $description = 'Decline older open visits of brides that have more than one (dry run unless --apply)';

    public function handle(): int
    {
        $clientIds = Visit::whereIn('status', Visit::OPEN_STATUSES)
            ->groupBy('client_id')->havingRaw('COUNT(*) > 1')->pluck('client_id');

        $rows = [];
        $declineIds = [];
        foreach ($clientIds as $clientId) {
            // Same order the dashboard uses to pick the visit it works on
            $open = Visit::with('client:id,name,phone')->where('client_id', $clientId)
                ->whereIn('status', Visit::OPEN_STATUSES)->latest()->latest('id')->get();
            $keep = $open->first();
            foreach ($open->slice(1) as $old) {
                $declineIds[] = $old->id;
                $rows[] = [$keep->client?->name, $keep->client?->phone, $keep->id, $keep->visit_date?->toDateString(),
                    $old->id, $old->visit_date?->toDateString(), $old->status];
            }
        }

        if ($rows) {
            $this->table(['العروسة', 'الموبايل', 'الزيارة اللي هتفضل', 'تاريخها', 'الزيارة اللي هتترفض', 'تاريخها', 'حالتها'], $rows);
        }
        $this->line(sprintf('عرايس عندها أكتر من زيارة مفتوحة: %d · زيارات هتترفض: %d', $clientIds->count(), count($declineIds)));

        if (!$this->option('apply')) {
            $this->warn('Dry run: مفيش حاجة اتغيرت. شغّل الأمر بـ --apply للتنفيذ.');
            return self::SUCCESS;
        }

        DB::transaction(fn() => Visit::whereIn('id', $declineIds)->update(['status' => 'declined']));
        $this->info('اتنفذ.');

        return self::SUCCESS;
    }
}
