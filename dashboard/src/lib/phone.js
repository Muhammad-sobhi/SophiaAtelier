import { parsePhoneNumberFromString } from 'libphonenumber-js/mobile';

// Bride phones: mobile numbers of the 22 Arab League countries (same rules as the backend PhoneNumberService)
export const ARAB_COUNTRIES = [
  'EG', 'SA', 'AE', 'KW', 'QA', 'BH', 'OM', 'JO', 'LB', 'IQ', 'SY',
  'PS', 'YE', 'LY', 'TN', 'DZ', 'MA', 'SD', 'SO', 'DJ', 'KM', 'MR',
];

// Arabic-Indic digits → ASCII, "00" international prefix → "+"
function clean(raw) {
  return String(raw || '')
    .trim()
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[^\d+]/g, '')
    .replace(/^00/, '+');
}

/** E.164 (+201012345678) when the number is a valid Arab mobile number, otherwise null. Local numbers are read as Egyptian. */
export function normalizeMobile(raw) {
  const input = clean(raw);
  if (!input) return null;
  const candidates = input.startsWith('+') ? [input] : [input, `+${input}`];
  for (const candidate of candidates) {
    const parsed = parsePhoneNumberFromString(candidate, 'EG');
    if (parsed?.isValid() && ARAB_COUNTRIES.includes(parsed.country)) return parsed.number;
  }
  return null;
}

/** Warning shown under a phone field; staff can still save the number */
export function getPhoneWarning(raw) {
  if (!String(raw || '').trim() || normalizeMobile(raw)) return null;
  return 'الرقم ده مش رقم موبايل صحيح. لو الرقم مش مصري اكتبه بكود الدولة (مثال: +966501234567).';
}

/** Search a stored phone (+201012345678) by what staff type (01012345678, 1012345, ...) */
export function phoneMatchesSearch(phone, query) {
  const needle = clean(query).replace(/\D/g, '').replace(/^0+/, '');
  if (!needle) return false;
  return clean(phone).includes(needle);
}
