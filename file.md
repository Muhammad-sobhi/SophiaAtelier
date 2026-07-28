# Sophia Dresses — Full System Audit, Performance Optimizations & Architecture Recommendations

This report presents a thorough analysis of the **Sophia Dresses** codebase, covering the Next.js Frontend (`sophia`), Vite Admin Dashboard (`dashboard`), and Laravel 11 Backend (`backend`).

---

## 1. Critical Fixes Needed 🚨

### Backend (Laravel 11)
- **Missing Database Indexes on Foreign Keys & Frequent Queries**:
  - `dresses`: Missing composite indexes on `category_id`, `collection_id`, `designer_id`, and `status`.
  - `visits` & `bookings`: Missing index on `visit_date` / `booking_date` and `status`.
  - *Fix*: Create a migration to index these foreign keys to eliminate full table scans during filtering.
- **N+1 Query Bottlenecks in Calendar & Booking APIs**:
  - `CalendarController::events` fetches visits and bookings separately in memory. Eager loading `.with('client')` is missing on some relations.
  - *Fix*: Implement strict `with(['client', 'dress'])` eager loading across all API index routes.
- **Queue & Cache Configuration**:
  - `.env` uses `QUEUE_CONNECTION=database` and `CACHE_STORE=database` in local dev without running `php artisan queue:work`, which can accumulate pending database locks under high load.

### Frontend (`sophia` Next.js 14/15)
- **Dead Code & Commented JSX in Hero Component**:
  - [Hero.js](file:///d:/sophiadresses/sophia/app/components/Hero/Hero.js) has commented out slider tracks and empty container blocks (`bottomBar`).
  - *Fix*: Clean up unused HTML/JSX wrappers to optimize the DOM node count.
- **Unbounded Storage URL Resolution**:
  - `getStorageUrl(path)` in [api.js](file:///d:/sophiadresses/sophia/app/lib/api.js#L19) replaces `/api` dynamically but doesn't handle trailing slashes consistently if `NEXT_PUBLIC_API_URL` changes in production.
- **Hardcoded Image Qualities**:
  - Ensure all Next.js images use configured quality values `qualities: [75, 95]` and explicit `sizes` attribute to avoid downloading 4K original images on mobile devices.

### Admin Dashboard (Vite + React)
- **Memory Leaks from Unrevoked Object URLs**:
  - `URL.createObjectURL(file)` is called during file selection in [DressesPage.jsx](file:///d:/sophiadresses/dashboard/src/pages/DressesPage.jsx#L353) and [CollectionsPage.jsx](file:///d:/sophiadresses/dashboard/src/pages/CollectionsPage.jsx#L306) without calling `URL.revokeObjectURL(url)` on form reset or component unmount.
  - *Fix*: Add cleanup effects or explicit `revokeObjectURL` calls to free browser memory.

---

## 2. Performance Optimizations ⚡

### A. Frontend Acceleration (Next.js `sophia`)
1. **SWR / React Query Stale-While-Revalidate Caching**:
   - Currently, [StoreContext.js](file:///d:/sophiadresses/sophia/app/context/StoreContext.js#L74) refetches all catalog data (`fetchDresses`, `categories`, `collections`, `gallery`) from scratch on every page load.
   - *Optimization*: Implement SWR or localStorage caching for static data (like categories and collections) to achieve instantaneous initial page loads (0ms latency for returning brides).
2. **Font & Static Asset Preloading**:
   - Google Fonts (Cormorant Garamond & Montserrat) should use `display: 'swap'` and `preload: true` in Next.js `font/google`.
3. **Responsive Image Sizes**:
   - Ensure all `<Image fill>` components pass tailored `sizes` attributes (e.g. `sizes="(max-width: 768px) 100vw, 33vw"`), allowing browsers to fetch 400px WebP images instead of 2000px originals.

### B. Backend API Acceleration (Laravel)
1. **API Response Caching**:
   - Public GET endpoints (`/api/public/categories`, `/api/public/collections`, `/api/dresses`) change infrequently.
   - *Optimization*: Wrap response output in Laravel's HTTP cache headers or `Cache::remember('public_categories', 3600, ...)` to serve requests directly from RAM.
2. **Database Query Profiling**:
   - Enable `DB::listen` in local development to log queries exceeding 50ms.

### C. Admin Dashboard Acceleration (Vite + React)
1. **Code Splitting & Lazy Loading**:
   - In `App.jsx`, lazy load heavy admin pages (`ReportsPage.jsx`, `BridesPage.jsx`, `BookingsPage.jsx`) using `React.lazy()` and `Suspense` to reduce initial JavaScript bundle download size.
2. **Lucide Icons Tree-Shaking**:
   - Ensure Lucide icon imports use named ES module imports to keep bundle size minimal.

---

## 3. Structural & Architectural Suggestions 💡

1. **Production Infrastructure Setup**:
   - Set up PHP OPCache on the production server (Nginx + PHP-FPM) to run Laravel up to **400% faster** than `php artisan serve`.
   - Use Redis for session, queue, and cache management in production.
2. **Image Processing Pipeline**:
   - Add automated server-side image compression (e.g. `Spatie/laravel-medialibrary` or `Intervention/image`) to auto-resize uploaded dress photos to standard WebP formats (800x1100 & 400x550) upon upload.
3. **Structured API Error Handling**:
   - Create a unified toast notification banner in the dashboard and frontend app for network retries and user feedback.

---

## 4. Summary Action Plan Checklist

| Module | Priority | Recommended Action |
| :--- | :--- | :--- |
| **Database** | 🔴 High | Add composite indexes on `dresses(category_id, status)` & `bookings(date)` |
| **Backend** | 🟡 Medium | Implement `Cache::remember` on `/public/categories` & `/public/collections` |
| **Frontend** | 🔴 High | Remove dead commented code in `Hero.js` and clean up `Appointment.js` font sizing |
| **Dashboard** | 🟡 Medium | Add `URL.revokeObjectURL()` cleanup in image upload handlers |
| **Dashboard** | 🟢 Low | Split routes using `React.lazy()` in dashboard `App.jsx` |
