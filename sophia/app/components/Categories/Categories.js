'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, Award, Heart, Ruler, Truck, Sparkles, Gem, Crown } from 'lucide-react';
import { useScrollAnimation } from '../ScrollAnimations/useScrollAnimation';
import { useStore } from '../../context/StoreContext';
import { getStorageUrl } from '../../lib/api';
import styles from './Categories.module.css';

// SVG Silhouette Icons for top-left translucent circular badges
const CategoryIcon = ({ type }) => {
  switch (type) {
    case 'gown':
    case 'evening':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2L8 7v4l-3 11h14l-3-11V7l-4-5z" />
          <path d="M9 7h6" />
        </svg>
      );
    case 'veil':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 4c4-2 10-2 14 0v16c-7 2-7 2-14 0V4z" />
          <path d="M9 4v16" />
        </svg>
      );
    case 'kids':
    case 'bridesmaid':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3l-3 4v3l-2 9h10l-2-9V7l-3-4z" />
        </svg>
      );
    case 'ring':
    case 'jewelry':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="14" r="6" />
          <path d="M12 2l3 4h-6l3-4z" />
        </svg>
      );
    case 'wedding':
    default:
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2L7 8v3l-4 11h18L17 11V8l-5-6z" />
          <path d="M8 8c2.5 1 5.5 1 8 0" />
        </svg>
      );
  }
};

const DEFAULT_MOCKUP_CATEGORIES = [
  { id: 1, name: 'Wedding Dresses', name_ar: 'فساتين الزفاف', count: 82, type: 'wedding', image: '/images/categories/ballgown.png' },
  { id: 2, name: 'Evening Dresses', name_ar: 'فساتين سهرة', count: 36, type: 'evening', image: '/images/categories/aline.png' },
  { id: 3, name: 'Veils & Accessories', name_ar: 'طرحة وإكسسوارات', count: 27, type: 'veil', image: '/images/categories/mermaid.png' },
  { id: 4, name: 'Bridesmaid & Kids', name_ar: 'وصيفات وأطفال', count: 18, type: 'kids', image: '/images/categories/sheath.png' },
  { id: 5, name: 'Accessories', name_ar: 'مجوهرات وملحقات', count: 24, type: 'ring', image: '/images/categories/minimal.png' },
];

export default function Categories() {
  const { categories, t, lang } = useStore();
  const ref = useScrollAnimation();

  const displayCategories = categories.length > 0
    ? categories.slice(0, 5).map((c, i) => {
        const defaultRef = DEFAULT_MOCKUP_CATEGORIES[i] || DEFAULT_MOCKUP_CATEGORIES[0];
        return {
          id: c.id,
          name: lang === 'ar' && c.name_ar ? c.name_ar : c.name,
          count: c.dresses_count !== undefined && c.dresses_count !== null ? c.dresses_count : defaultRef.count,
          type: defaultRef.type,
          image: c.image_path ? getStorageUrl(c.image_path) : defaultRef.image,
        };
      })
    : DEFAULT_MOCKUP_CATEGORIES.map((c) => ({
        ...c,
        name: lang === 'ar' ? c.name_ar : c.name,
      }));

  return (
    <section className={styles.section} id="categories" ref={ref}>
      {/* Warm Ambient Hero Background Banner */}
      <div className={styles.heroBanner}>
        <div className={styles.heroBgImage} />
        <div className={styles.heroOverlay} />
        <div className={`container ${styles.heroContent}`}>
          <div className={styles.leftCol}>
            <span className={styles.eyebrow}>{lang === 'ar' ? 'تسوقي حسب التصنيف' : 'SHOP BY CATEGORY'}</span>
            <h2 className={styles.heading}>
              {lang === 'ar'
                ? 'اعثري على القصة والأسلوب المثالي ليومك المميز'
                : 'Find the perfect silhouette and style for your special day'}
            </h2>
            <p className={styles.subtext}>
              {lang === 'ar'
                ? 'من التصاميم الكلاسيكية الخالدة إلى التحف العصرية، استكشفي تشكيلاتنا المنسقة بعناية لنتألقي في ليلتك.'
                : 'From timeless classics to modern masterpieces, explore our thoughtfully curated collections designed to make you shine.'}
            </p>

            <Link href="/collections" className={styles.exploreBtn}>
              <span>{lang === 'ar' ? 'استكشاف التشكيلة' : 'EXPLORE COLLECTION'}</span>
              <ArrowUpRight size={14} className={styles.btnArrow} />
            </Link>
          </div>
        </div>
      </div>

      {/* Categories 5-Columns Cards Container */}
      <div className={`container ${styles.cardsContainer}`}>
        <div className={styles.grid}>
          {displayCategories.map((cat, i) => (
            <Link
              href={`/collections?category=${encodeURIComponent(cat.name)}`}
              key={cat.id || cat.name}
              className={styles.card}
              data-animate="fade-up"
              data-delay={String(Math.min(i + 1, 5))}
            >
              <div className={styles.imageWrap}>
                <Image
                  src={cat.image}
                  alt={cat.name}
                  fill
                  sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
                  unoptimized={typeof cat.image === 'string' && cat.image.includes('/storage/')}
                  className={styles.image}
                />
                <div className={styles.gradientOverlay} />

                {/* Top-Left Translucent Icon Circle Badge */}
                <div className={styles.iconCircle}>
                  <CategoryIcon type={cat.type} />
                </div>

                {/* Bottom Card Content */}
                <div className={styles.cardContent}>
                  <span className={styles.designCount}>
                    {cat.count} {lang === 'ar' ? 'تصاميم' : 'DESIGNS'}
                  </span>
                  <h3 className={styles.catName}>{cat.name}</h3>
                  <div className={styles.shopNowLink}>
                    <span>{lang === 'ar' ? 'تسوقي الآن' : 'SHOP NOW'}</span>
                    <ArrowUpRight size={13} className={styles.arrowIcon} />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Bottom Feature / Trust Strip */}
        <div className={styles.trustStrip}>
          <div className={styles.trustItem}>
            <div className={styles.trustIconWrap}>
              <Award size={18} className={styles.trustIcon} />
            </div>
            <div className={styles.trustText}>
              <h4>{lang === 'ar' ? 'جودة فاخرة' : 'Premium Quality'}</h4>
              <p>{lang === 'ar' ? 'أرقى الأقمشة والحرفية' : 'Finest fabrics & craftsmanship'}</p>
            </div>
          </div>

          <div className={styles.trustDivider} />

          <div className={styles.trustItem}>
            <div className={styles.trustIconWrap}>
              <Heart size={18} className={styles.trustIcon} />
            </div>
            <div className={styles.trustText}>
              <h4>{lang === 'ar' ? 'صُنعت بحب' : 'Made with Love'}</h4>
              <p>{lang === 'ar' ? 'مصممة للحظاتك الخاصة' : 'Designed for your special moments'}</p>
            </div>
          </div>

          <div className={styles.trustDivider} />

          <div className={styles.trustItem}>
            <div className={styles.trustIconWrap}>
              <Ruler size={18} className={styles.trustIcon} />
            </div>
            <div className={styles.trustText}>
              <h4>{lang === 'ar' ? 'قياسات مخصصة' : 'Custom Fitting'}</h4>
              <p>{lang === 'ar' ? 'مضبوطة تماماً لأجلك' : 'Tailored perfectly for you'}</p>
            </div>
          </div>

          <div className={styles.trustDivider} />

          <div className={styles.trustItem}>
            <div className={styles.trustIconWrap}>
              <Truck size={18} className={styles.trustIcon} />
            </div>
            <div className={styles.trustText}>
              <h4>{lang === 'ar' ? 'خدمة متميزة' : 'Worldwide Shipping'}</h4>
              <p>{lang === 'ar' ? 'توصيل وتنسيق خيالي' : 'Delivering joy to your door'}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
