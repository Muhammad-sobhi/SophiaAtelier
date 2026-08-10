'use client';

import { useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Heart, ChevronLeft, ChevronRight } from 'lucide-react';
import { useScrollAnimation } from '../ScrollAnimations/useScrollAnimation';
import { useStore } from '../../context/StoreContext';
import DressCard from '../DressCard/DressCard';
import styles from './BestSellers.module.css';

export default function BestSellers({ onQuickView, onToggleWishlist, isWishlisted }) {
  const { dresses, loadingDresses, t, lang } = useStore();
  const trackRef = useRef(null);
  const sectionRef = useScrollAnimation();

  const scroll = (dir) => {
    if (!trackRef.current) return;
    const w = trackRef.current.firstChild?.offsetWidth || 300;
    trackRef.current.scrollBy({ left: dir * (w + 24), behavior: 'smooth' });
  };

  const displayProducts = dresses.slice(0, 8);

  return (
    <section className={`section-padding ${styles.section}`} id="bestsellers" ref={sectionRef}>
      <div className="container">
        <div className={styles.header}>
          <span className={styles.title}>{t.bestSellers.title}</span>
          <Link href="/collections" className={styles.viewAll}>{t.hero.explore}</Link>
        </div>

        <div className={styles.carouselWrap}>
          <button className={`${styles.arrow} ${styles.leftArrow}`} onClick={() => scroll(-1)} aria-label="Previous">
            <ChevronLeft size={18} />
          </button>

          <div className={styles.track} ref={trackRef}>
            {loadingDresses ? (
              <div style={{ padding: '40px', color: '#999' }}>...</div>
            ) : displayProducts.length === 0 ? (
              <div style={{ padding: '40px', color: '#999' }}>—</div>
            ) : (
              displayProducts.map((p, i) => (
                <DressCard
                  key={`${p.id}-${i}`}
                  product={p}
                  onQuickView={onQuickView}
                  onToggleWishlist={onToggleWishlist}
                  isWishlisted={isWishlisted}
                  showMeta={false}
                  dataAnimate="fade-up"
                  dataDelay={String(Math.min(i + 1, 6))}
                  className={styles.card}
                />
              ))
            )}
          </div>

          <button className={`${styles.arrow} ${styles.rightArrow}`} onClick={() => scroll(1)} aria-label="Next">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </section>
  );
}
