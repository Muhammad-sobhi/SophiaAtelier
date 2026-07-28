'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { fetchDresses, fetchPublicCategories, fetchPublicCollections, fetchPublicGallery } from '../lib/api';
import { translations } from '../lib/translations';

const StoreContext = createContext(null);

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

  /* Cart */
  const addToCart = useCallback((product, qty = 1) => {
    setCart((prev) => {
      const currentTotal = prev.reduce((sum, item) => sum + item.qty, 0);
      const existing = prev.find((x) => x.id === product.id);
      if (existing) {
        if (currentTotal + qty > 3) {
          alert('You can select a maximum of 3 dresses for your boutique visit.');
          return prev;
        }
        return prev.map((x) => (x.id === product.id ? { ...x, qty: x.qty + qty } : x));
      }
      if (currentTotal + qty > 3) {
        alert('You can select a maximum of 3 dresses for your boutique visit.');
        return prev;
      }
      return [...prev, { ...product, qty }];
    });
    setCartOpen(true);
  }, []);

  const removeFromCart = useCallback((id) => {
    setCart((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const updateCartQty = useCallback((id, qty) => {
    if (qty < 1) return removeFromCart(id);
    setCart((prev) => {
      const otherTotal = prev.filter((x) => x.id !== id).reduce((sum, item) => sum + item.qty, 0);
      if (otherTotal + qty > 3) {
        alert('You can select a maximum of 3 dresses for your boutique visit.');
        return prev;
      }
      return prev.map((x) => (x.id === id ? { ...x, qty } : x));
    });
  }, [removeFromCart]);

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
    cart, addToCart, removeFromCart, updateCartQty,
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
