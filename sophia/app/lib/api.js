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
  if (typeof path === 'object') {
    path = path.image_path || path.image || path.url || '';
  }
  if (!path || typeof path !== 'string') return '/images/product-1.png';

  if (path.startsWith('blob:')) return path;
  if (path.startsWith('http://') || path.startsWith('https://')) {
    if (typeof window !== 'undefined' && window.location.protocol === 'https:' && path.startsWith('http://')) {
      return path.replace('http://', 'https://');
    }
    return path;
  }

  const cleanPath = path.replace(/^\/?(storage\/)?/, '');
  const fullUrl = `${API_BASE}/storage/${cleanPath}`;
  if (typeof window !== 'undefined' && window.location.protocol === 'https:' && fullUrl.startsWith('http://')) {
    return fullUrl.replace('http://', 'https://');
  }
  return fullUrl;
}

export async function fetchDresses() {
  try {
    const res = await fetchWithTimeout(`${API_BASE}/dresses`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    const dresses = data.data || data;
    return dresses.map((d) => {
      const weightTextEn = (d.weight_from !== null && d.weight_from !== undefined) || (d.weight_to !== null && d.weight_to !== undefined)
        ? `${d.weight_from || 0}kg up to ${d.weight_to || 0}kg`
        : (d.size || '');

      const weightTextAr = (d.weight_from !== null && d.weight_from !== undefined) || (d.weight_to !== null && d.weight_to !== undefined)
        ? `من ${d.weight_from || 0} كجم إلى ${d.weight_to || 0} كجم`
        : (d.size || '');

      return {
        id: d.id,
        code: d.code || '',
        name: d.name,
        name_ar: d.name_ar,
        price: '', // Rent prices hidden on website as requested
        priceNum: 0,
        image: d.images && d.images.length > 0 ? getStorageUrl(d.images[0].image_path) : '/images/product-1.png',
        images: d.images && d.images.length > 0 ? d.images.map((img) => getStorageUrl(img.image_path)) : ['/images/product-1.png'],
        badge: d.new_collection ? 'New' : '',
        category: d.category?.name || 'All',
        collection: d.collection?.name || '',
        description: d.description || '',
        description_ar: d.description_ar || '',
        weight_from: d.weight_from,
        weight_to: d.weight_to,
        weightTextEn: weightTextEn,
        weightTextAr: weightTextAr,
        sizes: [weightTextEn || weightTextAr || 'Standard'],
        colors: d.color ? d.color.split(',').map((c) => c.trim()) : ['Ivory', 'Champagne', 'Blush'],
        rating: 5.0,
        reviews: 10,
      };
    });
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

export async function fetchPublicFaqs() {
  try {
    const res = await fetchWithTimeout(`${API_BASE}/public/faqs`, { cache: 'no-store' });
    if (!res.ok) return [];
    return await res.json();
  } catch (e) {
    console.error('Failed to fetch public faqs:', e);
    return [];
  }
}
