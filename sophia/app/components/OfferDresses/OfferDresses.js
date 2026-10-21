'use client';

import { useStore } from '../../context/StoreContext';
import { offerName } from '../../lib/offers';
import BestSellers from '../BestSellers/BestSellers';

/** Home carousel of the dresses in the running offer (hidden when the offer covers every dress) */
export default function OfferDresses(props) {
  const { offers, dresses, lang, t } = useStore();
  const offer = offers[0];
  if (!offer || offer.dress_ids === null) return null;

  const products = dresses.filter((d) => offer.dress_ids.includes(d.id));
  if (products.length === 0) return null;

  return <BestSellers {...props} products={products} title={t.offers.sectionTitle(offerName(offer, lang))} id="offers" />;
}
