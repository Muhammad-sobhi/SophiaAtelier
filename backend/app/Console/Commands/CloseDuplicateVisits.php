<?php

namespace App\Console\Commands;

use App\Models\Notification;
use App\Models\Revenue;
use App\Models\Visit;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Brides with more than one open visit (repeated website requests). One visit is kept: her latest confirmed
 * (or arrived) one, otherwise her latest request. The other open visits are deleted; a trying fee paid on one
 * of them moves to the kept visit first.
 */
class CloseDuplicateVisits extends Command
{
    protected $signature = 'data:close-duplicate-visits {--apply : Delete the duplicate open visits (default is a dry run)}';
    protected $description = 'Keep one open visit per bride (the confirmed one when there is one) and delete the duplicates (dry run unless --apply)';

    public function handle(): int
    {
        $clientIds = Visit::whereIn('status', Visit::OPEN_STATUSES)
            ->groupBy('client_id')->havingRaw('COUNT(*) > 1')->pluck('client_id');

        $rows = [];
        $groups = [];
        foreach ($clientIds as $clientId) {
            $open = Visit::with('client:id,name,phone')->where('client_id', $clientId)
                ->whereIn('status', Visit::OPEN_STATUSES)->latest()->latest('id')->get();
            $keep = $open->first(fn($v) => $v->status !== 'pending') ?? $open->first();
            $remove = $open->reject(fn($v) => $v->id === $keep->id);
            $groups[] = [$keep, $remove->pluck('id')];

            foreach ($remove as $old) {
                $rows[] = [$keep->client?->name, $keep->client?->phone,
                    $keep->id, $keep->visit_date?->toDateString(), $keep->status,
                    $old->id, $old->visit_date?->toDateString(), $old->status,
                    (float) Revenue::where('visit_id', $old->id)->sum('amount')];
            }
        }

        if ($rows) {
            $this->table(['العروسة', 'الموبايل', 'الزيارة اللي هتفضل', 'تاريخها', 'حالتها', 'الزيارة اللي هتتمسح', 'تاريخها', 'حالتها', 'مدفوعات هتتنقل'], $rows);
        }
        $this->line(sprintf('عرايس عندها أكتر من زيارة مفتوحة: %d · زيارات هتتمسح: %d', $clientIds->count(), count($rows)));

        if (!$this->option('apply')) {
            $this->warn('Dry run: مفيش حاجة اتغيرت. شغّل الأمر بـ --apply للمسح.');
            return self::SUCCESS;
        }

        DB::transaction(function () use ($groups) {
            foreach ($groups as [$keep, $removeIds]) {
                Revenue::whereIn('visit_id', $removeIds)->update(['visit_id' => $keep->id]);
                Visit::whereIn('previous_visit_id', $removeIds)->where('id', '!=', $keep->id)->update(['previous_visit_id' => $keep->id]);
                Notification::where('related_type', 'visit')->whereIn('related_id', $removeIds)->delete();
                // Requested / tried dresses of the deleted visits cascade with them
                Visit::whereIn('id', $removeIds)->delete();
            }
        });
        $this->info('اتمسحت.');

        return self::SUCCESS;
    }
}
