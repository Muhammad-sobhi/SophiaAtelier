<?php

namespace App\Http\Controllers;

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
                
                $fileName = 'payments/' . uniqid() . '.' . $type;
                \Illuminate\Support\Facades\Storage::disk('public')->put($fileName, $data);
                return $fileName;
            }
        }
        return null;
    }
}
