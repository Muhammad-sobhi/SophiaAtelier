'use client';

import { useState, useMemo, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Heart, Eye, ChevronDown, RotateCcw, Grid3X3, LayoutGrid, ChevronLeft, ChevronRight } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import Navbar from '../components/Navbar/Navbar';
import Footer from '../components/Footer/Footer';
import DressCard from '../components/DressCard/DressCard';
import styles from './collections.module.css';

const SORT_OPTIONS = [
  { label: 'Featured', value: 'featured' },
  { label: 'Price: Low to High', value: 'price-asc' },
  { label: 'Price: High to Low', value: 'price-desc' },
  { label: 'Rating', value: 'rating' },
  { label: 'Newest', value: 'newest' },
];

function CollectionsContent() {
  const searchParams = useSearchParams();
  const {
    dresses,
    categories,
    collections,
    loadingDresses,
    openQuickView,
    toggleWishlist,
    isWishlisted,
    setSearchOpen,
    setWishlistOpen,
    setCartOpen,
    cart,
    wishlist,
    t,
    lang,
  } = useStore();

  const [category, setCategory] = useState(searchParams.get('category') || 'All');
  const [collection, setCollection] = useState(searchParams.get('collection') || 'All');
  const [sort, setSort] = useState('featured');
  const [gridCols, setGridCols] = useState(4);
  const [perPage, setPerPage] = useState(16);
  const [currentPage, setCurrentPage] = useState(1);

  const sortOptions = [
    { label: t.collections.allCategories || 'All', value: 'featured' },
    { label: t.collections.sortPriceLow || 'Price: Low to High', value: 'price-asc' },
    { label: t.collections.sortPriceHigh || 'Price: High to Low', value: 'price-desc' },
  ];

  useEffect(() => {
    const cat = searchParams.get('category');
    const col = searchParams.get('collection');
    if (cat) setCategory(cat);
    if (col) setCollection(col);
  }, [searchParams]);

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [category, collection, sort, perPage]);

  const categoryList = useMemo(() => {
    const names = categories.map((c) => c.name);
    return ['All', ...names];
  }, [categories]);

  const collectionList = useMemo(() => {
    const names = collections.map((c) => c.name);
    return ['All', ...names];
  }, [collections]);

  const filtered = useMemo(() => {
    let result = [...dresses];

    if (category !== 'All') {
      result = result.filter((p) => p.category?.toLowerCase() === category.toLowerCase());
    }
    if (collection !== 'All') {
      result = result.filter((p) => p.collection?.toLowerCase() === collection.toLowerCase());
    }

    switch (sort) {
      case 'price-asc':
        result.sort((a, b) => a.priceNum - b.priceNum);
        break;
      case 'price-desc':
        result.sort((a, b) => b.priceNum - a.priceNum);
        break;
      case 'rating':
        result.sort((a, b) => b.rating - a.rating);
        break;
      case 'newest':
        result.sort((a, b) => b.id - a.id);
        break;
      default:
        break;
    }

    return result;
  }, [dresses, category, collection, sort]);

  const totalPages = Math.ceil(filtered.length / perPage) || 1;
  const startIndex = (currentPage - 1) * perPage;
  const paginatedDresses = useMemo(() => {
    return filtered.slice(startIndex, startIndex + perPage);
  }, [filtered, startIndex, perPage]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 380, behavior: 'smooth' });
    }
  };

  const clearFilters = () => {
    setCategory('All');
    setCollection('All');
    setSort('featured');
  };

  const hasActiveFilters = category !== 'All' || collection !== 'All' || sort !== 'featured';

  return (
    <>
      <Navbar
        onSearchClick={() => setSearchOpen(true)}
        onWishlistClick={() => setWishlistOpen(true)}
        onCartClick={() => setCartOpen(true)}
        cartCount={cart.length}
        wishlistCount={wishlist.length}
      />

      <main className={styles.main}>
        {/* Luxury Hero Banner */}
        <div className={styles.heroBanner}>
          <div className={styles.bgWrap}>
            <Image
              src="/images/appointments.png"
              alt="Our Collections"
              fill
              priority
              quality={95}
              className={styles.bgImage}
            />
            <div className={styles.overlayGradient} />
          </div>

          <div className={`container ${styles.bannerContent}`}>
            <div className={styles.breadcrumb}>
              <Link href="/">{t.nav.home}</Link> <span>/</span> <span>{t.nav.collections}</span>
            </div>
            <h1 className={styles.pageTitle}>{t.collections.title}</h1>
            <p className={styles.pageSubtitle}>
              {t.collections.subtitle}
            </p>
          </div>
        </div>

        {/* Elegant Filter Bar */}
        <div className={styles.filterSection}>
          <div className={`container ${styles.filterBarContainer}`}>
            {/* Category Dropdown/Tabs */}
            <div className={styles.filterGroup}>
              <span className={styles.filterGroupLabel}>{lang === 'ar' ? 'القسم' : 'Category'}</span>
              <div className={styles.tabScroll}>
                {categoryList.map((cat) => (
                  <button
                    key={cat}
                    className={`${styles.filterTab} ${category.toLowerCase() === cat.toLowerCase() ? styles.filterTabActive : ''}`}
                    onClick={() => setCategory(cat)}
                  >
                    {cat === 'All' ? t.collections.allCategories : cat}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.dividerLine} />

            {/* Collection Dropdown/Tabs */}
            <div className={styles.filterGroup}>
              <span className={styles.filterGroupLabel}>{lang === 'ar' ? 'التشكيلة' : 'Collection'}</span>
              <div className={styles.tabScroll}>
                {collectionList.map((col) => (
                  <button
                    key={col}
                    className={`${styles.filterTab} ${collection.toLowerCase() === col.toLowerCase() ? styles.filterTabActive : ''}`}
                    onClick={() => setCollection(col)}
                  >
                    {col === 'All' ? t.collections.allCollections : col}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.dividerLine} />

            {/* Sort & Controls Right */}
            <div className={styles.controlsRight}>
              {/* Items Per Page Option */}
              <div className={styles.perPageBox}>
                <span className={styles.filterGroupLabel}>{lang === 'ar' ? 'لكل صفحة' : 'Per Page'}</span>
                <div className={styles.sortSelectWrap}>
                  <select
                    className={styles.sortSelect}
                    value={perPage}
                    onChange={(e) => setPerPage(Number(e.target.value))}
                  >
                    <option value={16}>16</option>
                    <option value={32}>32</option>
                    <option value={64}>64</option>
                  </select>
                  <ChevronDown size={14} className={styles.sortChevron} />
                </div>
              </div>

              <div className={styles.sortBox}>
                <span className={styles.filterGroupLabel}>{t.collections.sortBy}</span>
                <div className={styles.sortSelectWrap}>
                  <select
                    className={styles.sortSelect}
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                  >
                    {sortOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className={styles.sortChevron} />
                </div>
              </div>

              {/* View Toggle */}
              <div className={styles.viewToggle}>
                <button
                  className={`${styles.viewBtn} ${gridCols === 3 ? styles.viewBtnActive : ''}`}
                  onClick={() => setGridCols(3)}
                  aria-label="3 columns grid"
                >
                  <Grid3X3 size={16} />
                </button>
                <button
                  className={`${styles.viewBtn} ${gridCols === 4 ? styles.viewBtnActive : ''}`}
                  onClick={() => setGridCols(4)}
                  aria-label="4 columns grid"
                >
                  <LayoutGrid size={16} />
                </button>
              </div>

              {/* Reset Filter Button */}
              {hasActiveFilters && (
                <button className={styles.resetBtn} onClick={clearFilters} title={t.collections.resetFilters}>
                  <RotateCcw size={14} />
                  <span>{t.collections.resetFilters}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Results Info Bar */}
        <div className={`container ${styles.resultsBar}`}>
          <span className={styles.countText}>
            {lang === 'ar' ? (
              <>عرض <strong>{filtered.length > 0 ? `${startIndex + 1}–${Math.min(startIndex + perPage, filtered.length)}` : '0'}</strong> من <strong>{filtered.length}</strong> فستان</>
            ) : (
              <>Showing <strong>{filtered.length > 0 ? `${startIndex + 1}–${Math.min(startIndex + perPage, filtered.length)}` : '0'}</strong> of <strong>{filtered.length}</strong> {filtered.length === 1 ? 'dress' : 'dresses'}</>
            )}
          </span>

          {hasActiveFilters && (
            <div className={styles.activePills}>
              {category !== 'All' && (
                <span className={styles.activeTag}>
                  {lang === 'ar' ? 'القسم' : 'Category'}: {category}
                  <button onClick={() => setCategory('All')}>×</button>
                </span>
              )}
              {collection !== 'All' && (
                <span className={styles.activeTag}>
                  {lang === 'ar' ? 'التشكيلة' : 'Collection'}: {collection}
                  <button onClick={() => setCollection('All')}>×</button>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Product Grid */}
        <div className={`container ${styles.content}`}>
          {loadingDresses ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#888' }}>...</div>
          ) : (
            <>
              <div className={`${styles.grid} ${gridCols === 4 ? styles.grid4 : styles.grid3}`}>
                {paginatedDresses.map((p) => (
                  <DressCard
                    key={p.id}
                    product={p}
                    onQuickView={openQuickView}
                    onToggleWishlist={toggleWishlist}
                    isWishlisted={isWishlisted}
                  />
                ))}
              </div>

              {/* Pagination Bar */}
              {totalPages > 1 && (
                <div className={styles.paginationContainer}>
                  <button
                    className={styles.pageArrowBtn}
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    aria-label="Previous Page"
                  >
                    <ChevronLeft size={16} />
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                    <button
                      key={pageNum}
                      className={`${styles.pageBtn} ${currentPage === pageNum ? styles.pageBtnActive : ''}`}
                      onClick={() => handlePageChange(pageNum)}
                    >
                      {pageNum}
                    </button>
                  ))}

                  <button
                    className={styles.pageArrowBtn}
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    aria-label="Next Page"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </>
          )}

          {!loadingDresses && filtered.length === 0 && (
            <div className={styles.noResults}>
              <p>{t.collections.noResults}</p>
              <button className={styles.resetBtn} onClick={clearFilters}>
                <RotateCcw size={14} /> {t.collections.resetFilters}
              </button>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}

export default function CollectionsPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh' }} />}>
      <CollectionsContent />
    </Suspense>
  );
}
