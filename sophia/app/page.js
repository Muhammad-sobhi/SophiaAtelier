'use client';

import Navbar from './components/Navbar/Navbar';
import Hero from './components/Hero/Hero';
import Categories from './components/Categories/Categories';
import Collections from './components/Collections/Collections';
import BestSellers from './components/BestSellers/BestSellers';
import NewCollection from './components/NewCollection/NewCollection';
import DreamDress from './components/Appointment/Appointment';
import ClientGallery from './components/ClientGallery/ClientGallery';
import Reviews from './components/Reviews/Reviews';
import Footer from './components/Footer/Footer';
import { useStore } from './context/StoreContext';

export default function Home() {
  const {
    openQuickView,
    toggleWishlist,
    isWishlisted,
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
      <Hero />
      <Collections />
      <BestSellers
        onQuickView={openQuickView}
        onToggleWishlist={toggleWishlist}
        isWishlisted={isWishlisted}
      />
      <NewCollection />
      <Categories />
      <DreamDress />
      <ClientGallery />
      <Reviews />
      <Footer />
    </>
  );
}
