<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Cache;

class CleanDatabaseKeepGuide extends Command
{
    protected $signature = 'db:clean-guide';
    protected $description = 'Clean all database tables keeping only 1 guide record per table (except users, employees, whatsapp_templates) and zero out financial fields';

    public function handle()
    {
        $this->info('Starting database cleanup (keeping guide records)...');

        DB::statement('SET FOREIGN_KEY_CHECKS=0;');

        // Tables to completely exclude from cleanup
        $preserveTables = [
            'migrations',
            'users',
            'employees',
            'whatsapp_templates',
            'personal_access_tokens',
            'cache',
            'cache_locks',
            'jobs',
            'job_batches',
            'failed_jobs'
        ];

        // Financial column names that should be reset to 0 in guide records
        $financeColumns = [
            'purchase_price',
            'rental_price',
            'trying_fee',
            'amount',
            'total',
            'paid',
            'remaining',
            'price',
            'cost',
            'salary',
            'bonus',
            'deduction'
        ];

        $tables = Schema::getTableListing();

        foreach ($tables as $table) {
            if (in_array($table, $preserveTables)) {
                $this->info("Skipping preserved table: {$table}");
                continue;
            }

            if (!Schema::hasTable($table)) continue;

            $count = DB::table($table)->count();
            if ($count === 0) {
                $this->line("Table {$table} is empty.");
                continue;
            }

            // Find the minimum ID or primary key record to keep as guide
            $firstRecord = DB::table($table)->orderBy('id', 'asc')->first();

            if ($firstRecord) {
                // Delete all rows except the first guide row
                DB::table($table)->where('id', '!=', $firstRecord->id)->delete();

                // Zero out financial fields in the remaining guide record
                $updateData = [];
                $columns = Schema::getColumnListing($table);
                foreach ($columns as $col) {
                    if (in_array($col, $financeColumns)) {
                        $updateData[$col] = 0;
                    }
                    if (in_array($col, ['image_path', 'image'])) {
                        $updateData[$col] = null;
                    }
                }

                if (!empty($updateData)) {
                    DB::table($table)->where('id', '=', $firstRecord->id)->update($updateData);
                }

                $this->info("Table {$table}: Cleaned. Kept 1 guide record (ID {$firstRecord->id}). Financial values set to 0.");
            }
        }

        DB::statement('SET FOREIGN_KEY_CHECKS=1;');
        Cache::flush();

        $this->info('Database cleanup completed successfully!');
        return 0;
    }
}
