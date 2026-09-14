<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateEmployeeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => 'sometimes|required|string|max:255',
            'phone' => 'nullable|string|max:50',
            'email' => 'nullable|email',
            'position' => 'nullable|string|max:255',
            'salary' => 'nullable|numeric|min:0',
            'pay_cycle' => 'nullable|in:monthly,weekly,custom',
            'pay_cycle_days' => 'nullable|integer|min:1|max:365',
            'hire_date' => 'nullable|date',
            'notes' => 'nullable|string',
            'password' => 'nullable|string|min:6',
            'address' => 'nullable|string',
            'id_number' => 'nullable|string',
            'id_image' => 'nullable|string',
            'permissions' => 'nullable|array',
        ];
    }
}
