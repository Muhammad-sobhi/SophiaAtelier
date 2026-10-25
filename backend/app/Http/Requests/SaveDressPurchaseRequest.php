<?php

namespace App\Http\Requests;

use App\Models\DressPurchase;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SaveDressPurchaseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'dress_id' => 'required|integer|exists:dresses,id',
            'supplier_id' => 'nullable|integer|exists:suppliers,id',
            'type' => ['required', Rule::in(array_keys(DressPurchase::TYPES))],
            'partner_name' => 'nullable|required_if:type,shared|string|max:255',
            'dress_total_price' => 'nullable|required_if:type,shared|numeric|min:0.01|max:99999999',
            'amount' => 'required|numeric|min:0.01|max:99999999',
            'prior_paid' => 'nullable|numeric|min:0|max:99999999',
            'purchase_date' => 'required|date',
            'notes' => 'nullable|string|max:2000',
            'receipt' => 'nullable|string',
            'remove_receipt' => 'nullable|boolean',
            'payments' => 'present|array|max:60',
            'payments.*.id' => 'nullable|integer',
            'payments.*.amount' => 'required|numeric|min:0.01|max:99999999',
            'payments.*.due_date' => 'required|date',
            'payments.*.paid' => 'required|boolean',
            'payments.*.paid_date' => 'nullable|required_if_accepted:payments.*.paid|date',
            'payments.*.payment_method' => 'nullable|required_if_accepted:payments.*.paid|string|max:50',
            'payments.*.receipt' => 'nullable|string',
            'payments.*.remove_receipt' => 'nullable|boolean',
            'payments.*.notes' => 'nullable|string|max:1000',
        ];
    }

    public function attributes(): array
    {
        return [
            'dress_id' => 'الفستان',
            'partner_name' => 'اسم العروسة المشاركة',
            'dress_total_price' => 'إجمالي سعر الفستان',
            'amount' => 'المبلغ المطلوب منا',
            'purchase_date' => 'تاريخ الشراء',
            'payments.*.amount' => 'مبلغ الدفعة',
            'payments.*.due_date' => 'تاريخ استحقاق الدفعة',
            'payments.*.paid_date' => 'تاريخ الدفع',
            'payments.*.payment_method' => 'طريقة الدفع',
        ];
    }
}
