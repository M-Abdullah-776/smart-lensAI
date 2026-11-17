import axios from 'axios';

// In production on Vercel, use same-origin calls (Vercel rewrites proxy to Render backend).
// In local dev, call localhost:8000 directly.
let envUrl = (import.meta.env.VITE_API_URL || '').trim();

// Reject known incorrect or outdated backend URLs from old Vercel deployments
if (envUrl.includes('smartlens-backend.onrender.com')) {
  envUrl = '';
}

let baseURL = envUrl;
if (!baseURL) {
  // PROD on Vercel: use empty string so all /auth/* /api/* /admin/* go through
  // the Vercel rewrite rules defined in vercel.json (which routes to https://smart-lensai.onrender.com)
  baseURL = import.meta.env.PROD ? '' : 'http://localhost:8000';
}

const cleanBaseUrl = baseURL.endsWith('/') ? baseURL.slice(0, -1) : baseURL;

const api = axios.create({
  baseURL: cleanBaseUrl,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('smartlens_access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url?.includes('/auth/login')) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('smartlens_refresh_token');
      try {
        const res = await axios.post(
          `${cleanBaseUrl}/auth/refresh`,
          { refresh_token: refreshToken || undefined },
          { withCredentials: true }
        );
        const { access_token, refresh_token: newRefreshToken } = res.data;
        localStorage.setItem('smartlens_access_token', access_token);
        if (newRefreshToken) {
          localStorage.setItem('smartlens_refresh_token', newRefreshToken);
        }
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return api(originalRequest);
      } catch {
        localStorage.removeItem('smartlens_access_token');
        localStorage.removeItem('smartlens_refresh_token');
        localStorage.removeItem('smartlens_user');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login?expired=1';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
