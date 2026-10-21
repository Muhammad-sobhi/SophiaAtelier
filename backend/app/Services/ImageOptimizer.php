<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

/**
 * Shrinks photos stored on the public disk for the website: phone photos (often 3-8 MB)
 * are scaled down to MAX_SIDE and re-encoded in place. The path, name and format stay the
 * same, so stored references and URLs keep working. Videos, GIFs and other files are skipped.
 */
class ImageOptimizer
{
    public const MAX_SIDE = 1600;
    private const QUALITY = 82;
    private const MIN_SAVING = 0.1;

    /**
     * Optimize a file on the public disk (e.g. "dresses/abc.jpg").
     * Returns [bytes before, bytes after], or null when the file was left untouched.
     */
    public static function optimize(string $path): ?array
    {
        $fullPath = Storage::disk('public')->path(ltrim($path, '/'));
        $result = self::encode($fullPath);
        if (!$result) {
            return null;
        }

        [$before, $data] = $result;
        file_put_contents($fullPath, $data, LOCK_EX);
        @chmod($fullPath, 0644);

        return [$before, strlen($data)];
    }

    /**
     * Re-encode the image at $fullPath without writing it.
     * Returns [bytes before, new bytes], or null when it isn't a supported photo or wouldn't get at least
     * MIN_SAVING smaller (so an already optimized photo isn't re-encoded again and again).
     */
    public static function encode(string $fullPath): ?array
    {
        $info = is_file($fullPath) ? @getimagesize($fullPath) : false;
        if (!$info || !in_array($info[2], [IMAGETYPE_JPEG, IMAGETYPE_PNG, IMAGETYPE_WEBP], true)) {
            return null;
        }

        $bufferLevel = ob_get_level();
        try {
            $image = match ($info[2]) {
                IMAGETYPE_JPEG => @imagecreatefromjpeg($fullPath),
                IMAGETYPE_PNG => @imagecreatefrompng($fullPath),
                IMAGETYPE_WEBP => @imagecreatefromwebp($fullPath),
            };
            if (!$image) {
                return null;
            }

            // GD drops EXIF, so a phone photo's rotation is applied to the pixels first
            if ($info[2] === IMAGETYPE_JPEG) {
                $image = self::applyExifOrientation($image, $fullPath);
            }

            $width = imagesx($image);
            $height = imagesy($image);
            $scale = min(1, self::MAX_SIDE / max($width, $height));
            if ($scale < 1) {
                $resized = imagecreatetruecolor((int) round($width * $scale), (int) round($height * $scale));
                imagealphablending($resized, false);
                imagecopyresampled($resized, $image, 0, 0, 0, 0, imagesx($resized), imagesy($resized), $width, $height);
                $image = $resized;
            }

            ob_start();
            if ($info[2] === IMAGETYPE_JPEG) {
                imageinterlace($image, true);
                imagejpeg($image, null, self::QUALITY);
            } else {
                imagesavealpha($image, true);
                $info[2] === IMAGETYPE_PNG ? imagepng($image, null, 9) : imagewebp($image, null, self::QUALITY);
            }
            $data = ob_get_clean();
        } catch (\Throwable $e) {
            while (ob_get_level() > $bufferLevel) {
                ob_end_clean();
            }
            Log::warning('Image optimization skipped', ['file' => $fullPath, 'error' => $e->getMessage()]);
            return null;
        }

        $before = filesize($fullPath);

        return $data && strlen($data) <= $before * (1 - self::MIN_SAVING) ? [$before, $data] : null;
    }

    private static function applyExifOrientation(\GdImage $image, string $fullPath): \GdImage
    {
        $exif = function_exists('exif_read_data') ? @exif_read_data($fullPath) : false;
        $orientation = (int) ($exif['Orientation'] ?? 1);

        if (in_array($orientation, [2, 4, 5, 7], true)) {
            imageflip($image, IMG_FLIP_HORIZONTAL);
        }
        $angle = match ($orientation) {
            3, 4 => 180,
            5, 6 => -90,
            7, 8 => 90,
            default => 0,
        };
        return $angle !== 0 ? imagerotate($image, $angle, 0) : $image;
    }
}
