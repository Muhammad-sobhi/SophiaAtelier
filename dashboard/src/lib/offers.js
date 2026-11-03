import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { cleanDate, todayStr } from '@/lib/utils';

// Offers on the website (announced or running) change rarely; one request per page load is enough
let runningOffersPromise = null;

export function useRunningOffers() {
  const [offers, setOffers] = useState([]);
  useEffect(() => {
    if (!runningOffersPromise) {
      runningOffersPromise = apiClient.get('/public/offers')
        .then((res) => (Array.isArray(res) ? res : []))
        .catch(() => {
          runningOffersPromise = null;
          return [];
        });
    }
    let active = true;
    runningOffersPromise.then((list) => active && setOffers(list));
    return () => { active = false; };
  }, []);
  return offers;
}

// What the offer gives: "خصم 20%", "خصم 500 ج.م" or the free perk
export function offerLabel(offer) {
  if (offer.type === 'perk') return offer.perk_ar || offer.perk || '';
  const value = Number(offer.value);
  return offer.type === 'percentage' ? `خصم ${value}%` : `خصم ${value.toLocaleString()} ج.م`;
}

/** Whether a wedding on this date may take the offer; without a wedding range every wedding may */
export function offerCoversWedding(offer, weddingDate) {
  if (!offer.wedding_from && !offer.wedding_until) return true;
  const wedding = cleanDate(weddingDate);
  if (!wedding) return false;
  return (!offer.wedding_from || offer.wedding_from <= wedding) && (!offer.wedding_until || wedding <= offer.wedding_until);
}

/** Offers staff can apply to a booking: started (the website may announce one before) and for this wedding */
export const bookableOffers = (offers, weddingDate) =>
  offers.filter((o) => o.starts_at <= todayStr() && offerCoversWedding(o, weddingDate));

export const offerCoversAny = (offer, dressIds) =>
  offer.dress_ids === null || dressIds.some((id) => offer.dress_ids.includes(Number(id)));

// Same rule as the server (BookingOfferService): the discount is taken off the whole rental total
function discountFor(offer, gross) {
  if (offer.type === 'percentage') return Math.round(gross * Number(offer.value)) / 100;
  if (offer.type === 'fixed') return Math.min(Number(offer.value), gross);
  return 0;
}

/**
 * The discount for the applied offer. A booking keeps an offer that has since ended at the
 * discount it was saved with (the server accepts it unchanged).
 */
export function resolveOfferDiscount({ offers, offerId, gross, savedBooking }) {
  if (!offerId) return 0;
  const offer = offers.find((o) => o.id === offerId);
  if (offer) return discountFor(offer, gross);
  if (savedBooking?.offer_id === offerId) return Number(savedBooking.discount_amount) || 0;
  return 0;
}
