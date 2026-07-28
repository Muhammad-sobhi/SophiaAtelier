'use client';

import Image from 'next/image';
import Link from 'next/link';
import { TextReveal, useScrollAnimation } from '../ScrollAnimations/useScrollAnimation';
import { useStore } from '../../context/StoreContext';
import { getStorageUrl } from '../../lib/api';
import styles from './Collections.module.css';

const DEFAULT_COLLECTIONS = [
  {
    name: 'Classic',
    tagline: 'Timeless & Elegant',
    image: '/images/collection-classic.png',
    href: '/collections?collection=Classic',
  },
  {
    name: 'Royal',
    tagline: 'Luxurious & Glamorous',
    image: '/images/collection-royal.png',
    href: '/collections?collection=Royal',
  },
  {
    name: 'Boho',
    tagline: 'Free-Spirited & Romantic',
    image: '/images/collection-boho.png',
    href: '/collections?collection=Boho',
  },
];

export default function Collections() {
  const { collections, t, lang } = useStore();
  const ref = useScrollAnimation();

  const defaultCollections = [
    {
      name: lang === 'ar' ? 'كلاسيك' : 'Classic',
      tagline: lang === 'ar' ? 'أناقة كلاسيكية خالدة' : 'Timeless & Elegant',
      image: '/images/collection-classic.png',
      href: '/collections?collection=Classic',
    },
    {
      name: lang === 'ar' ? 'ملكي' : 'Royal',
      tagline: lang === 'ar' ? 'فخامة وملكية ساحرة' : 'Luxurious & Glamorous',
      image: '/images/collection-royal.png',
      href: '/collections?collection=Royal',
    },
    {
      name: lang === 'ar' ? 'بوهو' : 'Boho',
      tagline: lang === 'ar' ? 'رومانسية وعصرية' : 'Free-Spirited & Romantic',
      image: '/images/collection-boho.png',
      href: '/collections?collection=Boho',
    },
  ];

  const displayCollections = collections.length > 0
    ? collections.map((c) => ({
        name: lang === 'ar' && c.name_ar ? c.name_ar : c.name,
        tagline: lang === 'ar' && c.name_ar ? c.name_ar : (c.tagline || 'Exclusive Collection'),
        image: c.image ? getStorageUrl(c.image) : '/images/collection-classic.png',
        href: `/collections?collection=${encodeURIComponent(c.name)}`,
      }))
    : defaultCollections;

  return (
    <section className={`section-padding ${styles.section}`} id="collections" ref={ref}>
      <div className={`container ${styles.layout}`}>
        {/* Left Side Info */}
        <div className={styles.leftCol}>
          <span className={styles.eyebrow} data-animate="fade-up">{t.ourCollections.eyebrow}</span>
          <TextReveal text={t.ourCollections.title} Tag="h2" className={styles.heading} />
          <p className={styles.paragraph} data-animate="fade-up">
            {t.ourCollections.desc}
          </p>
          <Link href="/collections" className={styles.viewBtn} data-animate="fade-up">
            {t.ourCollections.viewAll}
          </Link>
        </div>

        {/* Right Side Arch Cards */}
        <div className={styles.cardsGrid}>
          {displayCollections.map((col, i) => (
            <Link
              href={col.href}
              key={col.name}
              className={styles.card}
              data-animate="scale-in"
              data-delay={String(i + 1)}
            >
              <div className={styles.archFrame}>
                <Image
                  src={col.image}
                  alt={col.name}
                  width={350}
                  height={500}
                  unoptimized={col.image.includes('/storage/')}
                  className={styles.image}
                />
              </div>
              <div className={styles.cardMeta}>
                <h3 className={styles.collectionName}>{col.name}</h3>
                <p className={styles.tagline}>{col.tagline}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
