'use client';

import Navbar from '../components/Navbar/Navbar';
import Footer from '../components/Footer/Footer';
import TrackOrder from '../components/TrackOrder/TrackOrder';
import { useStore } from '../context/StoreContext';

export default function TrackPage() {
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
      <main style={{ paddingTop: '100px', minHeight: '100vh' }}>
        <TrackOrder />
      </main>
      <Footer />
    </>
  );
}
