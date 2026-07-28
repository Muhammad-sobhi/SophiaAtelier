'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import { X, Trash2, Eye } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import styles from './WishlistDrawer.module.css';

export default function WishlistDrawer() {
  const { wishlist, wishlistOpen, setWishlistOpen, toggleWishlist, openQuickView, addToCart, t, lang } = useStore();

  useEffect(() => {
    if (wishlistOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [wishlistOpen]);

  if (!wishlistOpen) return null;

  return (
    <div className={styles.overlay} onClick={() => setWishlistOpen(false)}>
      <div className={styles.drawer} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>{t.wishlist.title} ({wishlist.length})</h3>
          <button className={styles.closeBtn} onClick={() => setWishlistOpen(false)} aria-label="Close"><X size={20} /></button>
        </div>

        {wishlist.length === 0 ? (
          <div className={styles.empty}>
            <p>{t.wishlist.empty}</p>
            <button className={styles.shopBtn} onClick={() => setWishlistOpen(false)}>{t.hero.explore}</button>
          </div>
        ) : (
          <div className={styles.items}>
            {wishlist.map((item) => (
              <div key={item.id} className={styles.item}>
                <Image src={item.image} alt={item.name} width={80} height={100} className={styles.itemImage} />
                <div className={styles.itemInfo}>
                  <h4 className={styles.itemName}>{lang === 'ar' && item.name_ar ? item.name_ar : item.name}</h4>
                  <p className={styles.itemPrice}>{item.price}</p>
                  <div className={styles.itemActions}>
                    <button className={styles.viewBtn} onClick={() => { openQuickView(item); setWishlistOpen(false); }}>
                      <Eye size={14} /> {t.bestSellers.quickView}
                    </button>
                    <button className={styles.addBtn} onClick={() => { addToCart(item); setWishlistOpen(false); }}>
                      {t.wishlist.addToBag}
                    </button>
                  </div>
                </div>
                <button className={styles.removeBtn} onClick={() => toggleWishlist(item)} aria-label="Remove"><Trash2 size={16} /></button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
