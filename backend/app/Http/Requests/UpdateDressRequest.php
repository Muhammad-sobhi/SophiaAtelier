<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateDressRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $dressId = $this->route('dress')->id ?? $this->route('dress');

        return [
            'code' => ['nullable', 'string', 'max:50', Rule::unique('dresses', 'code')->whereNull('deleted_at')->ignore($dressId)],
            'name' => 'sometimes|required|string|max:255',
            'name_ar' => 'nullable|string|max:255',
            'category_id' => 'sometimes|required|exists:categories,id',
            'collection_id' => 'nullable|exists:collections,id',
            'designer_id' => 'sometimes|required|exists:designers,id',
            'description' => 'nullable|string',
            'description_ar' => 'nullable|string',
            'purchase_price' => 'nullable|numeric|min:0',
            'purchase_date' => 'nullable|date',
            'rental_price' => 'nullable|numeric|min:0',
            'trying_fee' => 'nullable|numeric|min:0',
            'status' => 'nullable|in:available,out,maintenance,cleaning',
            'size' => 'nullable|string|max:50',
            'weight_from' => 'nullable|integer|min:0',
            'weight_to' => 'nullable|integer|min:0',
            'color' => 'nullable|string|max:50',
            'color_ar' => 'nullable|string|max:50',
            'fabric' => 'nullable|string|max:100',
            'fabric_ar' => 'nullable|string|max:100',
            'notes' => 'nullable|string',
            'accessories' => 'nullable|array',
            'new_collection' => 'nullable|boolean',
            'is_website_visible' => 'nullable|boolean',
            'is_best_seller' => 'nullable|boolean',
            'best_seller_sort' => 'nullable|integer',
        ];
    }
}
