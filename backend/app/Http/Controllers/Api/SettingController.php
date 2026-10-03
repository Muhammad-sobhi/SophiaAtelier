<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Services\ActivityLogger;
use App\Services\PhoneNumberService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class SettingController extends Controller
{
    public function publicIndex(): JsonResponse
    {
        return response()->json(Setting::many(Setting::PUBLIC_KEYS));
    }

    public function index(): JsonResponse
    {
        return response()->json(Setting::many(['whatsapp_number']));
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'whatsapp_number' => 'required|string|max:30',
        ]);

        $number = PhoneNumberService::normalizeMobile($validated['whatsapp_number']);
        if (!$number) {
            throw ValidationException::withMessages([
                'whatsapp_number' => 'رقم الواتساب غير صحيح، يجب أن يكون رقم موبايل صالح (مثال: 01012345678)',
            ]);
        }

        $old = Setting::get('whatsapp_number');
        Setting::put('whatsapp_number', $number);

        if ($old !== $number) {
            ActivityLogger::log('تعديل رقم واتساب النظام', 'Setting', null, ['من' => $old, 'إلى' => $number]);
        }

        return response()->json(Setting::many(['whatsapp_number']));
    }
}
