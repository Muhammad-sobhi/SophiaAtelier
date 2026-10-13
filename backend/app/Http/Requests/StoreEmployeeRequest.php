<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreEmployeeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'phone' => 'nullable|string|max:50',
            // An existing login (e.g. the admin) must not be taken over by a new employee record,
            // since Employee::saved syncs name/password/role onto the user with the same email
            'email' => 'nullable|email|unique:employees,email|unique:users,email',
            'role' => 'nullable|string|max:255',
            'daily_rate' => 'nullable|numeric|min:0', // pay per day; cycle salary = daily_rate x cycle days
            'pay_type' => 'sometimes|in:daily,per_piece,both', // per_piece / both: paid for recorded pieces x piece_rate
            'piece_rate' => 'sometimes|numeric|min:0',
            'attendance_deductions' => 'sometimes|boolean',
            'pay_cycle' => 'nullable|in:monthly,weekly,custom',
            'pay_cycle_days' => 'nullable|integer|min:1|max:365',
            'hire_date' => 'nullable|date',
            'notes' => 'nullable|string',
            'password' => 'nullable|string|min:6',
            'address' => 'nullable|string',
            'id_number' => 'nullable|string',
            'id_image' => 'nullable|string',
            'id_image_back' => 'nullable|string',
            'permissions' => 'nullable|array',
            'permissions.*' => 'string|max:100',
            'sales_aliases' => 'nullable|array|max:20',
            'sales_aliases.*' => 'string|max:255',
        ];
    }
}
