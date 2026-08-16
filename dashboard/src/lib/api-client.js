const API_BASE = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' && window.location.hostname.includes('sophiadresses.cloud') ? 'https://api.sophiadresses.cloud/api' : 'http://localhost:8000/api');

function clearAuth() {
  localStorage.removeItem('atelier_auth_token');
  localStorage.removeItem('atelier_current_employee');
  window.dispatchEvent(new Event('auth-change'));
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
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('atelier_auth_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }
    return headers;
  }

  getAuthHeader() {
    const h = { 'Accept': 'application/json' };
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('atelier_auth_token');
      if (token) h['Authorization'] = `Bearer ${token}`;
    }
    return h;
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

    const response = await fetch(url, {
      ...options,
      headers
    });

    if (response.status === 401) {
      clearAuth();
      throw new Error('انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى.');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = new Error(errorData.message || `Request failed with status ${response.status}`);
      error.data = errorData;
      throw error;
    }

    return response.json();
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

  delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }

  async postFormData(endpoint, formData) {
    const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const response = await fetch(url, {
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
      const error = new Error(errorData.message || `Upload failed with status ${response.status}`);
      error.data = errorData;
      throw error;
    }
    return response.json();
  }
}

export const apiClient = new ApiClient();