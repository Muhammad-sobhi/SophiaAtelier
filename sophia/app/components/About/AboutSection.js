'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Heart, Scissors, Gem, Shirt, ArrowRight } from 'lucide-react';
import { useScrollAnimation } from '../ScrollAnimations/useScrollAnimation';
import { useStore } from '../../context/StoreContext';
import styles from './AboutSection.module.css';

export default function AboutSection() {
  const { t } = useStore();
  const storyRef = useScrollAnimation();
  const promiseRef = useScrollAnimation();
  const statsRef = useScrollAnimation();

  const values = [
    {
      icon: Heart,
      title: t.about.v1Title,
      subtitle: t.about.v1Desc,
    },
    {
      icon: Scissors,
      title: t.about.v2Title,
      subtitle: t.about.v2Desc,
    },
    {
      icon: Gem,
      title: t.about.v3Title,
      subtitle: t.about.v3Desc,
    },
  ];

  const stats = [
    { number: '10+', label: t.about.v1Title },
    { number: '5K+', label: t.about.v2Title },
    { number: '30+', label: t.about.v3Title },
    { number: '100%', label: t.about.storyTitle },
  ];

  return (
    <div className={styles.container}>
      {/* 1. OUR STORY SECTION */}
      <section className={styles.storySection} ref={storyRef}>
        <div className={styles.storyGrid}>
          {/* Left Column: Overlapping Images */}
          <div className={styles.imageComposition} data-animate="slide-left">
            <div className={styles.mainImageWrap}>
              <Image
                src="/images/about.png"
                alt="Luxury gown in boutique"
                fill
                quality={95}
                className={styles.mainImage}
                priority
              />
            </div>
            <div className={styles.overlapImageWrap}>
              <Image
                src="/images/about2.png"
                alt="Handcrafted lacework detail"
                fill
                quality={95}
                className={styles.overlapImage}
              />
            </div>
          </div>

          {/* Right Column: Content */}
          <div className={styles.storyContent} data-animate="slide-right">
            <span className={styles.eyebrow}>{t.about.storyTitle}</span>
            <h2 className={styles.heading}>{t.about.title}</h2>
            <div className={styles.description}>
              <p>{t.about.storyText}</p>
            </div>

            {/* Feature Badges */}
            <div className={styles.valuesGrid}>
              {values.map((val) => (
                <div key={val.title} className={styles.valueItem}>
                  <div className={styles.iconCircle}>
                    <val.icon size={22} strokeWidth={1.3} />
                  </div>
                  <h4 className={styles.valueTitle}>{val.title}</h4>
                  <p className={styles.valueSub}>{val.subtitle}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 2. OUR PROMISE SECTION */}
      <section className={styles.promiseSection} ref={promiseRef}>
        <div className={styles.promiseBanner}>
          <Image
            src="/images/about3.png"
            alt="Bridal gown sketch and flowers"
            fill
            quality={95}
            className={styles.promiseBgImage}
          />
          <div className={styles.promiseOverlay} />

          <div className={styles.promiseContent} data-animate="fade-up">
            <span className={styles.promiseEyebrow}>{t.about.valuesTitle}</span>
            <h3 className={styles.promiseHeading}>{t.about.subtitle}</h3>
            <Link href="/contact" className={styles.appointmentBtn}>
              <span>{t.appointment.bookBtn}</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* 3. STATS BAR SECTION */}
      <section className={styles.statsSection} ref={statsRef}>
        <div className={styles.statsGrid} data-animate="fade-up">
          {stats.map((stat, index) => (
            <div key={stat.number} className={styles.statItem}>
              <div className={styles.statNumber}>{stat.number}</div>
              <div className={styles.statLabel}>{stat.label}</div>
              {index < stats.length - 1 && <div className={styles.statDivider} />}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
