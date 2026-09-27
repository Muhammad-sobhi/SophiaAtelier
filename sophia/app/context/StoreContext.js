'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { fetchDresses, fetchPublicCategories, fetchPublicCollections, fetchPublicGallery, checkAvailability } from '../lib/api';
import { translations } from '../lib/translations';

const StoreContext = createContext(null);

export const MAX_BAG_DRESSES = 3;

function readStored(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}

function writeStored(key, value) {
  try {
    if (value === null || value === undefined || value === '') localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {}
}

export function StoreProvider({ children }) {
  const [lang, setLangState] = useState('en');
  const [cart, setCart] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [dresses, setDresses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [collections, setCollections] = useState([]);
  const [clientGallery, setClientGallery] = useState([]);
  const [loadingDresses, setLoadingDresses] = useState(true);

  const [brideUser, setBrideUser] = useState(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [wishlistOpen, setWishlistOpen] = useState(false);
  // Short message shown in the bag (limit reached, favorites moved…)
  const [bagNotice, setBagNotice] = useState('');
  // Bride's wedding date: drives the availability badges on every dress
  const [weddingDate, setWeddingDateState] = useState('');
  const [catalogAvailability, setCatalogAvailability] = useState({});
  const storageLoaded = useRef(false);

  // Bag, favorites and wedding date survive page reloads so the bride never refills them
  useEffect(() => {
    const savedCart = readStored('sophia_cart', []);
    const savedWishlist = readStored('sophia_wishlist', []);
    const savedWedding = readStored('sophia_wedding_date', '');
    if (Array.isArray(savedCart)) setCart(savedCart.slice(0, MAX_BAG_DRESSES).map((x) => ({ ...x, qty: 1 })));
    if (Array.isArray(savedWishlist)) setWishlist(savedWishlist);
    const today = new Date().toISOString().split('T')[0];
    if (typeof savedWedding === 'string' && savedWedding >= today) setWeddingDateState(savedWedding);
    storageLoaded.current = true;
  }, []);

  useEffect(() => { if (storageLoaded.current) writeStored('sophia_cart', cart); }, [cart]);
  useEffect(() => { if (storageLoaded.current) writeStored('sophia_wishlist', wishlist); }, [wishlist]);
  useEffect(() => { if (storageLoaded.current) writeStored('sophia_wedding_date', weddingDate); }, [weddingDate]);

  const setWeddingDate = useCallback((date) => setWeddingDateState(date || ''), []);

  useEffect(() => {
    const savedLang = localStorage.getItem('sophia_lang');
    if (savedLang === 'ar' || savedLang === 'en') {
      setLangState(savedLang);
      document.documentElement.dir = savedLang === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.lang = savedLang;
    }
  }, []);

  const toggleLang = useCallback(() => {
    setLangState((prev) => {
      const next = prev === 'en' ? 'ar' : 'en';
      localStorage.setItem('sophia_lang', next);
      document.documentElement.dir = next === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.lang = next;
      return next;
    });
  }, []);

  useEffect(() => {
    const savedUser = localStorage.getItem('sophia_bride_user');
    if (savedUser) {
      try { setBrideUser(JSON.parse(savedUser)); } catch (e) {}
    }

    const cachedCatalog = localStorage.getItem('sophia_catalog_cache');
    if (cachedCatalog) {
      try {
        const parsed = JSON.parse(cachedCatalog);
        if (parsed.dresses?.length) setDresses(parsed.dresses);
        if (parsed.categories?.length) setCategories(parsed.categories);
        if (parsed.collections?.length) setCollections(parsed.collections);
        if (parsed.clientGallery?.length) setClientGallery(parsed.clientGallery);
        setLoadingDresses(false);
      } catch (e) {}
    }
  }, []);

  const loginBride = useCallback(async (phone, email) => {
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
    const res = await fetch(`${API_BASE}/public/find-client`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ phone, email }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Client not found');
    }

    setBrideUser(data);
    localStorage.setItem('sophia_bride_user', JSON.stringify(data));
    return data;
  }, []);

  const registerBride = useCallback(async ({ name, phone, email, city }) => {
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
    const res = await fetch(`${API_BASE}/public/register-client`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ name, phone, email, city, source: 'website' }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Registration failed');
    }

    setBrideUser(data);
    localStorage.setItem('sophia_bride_user', JSON.stringify(data));
    return data;
  }, []);

  const logoutBride = useCallback(() => {
    setBrideUser(null);
    localStorage.removeItem('sophia_bride_user');
  }, []);

  const loadApiData = useCallback(async () => {
    const cachedCatalog = localStorage.getItem('sophia_catalog_cache');
    if (!cachedCatalog) setLoadingDresses(true);

    const results = await Promise.allSettled([
      fetchDresses(),
      fetchPublicCategories(),
      fetchPublicCollections(),
      fetchPublicGallery(),
    ]);

    const dList = results[0].status === 'fulfilled' ? results[0].value : [];
    const cList = results[1].status === 'fulfilled' ? results[1].value : [];
    const colList = results[2].status === 'fulfilled' ? results[2].value : [];
    const gList = results[3].status === 'fulfilled' ? results[3].value : [];

    if (dList.length) setDresses(dList);
    if (cList.length) setCategories(cList);
    if (colList.length) setCollections(colList);
    if (gList.length) setClientGallery(gList);
    setLoadingDresses(false);

    try {
      localStorage.setItem('sophia_catalog_cache', JSON.stringify({
        dresses: dList,
        categories: cList,
        collections: colList,
        clientGallery: gList,
      }));
    } catch (e) {}
  }, []);

  useEffect(() => {
    loadApiData();
  }, [loadApiData]);

  /* Cart — one piece of each dress, up to 3 dresses per visit */
  const addToCart = useCallback((product) => {
    const tr = translations[lang] || translations.en;
    if (cart.some((x) => x.id === product.id)) {
      setBagNotice(tr.availability.alreadyInBag);
    } else if (cart.length >= MAX_BAG_DRESSES) {
      setBagNotice(tr.availability.bagLimit);
    } else {
      setBagNotice('');
      setCart([...cart, { ...product, qty: 1 }]);
    }
    setCartOpen(true);
  }, [cart, lang]);

  const removeFromCart = useCallback((id) => {
    setCart((prev) => prev.filter((x) => x.id !== id));
    setBagNotice('');
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  /** Moves every favorite that fits into the bag (max 3 dresses) and reports what happened */
  const moveWishlistToCart = useCallback(() => {
    const tr = translations[lang] || translations.en;
    const candidates = wishlist.filter((w) => !cart.some((c) => c.id === w.id));
    if (candidates.length === 0) {
      setBagNotice(tr.wishlist.alreadyInBag);
      setCartOpen(true);
      return;
    }
    const room = Math.max(0, MAX_BAG_DRESSES - cart.length);
    const added = candidates.slice(0, room);
    const skipped = candidates.length - added.length;
    setCart([...cart, ...added.map((x) => ({ ...x, qty: 1 }))]);
    setBagNotice([added.length ? tr.wishlist.sentAll(added.length) : '', skipped ? tr.wishlist.bagLimitSkipped(skipped) : ''].filter(Boolean).join(' — '));
    setCartOpen(true);
  }, [wishlist, cart, lang]);

  /* Catalog availability for the bride's wedding date */
  useEffect(() => {
    if (!weddingDate) {
      setCatalogAvailability({});
      return;
    }
    let cancelled = false;
    checkAvailability({ wedding_date: weddingDate, city: brideUser?.city })
      .then((res) => {
        if (cancelled || !res) return;
        setCatalogAvailability(Object.fromEntries((res.dresses || []).map((r) => [r.dress_id, r.wedding_date])));
      })
      .catch(() => !cancelled && setCatalogAvailability({}));
    return () => { cancelled = true; };
  }, [weddingDate, brideUser?.city]);

  /* Wishlist */
  const toggleWishlist = useCallback((product) => {
    setWishlist((prev) => {
      const exists = prev.find((x) => x.id === product.id);
      if (exists) return prev.filter((x) => x.id !== product.id);
      return [...prev, product];
    });
  }, []);

  const isWishlisted = useCallback((id) => wishlist.some((x) => x.id === id), [wishlist]);

  /* Quick View */
  const openQuickView = useCallback((product) => setQuickViewProduct(product), []);
  const closeQuickView = useCallback(() => setQuickViewProduct(null), []);

  const value = {
    lang, toggleLang, t: translations[lang] || translations.en,
    cart, addToCart, removeFromCart, clearCart, bagNotice, setBagNotice, moveWishlistToCart,
    weddingDate, setWeddingDate, catalogAvailability,
    wishlist, toggleWishlist, isWishlisted,
    dresses, categories, collections, clientGallery, loadingDresses, refreshData: loadApiData,
    brideUser, loginBride, registerBride, logoutBride,
    authModalOpen, setAuthModalOpen,
    quickViewProduct, openQuickView, closeQuickView,
    searchOpen, setSearchOpen,
    cartOpen, setCartOpen,
    wishlistOpen, setWishlistOpen,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
