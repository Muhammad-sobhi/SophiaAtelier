<?php

namespace App\Http\Controllers;

use Illuminate\Support\Str;

abstract class Controller
{
    public static function saveReceipt($request, $fieldName = 'receipt')
    {
        if ($request->hasFile($fieldName)) {
            return $request->file($fieldName)->store('payments', 'public');
        }

        if ($request->has($fieldName) && !empty($request->input($fieldName))) {
            $data = $request->input($fieldName);
            if (preg_match('/^data:image\/(\w+);base64,/', $data, $type)) {
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

                // Validate actual content MIME type (not just the user-supplied header)
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
        }
        return null;
    }
}

