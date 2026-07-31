<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class SetupStorageDirectories extends Command
{
    protected $signature = 'storage:setup';
    protected $description = 'Create required storage directories and set proper permissions for file uploads';

    public function handle(): int
    {
        $directories = [
            storage_path('app/public/dresses'),
            storage_path('app/public/collections'),
            storage_path('app/public/categories'),
            storage_path('app/public/client-gallery'),
        ];

        foreach ($directories as $dir) {
            if (!is_dir($dir)) {
                mkdir($dir, 0755, true);
                $this->info("Created directory: {$dir}");
            } else {
                $this->info("Directory already exists: {$dir}");
            }

            // Ensure proper permissions
            @chmod($dir, 0755);
        }

        // Also ensure the parent directory has correct permissions
        $publicDir = storage_path('app/public');
        @chmod($publicDir, 0755);

        // Set permissions on all existing files
        foreach ($directories as $dir) {
            if (is_dir($dir)) {
                $files = glob($dir . '/*');
                foreach ($files as $file) {
                    if (is_file($file)) {
                        @chmod($file, 0644);
                    }
                }
                $fileCount = count($files);
                $this->info("Set permissions on {$fileCount} files in " . basename($dir));
            }
        }

        // Verify symlink
        $symlinkPath = public_path('storage');
        if (is_link($symlinkPath)) {
            $target = readlink($symlinkPath);
            $this->info("Storage symlink exists: {$symlinkPath} -> {$target}");
        } else {
            $this->warn("Storage symlink does NOT exist at: {$symlinkPath}");
            $this->warn("Run 'php artisan storage:link' to create it.");
        }

        $this->info('');
        $this->info('Storage setup complete!');

        return Command::SUCCESS;
    }
}
