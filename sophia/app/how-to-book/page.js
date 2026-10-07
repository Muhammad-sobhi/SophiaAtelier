'use client';

import Navbar from '../components/Navbar/Navbar';
import Footer from '../components/Footer/Footer';
import HowToBookGuide from '../components/HowToBook/HowToBookGuide';
import { useStore } from '../context/StoreContext';

export default function HowToBookPage() {
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
      <main style={{ backgroundColor: '#FAF8F5', minHeight: '100vh' }}>
        <HowToBookGuide />
      </main>
      <Footer />
    </>
  );
}
