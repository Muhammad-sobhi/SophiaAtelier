'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Search, User, Heart, ShoppingBag, Menu, X, Globe } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import styles from './Navbar.module.css';

export default function Navbar({ onSearchClick, onWishlistClick, onCartClick, cartCount = 0, wishlistCount = 0 }) {
  const { brideUser, setAuthModalOpen, t, lang, toggleLang } = useStore();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const navLinks = [
    { label: t.nav.home, href: '/' },
    { label: t.nav.collections, href: '/collections' },
    { label: t.nav.howToBook, href: '/#appointment' },
    { label: t.nav.about, href: '/about' },
    { label: t.nav.contact, href: '/contact' },
  ];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    const checkMobile = () => setIsMobile(window.innerWidth <= 900);
    checkMobile();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', checkMobile);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const showGoldenLogo = scrolled || isMobile || mobileOpen;

  return (
    <>
      <nav className={`${styles.navbar} ${scrolled ? styles.scrolled : ''}`} id="navbar">
        <div className={styles.navInner}>
          <Link href="/" className={styles.logo}>
            <Image
              src={showGoldenLogo ? "/images/goldenlogo.png" : "/images/whitelogo.png"}
              alt="Sophia Dresses"
              width={220}
              height={85}
              priority
              className={styles.logoImage}
            />
          </Link>

          <ul className={styles.navLinks}>
            {navLinks.map((link) => (
              <li key={link.href + link.label}>
                <Link href={link.href} className={styles.navLink}>{link.label}</Link>
              </li>
            ))}
          </ul>

          <div className={styles.navIcons}>
            {/* Language Toggle Button */}
            <button
              onClick={toggleLang}
              className={styles.iconBtn}
              title={lang === 'en' ? 'تغيير للغة العربية' : 'Switch to English'}
              style={{ display: 'flex', itemsCenter: 'center', gap: '4px', fontSize: '11px', fontWeight: '700', letterSpacing: '0.5px' }}
            >
              <Globe size={18} strokeWidth={1.5} />
              <span>{t.nav.switchLang}</span>
            </button>

            <button className={styles.iconBtn} aria-label="Search" onClick={onSearchClick}>
              <Search size={20} strokeWidth={1.5} />
            </button>
            <button
              className={`${styles.iconBtn} ${brideUser ? styles.activeUser : ''}`}
              aria-label="User Account"
              onClick={() => {
                if (brideUser) {
                  window.location.href = '/track';
                } else {
                  setAuthModalOpen(true);
                }
              }}
              title={brideUser ? `${t.nav.welcome || 'Logged in as'} ${brideUser.name}` : t.nav.account}
            >
              <User size={20} strokeWidth={1.5} />
            </button>
            <button className={styles.iconBtn} aria-label="Wishlist" onClick={onWishlistClick}>
              <Heart size={20} strokeWidth={1.5} />
              {wishlistCount > 0 && <span className={styles.badge}>{wishlistCount}</span>}
            </button>
            <button className={styles.iconBtn} aria-label="Shopping Bag" onClick={onCartClick}>
              <ShoppingBag size={20} strokeWidth={1.5} />
              {cartCount > 0 && <span className={styles.badge}>{cartCount}</span>}
            </button>
          </div>

          <button className={styles.menuToggle} onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle Menu">
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      <div className={`${styles.mobileOverlay} ${mobileOpen ? styles.mobileOpen : ''}`}>
        <div className={styles.mobileMenu}>
          <ul className={styles.mobileLinks}>
            {navLinks.map((link, i) => (
              <li key={link.href + link.label} style={{ animationDelay: `${i * 0.08}s` }}>
                <Link href={link.href} className={styles.mobileLink} onClick={() => setMobileOpen(false)}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          <div style={{ padding: '15px 0', borderTop: '1px solid rgba(200, 169, 106, 0.2)', marginBottom: '15px', display: 'flex', justifyContent: 'center' }}>
            <button
              onClick={() => { toggleLang(); setMobileOpen(false); }}
              style={{ background: 'none', border: '1px solid #c8a96a', color: '#1a1a1a', padding: '8px 18px', borderRadius: '20px', fontSize: '13px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
            >
              <Globe size={18} />
              <span>{t.nav.switchLang}</span>
            </button>
          </div>

          <div className={styles.mobileIcons}>
            <button className={styles.iconBtn} onClick={() => { setMobileOpen(false); onSearchClick?.(); }}><Search size={22} strokeWidth={1.5} /></button>
            <button
              className={styles.iconBtn}
              onClick={() => {
                setMobileOpen(false);
                if (brideUser) window.location.href = '/track';
                else setAuthModalOpen(true);
              }}
            >
              <User size={22} strokeWidth={1.5} />
            </button>
            <button className={styles.iconBtn} onClick={() => { setMobileOpen(false); onWishlistClick?.(); }}><Heart size={22} strokeWidth={1.5} /></button>
            <button className={styles.iconBtn} onClick={() => { setMobileOpen(false); onCartClick?.(); }}><ShoppingBag size={22} strokeWidth={1.5} /></button>
          </div>
        </div>
      </div>
    </>
  );
}
