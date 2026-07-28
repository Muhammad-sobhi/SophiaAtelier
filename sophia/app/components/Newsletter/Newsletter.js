'use client';

import { Send } from 'lucide-react';
import { useScrollAnimation } from '../ScrollAnimations/useScrollAnimation';
import styles from './Newsletter.module.css';

export default function Newsletter() {
  const ref = useScrollAnimation();

  return (
    <section className={`section-padding ${styles.section}`} ref={ref}>
      <div className={`container ${styles.inner}`} data-animate="fade-up">
        <span className={styles.eyebrow}>Stay Inspired</span>
        <h2 className={styles.heading}>Join Our World of Elegance</h2>
        <p className={styles.subtitle}>
          Be the first to know about new collections, exclusive events, and bridal inspiration.
        </p>
        <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
          <input
            type="email"
            placeholder="Enter your email address"
            className={styles.input}
            aria-label="Email address"
          />
          <button type="submit" className={styles.submitBtn}>
            <Send size={18} strokeWidth={1.5} />
            <span>Subscribe</span>
          </button>
        </form>
      </div>
    </section>
  );
}
