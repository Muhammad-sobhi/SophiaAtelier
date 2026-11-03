// Display helpers for running offers (see /api/public/offers)

export function offerName(offer, lang) {
  return lang === 'ar' ? (offer.name_ar || offer.name) : (offer.name || offer.name_ar);
}

/** Short label for a dress badge: "20% OFF", "خصم 500 ج.م" or the free perk */
export function offerLabel(offer, lang, t) {
  if (offer.type === 'perk') return lang === 'ar' ? (offer.perk_ar || offer.perk) : (offer.perk || offer.perk_ar);
  const value = Number(offer.value).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US');
  return offer.type === 'percentage' ? t.offers.off(value) : t.offers.amountOff(value);
}

/**
 * Countdown to the offer's start while it is announced, else to the end of its last day (visitor's local
 * time): { upcoming, left: { days, hours, minutes } }, or null once it has ended
 */
export function offerCountdown(offer) {
  const until = (moment) => {
    const ms = new Date(moment).getTime() - Date.now();
    if (ms <= 0) return null;
    const minutes = Math.floor(ms / 60000);
    return { days: Math.floor(minutes / 1440), hours: Math.floor((minutes % 1440) / 60), minutes: minutes % 60 };
  };
  const toStart = until(`${offer.starts_at}T00:00:00`);
  if (toStart) return { upcoming: true, left: toStart };
  const toEnd = until(`${offer.ends_at}T23:59:59`);
  return toEnd ? { upcoming: false, left: toEnd } : null;
}

export function offerBannerText(offer, lang) {
  const text = lang === 'ar' ? (offer.banner_text_ar || offer.banner_text) : (offer.banner_text || offer.banner_text_ar);
  return text || offerName(offer, lang);
}

/** The offer's conditions, one per line */
export function offerTerms(offer, lang) {
  const text = lang === 'ar' ? (offer.terms_ar || offer.terms) : (offer.terms || offer.terms_ar);
  return String(text || '').split('\n').map((line) => line.trim()).filter(Boolean);
}

const formatDay = (date, lang, options) =>
  new Date(`${date}T00:00:00`).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', options);

/** "6 – 8 نوفمبر" */
export function offerDays(offer, lang) {
  const end = formatDay(offer.ends_at, lang, { day: 'numeric', month: 'long' });
  if (offer.starts_at === offer.ends_at) return end;
  return `${formatDay(offer.starts_at, lang, { day: 'numeric' })} – ${end}`;
}

/** "ديسمبر ٢٠٢٦ – مارس ٢٠٢٧", or null when the offer is for every wedding */
export function offerWeddingMonths(offer, lang) {
  if (!offer.wedding_from && !offer.wedding_until) return null;
  const month = (date) => formatDay(date, lang, { month: 'long', year: 'numeric' });
  if (!offer.wedding_from) return `≤ ${month(offer.wedding_until)}`;
  if (!offer.wedding_until) return `≥ ${month(offer.wedding_from)}`;
  return `${month(offer.wedding_from)} – ${month(offer.wedding_until)}`;
}

/** Whether a wedding on this date may take the offer; without a wedding range every wedding may */
export function offerCoversWedding(offer, weddingDate) {
  if (!offer.wedding_from && !offer.wedding_until) return true;
  if (!weddingDate) return false;
  return (!offer.wedding_from || offer.wedding_from <= weddingDate) && (!offer.wedding_until || weddingDate <= offer.wedding_until);
}

/**
 * The offer a visit on this day takes: the day is one of the offer's days, the wedding is in its range and
 * one of the dresses is covered. With a wedding range end (wedding_until) it also lifts the 4-month rule
 * (same as Offer::openingVisitWindow in the API).
 */
export function offerForVisit(offers, visitDate, weddingDate, dressIds) {
  if (!visitDate || !weddingDate) return null;
  return offers.find((o) => o.starts_at <= visitDate && visitDate <= o.ends_at && offerCoversWedding(o, weddingDate)
    && (o.dress_ids === null || dressIds.some((id) => o.dress_ids.includes(id)))) || null;
}
