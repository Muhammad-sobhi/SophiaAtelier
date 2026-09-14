<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreBookingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'client_id' => 'required|exists:clients,id',
            'dress_id' => 'required|exists:dresses,id',
            'dress_2_id' => 'nullable|exists:dresses,id',
            'dress_3_id' => 'nullable|exists:dresses,id',
            'booking_date' => 'required|date',
            'event_date' => 'required|date',
            'status' => 'nullable|in:pending,confirmed,picked_up,returned,cancelled',
            'total_amount' => 'required|numeric|min:0',
            'deposit_amount' => 'nullable|numeric|min:0',
            'insurance_amount' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
            'sales_name' => 'nullable|string|max:255',
            'payment_method' => 'nullable|string',
            'is_override' => 'nullable|boolean',
            'force_override' => 'nullable|boolean',
            'receipt' => 'nullable',
            'receipt_image' => 'nullable',
        ];
    }
}
