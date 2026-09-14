<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreClientRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255', 'regex:/^[\pL\s\.\'\-]+$/u'],
            'phone' => ['nullable', 'string', 'max:50', 'regex:/^\+?[0-9\s\-\(\)]+$/'],
            'phone2' => ['nullable', 'string', 'max:50', 'regex:/^\+?[0-9\s\-\(\)]+$/'],
            'email' => 'nullable|email',
            'address' => 'nullable|string',
            'city' => 'nullable|string|max:100',
            'source' => 'nullable|in:instagram,website,referral,walkin,whatsapp',
            'wedding_date' => 'nullable|date',
            'notes' => 'nullable|string',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:5120',
        ];
    }
}
