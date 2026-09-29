<?php

namespace App\Rules;

use App\Services\PhoneNumberService;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/** Mobile number of one of the 22 Arab League countries (local Egyptian or with country code) */
class ArabMobilePhone implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (!is_string($value) || !PhoneNumberService::isValidMobile($value)) {
            $fail('رقم الموبايل غير صحيح. تأكدي من الرقم واختيار الدولة.');
        }
    }
}
