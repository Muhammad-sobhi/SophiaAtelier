import { useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useStore } from '../../context/StoreContext';
import styles from './NewCollection.module.css';

export default function NewCollection() {
  const { t } = useStore();
  const bgRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      if (!bgRef.current) return;
      const rect = bgRef.current.parentElement.getBoundingClientRect();
      const offset = rect.top * 0.25;
      bgRef.current.style.transform = `translateY(${offset}px) scale(1.12)`;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <section className={styles.section}>
      <div className={styles.bgWrap} ref={bgRef}>
        <Image
          src="/images/new-collection.png"
          alt="Éternelle Collection"
          fill
          priority
          quality={95}
          className={styles.bgImage}
        />
      </div>
      <div className={styles.overlay}>
        <span className={styles.eyebrow}>{t.newCollection.eyebrow}</span>
        <h2 className={styles.heading}>{t.newCollection.title}</h2>
        <Link href="/collections?collection=Éternelle" className={styles.cta}>
          {t.newCollection.cta}
        </Link>
      </div>
    </section>
  );
}
