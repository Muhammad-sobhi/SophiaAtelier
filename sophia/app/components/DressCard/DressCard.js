'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { Heart, ChevronLeft, ChevronRight } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import styles from './DressCard.module.css';

export default function DressCard({
  product,
  onQuickView,
  onToggleWishlist,
  isWishlisted,
  showMeta = true,
  dataAnimate,
  dataDelay,
  className = '',
}) {
  const { t, lang } = useStore();
  const [currentIdx, setCurrentIdx] = useState(0);
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);

  // Extract images array
  const images = product?.images && product.images.length > 0
    ? product.images
    : (product?.image ? [product.image] : ['/images/product-1.png']);

  const currentImage = images[currentIdx] || product?.image || '/images/product-1.png';
  const hasMultipleImages = images.length > 1;

  const nextImage = (e) => {
    if (e) e.stopPropagation();
    setCurrentIdx((prev) => (prev + 1) % images.length);
  };

  const prevImage = (e) => {
    if (e) e.stopPropagation();
    setCurrentIdx((prev) => (prev - 1 + images.length) % images.length);
  };

  const goToImage = (idx, e) => {
    if (e) e.stopPropagation();
    setCurrentIdx(idx);
  };

  // Touch Swipe Handlers for phone/mobile
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null || !hasMultipleImages) return;

    const deltaX = touchStartX.current - e.changedTouches[0].clientX;
    const deltaY = touchStartY.current - e.changedTouches[0].clientY;

    // Only swipe if horizontal movement is greater than vertical movement and > 30px
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 30) {
      if (deltaX > 0) {
        // Swiped left -> Next photo
        setCurrentIdx((prev) => (prev + 1) % images.length);
      } else {
        // Swiped right -> Previous photo
        setCurrentIdx((prev) => (prev - 1 + images.length) % images.length);
      }
    }

    touchStartX.current = null;
    touchStartY.current = null;
  };

  const wishActive = typeof isWishlisted === 'function' ? isWishlisted(product.id) : !!isWishlisted;

  return (
    <div
      className={`${styles.card} ${className}`}
      data-animate={dataAnimate}
      data-delay={dataDelay}
      onClick={() => onQuickView?.(product)}
    >
      <div
        className={styles.imageWrap}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/\.(mp4|mov|webm|avi|m4v|3gp|3gpp|mkv)($|\?)/i.test(currentImage) ? (
          <video src={currentImage} className={styles.image} muted loop autoPlay playsInline />
        ) : (
          <Image
            src={currentImage}
            alt={product.name || 'Dress'}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            unoptimized={typeof currentImage === 'string' && currentImage.includes('/storage/')}
            className={styles.image}
            priority={false}
          />
        )}

        {product.badge && <span className={styles.badge}>{product.badge}</span>}

        {/* Image Slider Controls (Arrows) */}
        {hasMultipleImages && (
          <>
            <button
              className={`${styles.sliderArrow} ${styles.prevArrow}`}
              onClick={prevImage}
              aria-label="Previous photo"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              className={`${styles.sliderArrow} ${styles.nextArrow}`}
              onClick={nextImage}
              aria-label="Next photo"
            >
              <ChevronRight size={16} />
            </button>

            {/* Pagination Dots */}
            <div className={styles.dotsContainer}>
              {images.map((_, idx) => (
                <button
                  key={idx}
                  className={`${styles.dot} ${idx === currentIdx ? styles.dotActive : ''}`}
                  onClick={(e) => goToImage(idx, e)}
                  aria-label={`Go to photo ${idx + 1}`}
                />
              ))}
            </div>
          </>
        )}

        {/* Hover Overlay Controls */}
        <div className={styles.overlayControls}>
          <button
            className={`${styles.overlayBtn} ${wishActive ? styles.activeWish : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleWishlist?.(product);
            }}
            aria-label="Wishlist"
            title={t.quickView.addToWishlist}
          >
            <Heart
              size={16}
              fill={wishActive ? '#c8a96a' : 'none'}
              color={wishActive ? '#c8a96a' : '#111'}
            />
          </button>
          <button
            className={styles.quickViewOverlayBtn}
            onClick={(e) => {
              e.stopPropagation();
              onQuickView?.(product);
            }}
          >
            {t.bestSellers.quickView}
          </button>
        </div>

        {product.price && <div className={styles.overlayPriceTag}>{product.price}</div>}
      </div>

      <div className={styles.info}>
        {showMeta && (product.collection || product.category) && (
          <div className={styles.meta}>
            {product.collection && <span className={styles.collection}>{product.collection}</span>}
            {product.category && <span className={styles.category}>{product.category}</span>}
          </div>
        )}
        <h3 className={styles.name}>
          {lang === 'ar' && product.name_ar ? product.name_ar : product.name}
        </h3>
      </div>
    </div>
  );
}
