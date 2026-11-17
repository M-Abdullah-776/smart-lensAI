import axios from 'axios';

// SmartLens API client with secure credentials and direct/proxy fallback
const envUrl = (import.meta.env.VITE_API_URL || '').trim();
let determinedUrl = envUrl;
if (!determinedUrl) {
  if (import.meta.env.PROD) {
    determinedUrl = 'https://smart-lensai.onrender.com';
  } else {
    determinedUrl = 'http://localhost:8000';
  }
}

const cleanBaseUrl = determinedUrl.endsWith('/') ? determinedUrl.slice(0, -1) : determinedUrl;

const api = axios.create({
  baseURL: cleanBaseUrl,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000, // Accommodate cold starts on cloud containers
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
    // Attempt automatic refresh on 401 if not already retried
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
      } catch (refreshErr) {
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
