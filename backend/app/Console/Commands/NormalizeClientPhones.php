<?php

namespace App\Console\Commands;

use App\Models\Client;
use App\Services\PhoneNumberService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class NormalizeClientPhones extends Command
{
    protected $signature = 'clients:normalize-phones {--apply : Save the international format (default is a dry run)}';
    protected $description = 'Convert brides\' valid mobile numbers to international format (+201012345678) and list the invalid ones for review';

    public function handle()
    {
        $apply = (bool) $this->option('apply');
        $converted = [];
        $invalid = [];

        Client::withTrashed()->orderBy('id')->select(['id', 'name', 'phone', 'phone2'])->chunkById(500, function ($clients) use ($apply, &$converted, &$invalid) {
            foreach ($clients as $client) {
                $updates = [];
                foreach (['phone', 'phone2'] as $field) {
                    // Raw column value: the model mutator only runs on writes
                    $stored = $client->getRawOriginal($field);
                    if ($stored === null || trim($stored) === '') {
                        continue;
                    }
                    $normalized = PhoneNumberService::normalizeMobile($stored);
                    if ($normalized === null) {
                        $invalid[] = [$client->id, $client->name, $field, $stored];
                    } elseif ($normalized !== $stored) {
                        $converted[] = [$client->id, $client->name, $field, $stored, $normalized];
                        $updates[$field] = $normalized;
                    }
                }
                // Direct update: keeps updated_at and skips observers/activity log for a format-only change
                if ($apply && $updates) {
                    DB::table('clients')->where('id', $client->id)->update($updates);
                }
            }
        });

        $this->info(count($converted) . ' number(s) ' . ($apply ? 'converted' : 'to convert') . ':');
        if ($converted) {
            $this->table(['ID', 'Bride', 'Field', 'Stored', 'International'], $converted);
        }

        $this->warn(count($invalid) . ' invalid number(s) left as they are (review in the dashboard):');
        if ($invalid) {
            $this->table(['ID', 'Bride', 'Field', 'Stored'], $invalid);
        }

        if (!$apply && $converted) {
            $this->line('Dry run. Run again with --apply to save.');
        }

        return self::SUCCESS;
    }
}
