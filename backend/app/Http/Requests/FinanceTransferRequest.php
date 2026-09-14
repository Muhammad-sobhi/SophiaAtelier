<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class FinanceTransferRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'from_method' => 'required|string|max:100',
            'to_method' => 'required|string|max:100|different:from_method',
            'amount' => 'required|numeric|min:0.01',
            'date' => 'required|date',
            'notes' => 'nullable|string|max:1000',
            'receipt' => 'nullable',
            'receipt_image' => 'nullable',
        ];
    }
}
