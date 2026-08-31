/**
 * Formats a raw phone number string to the +020XXXXXXXXX format required for wa.me links.
 * Examples:
 *   "01006508435"    → "+0201006508435"
 *   "201006508435"   → "+0201006508435"
 *   "+201006508435"  → "+0201006508435"
 *   ""               → ""
 */
export function formatWhatsAppNumber(raw) {
  const digits = (raw || '').replace(/[^\d]/g, '');
  if (!digits) return '';

  // Already has Egyptian country code (20XXXXXXXXX, 12 digits)
  if (digits.startsWith('20')) {
    return '+0' + digits; // +0201006508435
  }

  // Local format starting with 0 (01XXXXXXXXX, 11 digits)
  if (digits.startsWith('0')) {
    return '+02' + digits; // +0201006508435
  }

  // Bare number without leading 0 (1XXXXXXXXX)
  return '+020' + digits;
}
