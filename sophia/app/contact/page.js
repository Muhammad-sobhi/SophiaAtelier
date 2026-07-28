'use client';

import Navbar from '../components/Navbar/Navbar';
import Footer from '../components/Footer/Footer';
import ContactSection from '../components/Contact/ContactSection';
import { useStore } from '../context/StoreContext';

export default function ContactPage() {
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
      <main style={{ paddingTop: '120px', backgroundColor: '#F6F3EE', minHeight: '100vh' }}>
        <ContactSection />
      </main>
      <Footer />
    </>
  );
}
