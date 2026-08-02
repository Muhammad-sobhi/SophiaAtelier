'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Phone, MapPin, ExternalLink } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import styles from './Footer.module.css';

const EXACT_MAP_URL = "https://maps.app.goo.gl/RUyaQk3v1rZR4gVC6";
const EMBED_MAP_SRC = "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3454.14856417757!2d31.445114!3d30.047744!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMzDCsDAyJzUxLjkiTiAzMcKwMjYnNDIuNCJF!5e0!3m2!1sen!2seg!4v1700000000000!5m2!1sen!2seg";

export default function Footer() {
  const { t, lang } = useStore();
  const isAr = lang === 'ar';

  const navigateLinks = [
    { label: t.nav.home, href: '/' },
    { label: t.nav.collections, href: '/collections' },
    { label: t.bestSellers.title, href: '/#bestsellers' },
    { label: t.categories.title, href: '/#categories' },
  ];

  const pageLinks = [
    { label: t.nav.about, href: '/about' },
    { label: t.nav.contact, href: '/contact' },
    { label: t.nav.howToBook, href: '/#appointment' },
    { label: t.nav.myJourney, href: '/track' },
  ];

  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.topGrid}`}>
        {/* Col 1: Logo & Social Media Icons */}
        <div className={styles.brandCol}>
          <div className={styles.logoWrap}>
            <Image
              src="/images/goldenlogo.png"
              alt="Sophia Dresses"
              width={260}
              height={130}
              className={styles.logo}
            />
          </div>
          {/* <p className={styles.tagline}>{t.footer.tagline}</p> */}

          <div className={styles.socials}>
            {/* Instagram */}
            <a href="https://www.instagram.com/sophiadresses2022?utm_source=qr" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className={styles.socialIcon}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c8a96a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></svg>
            </a>
            {/* Facebook */}
            <a href="https://www.facebook.com/share/1Ef8MfyiGi/?mibextid=wwXIfr" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className={styles.socialIcon}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#c8a96a"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
            </a>
            {/* TikTok */}
            <a href="https://www.tiktok.com/@sophia.dresses0?_r=1&_t=ZS-98EEvFckAlx" target="_blank" rel="noopener noreferrer" aria-label="TikTok" className={styles.socialIcon}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#c8a96a"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.82.57-1.31 1.56-1.3 2.56.02 1.12.63 2.18 1.59 2.73.91.53 2.07.61 3.06.22 1.05-.39 1.83-1.36 1.97-2.48.06-2.95.03-5.91.04-8.86-.01-1.33-.01-2.65-.01-3.98z" /></svg>
            </a>
          </div>
        </div>

        {/* Col 2: Navigate */}
        <div className={styles.linkCol}>
          <h4 className={styles.colHeader}>{t.footer.navigate}</h4>
          <ul className={styles.linkList}>
            {navigateLinks.map((link) => (
              <li key={link.href + link.label}>
                <Link href={link.href} className={styles.footerLink}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Col 3: Pages */}
        <div className={styles.linkCol}>
          <h4 className={styles.colHeader}>{t.footer.pages}</h4>
          <ul className={styles.linkList}>
            {pageLinks.map((link) => (
              <li key={link.href + link.label}>
                <Link href={link.href} className={styles.footerLink}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Col 4: Visit Us & Luxury Gold Framed Map */}
        <div className={styles.visitCol}>
          <h4 className={styles.colHeader}>{t.footer.visitUs}</h4>

          <div className={styles.infoBlock}>
            <div className={styles.infoRow}>
              <Phone size={16} className={styles.goldIcon} />
              <a href="tel:+201554159359" className={styles.phoneLink}>
                +20 155 415 9359
              </a>
            </div>

            <div className={styles.infoRow}>
              <MapPin size={18} className={styles.goldIconTop} />
              <div className={styles.addressText}>
                <p>{t.footer.address}</p>
                <p className={styles.signNote}>{t.footer.signNote}</p>
              </div>
            </div>

            {/* Custom Luxury Gold Framed Interactive Map Card */}
            <a
              href={EXACT_MAP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.luxuryMapCard}
              title={isAr ? "افتح الموقع في خرائط جوجل" : "Open in Google Maps"}
            >
              {/* Map Background Tile */}
              <iframe
                title="Sophia Dresses Boutique Location"
                src={EMBED_MAP_SRC}
                width="100%"
                height="100%"
                className={styles.mapIframe}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />

              {/* Top Glassmorphism Status Badge */}
              <div className={styles.mapBadge}>
                <span className={styles.mapBadgeTitle}>SOPHIA DRESSES</span>
                <span className={styles.mapBadgeStatus}>{isAr ? 'مفتوح الآن 📍' : 'OPEN NOW 📍'}</span>
              </div>

              {/* Custom Center Gold Pin Marker */}
              <div className={styles.mapPinWrap}>
                <div className={styles.goldPin}>
                  <div className={styles.goldPinInner}>
                    <span className={styles.pinLogoText}>SD</span>
                  </div>
                </div>
                <div className={styles.pinShadow} />
                <span className={styles.pinAddressLabel}>{isAr ? 'التجمع الأول - الياسمين 2' : 'Al-Yasmeen 2, Villa 161'}</span>
              </div>
            </a>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className={styles.bottomBar}>
        <div className={`container ${styles.bottomInner}`}>
          <p className={styles.copyright}>{t.footer.copyright}</p>
          <div className={styles.legalLinks}>
            <a href="#">{t.footer.privacy}</a>
            <span className={styles.divider}>|</span>
            <a href="#">{t.footer.terms}</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
