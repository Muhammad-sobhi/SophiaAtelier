/**
 * Formats a raw phone number string to the correct +20XXXXXXXXXX format for wa.me links (Egypt).
 * Examples:
 *   "01006508435"    → "+201006508435"
 *   "201006508435"   → "+201006508435"
 *   "+201006508435"  → "+201006508435"
 *   ""               → ""
 */
export function formatWhatsAppNumber(raw) {
  const digits = (raw || '').replace(/[^\d]/g, '');
  if (!digits) return '';

  // Already has Egyptian country code (20XXXXXXXXX, 12 digits)
  if (digits.startsWith('20')) {
    return '+' + digits; // +201006508435
  }

  // Local format starting with 0 (01XXXXXXXXX, 11 digits)
  if (digits.startsWith('0')) {
    return '+2' + digits; // +201006508435
  }

  // Bare number without leading 0 (1XXXXXXXXX)
  return '+20' + digits;
}
