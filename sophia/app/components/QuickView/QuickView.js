'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { X, Heart, Star, ChevronLeft } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import styles from './QuickView.module.css';

export default function QuickView() {
  const { quickViewProduct: product, closeQuickView, addToCart, toggleWishlist, isWishlisted, t, lang } = useStore();
  const [qty, setQty] = useState(1);
  const [selectedSize, setSelectedSize] = useState('6');
  const [selectedColor, setSelectedColor] = useState('Ivory');
  const [activeImage, setActiveImage] = useState('');

  const sizes = product?.sizes && product.sizes.length > 0 ? product.sizes : ['XS', 'S', 'M', 'L', 'XL'];
  const colors = product?.colors && product.colors.length > 0 ? product.colors : ['Ivory', 'Champagne', 'Blush'];
  const images = product?.images && product.images.length > 0 ? product.images : [product?.image];

  useEffect(() => {
    if (product) {
      setQty(1);
      setActiveImage(product.image);
      if (sizes.length > 0) setSelectedSize(sizes[0]);
      if (colors.length > 0) setSelectedColor(colors[0]);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [product]);

  if (!product) return null;

  const handleAdd = () => {
    addToCart(product, qty);
    closeQuickView();
  };

  return (
    <div className={styles.overlay} onClick={closeQuickView}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={closeQuickView} aria-label="Close">
          <X size={20} />
        </button>

        <div className={styles.topBackNav}>
          <button className={styles.backBtn} onClick={closeQuickView}>
            <ChevronLeft size={16} /> {t.nav.collections}
          </button>
        </div>

        <div className={styles.grid}>
          {/* Thumbnails + Main Image */}
          <div className={styles.galleryRow}>
            <div className={styles.thumbnails}>
              {images.map((img, idx) => (
                <button
                  key={idx}
                  className={`${styles.thumbBtn} ${activeImage === img ? styles.activeThumb : ''}`}
                  onClick={() => setActiveImage(img)}
                >
                  <Image
                    src={img}
                    alt="Thumbnail"
                    width={60}
                    height={80}
                    unoptimized={typeof img === 'string' && img.includes('/storage/')}
                    className={styles.thumbImg}
                  />
                </button>
              ))}
            </div>

            <div className={styles.mainImageWrap}>
              <Image
                src={activeImage || product.image}
                alt={product.name}
                width={450}
                height={600}
                unoptimized={typeof (activeImage || product.image) === 'string' && (activeImage || product.image).includes('/storage/')}
                className={styles.mainImage}
              />
            </div>
          </div>

          {/* Details Col */}
          <div className={styles.detailCol}>
            <h2 className={styles.name}>{(lang === 'ar' && product.name_ar ? product.name_ar : product.name)?.toUpperCase()}</h2>
            <p className={styles.price}>{product.price}</p>

            <p className={styles.desc}>
              {product.description || 'Exquisite gown handcrafted with intricate details and timeless elegance.'}
            </p>

            {/* Size */}
            <div className={styles.optionGroup}>
              <div className={styles.sizeHeader}>
                <label className={styles.optionLabel}>{t.bestSellers.size}</label>
              </div>
              <div className={styles.sizeGrid}>
                {sizes.map((s) => (
                  <button
                    key={s}
                    className={`${styles.sizeBox} ${selectedSize === s ? styles.selectedSize : ''}`}
                    onClick={() => setSelectedSize(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className={styles.actionsBlock}>
              <button className={styles.addToCartBtn} onClick={handleAdd}>
                {t.quickView.addToBag}
              </button>
              <button
                className={`${styles.wishlistBtn} ${isWishlisted(product.id) ? styles.activeWish : ''}`}
                onClick={() => toggleWishlist(product)}
              >
                <Heart size={16} fill={isWishlisted(product.id) ? 'currentColor' : 'none'} />
                <span>{isWishlisted(product.id) ? t.quickView.inWishlist : t.quickView.addToWishlist}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
