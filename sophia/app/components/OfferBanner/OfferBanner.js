'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { offerBannerText } from '../../lib/offers';
import styles from './OfferBanner.module.css';

const DISMISS_KEY = 'sophia_offer_dismissed';
const BAR_HEIGHT = '38px';

// Time left until the end of the offer's last day (visitor's local time)
function timeLeft(endsAt) {
  const ms = new Date(`${endsAt}T23:59:59`).getTime() - Date.now();
  if (ms <= 0) return null;
  const minutes = Math.floor(ms / 60000);
  return { days: Math.floor(minutes / 1440), hours: Math.floor((minutes % 1440) / 60), minutes: minutes % 60 };
}

/** Thin bar above the navbar announcing the running offer, with a countdown */
export default function OfferBanner() {
  const { offers, lang, t } = useStore();
  const offer = offers[0];
  const [dismissedId, setDismissedId] = useState(null);
  const [left, setLeft] = useState(null);

  useEffect(() => {
    try { setDismissedId(Number(sessionStorage.getItem(DISMISS_KEY)) || null); } catch (e) {}
  }, []);

  useEffect(() => {
    if (!offer) return undefined;
    const tick = () => setLeft(timeLeft(offer.ends_at));
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

  return (
    <div className={styles.bar} role="region" aria-label={offerBannerText(offer, lang)}>
      <span className={styles.text}>{offerBannerText(offer, lang)}</span>
      <span className={styles.countdown} aria-label={t.offers.endsIn}>
        <span className={styles.endsIn}>{t.offers.endsIn}</span>
        <span className={styles.unit}>{left.days} {t.offers.days}</span>
        <span className={styles.unit}>{left.hours} {t.offers.hours}</span>
        <span className={styles.unit}>{left.minutes} {t.offers.minutes}</span>
      </span>
      <Link href="/#appointment" className={styles.cta}>{t.offers.bookNow}</Link>
      <button type="button" className={styles.close} onClick={dismiss} aria-label={t.offers.close}>
        <X size={14} />
      </button>
    </div>
  );
}
