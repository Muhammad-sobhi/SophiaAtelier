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
    const res = await fetchWithTimeout(`${API_BASE}/dresses?per_page=all`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    const dresses = (data.data || data).filter((d) => {
      const vis = d.is_website_visible;
      return vis !== false && vis !== 0 && vis !== '0' && vis !== 'false';
    });
    return dresses.map((d) => {
      const hasWeightFrom = d.weight_from !== null && d.weight_from !== undefined && d.weight_from !== '';
      const hasWeightTo = d.weight_to !== null && d.weight_to !== undefined && d.weight_to !== '';

      let weightTextEn = '50kg up to 75kg';
      let weightTextAr = 'من 50 كجم إلى 75 كجم';

      if (hasWeightFrom && hasWeightTo) {
        weightTextEn = `${d.weight_from}kg up to ${d.weight_to}kg`;
        weightTextAr = `من ${d.weight_from} كجم إلى ${d.weight_to} كجم`;
      } else if (hasWeightFrom) {
        weightTextEn = `From ${d.weight_from}kg`;
        weightTextAr = `من ${d.weight_from} كجم`;
      } else if (hasWeightTo) {
        weightTextEn = `Up to ${d.weight_to}kg`;
        weightTextAr = `حتى ${d.weight_to} كجم`;
      } else if (d.size && typeof d.size === 'string' && /\d/.test(d.size)) {
        const m = d.size.match(/(\d+)\s*[-_toإلى\s]+\s*(\d+)/i);
        if (m) {
          weightTextEn = `${m[1]}kg up to ${m[2]}kg`;
          weightTextAr = `من ${m[1]} كجم إلى ${m[2]} كجم`;
        }
      }

      return {
        id: d.id,
        code: d.code || '',
        name: d.name,
        name_ar: d.name_ar,
        price: '', // Rent prices hidden on website as requested
        priceNum: 0,
        trying_fee: d.trying_fee,
        rental_price: d.rental_price,
        image: d.images && d.images.length > 0 ? getStorageUrl(d.images[0].image_path) : '/images/product-1.png',
        images: d.images && d.images.length > 0 ? d.images.map((img) => getStorageUrl(img.image_path)) : ['/images/product-1.png'],
        badge: d.new_collection ? 'New' : '',
        new_collection: d.new_collection,
        category: d.category?.name || 'All',
        category_ar: d.category?.name_ar || d.category?.name || 'الكل',
        collection: d.collection?.name || '',
        collection_ar: d.collection?.name_ar || d.collection?.name || '',
        designer: d.designer?.name || d.designer?.name_ar || '',
        designer_ar: d.designer?.name_ar || d.designer?.name || '',
        description: d.description || '',
        description_ar: d.description_ar || '',
        color: d.color || d.color_ar || '',
        color_ar: d.color_ar || d.color || '',
        fabric: d.fabric || '',
        fabric_ar: d.fabric_ar || '',
        accessories: d.accessories && d.accessories.length > 0 ? d.accessories.map((a) => (typeof a === 'string' ? a : (a.name || a.name_ar || ''))).filter(Boolean) : [],
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
