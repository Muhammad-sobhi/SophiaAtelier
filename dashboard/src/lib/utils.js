import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function cleanDate(raw) {
  if (!raw) return '';
  return String(raw).trim().split('T')[0].split(' ')[0];
}

/** Today as YYYY-MM-DD in local time (toISOString() would give the UTC day) */
export function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function formatDate(raw) {
  if (!raw) return '-';
  const clean = cleanDate(raw);
  if (!clean) return '-';
  try {
    const parts = clean.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return clean;
  } catch {
    return clean;
  }
}

// Cities/areas that count as Cairo & Giza (pickup 1 day before the wedding instead of 2).
// Keep in sync with Booking::CAIRO_CITY_KEYWORDS in the backend (checked by ScheduledDatesTest).
export const CAIRO_CITY_KEYWORDS = [
  'قاهر', 'جيز', 'cairo', 'giza', 'gize', 'نصر', 'مصر الجديد', 'معادي', 'تجمع', 'زايد',
  'أكتوبر', 'اكتوبر', 'شروق', 'مدينتي', 'حلوان', 'بدر',
];

export function isCairoCity(city) {
  const c = String(city || '').trim().toLowerCase();
  if (!c) return true;
  return CAIRO_CITY_KEYWORDS.some((keyword) => c.includes(keyword));
}

export function calculateScheduledDates(weddingDate, city) {
  if (!weddingDate) return { pickupDate: '', returnDate: '' };
  try {
    const isCairo = isCairoCity(city);
    
    // 1 day before wedding for Cairo & Giza, 2 days before for other cities
    const daysBefore = isCairo ? 1 : 2;
    const daysAfter = 1;

    const [year, month, day] = String(weddingDate).split('T')[0].split(' ')[0].split('-').map(Number);
    if (!year || !month || !day) return { pickupDate: '', returnDate: '' };

    const wDate = new Date(Date.UTC(year, month - 1, day));
    const pDate = new Date(wDate.getTime() - daysBefore * 24 * 60 * 60 * 1000);
    const rDate = new Date(wDate.getTime() + daysAfter * 24 * 60 * 60 * 1000);

    return {
      pickupDate: pDate.toISOString().split('T')[0],
      returnDate: rDate.toISOString().split('T')[0],
    };
  } catch (e) {
    return { pickupDate: '', returnDate: '' };
  }
}
// A visit may be at most this many months before the wedding.
// Keep in sync with Visit::MAX_MONTHS_BEFORE_WEDDING in the backend.
export const MAX_MONTHS_BEFORE_WEDDING = 4;

/** Earliest allowed visit date for a wedding (by day; a shorter month clamps to its last day, like the backend) */
export function earliestVisitDate(weddingDate) {
  const [year, month, day] = cleanDate(weddingDate).split('-').map(Number);
  if (!year || !month || !day) return '';
  const total = year * 12 + (month - 1) - MAX_MONTHS_BEFORE_WEDDING;
  const y = Math.floor(total / 12);
  const m = (total % 12) + 1;
  const d = Math.min(day, new Date(Date.UTC(y, m, 0)).getUTCDate());
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** Arabic error when the visit is more than 4 months before the wedding, otherwise '' */
export function visitWindowError(visitDate, weddingDate) {
  const visit = cleanDate(visitDate);
  const earliest = earliestVisitDate(weddingDate);
  if (!visit || !earliest || visit >= earliest) return '';
  return `لا يمكن حجز موعد زيارة قبل الفرح بأكثر من ${MAX_MONTHS_BEFORE_WEDDING} شهور. أقرب تاريخ مسموح للزيارة: ${formatDate(earliest)}`;
}
