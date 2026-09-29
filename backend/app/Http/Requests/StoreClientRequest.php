<?php

namespace App\Http\Requests;

use App\Rules\ArabMobilePhone;
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
            'name' => 'required|string|max:255',
            // The bride registering on the website must give a valid mobile; staff only get a warning in the dashboard
            'phone' => $this->is('api/public/*')
                ? ['required', 'string', 'max:50', new ArabMobilePhone()]
                : 'nullable|string|max:50',
            'phone2' => 'nullable|string|max:50',
            'email' => 'nullable|email',
            'address' => 'nullable|string',
            'city' => 'nullable|string|max:100',
            'source' => 'nullable|string|max:100',
            'wedding_date' => 'nullable|date',
            'notes' => 'nullable|string',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:5120',
            'dress_id' => 'nullable|integer|exists:dresses,id',
            'dress_2_id' => 'nullable|integer|exists:dresses,id',
            'dress_3_id' => 'nullable|integer|exists:dresses,id',
            'trying_fee' => 'nullable|numeric|min:0',
            'pickup_scheduled_on' => 'nullable|date',
            'return_scheduled_on' => 'nullable|date',
            'visit_date' => 'nullable|date',
            'visit_time' => 'nullable|string|max:50',
            'sales_name' => 'nullable|string|max:100',
            'tried_dresses' => 'nullable|array',
            'tried_dresses.*' => 'exists:dresses,id',
            'booked_dresses' => 'nullable|array',
            'booked_dresses.*' => 'exists:dresses,id',
        ];
    }
}
