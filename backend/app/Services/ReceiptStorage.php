<?php

namespace App\Services;

use Illuminate\Support\Str;

/** Saves payment receipts (uploaded files or base64 images) on the public disk */
class ReceiptStorage
{
    public static function save($request, $fieldName = 'receipt')
    {
        if ($request->hasFile($fieldName)) {
            return self::storeReceiptFile($request->file($fieldName));
        }

        if ($request->has($fieldName) && !empty($request->input($fieldName))) {
            return self::saveData($request->input($fieldName));
        }

        return null;
    }

    public static function saveData($data)
    {
        if (empty($data)) {
            return null;
        }

        if ($data instanceof \Illuminate\Http\UploadedFile) {
            return self::storeReceiptFile($data);
        }

        if (is_string($data) && preg_match('/^data:image\/(\w+);base64,/', $data, $type)) {
            $data = substr($data, strpos($data, ',') + 1);
            $type = strtolower($type[1]); // jpg, png, etc

            if (!in_array($type, ['jpg', 'jpeg', 'gif', 'png', 'webp'])) {
                return null;
            }
            if (strlen($data) > 7 * 1024 * 1024) { // Max ~5MB decoded
                return null;
            }
            $data = base64_decode($data);
            if ($data === false) {
                return null;
            }

            // Validate actual content MIME type
            $finfo = new \finfo(FILEINFO_MIME_TYPE);
            $detectedMime = $finfo->buffer($data);
            $allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
            if (!in_array($detectedMime, $allowedMimes)) {
                return null;
            }

            $fileName = 'payments/' . Str::random(40) . '.' . $type;
            \Illuminate\Support\Facades\Storage::disk('public')->put($fileName, $data);
            return $fileName;
        }

        return null;
    }

    /**
     * Receipts land on the public disk: only real images (checked by content, not by name) are kept,
     * so an uploaded .html / .php can never be served from the API domain.
     */
    private static function storeReceiptFile(\Illuminate\Http\UploadedFile $file): ?string
    {
        $extensions = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/gif' => 'gif', 'image/webp' => 'webp', 'application/pdf' => 'pdf'];
        $mime = $file->isValid() ? $file->getMimeType() : null;

        if (!isset($extensions[$mime]) || $file->getSize() > 10 * 1024 * 1024) {
            return null;
        }

        return $file->storeAs('payments', Str::random(40) . '.' . $extensions[$mime], 'public');
    }
}
