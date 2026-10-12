<?php

namespace App\Console\Commands;

use App\Services\DataAuditService;
use Illuminate\Console\Command;

/**
 * Read-only data health check for the data the reports rely on (bookings, payments, visits, brides).
 * Prints each problem with how many rows have it and their ids; nothing is changed.
 * The same checks are on the admin "data health" page.
 */
class AuditData extends Command
{
    protected $signature = 'data:audit {--limit=30 : Max ids shown per check} {--show= : Check number to print in detail}';
    protected $description = 'Read-only check of bookings, payments, visits and brides for data that makes reports wrong';

    public function handle(DataAuditService $audit): int
    {
        $checks = $audit->summary();
        $limit = (int) $this->option('limit');

        $this->table(['#', 'الفحص', 'النوع', 'العدد', 'الأرقام (ids)'], array_map(function ($c) use ($limit) {
            $shown = $c['ids']->take($limit)->implode(',') . ($c['ids']->count() > $limit ? ' …' : '');

            return [$c['number'], $c['label'], $c['entity'], $c['ids']->count(), $shown ?: '—'];
        }, $checks));

        $problems = collect($checks)->filter(fn($c) => $c['ids']->isNotEmpty())->count();
        $this->info($problems ? "{$problems} فحص فيهم مشاكل من " . count($checks) : 'كل الفحوصات سليمة');

        if ($number = (int) $this->option('show')) {
            $check = collect($checks)->firstWhere('number', $number);
            if (!$check) {
                $this->error("مفيش فحص رقم {$number}");
                return self::FAILURE;
            }
            $this->line('');
            $this->info("#{$number} {$check['label']} ({$check['ids']->count()})");
            $rows = $audit->rows($check['entity'], $check['ids'])->map(fn($r) => (array) $r);
            if ($rows->isNotEmpty()) {
                $this->table(array_keys($rows->first()), $rows->all());
            }
        }

        return self::SUCCESS;
    }
}
