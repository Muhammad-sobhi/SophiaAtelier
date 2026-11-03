'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { X } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { offerName, offerLabel, offerTerms, offerDays, offerWeddingMonths, offerCountdown } from '../../lib/offers';
import styles from './OfferPopup.module.css';

const DISMISS_KEY = 'sophia_offer_popup_closed';
const OPEN_DELAY = 1000;

/**
 * Advert for the offer on the website, opened once per visit (session) from the day it is announced
 * until it ends. The wedding date question waits until it is closed.
 */
export default function OfferPopup() {
  const { offers, lang, t, offerPopup, setOfferPopup } = useStore();
  const offer = offers[0];
  const [countdown, setCountdown] = useState(null);
  const closeRef = useRef(null);
  const isOpen = offerPopup === 'open';

  // Once the offers load: open after a short delay, unless she closed it this session or it has ended
  useEffect(() => {
    if (offerPopup !== 'pending' || !offer) return undefined;
    let closed = false;
    try { closed = sessionStorage.getItem(DISMISS_KEY) === String(offer.id); } catch (e) {}
    if (closed || !offerCountdown(offer)) {
      setOfferPopup('done');
      return undefined;
    }
    const timer = setTimeout(() => setOfferPopup('open'), OPEN_DELAY);
    return () => clearTimeout(timer);
  }, [offer, offerPopup, setOfferPopup]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const tick = () => setCountdown(offerCountdown(offer));
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, [isOpen, offer]);

  const close = () => {
    try { sessionStorage.setItem(DISMISS_KEY, String(offer.id)); } catch (e) {}
    setOfferPopup('done');
  };

  // While open: Esc closes it, the page behind does not scroll, and focus starts on the close button
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOpen || !offer) return null;

  const isAr = lang === 'ar';
  const weddingMonths = offerWeddingMonths(offer, lang);
  const terms = offerTerms(offer, lang);
  const dressesHref = offer.dress_ids === null ? '/collections' : '/#offers';

  return (
    <div className={styles.backdrop} onClick={close} dir={isAr ? 'rtl' : 'ltr'}>
      <div
        className={styles.popup}
        role="dialog"
        aria-modal="true"
        aria-labelledby="offer-popup-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" ref={closeRef} className={styles.close} onClick={close} aria-label={t.offers.close}>
          <X size={18} />
        </button>

        <div className={styles.art}>
          <Image src="/images/offer-bride.webp" alt="" fill sizes="(max-width: 640px) 100vw, 360px" className={styles.bride} />
          <span className={styles.ribbon}>{t.offers.limited}</span>
        </div>

        <div className={styles.content}>
          <span className={styles.eyebrow}>{t.offers.special}</span>
          <h2 id="offer-popup-title" className={styles.title}>{offerName(offer, lang)}</h2>
          <p className={styles.perk}>{offerLabel(offer, lang, t)}</p>
          <p className={styles.days}>
            {t.offers.offerDays}: <b>{offerDays(offer, lang)}</b>
            {weddingMonths && <> · {t.offers.forWeddings(weddingMonths)}</>}
          </p>

          {countdown && (
            <div>
              <span className={styles.countLabel}>{countdown.upcoming ? t.offers.startsIn : t.offers.endsIn}</span>
              <div className={styles.count}>
                <div><strong>{countdown.left.days}</strong><span>{t.offers.days}</span></div>
                <div><strong>{countdown.left.hours}</strong><span>{t.offers.hours}</span></div>
                <div><strong>{countdown.left.minutes}</strong><span>{t.offers.minutes}</span></div>
              </div>
            </div>
          )}

          {terms.length > 0 && (
            <ul className={styles.terms}>
              {terms.map((term) => <li key={term}>{term}</li>)}
            </ul>
          )}

          <Link href="/#appointment" className={styles.cta} onClick={close}>{t.offers.bookNow}</Link>
          <Link href={dressesHref} className={styles.link} onClick={close}>{t.offers.viewDresses}</Link>
        </div>
      </div>
    </div>
  );
}
