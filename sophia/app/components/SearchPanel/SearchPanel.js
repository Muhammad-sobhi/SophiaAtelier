'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { X, Search as SearchIcon } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import styles from './SearchPanel.module.css';

const POPULAR = ['Ball Gown', 'Mermaid', 'Lace', 'Minimal', 'Boho'];

export default function SearchPanel() {
  const { searchOpen, setSearchOpen, openQuickView, dresses, t, lang } = useStore();
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [searchOpen]);

  if (!searchOpen) return null;

  const results = query.trim()
    ? dresses.filter((p) =>
        [p.code, p.name, p.name_ar, p.category, p.collection, p.description]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(query.toLowerCase())
      )
    : [];

  return (
    <div className={styles.overlay} onClick={() => setSearchOpen(false)}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={() => setSearchOpen(false)} aria-label="Close">
          <X size={22} />
        </button>

        <div className={styles.searchRow}>
          <SearchIcon size={20} className={styles.searchIcon} />
          <input
            ref={inputRef}
            type="text"
            placeholder={t.nav.search}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={styles.input}
          />
        </div>

        {!query.trim() && (
          <div className={styles.popular}>
            <p className={styles.popularLabel}>{lang === 'ar' ? 'البحث الشائع' : 'Popular Searches'}</p>
            <div className={styles.tags}>
              {POPULAR.map((t) => (
                <button key={t} className={styles.tag} onClick={() => setQuery(t)}>{t}</button>
              ))}
            </div>
          </div>
        )}

        {results.length > 0 && (
          <div className={styles.results}>
            {results.map((p) => (
              <button
                key={p.id}
                className={styles.resultCard}
                onClick={() => { openQuickView(p); setSearchOpen(false); setQuery(''); }}
              >
                <Image src={p.image} alt={p.name} width={60} height={80} className={styles.resultImage} />
                <div className={styles.resultInfo}>
                  <h4 className={styles.resultName}>{lang === 'ar' && p.name_ar ? p.name_ar : p.name}</h4>
                  <p className={styles.resultPrice}>{p.price}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {query.trim() && results.length === 0 && (
          <p className={styles.noResults}>
            {lang === 'ar' ? `لم نجد فساتين تطابق "${query}"` : `No dresses found for "${query}"`}
          </p>
        )}
      </div>
    </div>
  );
}
