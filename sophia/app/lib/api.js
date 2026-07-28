const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

async function fetchWithTimeout(url, options = {}, timeoutMs = 30000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return res;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

export function getStorageUrl(path) {
  if (!path) return '/images/product-1.png';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const baseUrl = API_BASE.replace('/api', '');
  if (path.startsWith('/storage/')) return `${baseUrl}${path}`;
  if (path.startsWith('storage/')) return `${baseUrl}/${path}`;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}/storage${cleanPath}`;
}

export async function fetchDresses() {
  try {
    const res = await fetchWithTimeout(`${API_BASE}/dresses`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    const dresses = data.data || data;
    return dresses.map((d) => ({
      id: d.id,
      name: d.name,
      name_ar: d.name_ar,
      price: `$${parseFloat(d.rental_price || d.purchase_price || 0).toLocaleString()}`,
      priceNum: parseFloat(d.rental_price || d.purchase_price || 0),
      image: d.images && d.images.length > 0 ? getStorageUrl(d.images[0].image_path) : '/images/product-1.png',
      images: d.images && d.images.length > 0 ? d.images.map((img) => getStorageUrl(img.image_path)) : ['/images/product-1.png'],
      badge: d.new_collection ? 'New' : '',
      category: d.category?.name || 'All',
      collection: d.collection?.name || '',
      description: d.description || '',
      sizes: d.size ? d.size.split(',').map((s) => s.trim()) : ['XS', 'S', 'M', 'L', 'XL'],
      colors: d.color ? d.color.split(',').map((c) => c.trim()) : ['Ivory', 'Champagne', 'Blush'],
      rating: 5.0,
      reviews: 10,
    }));
  } catch (e) {
    console.error('Failed to fetch dresses:', e);
    return [];
  }
}

export async function fetchPublicReviews() {
  try {
    const res = await fetchWithTimeout(`${API_BASE}/public/reviews`, { cache: 'no-store' });
    if (!res.ok) return [];
    return await res.json();
  } catch (e) {
    console.error('Failed to fetch public reviews:', e);
    return [];
  }
}

export async function fetchPublicCategories() {
  try {
    const res = await fetchWithTimeout(`${API_BASE}/public/categories`, { cache: 'no-store' });
    if (!res.ok) return [];
    return await res.json();
  } catch (e) {
    console.error('Failed to fetch public categories:', e);
    return [];
  }
}

export async function fetchPublicCollections() {
  try {
    const res = await fetchWithTimeout(`${API_BASE}/public/collections`, { cache: 'no-store' });
    if (!res.ok) return [];
    return await res.json();
  } catch (e) {
    console.error('Failed to fetch public collections:', e);
    return [];
  }
}

export async function fetchPublicGallery() {
  try {
    const res = await fetchWithTimeout(`${API_BASE}/public/client-gallery`, { cache: 'no-store' });
    if (!res.ok) return [];
    return await res.json();
  } catch (e) {
    console.error('Failed to fetch public client gallery:', e);
    return [];
  }
}
