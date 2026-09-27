'use client';

import { useEffect, useState } from 'react';
import { CalendarHeart, X } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import styles from './WeddingDateWidget.module.css';

const DISMISS_KEY = 'sophia_wedding_prompt_dismissed';

/** Asks the bride for her wedding date once, then shows it as a small pill she can change anytime */
export default function WeddingDateWidget() {
  const { weddingDate, setWeddingDate, t, lang } = useStore();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const today = new Date().toISOString().split('T')[0];

  // First visit without a date: open the question (unless she chose "later" this session)
  useEffect(() => {
    let dismissed = false;
    try { dismissed = sessionStorage.getItem(DISMISS_KEY) === '1'; } catch (e) {}
    const timer = setTimeout(() => {
      if (!localStorage.getItem('sophia_wedding_date') && !dismissed) setOpen(true);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => { if (open) setDraft(weddingDate || ''); }, [open, weddingDate]);

  const save = (e) => {
    e.preventDefault();
    if (!draft || draft < today) return;
    setWeddingDate(draft);
    setOpen(false);
  };

  const later = () => {
    try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch (e) {}
    setOpen(false);
  };

  const a = t.availability;

  if (open) {
    return (
      <form className={styles.card} onSubmit={save} dir={lang === 'ar' ? 'rtl' : 'ltr'} aria-label={a.weddingQuestion}>
        <button type="button" className={styles.close} onClick={later} aria-label={a.later}><X size={16} /></button>
        <div className={styles.title}><CalendarHeart size={18} /> {a.weddingQuestion}</div>
        <p className={styles.hint}>{a.weddingHint}</p>
        <input
          type="date"
          className={styles.input}
          min={today}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          required
          aria-label={a.weddingQuestion}
        />
        <div className={styles.actions}>
          <button type="submit" className={styles.primary} disabled={!draft}>{a.save}</button>
          <button type="button" className={styles.secondary} onClick={later}>{a.later}</button>
        </div>
      </form>
    );
  }

  return (
    <button type="button" className={styles.pill} onClick={() => setOpen(true)} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <CalendarHeart size={15} />
      {weddingDate ? (
        <span>{a.yourWedding}: <strong dir="ltr">{weddingDate}</strong> · {a.change}</span>
      ) : (
        <span>{a.weddingQuestion}</span>
      )}
    </button>
  );
}
