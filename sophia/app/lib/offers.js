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

export function offerBannerText(offer, lang) {
  const text = lang === 'ar' ? (offer.banner_text_ar || offer.banner_text) : (offer.banner_text || offer.banner_text_ar);
  return text || offerName(offer, lang);
}
