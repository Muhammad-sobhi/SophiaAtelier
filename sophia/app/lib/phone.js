import { getCountryCallingCode, parsePhoneNumberFromString } from 'libphonenumber-js/mobile';

// Bride phones: mobile numbers of the 22 Arab League countries (same rules as the backend PhoneNumberService)
export const ARAB_COUNTRIES = [
  { code: 'EG', ar: 'مصر', en: 'Egypt' },
  { code: 'SA', ar: 'السعودية', en: 'Saudi Arabia' },
  { code: 'AE', ar: 'الإمارات', en: 'UAE' },
  { code: 'KW', ar: 'الكويت', en: 'Kuwait' },
  { code: 'QA', ar: 'قطر', en: 'Qatar' },
  { code: 'BH', ar: 'البحرين', en: 'Bahrain' },
  { code: 'OM', ar: 'عُمان', en: 'Oman' },
  { code: 'JO', ar: 'الأردن', en: 'Jordan' },
  { code: 'LB', ar: 'لبنان', en: 'Lebanon' },
  { code: 'IQ', ar: 'العراق', en: 'Iraq' },
  { code: 'SY', ar: 'سوريا', en: 'Syria' },
  { code: 'PS', ar: 'فلسطين', en: 'Palestine' },
  { code: 'YE', ar: 'اليمن', en: 'Yemen' },
  { code: 'LY', ar: 'ليبيا', en: 'Libya' },
  { code: 'TN', ar: 'تونس', en: 'Tunisia' },
  { code: 'DZ', ar: 'الجزائر', en: 'Algeria' },
  { code: 'MA', ar: 'المغرب', en: 'Morocco' },
  { code: 'SD', ar: 'السودان', en: 'Sudan' },
  { code: 'SO', ar: 'الصومال', en: 'Somalia' },
  { code: 'DJ', ar: 'جيبوتي', en: 'Djibouti' },
  { code: 'KM', ar: 'جزر القمر', en: 'Comoros' },
  { code: 'MR', ar: 'موريتانيا', en: 'Mauritania' },
].map((c) => ({ ...c, dial: `+${getCountryCallingCode(c.code)}` }));

const ARAB_CODES = ARAB_COUNTRIES.map((c) => c.code);

/**
 * E.164 (+966501234567) when the number is a valid mobile of an Arab country, otherwise null.
 * A local number (0501234567) is read in the selected country; a number with "+" / "00" keeps its own code.
 */
export function normalizeMobile(raw, country = 'EG') {
  const input = String(raw || '')
    .trim()
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[^\d+]/g, '')
    .replace(/^00/, '+');
  if (!input) return null;
  const parsed = parsePhoneNumberFromString(input, country);
  return parsed?.isValid() && ARAB_CODES.includes(parsed.country) ? parsed.number : null;
}
