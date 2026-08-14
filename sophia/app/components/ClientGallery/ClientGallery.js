'use client';

import { useRef } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useScrollAnimation } from '../ScrollAnimations/useScrollAnimation';
import { useStore } from '../../context/StoreContext';
import { getStorageUrl } from '../../lib/api';
import styles from './ClientGallery.module.css';

const DEFAULT_CLIENTS = [
  { id: 1, image: '/images/product-1.png', name: 'Sarah & James' },
  { id: 2, image: '/images/product-2.png', name: 'Emily & David' },
  { id: 3, image: '/images/product-3.png', name: 'Olivia & Michael' },
  { id: 4, image: '/images/product-4.png', name: 'Sophia & Daniel' },
];

export default function ClientGallery() {
  const { clientGallery, t } = useStore();
  const trackRef = useRef(null);
  const sectionRef = useScrollAnimation();

  const scroll = (dir) => {
    if (!trackRef.current) return;
    const card = trackRef.current.firstChild;
    const w = card?.offsetWidth || 300;
    trackRef.current.scrollBy({ left: dir * (w + 20), behavior: 'smooth' });
  };

  const displayClients = clientGallery.length > 0
    ? clientGallery.map((c) => ({
        id: c.id,
        image: c.image_path ? getStorageUrl(c.image_path) : '/images/product-1.png',
        name: c.client_name,
      }))
    : DEFAULT_CLIENTS;

  return (
    <section className={`section-padding ${styles.section}`} ref={sectionRef}>
      <div className={`container ${styles.header}`} data-animate="fade-up">
        <span className={styles.eyebrow}>{t.realBrides.eyebrow}</span>
        <h2 className={styles.heading}>{t.realBrides.title}</h2>
        <p className={styles.subtitle}>
          {t.realBrides.subtitle}
        </p>
      </div>

      <div className={styles.carouselWrap}>
        <button
          className={`${styles.arrow} ${styles.leftArrow}`}
          onClick={() => scroll(-1)}
          aria-label="Previous"
        >
          <ChevronLeft size={20} strokeWidth={1.5} />
        </button>

        <div className={styles.track} ref={trackRef}>
          {displayClients.map((c, i) => (
            <div
              key={`${c.id}-${i}`}
              className={styles.card}
              data-animate="fade-up"
              data-delay={String(Math.min(i + 1, 6))}
            >
              <div className={styles.imageWrap}>
                {/\.(mp4|mov|webm|avi|m4v|3gp|3gpp|mkv)($|\?)/i.test(c.image || '') ? (
                  <video
                    src={c.image}
                    className={styles.image}
                    muted
                    loop
                    autoPlay
                    playsInline
                  />
                ) : (
                  <Image
                    src={c.image}
                    alt={c.name}
                    width={380}
                    height={520}
                    unoptimized={c.image.includes('/storage/')}
                    className={styles.image}
                  />
                )}
                <div className={styles.nameOverlay}>
                  <span className={styles.clientName}>{c.name}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          className={`${styles.arrow} ${styles.rightArrow}`}
          onClick={() => scroll(1)}
          aria-label="Next"
        >
          <ChevronRight size={20} strokeWidth={1.5} />
        </button>
      </div>
    </section>
  );
}
