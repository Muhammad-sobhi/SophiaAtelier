import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';

// Running offers change rarely; one request per page load is enough
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
