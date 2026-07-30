'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Phone, Mail, MapPin, Clock, Calendar, Sparkles, Award, CheckCircle } from 'lucide-react';
import { useScrollAnimation } from '../ScrollAnimations/useScrollAnimation';
import { useStore } from '../../context/StoreContext';
import styles from './ContactSection.module.css';

export default function ContactSection() {
  const { t } = useStore();
  const ref = useScrollAnimation();

  const contactInfo = [
    {
      icon: Phone,
      title: t.contact.phone,
      content: '+20 155 415 9359',
    },
    {
      icon: Mail,
      title: t.contact.email,
      content: 'info@sophiadresses.cloud',
    },
    {
      icon: MapPin,
      title: t.contact.address,
      content: t.footer.address + '\n' + t.footer.signNote,
    },
    {
      icon: Clock,
      title: t.contact.hours || 'Working Hours',
      content: t.contact.hoursVal || '7 Days a Week: 01:00 PM – 08:30 PM',
    },
  ];

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
      const res = await fetch(`${API_BASE}/public/contact-messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Error sending message');
      }

      setSuccess(true);
      setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
    } catch (err) {
      setError(err.message || 'Error sending message');
    } finally {
      setLoading(false);
    }
  };

  const bottomFeatures = [
    {
      icon: Calendar,
      title: t.about.v1Title || 'Book with Ease',
      desc: t.about.v1Desc || 'Schedule your private appointment online.',
    },
    {
      icon: Sparkles,
      title: t.about.v2Title || 'Expert Guidance',
      desc: t.about.v2Desc || 'Our stylists are here to bring your vision to life.',
    },
    {
      icon: Award,
      title: t.about.v3Title || 'Unforgettable Experience',
      desc: t.about.v3Desc || 'Enjoy a personalized fitting in a luxurious setting.',
    },
  ];

  return (
    <section className={styles.section} id="contact-section" ref={ref}>
      <div className={styles.wrapper}>
        {/* Main Card Container with Outer Shadow & Rounded Corners */}
        <div className={styles.cardContainer}>
          {/* Main Top Grid */}
          <div className={styles.topGrid}>
            {/* Left Image Section */}
            <div className={styles.leftImageWrapper} data-animate="slide-left">
              <Image
                src="/images/contact.png"
                alt="Bridal Studio Display"
                fill
                quality={95}
                className={styles.leftImage}
                priority
              />
              <div className={styles.imageOverlayGradient} />
            </div>

            {/* Right Form & Contact Details Section */}
            <div className={styles.rightContent} data-animate="slide-right">
              <span className={styles.eyebrow}>{t.contact.eyebrow}</span>
              <h2 className={styles.heading}>{t.contact.title}</h2>
              <p className={styles.subtext}>{t.contact.subtitle}</p>

              {/* Two Column Layout: Info Column & Form Column */}
              <div className={styles.interactiveGrid}>
                {/* Info List */}
                <div className={styles.infoList}>
                  {contactInfo.map((item) => (
                    <div key={item.title} className={styles.infoItem}>
                      <div className={styles.iconCircle}>
                        <item.icon size={18} strokeWidth={1.5} />
                      </div>
                      <div className={styles.infoText}>
                        <h4 className={styles.infoTitle}>{item.title}</h4>
                        <p className={styles.infoContent} style={{ whiteSpace: 'pre-line' }}>{item.content}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Contact Form */}
                {success ? (
                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '16px', padding: '30px 20px', textAlign: 'center', margin: 'auto 0' }}>
                    <CheckCircle size={48} style={{ color: '#16a34a', marginBottom: '12px' }} />
                    <h4 style={{ fontSize: '18px', fontWeight: '700', color: '#14532d', marginBottom: '6px' }}>{t.contact.successTitle}</h4>
                    <p style={{ fontSize: '12px', color: '#166534', lineHeight: '1.6' }}>{t.contact.successDesc}</p>
                    <button
                      type="button"
                      onClick={() => setSuccess(false)}
                      style={{ marginTop: '16px', padding: '8px 18px', background: '#166534', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
                    >
                      {t.contact.sendAnother}
                    </button>
                  </div>
                ) : (
                  <form className={styles.contactForm} onSubmit={handleSubmit}>
                    {error && (
                      <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '10px 14px', borderRadius: '10px', fontSize: '12px' }}>
                        {error}
                      </div>
                    )}

                    <div className={styles.formRow}>
                      <input
                        type="text"
                        placeholder={t.contact.namePlaceholder}
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className={styles.inputField}
                        required
                      />
                      <input
                        type="email"
                        placeholder={t.contact.emailPlaceholder}
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className={styles.inputField}
                        required
                      />
                    </div>

                    <input
                      type="tel"
                      placeholder={t.contact.phonePlaceholder}
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className={styles.inputField}
                    />

                    <div className={styles.selectWrapper}>
                      <select
                        className={styles.selectField}
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      >
                        <option value="" disabled hidden>
                          {t.contact.subjectPlaceholder}
                        </option>
                        <option value="Book an Appointment">{t.contact.subjectOptions?.appointment}</option>
                        <option value="Styling Consultation">{t.contact.subjectOptions?.consultation}</option>
                        <option value="Custom Dress Design">{t.contact.subjectOptions?.customDesign}</option>
                        <option value="General Inquiry">{t.contact.subjectOptions?.general}</option>
                      </select>
                    </div>

                    <textarea
                      placeholder={t.contact.msgPlaceholder}
                      rows={4}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      className={styles.textareaField}
                      required
                    />

                    <button type="submit" className={styles.submitBtn} disabled={loading}>
                      {loading ? t.contact.sending : t.contact.sendBtn}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Features & Quote Footer Bar */}
          <div className={styles.bottomBar}>
            {/* 3 Perks Items */}
            <div className={styles.featuresList}>
              {bottomFeatures.map((feature) => (
                <div key={feature.title} className={styles.featureItem}>
                  <div className={styles.featureIconCircle}>
                    <feature.icon size={20} strokeWidth={1.4} />
                  </div>
                  <div className={styles.featureText}>
                    <h5 className={styles.featureTitle}>{feature.title}</h5>
                    <p className={styles.featureDesc}>{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Vertical Divider */}
            <div className={styles.verticalDivider} />

            {/* Right Cursive Quote */}
            <div className={styles.quoteBox}>
              <p className={styles.quoteText}>
                {t.contact.quote}
              </p>
              <div className={styles.ornamentLine}>
                <span className={styles.diamond} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
