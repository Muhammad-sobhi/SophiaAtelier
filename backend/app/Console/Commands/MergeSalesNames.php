<?php

namespace App\Console\Commands;

use App\Services\SalesNameResolver;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Rewrites sales names saved with another spelling (e.g. "لمياء", "Amany") to the employee name
 * from the employees page, using each employee's sales_aliases. Names that match no employee are listed
 * so they can be added as aliases first.
 */
class MergeSalesNames extends Command
{
    protected $signature = 'data:merge-sales-names {--apply : Save the changes (default is a dry run)}';
    protected $description = 'Unify sales names in bookings, fittings and visits to the employee names (dry run unless --apply)';

    public function handle(SalesNameResolver $sales): int
    {
        $merge = [];   // [table, column, current name, employee name, ids]
        $unknown = [];
        foreach (SalesNameResolver::COLUMNS as $table => $columns) {
            foreach ($columns as $column) {
                // Grouped in PHP, not SQL, so "Amany" and "amany" stay separate whatever the column collation
                $rows = DB::table($table)->whereNotNull($column)->where($column, '!=', '')->pluck($column, 'id');
                foreach ($rows->groupBy(fn($name) => $name, true) as $name => $group) {
                    $employee = $sales->resolve($name);
                    if ($employee === null) {
                        $unknown[$name] = ($unknown[$name] ?? 0) + $group->count();
                    } elseif ($employee !== $name) {
                        $merge[] = [$table, $column, $name, $employee, $group->keys()->all()];
                    }
                }
            }
        }

        if ($merge) {
            $this->info('أسماء هتتوحد على اسم الموظف:');
            $this->table(['الجدول', 'العمود', 'الاسم الحالي', 'اسم الموظف', 'عدد السجلات'],
                array_map(fn($m) => [$m[0], $m[1], $m[2], $m[3], count($m[4])], $merge));
        }
        if ($unknown) {
            arsort($unknown);
            $this->warn('أسماء مش مطابقة لأي موظف (ضيفيها كاسم بديل في صفحة الموظفين ثم شغّلي الأمر تاني):');
            $this->table(['الاسم', 'عدد السجلات'], array_map(null, array_keys($unknown), $unknown));
        }

        $this->line(sprintf('هتتوحد: %d سجل · غير معروف: %d سجل', array_sum(array_map(fn($m) => count($m[4]), $merge)), array_sum($unknown)));
        if (!$this->option('apply')) {
            $this->warn('Dry run: مفيش حاجة اتغيرت. شغّل الأمر بـ --apply للحفظ.');
            return self::SUCCESS;
        }

        DB::transaction(function () use ($merge) {
            foreach ($merge as [$table, $column, , $to, $ids]) {
                foreach (array_chunk($ids, 500) as $chunk) {
                    DB::table($table)->whereIn('id', $chunk)->update([$column => $to]);
                }
            }
        });
        $this->info('اتحفظ.');

        return self::SUCCESS;
    }
}
