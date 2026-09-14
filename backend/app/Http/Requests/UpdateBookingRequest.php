<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateBookingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'client_id' => 'sometimes|required|exists:clients,id',
            'dress_id' => 'sometimes|required|exists:dresses,id',
            'dress_2_id' => 'nullable|exists:dresses,id',
            'dress_3_id' => 'nullable|exists:dresses,id',
            'booking_date' => 'sometimes|required|date',
            'event_date' => 'sometimes|required|date',
            'status' => 'nullable|in:pending,confirmed,picked_up,returned,cancelled',
            'total_amount' => 'sometimes|required|numeric|min:0',
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
