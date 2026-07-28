'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import styles from './Hero.module.css';

export default function Hero() {
  const { t } = useStore();
  const sectionRef = useRef(null);
  const bgRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      if (!bgRef.current) return;
      const y = window.scrollY;
      bgRef.current.style.transform = `translateY(${y * 0.35}px) scale(1.1)`;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      sectionRef.current?.classList.add(styles.loaded);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section className={styles.hero} id="home" ref={sectionRef}>
      {/* Parallax BG */}
      <div className={styles.bgWrap} ref={bgRef}>
        <Image
          src="/images/hero-bg.png"
          alt="Luxury bridal salon"
          fill
          priority
          quality={95}
          className={styles.bgImage}
        />
        {/* Left-to-right gradient blur */}
        <div className={styles.blurOverlay} />
        {/* Warm tint overlay */}
        <div className={styles.gradientOverlay} />
      </div>

      {/* Content */}
      <div className={`container ${styles.content}`}>
        {/* Left Vertical Slider Track */}
        <div className={styles.sliderTrack}>

          {/* <div className={styles.sliderLine}>
            <div className={styles.sliderFill} />
          </div> */}

        </div>

        <div className={styles.textBlock}>
          <span className={styles.eyebrow}>{t.hero.subtitle}</span>
          <h1 className={styles.heading}>
            <span className={styles.word}>{t.hero.title}</span>
          </h1>
          <p className={styles.subtitle}>
            {t.hero.desc}
          </p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '20px' }}>
            <Link href="/collections" className={styles.cta}>
              <span>{t.hero.explore}</span>
              <ArrowRight size={16} strokeWidth={1.5} />
            </Link>
            <Link href="/#appointment" className={styles.cta} style={{ background: 'transparent', border: '1px solid #c8a96a', color: '#1a1a1a' }}>
              <span>{t.hero.howToBook}</span>
            </Link>
          </div>
        </div>

        {/* Bride Image — blended into the scene */}
        <div className={styles.brideWrap}>
          <Image
            src="/images/hero-bride.png"
            alt="Bride in wedding dress"
            width={650}
            height={820}
            priority
            quality={95}
            className={styles.brideImage}
          />
        </div>
      </div>

      {/* Bottom Bar */}
      <div className={styles.bottomBar}>
        <div className={styles.scrollLeft}>

        </div>


      </div>
    </section>
  );
}
