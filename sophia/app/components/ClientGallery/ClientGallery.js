'use client';

import { useRef, useState, useEffect } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Play, X } from 'lucide-react';
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
  const [selectedMedia, setSelectedMedia] = useState(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setSelectedMedia(null);
    };
    if (selectedMedia) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [selectedMedia]);

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
          {displayClients.map((c, i) => {
            const isVideo = /\.(mp4|mov|webm|avi|m4v|3gp|3gpp|mkv)($|\?)/i.test(c.image || '');
            return (
              <div
                key={`${c.id}-${i}`}
                className={styles.card}
                data-animate="fade-up"
                data-delay={String(Math.min(i + 1, 6))}
                onClick={() => setSelectedMedia({ ...c, isVideo })}
                role="button"
                tabIndex={0}
                aria-label={`View ${c.name}`}
              >
                <div className={styles.imageWrap}>
                  {isVideo ? (
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

                  {/* Reel / Video Badge */}
                  {isVideo && (
                    <div className={styles.videoBadge}>
                      <Play size={10} className={styles.playIcon} />
                      <span>REEL</span>
                    </div>
                  )}

                  <div className={styles.nameOverlay}>
                    <span className={styles.clientName}>{c.name}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <button
          className={`${styles.arrow} ${styles.rightArrow}`}
          onClick={() => scroll(1)}
          aria-label="Next"
        >
          <ChevronRight size={20} strokeWidth={1.5} />
        </button>
      </div>

      {/* Lightbox / Video Modal */}
      {selectedMedia && (
        <div
          className={styles.lightboxOverlay}
          onClick={() => setSelectedMedia(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className={styles.lightboxContent}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className={styles.closeBtn}
              onClick={() => setSelectedMedia(null)}
              aria-label="Close"
            >
              <X size={20} />
            </button>

            <div className={styles.mediaContainer}>
              {selectedMedia.isVideo ? (
                <video
                  src={selectedMedia.image}
                  className={styles.lightboxVideo}
                  controls
                  autoPlay
                  playsInline
                />
              ) : (
                <img
                  src={selectedMedia.image}
                  alt={selectedMedia.name}
                  className={styles.lightboxImage}
                />
              )}
            </div>

            <div className={styles.lightboxCaption}>
              <span className={styles.lightboxName}>{selectedMedia.name}</span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
