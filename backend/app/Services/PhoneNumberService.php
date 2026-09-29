<?php

namespace App\Services;

use libphonenumber\NumberParseException;
use libphonenumber\PhoneNumberFormat;
use libphonenumber\PhoneNumberType;
use libphonenumber\PhoneNumberUtil;

/**
 * Bride phone numbers: mobile numbers of the 22 Arab League countries, stored in E.164 (+201012345678).
 * Numbers without a country code are read as Egyptian.
 */
class PhoneNumberService
{
    public const DEFAULT_COUNTRY = 'EG';

    public const ARAB_COUNTRIES = [
        'EG', 'SA', 'AE', 'KW', 'QA', 'BH', 'OM', 'JO', 'LB', 'IQ', 'SY',
        'PS', 'YE', 'LY', 'TN', 'DZ', 'MA', 'SD', 'SO', 'DJ', 'KM', 'MR',
    ];

    /** E.164 when the number is a valid Arab mobile number, otherwise null */
    public static function normalizeMobile(?string $raw): ?string
    {
        $input = self::clean($raw);
        if ($input === '') {
            return null;
        }

        // Local Egyptian number first; then the same digits as a country code without "+" (966501234567)
        $candidates = str_starts_with($input, '+') ? [$input] : [$input, '+' . $input];
        foreach ($candidates as $candidate) {
            if ($e164 = self::parseMobile($candidate)) {
                return $e164;
            }
        }

        return null;
    }

    private static function parseMobile(string $input): ?string
    {
        $util = PhoneNumberUtil::getInstance();
        try {
            $number = $util->parse($input, self::DEFAULT_COUNTRY);
        } catch (NumberParseException) {
            return null;
        }

        $type = $util->getNumberType($number);
        $isMobile = in_array($type, [PhoneNumberType::MOBILE, PhoneNumberType::FIXED_LINE_OR_MOBILE], true);

        if (!$util->isValidNumber($number) || !$isMobile
            || !in_array($util->getRegionCodeForNumber($number), self::ARAB_COUNTRIES, true)) {
            return null;
        }

        return $util->format($number, PhoneNumberFormat::E164);
    }

    public static function isValidMobile(?string $raw): bool
    {
        return self::normalizeMobile($raw) !== null;
    }

    /** What to save: E.164 when valid, otherwise what was typed (staff may save numbers the check rejects) */
    public static function forStorage(?string $raw): ?string
    {
        if ($raw === null || trim($raw) === '') {
            return $raw;
        }

        return self::normalizeMobile($raw) ?? trim($raw);
    }

    /** Local form of a valid number (+201012345678 → 01012345678), to match rows saved before normalization */
    public static function localForm(?string $raw): ?string
    {
        $e164 = self::normalizeMobile($raw);
        if (!$e164) {
            return null;
        }
        $util = PhoneNumberUtil::getInstance();

        return preg_replace('/\D/', '', $util->format($util->parse($e164), PhoneNumberFormat::NATIONAL));
    }

    /** Comparison key for matching the same number stored in different formats */
    public static function matchKey(?string $raw): string
    {
        return self::normalizeMobile($raw) ?? preg_replace('/\D/', '', self::clean($raw));
    }

    /** Arabic-Indic digits → ASCII, "00" international prefix → "+" */
    private static function clean(?string $raw): string
    {
        $value = strtr(trim((string) $raw), [
            '٠' => '0', '١' => '1', '٢' => '2', '٣' => '3', '٤' => '4',
            '٥' => '5', '٦' => '6', '٧' => '7', '٨' => '8', '٩' => '9',
            '۰' => '0', '۱' => '1', '۲' => '2', '۳' => '3', '۴' => '4',
            '۵' => '5', '۶' => '6', '۷' => '7', '۸' => '8', '۹' => '9',
        ]);

        return preg_replace('/^00/', '+', preg_replace('/[^\d+]/', '', $value));
    }
}
