const API_BASE = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' && window.location.hostname.includes('sophiadresses.cloud') ? 'https://api.sophiadresses.cloud/api' : 'http://localhost:8000/api');

export function clearAuth() {
  localStorage.removeItem('atelier_current_employee');
  window.dispatchEvent(new Event('auth-change'));
}

// Auth is a Sanctum HttpOnly session cookie. JS never sees it; we only echo the
// readable XSRF-TOKEN cookie back as a header so Laravel can verify CSRF.
const API_ORIGIN = API_BASE.replace(/\/api\/?$/, '');
const UNSAFE_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

function readXsrfToken() {
  const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

async function ensureCsrfCookie(force = false) {
  if (!force && readXsrfToken()) return;
  await fetch(`${API_ORIGIN}/sanctum/csrf-cookie`, { credentials: 'include' });
}

// Sends a request with the session cookie + CSRF header, retrying once on CSRF mismatch (419)
async function sendWithSession(url, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const isUnsafe = UNSAFE_METHODS.includes(method);

  const send = () => {
    const headers = { ...options.headers };
    const xsrf = readXsrfToken();
    if (isUnsafe && xsrf) headers['X-XSRF-TOKEN'] = xsrf;
    return fetch(url, { ...options, headers, credentials: 'include' });
  };

  if (isUnsafe) await ensureCsrfCookie();
  let response = await send();
  if (response.status === 419 && isUnsafe) {
    await ensureCsrfCookie(true);
    response = await send();
  }
  return response;
}

export function getStorageUrl(path) {
  if (!path) return null;
  if (typeof path === 'object') {
    path = path.image_path || path.image || path.url || path.primary_image || '';
  }
  if (!path || typeof path !== 'string') return null;

  if (path.startsWith('blob:') || path.startsWith('data:')) return path;

  // If path contains localhost/127.0.0.1 and we are on a remote server domain, extract the relative storage path
  if (path.includes('localhost') || path.includes('127.0.0.1')) {
    const match = path.match(/(?:storage|uploads|images)\/.*$/);
    if (match) {
      path = match[0];
    }
  }

  // If it's a valid remote external URL (not localhost), ensure HTTPS if page is HTTPS
  if (path.startsWith('http://') || path.startsWith('https://')) {
    if (typeof window !== 'undefined' && window.location.protocol === 'https:' && path.startsWith('http://')) {
      return path.replace('http://', 'https://');
    }
    return path;
  }

  // Base domain without /api suffix
  const baseDomain = API_BASE.replace(/\/api\/?$/, '');
  const cleanPath = path.replace(/^\/?(storage\/|public\/)?/, '');
  const fullUrl = `${baseDomain}/storage/${cleanPath}`;

  if (typeof window !== 'undefined' && window.location.protocol === 'https:' && fullUrl.startsWith('http://')) {
    return fullUrl.replace('http://', 'https://');
  }
  return fullUrl;
}

class ApiClient {
  getHeaders() {
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }

  getAuthHeader() {
    return { 'Accept': 'application/json' };
  }

  async request(endpoint, options = {}) {
    let url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    
    if (options.params) {
      const searchParams = new URLSearchParams();
      Object.entries(options.params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, value);
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        url += (url.includes('?') ? '&' : '?') + queryString;
      }
      delete options.params;
    }

    const headers = {
      ...this.getHeaders(),
      ...options.headers
    };

    const response = await sendWithSession(url, {
      ...options,
      headers
    });

    if (response.status === 401) {
      clearAuth();
      throw new Error('انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى.');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      let msg = errorData.message || `Request failed with status ${response.status}`;
      if (errorData.errors && typeof errorData.errors === 'object') {
        const errorDetails = Object.values(errorData.errors).flat().join(' | ');
        if (errorDetails) {
          msg = `${msg}: ${errorDetails}`;
        }
      }
      const error = new Error(msg);
      error.data = errorData;
      throw error;
    }

    const json = await response.json();

    // Globally sort dresses by natural code order if applicable
    if (url.includes('/dresses') && !url.includes('/best-sellers/reorder') && !url.includes('/availability-check') && !url.includes('/stage-action')) {
      if (Array.isArray(json)) {
        json.sort((a, b) => String(a.code || '').localeCompare(String(b.code || ''), undefined, { numeric: true, sensitivity: 'base' }));
      } else if (json && Array.isArray(json.data)) {
        json.data.sort((a, b) => String(a.code || '').localeCompare(String(b.code || ''), undefined, { numeric: true, sensitivity: 'base' }));
      }
    }

    return json;
  }

  get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  post(endpoint, data, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  put(endpoint, data, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  patch(endpoint, data = {}, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }

  delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }

  /** Download a file endpoint (session cookie included) and save it with the given name */
  async download(endpoint, filename) {
    const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const response = await sendWithSession(url, { headers: this.getAuthHeader() });

    if (response.status === 401) {
      clearAuth();
      throw new Error('انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى.');
    }
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Download failed with status ${response.status}`);
    }

    const blobUrl = URL.createObjectURL(await response.blob());
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(blobUrl);
  }

  async postFormData(endpoint, formData) {
    const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const response = await sendWithSession(url, {
      method: 'POST',
      headers: this.getAuthHeader(),
      body: formData
    });

    if (response.status === 401) {
      clearAuth();
      throw new Error('انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى.');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      let msg = errorData.message || `Upload failed with status ${response.status}`;
      if (errorData.errors && typeof errorData.errors === 'object') {
        const errorDetails = Object.values(errorData.errors).flat().join(' | ');
        if (errorDetails) {
          msg = `${msg}: ${errorDetails}`;
        }
      }
      const error = new Error(msg);
      error.data = errorData;
      throw error;
    }
    return response.json();
  }
}

export const apiClient = new ApiClient();
// Loads every page of a paginated list endpoint (the backend caps per_page at 100).
export async function getAllPages(path) {
  const sep = path.includes('?') ? '&' : '?';
  const first = await apiClient.get(`${path}${sep}per_page=100&page=1`);
  if (Array.isArray(first)) return first;
  const lastPage = first?.last_page || 1;
  const rest = await Promise.all(
    Array.from({ length: lastPage - 1 }, (_, i) => apiClient.get(`${path}${sep}per_page=100&page=${i + 2}`))
  );
  return [first, ...rest].flatMap((res) => res?.data || []);
}
