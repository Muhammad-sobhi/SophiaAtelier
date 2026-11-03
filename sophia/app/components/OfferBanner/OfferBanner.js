'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { X, ChevronDown } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { offerBannerText, offerTerms, offerWeddingMonths, offerCountdown } from '../../lib/offers';
import styles from './OfferBanner.module.css';

const DISMISS_KEY = 'sophia_offer_dismissed';
const BAR_HEIGHT = '38px';

/**
 * Thin bar above the navbar announcing the offer, with a countdown to its start (while announced
 * before its days) or to its end, and its terms in a panel under the bar
 */
export default function OfferBanner() {
  const { offers, lang, t } = useStore();
  const offer = offers[0];
  const [dismissedId, setDismissedId] = useState(null);
  const [left, setLeft] = useState(null);
  const [upcoming, setUpcoming] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);

  useEffect(() => {
    try { setDismissedId(Number(sessionStorage.getItem(DISMISS_KEY)) || null); } catch (e) {}
  }, []);

  useEffect(() => {
    if (!offer) return undefined;
    const tick = () => {
      const countdown = offerCountdown(offer);
      setUpcoming(Boolean(countdown?.upcoming));
      setLeft(countdown?.left || null);
    };
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, [offer]);

  const visible = Boolean(offer && left && dismissedId !== offer.id);

  // The fixed navbar sits below the bar while it shows
  useEffect(() => {
    const root = document.documentElement;
    if (visible) root.style.setProperty('--offer-bar-h', BAR_HEIGHT);
    else root.style.removeProperty('--offer-bar-h');
    return () => root.style.removeProperty('--offer-bar-h');
  }, [visible]);

  if (!visible) return null;

  const dismiss = () => {
    setDismissedId(offer.id);
    try { sessionStorage.setItem(DISMISS_KEY, String(offer.id)); } catch (e) {}
  };

  const terms = offerTerms(offer, lang);
  const weddingMonths = offerWeddingMonths(offer, lang);
  if (weddingMonths) terms.push(t.offers.forWeddings(weddingMonths));
  const countdownLabel = upcoming ? t.offers.startsIn : t.offers.endsIn;

  return (
    <div className={styles.bar} role="region" aria-label={offerBannerText(offer, lang)}>
      <span className={styles.text}>{offerBannerText(offer, lang)}</span>
      <span className={styles.countdown} aria-label={countdownLabel}>
        <span className={styles.endsIn}>{countdownLabel}</span>
        <span className={styles.unit}>{left.days} {t.offers.days}</span>
        <span className={styles.unit}>{left.hours} {t.offers.hours}</span>
        <span className={styles.unit}>{left.minutes} {t.offers.minutes}</span>
      </span>
      <Link href="/#appointment" className={styles.cta}>{t.offers.bookNow}</Link>
      {terms.length > 0 && (
        <button
          type="button"
          className={styles.termsBtn}
          onClick={() => setTermsOpen((open) => !open)}
          aria-expanded={termsOpen}
          aria-controls="offer-terms"
        >
          {t.offers.terms} <ChevronDown size={12} className={termsOpen ? styles.chevronOpen : undefined} />
        </button>
      )}
      {termsOpen && terms.length > 0 && (
        <ul id="offer-terms" className={styles.terms}>
          {terms.map((term) => <li key={term}>{term}</li>)}
        </ul>
      )}
      <button type="button" className={styles.close} onClick={dismiss} aria-label={t.offers.close}>
        <X size={14} />
      </button>
    </div>
  );
}
