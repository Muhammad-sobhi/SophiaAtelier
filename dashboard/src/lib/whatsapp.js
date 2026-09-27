import { apiClient } from '@/lib/api-client';

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

/** "14:30" / "2:30 PM" / "02:30 م" → "02:30 م" (the format used in the visit time select) */
export function formatVisitTime(raw) {
  if (!raw) return '';
  const str = String(raw).trim();
  const m = str.match(/^(\d{1,2}):(\d{2})\s*(AM|PM|ص|م)?/i);
  if (!m) return str;
  let h = parseInt(m[1], 10);
  const marker = (m[3] || '').toUpperCase();
  if (marker === 'PM' || marker === 'م') {
    if (h < 12) h += 12;
  } else if ((marker === 'AM' || marker === 'ص') && h === 12) {
    h = 0;
  }
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(h12).padStart(2, '0')}:${m[2]} ${h >= 12 ? 'م' : 'ص'}`;
}

const VISIT_CONFIRMATION_FALLBACK =
  '✨ *فساتين صوفيا | Sophia Dresses* ✨\n\nمرحباً يا جميلتنا *{{client_name}}* 🤍،\nيسعدنا جداً تأكيد موعدكِ معنا لتجربة فستان أحلامكِ!\n\n📅 *تفاصيل الموعد:*\n• *التاريخ:* {{visit_date}}\n• *الوقت:* {{visit_time}}\n\n🌸 *شروط وقواعد فساتين صوفيا:*\n( مسموح ب دخول فردين فقط مع العروسه ladies only )\n(الدخول ب أولوية الحضور)\n• *رسوم التجربة والقياس:* {{trying_fee}}\n\nAddress ⤵️\nالتجمع الاول الياسمين ٢ \nفيلا 161 الباب الجانبي للفيلا بيكون شمال باب الفيلا (basement) \n⬅️اليافطه السودا161\n\nLocation📍\nhttps://maps.app.goo.gl/RUyaQk3v1rZR4gVC6\n\nنحن بانتظار تشريفكِ لتنيري المكان ✨🎀';

/**
 * wa.me link with the "visit_confirmation" template filled from the bride's visit
 * (date, time and trying fee — 0 when the visit has no fee). Returns null without a phone.
 */
export async function buildVisitConfirmationUrl(bride, visit) {
  const phone = formatWhatsAppNumber(bride?.phone).replace('+', '');
  if (!phone || !visit) return null;

  const fee = parseFloat(visit.trying_fee || 0);
  const values = {
    client_name: bride.name || '',
    visit_date: String(visit.visit_date || '').split('T')[0].split(' ')[0],
    visit_time: formatVisitTime(visit.time_slot) || 'خلال أوقات العمل (من ١:٠٠ م حتى ٨:٣٠ م)',
    trying_fee: `${fee > 0 ? fee.toLocaleString() : 0} ج.م`,
  };

  let body = VISIT_CONFIRMATION_FALLBACK;
  try {
    const templates = await apiClient.get('/whatsapp-templates');
    const t = Array.isArray(templates) ? templates.find((x) => x.key === 'visit_confirmation') : null;
    if (t?.body) body = t.body;
  } catch (err) {
    console.error('Failed to load WhatsApp template, using fallback:', err);
  }

  const message = body.replace(/\{\{(\w+)\}\}/g, (match, key) => (key in values ? values[key] : match));
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
