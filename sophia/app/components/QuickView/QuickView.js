'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { X, Heart, Star, ChevronLeft, ChevronRight, Sparkles, Shirt, Scale, Palette, Package } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import styles from './QuickView.module.css';

export default function QuickView() {
  const { quickViewProduct: product, closeQuickView, addToCart, toggleWishlist, isWishlisted, t, lang } = useStore();
  const [activeImage, setActiveImage] = useState('');

  const isAr = lang === 'ar';
  const images = product?.images && product.images.length > 0 ? product.images : (product?.image ? [product.image] : []);

  useEffect(() => {
    if (product) {
      setActiveImage(product.images?.[0] || product.image || '');
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [product]);

  if (!product) return null;

  const handleAdd = () => {
    addToCart(product, 1);
    closeQuickView();
  };

  const displayName = isAr ? (product.name_ar || product.name) : (product.name || product.name_ar);
  const displayDesc = isAr ? (product.description_ar || product.description) : (product.description || product.description_ar);
  const displayCategory = isAr ? (product.category_ar || product.category) : (product.category || product.category_ar);
  const displayCollection = isAr ? (product.collection_ar || product.collection) : (product.collection || product.collection_ar);
  const displayDesigner = isAr ? (product.designer_ar || product.designer) : (product.designer || product.designer_ar);
  const displayFabric = isAr ? (product.fabric_ar || product.fabric) : (product.fabric || product.fabric_ar);
  const displayColor = isAr ? (product.color_ar || product.color) : (product.color || product.color_ar);
  const formatWeight = (p, isArabic) => {
    if (p?.weight_from && p?.weight_to) {
      return isArabic ? `من ${p.weight_from} كجم إلى ${p.weight_to} كجم` : `${p.weight_from}kg up to ${p.weight_to}kg`;
    }
    if (p?.weight_from) {
      return isArabic ? `من ${p.weight_from} كجم` : `From ${p.weight_from}kg`;
    }
    if (p?.weight_to) {
      return isArabic ? `حتى ${p.weight_to} كجم` : `Up to ${p.weight_to}kg`;
    }
    const raw = isArabic ? (p?.weightTextAr || p?.weightTextEn) : (p?.weightTextEn || p?.weightTextAr);
    if (raw && !['xs', 's', 'm', 'l', 'xl'].includes(raw.trim().toLowerCase())) {
      return raw;
    }
    return isArabic ? 'من 50 كجم إلى 75 كجم' : '50kg up to 75kg';
  };

  const displayWeight = formatWeight(product, isAr);

  return (
    <div className={styles.overlay} onClick={closeQuickView} dir={isAr ? 'rtl' : 'ltr'}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button className={styles.closeBtn} onClick={closeQuickView} aria-label="Close">
          <X size={18} />
        </button>

        {/* Navigation Bar */}
        <div className={styles.topBackNav}>
          <button className={styles.backBtn} onClick={closeQuickView}>
            {isAr ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            <span>{isAr ? 'العودة للتشكيلة' : 'BACK TO COLLECTION'}</span>
          </button>
        </div>

        <div className={styles.grid}>
          {/* Gallery Row: Vertical Thumbnails + Main Image */}
          <div className={styles.galleryRow}>
            {images.length > 1 && (
              <div className={styles.thumbnails}>
                {images.map((img, idx) => {
                  const isVid = typeof img === 'string' && /\.(mp4|mov|webm|avi|m4v|3gp|3gpp|mkv)($|\?)/i.test(img);
                  return (
                    <button
                      key={idx}
                      className={`${styles.thumbBtn} ${activeImage === img ? styles.activeThumb : ''}`}
                      onClick={() => setActiveImage(img)}
                    >
                      {isVid ? (
                        <video src={img} className={styles.thumbImg} muted loop autoPlay playsInline />
                      ) : (
                        <Image
                          src={img}
                          alt="Thumbnail"
                          width={70}
                          height={90}
                          unoptimized={typeof img === 'string' && (img.includes('/storage/') || img.startsWith('blob:'))}
                          className={styles.thumbImg}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            <div className={styles.mainImageWrap}>
              {/\.(mp4|mov|webm|avi|m4v|3gp|3gpp|mkv)($|\?)/i.test(activeImage || product.image || '') ? (
                <video
                  src={activeImage || product.image}
                  className={styles.mainImage}
                  controls
                  autoPlay
                  muted
                  loop
                  playsInline
                />
              ) : (
                <Image
                  src={activeImage || product.image}
                  alt={displayName || 'Dress image'}
                  width={500}
                  height={680}
                  unoptimized={typeof (activeImage || product.image) === 'string' && ((activeImage || product.image).includes('/storage/') || (activeImage || product.image).startsWith('blob:'))}
                  className={styles.mainImage}
                  priority
                />
              )}
              {product.new_collection && (
                <div className={styles.newBadge}>
                  <Sparkles size={12} />
                  <span>{isAr ? 'تشكيلة جديدة' : 'NEW COLLECTION'}</span>
                </div>
              )}
            </div>
          </div>

          {/* Details Column */}
          <div className={styles.detailCol}>
            {/* Metadata Tags */}
            <div className={styles.metaRow}>
              {product.code && (
                <span className={styles.codeBadge}>
                  {isAr ? `كود الفستان: ${product.code}` : `Dress Code: ${product.code}`}
                </span>
              )}
              {displayCategory && (
                <span className={styles.categoryBadge}>{displayCategory}</span>
              )}
            </div>

            {/* Title */}
            <h2 className={styles.name}>{displayName}</h2>

            {/* Collection & Designer Sub-info */}
            {(displayCollection || displayDesigner) && (
              <div className={styles.subMeta}>
                {displayCollection && (
                  <span className={styles.subMetaItem}>
                    <strong>{isAr ? 'التشكيلة:' : 'Collection:'}</strong> {displayCollection}
                  </span>
                )}
                {displayDesigner && (
                  <span className={styles.subMetaItem}>
                    <strong>{isAr ? 'المصمم:' : 'Designer:'}</strong> {displayDesigner}
                  </span>
                )}
              </div>
            )}

            {/* Trying Fee / Price */}
            {product.trying_fee ? (
              <div className={styles.feeBox}>
                <span className={styles.feeLabel}>{isAr ? 'رسوم التجربة والقياس:' : 'Fitting & Trying Fee:'}</span>
                <span className={styles.feeValue}>{parseFloat(product.trying_fee).toLocaleString()} {isAr ? 'ج.م' : 'EGP'}</span>
              </div>
            ) : null}

            {/* Rating */}
            <div className={styles.ratingRow}>
              <div className={styles.stars}>
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={14} fill="#c8a96a" color="#c8a96a" />
                ))}
              </div>
              <span className={styles.reviewCount}>(5.0 / {isAr ? 'مقيّم متميز' : 'Top Rated'})</span>
            </div>

            {/* Description */}
            {displayDesc && (
              <p className={styles.desc}>{displayDesc}</p>
            )}

            {/* Attributes / Details Grid */}
            <div className={styles.specGrid}>
              {/* Color */}
              {displayColor && (
                <div className={styles.specItem}>
                  <div className={styles.specHeader}>
                    <Palette size={14} className={styles.specIcon} />
                    <span className={styles.specLabel}>{isAr ? 'اللون' : 'COLOR'}</span>
                  </div>
                  <div className={styles.specValueGroup}>
                    <span className={styles.colorDot} style={{ backgroundColor: getSwatchColor(displayColor) }} />
                    <span className={styles.specValue}>{displayColor}</span>
                  </div>
                </div>
              )}

              {/* Fabric */}
              {displayFabric && (
                <div className={styles.specItem}>
                  <div className={styles.specHeader}>
                    <Shirt size={14} className={styles.specIcon} />
                    <span className={styles.specLabel}>{isAr ? 'القماش' : 'FABRIC'}</span>
                  </div>
                  <span className={styles.specValue}>{displayFabric}</span>
                </div>
              )}
            </div>

            {/* Suitable Weight Box (Full Width as in Image 2) */}
            {displayWeight && (
              <div className={styles.weightSection}>
                <div className={styles.weightHeader}>
                  <Scale size={14} className={styles.weightIcon} />
                  <span className={styles.weightLabel}>{isAr ? 'الوزن المناسب:' : 'SUITABLE WEIGHT:'}</span>
                </div>
                <div className={styles.weightValueBox}>
                  <span className={styles.weightValueText}>{displayWeight}</span>
                </div>
              </div>
            )}

            {/* Accessories */}
            {product.accessories && product.accessories.length > 0 && (
              <div className={styles.specItem}>
                <div className={styles.specHeader}>
                  <Package size={14} className={styles.specIcon} />
                  <span className={styles.specLabel}>{isAr ? 'الإكسسوارات والملحقات' : 'INCLUDED ACCESSORIES'}</span>
                </div>
                <div className={styles.accChips}>
                  {product.accessories.map((acc, i) => (
                    <span key={i} className={styles.accChip}>✨ {acc}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className={styles.actionsBlock}>
              <button className={styles.addToCartBtn} onClick={handleAdd}>
                {isAr ? 'حجز موعد تجربة الفستان' : 'BOOK A FITTING APPOINTMENT'}
              </button>
              <button
                className={`${styles.wishlistBtn} ${isWishlisted(product.id) ? styles.activeWish : ''}`}
                onClick={() => toggleWishlist(product)}
              >
                <Heart size={16} fill={isWishlisted(product.id) ? '#c8a96a' : 'none'} color={isWishlisted(product.id) ? '#c8a96a' : 'currentColor'} />
                <span>{isWishlisted(product.id) ? (isAr ? 'موجود بالمفضلة' : 'IN WISHLIST') : (isAr ? 'إضافة إلى المفضلة' : 'ADD TO WISHLIST')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getSwatchColor(colorName) {
  if (!colorName) return '#F8F5F0';
  const lower = colorName.toLowerCase();
  if (lower.includes('champagne')) return '#EBD8C3';
  if (lower.includes('blush') || lower.includes('rose')) return '#EFD9D7';
  if (lower.includes('white') || lower.includes('أبيض')) return '#FFFFFF';
  if (lower.includes('ivory') || lower.includes('عاجي')) return '#F8F5F0';
  if (lower.includes('silver') || lower.includes('فضي')) return '#E2E8F0';
  if (lower.includes('gold') || lower.includes('ذهبي')) return '#D4AF37';
  return '#E2E8F0';
}
