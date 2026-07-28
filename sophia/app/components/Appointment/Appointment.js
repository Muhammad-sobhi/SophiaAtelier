'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Eye, Heart, ShoppingBag, Calendar } from 'lucide-react';
import { useScrollAnimation } from '../ScrollAnimations/useScrollAnimation';
import { useStore } from '../../context/StoreContext';
import styles from './Appointment.module.css';

export default function DreamDress() {
  const { t } = useStore();
  const ref = useScrollAnimation();

  const steps = [
    {
      step: '01',
      icon: Eye,
      title: t.appointment.step1Title,
      desc: t.appointment.step1Desc,
    },
    {
      step: '02',
      icon: Heart,
      title: t.appointment.step2Title,
      desc: t.appointment.step2Desc,
    },
    {
      step: '03',
      icon: ShoppingBag,
      title: t.appointment.step3Title,
      desc: t.appointment.step3Desc,
    },
    {
      step: '04',
      icon: Calendar,
      title: t.appointment.step4Title,
      desc: t.appointment.step4Desc,
    },
  ];

  return (
    <section className={styles.section} id="appointment" ref={ref}>
      {/* Background Bride Photo extending across left and center */}
      <div className={styles.bgWrap}>
        <Image
          src="/images/dreemdress.png"
          alt="Luxury bridal salon"
          fill
          priority
          quality={95}
          className={styles.bgImage}
        />
        {/* Subtle dark gradient overlay over left image */}
        <div className={styles.bgGradient} />
      </div>

      <div className={styles.contentGrid}>
        {/* Left Content over image */}
        <div className={styles.leftCol} data-animate="slide-left">
          <span className={styles.eyebrow}>{t.appointment.badge}</span>
          <h2 className={styles.heading}>{t.appointment.title}</h2>
        </div>

        {/* Center spacing area for bride image */}
        <div className={styles.centerSpace} />

        {/* Right Dark Panel with 4-step Journey */}
        <div className={styles.rightPanel} data-animate="slide-right">
          <div className={styles.dividerLine} />

          <div className={styles.panelHeader}>
            <span className={styles.panelEyebrow}>{t.appointment.badge}</span>
            <h3 className={styles.panelTitle}>{t.appointment.title}</h3>
          </div>

          <div className={styles.perksList}>
            {steps.map((s) => (
              <div key={s.step} className={styles.perkItem}>
                <div className={styles.stepBadge}>
                  <span className={styles.stepNum}>{s.step}</span>
                  <div className={styles.iconCircle}>
                    <s.icon size={18} strokeWidth={1.5} />
                  </div>
                </div>
                <div className={styles.perkText}>
                  <h4 className={styles.perkTitle}>{s.title}</h4>
                  <p className={styles.perkDesc}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
