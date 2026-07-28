'use client';

import { useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Heart, ChevronLeft, ChevronRight } from 'lucide-react';
import { useScrollAnimation } from '../ScrollAnimations/useScrollAnimation';
import { useStore } from '../../context/StoreContext';
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
                <div
                  key={`${p.id}-${i}`}
                  className={styles.card}
                  data-animate="fade-up"
                  data-delay={String(Math.min(i + 1, 6))}
                  onClick={() => onQuickView?.(p)}
                >
                  <div className={styles.imageWrap}>
                    <Image
                      src={p.image}
                      alt={p.name}
                      fill
                      sizes="(max-width: 900px) 210px, 25vw"
                      unoptimized={typeof p.image === 'string' && p.image.includes('/storage/')}
                      className={styles.image}
                    />
                    
                    {/* Hover Overlay Controls */}
                    <div className={styles.overlayControls}>
                      <button
                        className={`${styles.overlayBtn} ${isWishlisted?.(p.id) ? styles.activeWish : ''}`}
                        onClick={(e) => { e.stopPropagation(); onToggleWishlist?.(p); }}
                        aria-label="Wishlist"
                        title={t.quickView.addToWishlist}
                      >
                        <Heart size={16} fill={isWishlisted?.(p.id) ? '#c8a96a' : 'none'} color={isWishlisted?.(p.id) ? '#c8a96a' : '#111'} />
                      </button>
                      <button
                        className={styles.quickViewOverlayBtn}
                        onClick={(e) => { e.stopPropagation(); onQuickView?.(p); }}
                      >
                        {t.bestSellers.quickView}
                      </button>
                    </div>

                    <div className={styles.overlayPriceTag}>{p.price}</div>
                  </div>
                  <div className={styles.infoRow}>
                    <h3 className={styles.name}>{lang === 'ar' && p.name_ar ? p.name_ar : p.name}</h3>
                  </div>
                </div>
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
