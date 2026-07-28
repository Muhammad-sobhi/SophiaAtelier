'use client';

import Navbar from '../components/Navbar/Navbar';
import Footer from '../components/Footer/Footer';
import AboutSection from '../components/About/AboutSection';
import { useStore } from '../context/StoreContext';

export default function AboutPage() {
  const {
    setSearchOpen,
    setWishlistOpen,
    setCartOpen,
    cart,
    wishlist,
  } = useStore();

  return (
    <>
      <Navbar
        onSearchClick={() => setSearchOpen(true)}
        onWishlistClick={() => setWishlistOpen(true)}
        onCartClick={() => setCartOpen(true)}
        cartCount={cart.length}
        wishlistCount={wishlist.length}
      />
      <main style={{ paddingTop: '100px', backgroundColor: '#FAF8F5', minHeight: '100vh' }}>
        <AboutSection />
      </main>
      <Footer />
    </>
  );
}
