<?php

namespace App\Console\Commands;

use App\Services\ImageOptimizer;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class OptimizeStoredImages extends Command
{
    /** Upload folders whose photos the website and dashboard show (receipts, bills and fittings are left as they are) */
    private const FOLDERS = ['dresses', 'collections', 'client-gallery', 'categories', 'clients'];

    protected $signature = 'images:optimize {--apply : Rewrite the files (default is a dry run)} {--no-backup : Do not keep a copy of the originals}';
    protected $description = 'Shrink already uploaded photos (max ' . ImageOptimizer::MAX_SIDE . 'px, re-encoded in place: same path and format), keeping a copy of the originals on the local disk (image-originals/)';

    public function handle()
    {
        $apply = (bool) $this->option('apply');
        $backup = !$this->option('no-backup');
        $base = rtrim(Storage::disk('public')->path(''), '/');
        $rows = [];
        $before = 0;
        $after = 0;

        foreach (self::FOLDERS as $folder) {
            if (!is_dir("$base/$folder")) {
                continue;
            }
            $files = new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator("$base/$folder", \FilesystemIterator::SKIP_DOTS));
            foreach ($files as $file) {
                $fullPath = $file->getPathname();
                $path = substr($fullPath, strlen($base) + 1);
                $result = ImageOptimizer::encode($fullPath);
                if (!$result) {
                    continue;
                }

                [$size, $data] = $result;
                if ($apply) {
                    if ($backup) {
                        $copy = Storage::disk('local')->path("image-originals/$path");
                        @mkdir(dirname($copy), 0755, true);
                        if (!is_file($copy) && !copy($fullPath, $copy)) {
                            $this->error("Could not back up $path, left as it is");
                            continue;
                        }
                    }
                    file_put_contents($fullPath, $data, LOCK_EX);
                    @chmod($fullPath, 0644);
                }

                $before += $size;
                $after += strlen($data);
                $rows[] = [$path, $this->kb($size), $this->kb(strlen($data))];
            }
        }

        if ($rows) {
            $this->table(['File', 'Before', 'After'], $rows);
        }
        $this->info(count($rows) . ' photo(s) ' . ($apply ? 'optimized' : 'to optimize') . ': ' . $this->kb($before) . ' -> ' . $this->kb($after));

        if ($apply && $backup && $rows) {
            $this->line('Originals kept in ' . Storage::disk('local')->path('image-originals'));
        }
        if (!$apply && $rows) {
            $this->line('Dry run. Run again with --apply to rewrite the files.');
        }

        return self::SUCCESS;
    }

    private function kb(int $bytes): string
    {
        return number_format($bytes / 1024) . ' KB';
    }
}
