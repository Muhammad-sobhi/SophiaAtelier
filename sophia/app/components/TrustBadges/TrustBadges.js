'use client';

import { Truck, RotateCcw, ShieldCheck, Ruler } from 'lucide-react';
import { useScrollAnimation } from '../ScrollAnimations/useScrollAnimation';
import styles from './TrustBadges.module.css';

const BADGES = [
  { icon: Truck, title: 'Free Shipping', desc: 'On all orders' },
  { icon: RotateCcw, title: 'Easy Returns', desc: '30 days return' },
  { icon: ShieldCheck, title: 'Secure Payment', desc: '100% secure' },
  { icon: Ruler, title: 'Custom Fitting', desc: 'Perfectly yours' },
];

export default function TrustBadges() {
  const ref = useScrollAnimation();
  return (
    <section className={styles.section} ref={ref}>
      <div className={`container ${styles.grid}`}>
        {BADGES.map((b, i) => (
          <div key={b.title} className={styles.badge} data-animate="fade-up" data-delay={String(i + 1)}>
            <div className={styles.iconWrap}>
              <b.icon size={22} strokeWidth={1.3} />
            </div>
            <div className={styles.textWrap}>
              <h4 className={styles.title}>{b.title}</h4>
              <p className={styles.desc}>{b.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
