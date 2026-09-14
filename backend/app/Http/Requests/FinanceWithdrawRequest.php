<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class FinanceWithdrawRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'payment_method' => 'required|string|max:100',
            'amount' => 'required|numeric|min:0.01',
            'date' => 'required|date',
            'notes' => 'nullable|string|max:1000',
            'receipt' => 'nullable',
            'receipt_image' => 'nullable',
        ];
    }
}
