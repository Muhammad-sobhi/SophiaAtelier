'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { useScrollAnimation } from '../ScrollAnimations/useScrollAnimation';
import { useStore } from '../../context/StoreContext';
import { getStorageUrl } from '../../lib/api';
import styles from './Categories.module.css';

const DEFAULT_CATEGORY_IMAGES = {
  'BALL GOWN': '/images/categories/ballgown.png',
  'A-LINE': '/images/categories/aline.png',
  'MERMAID': '/images/categories/mermaid.png',
  'SHEATH': '/images/categories/sheath.png',
  'MINIMAL': '/images/categories/minimal.png',
};

export default function Categories() {
  const { categories, t, lang } = useStore();
  const ref = useScrollAnimation();

  const displayCategories = categories.length > 0
    ? categories.map((c) => ({
        id: c.id,
        name: lang === 'ar' && c.name_ar ? c.name_ar : c.name,
        name_ar: c.name_ar,
        count: c.dresses_count,
        image: c.image_path ? getStorageUrl(c.image_path) : (DEFAULT_CATEGORY_IMAGES[c.name?.toUpperCase()] || '/images/categories/ballgown.png'),
      }))
    : [
        { id: 1, name: lang === 'ar' ? 'بال جون' : 'Ball Gown', count: 8, image: '/images/categories/ballgown.png' },
        { id: 2, name: lang === 'ar' ? 'إيه لاين' : 'A-Line', count: 12, image: '/images/categories/aline.png' },
        { id: 3, name: lang === 'ar' ? 'ميرمايد' : 'Mermaid', count: 6, image: '/images/categories/mermaid.png' },
        { id: 4, name: lang === 'ar' ? 'سكات' : 'Sheath', count: 5, image: '/images/categories/sheath.png' },
        { id: 5, name: lang === 'ar' ? 'مينيمال' : 'Minimalist', count: 9, image: '/images/categories/minimal.png' },
      ];

  return (
    <section className={`section-padding ${styles.section}`} id="categories" ref={ref}>
      <div className="container">
        {/* Header */}
        <div className={styles.headerRow}>
          <div className={styles.headerTitles}>
            <span className={styles.eyebrow}>{t.categories.title}</span>
            <h2 className={styles.heading}>{t.categories.subtitle}</h2>
          </div>
          <Link href="/collections" className={styles.viewAllBtn}>
            <span>{t.hero.explore}</span>
            <ArrowUpRight size={14} />
          </Link>
        </div>

        {/* Categories Grid */}
        <div className={styles.grid}>
          {displayCategories.map((cat, i) => (
            <Link
              href={`/collections?category=${encodeURIComponent(cat.name)}`}
              key={cat.id || cat.name}
              className={styles.card}
              data-animate="fade-up"
              data-delay={String(Math.min(i + 1, 6))}
            >
              <div className={styles.imageWrap}>
                <Image
                  src={cat.image}
                  alt={cat.name}
                  fill
                  sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw"
                  unoptimized={typeof cat.image === 'string' && cat.image.includes('/storage/')}
                  className={styles.image}
                />
                <div className={styles.gradientOverlay} />

                {cat.count !== undefined && cat.count !== null && (
                  <span className={styles.countBadge}>{cat.count} {lang === 'ar' ? 'تصاميم' : 'Designs'}</span>
                )}

                <div className={styles.cardContent}>
                  <h3 className={styles.catName}>{cat.name}</h3>
                  <div className={styles.exploreLink}>
                    <span>{t.bestSellers.quickView}</span>
                    <ArrowUpRight size={14} className={styles.arrowIcon} />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
