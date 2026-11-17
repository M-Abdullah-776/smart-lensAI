import axios from 'axios';

// SmartLens API client
// 1. If VITE_API_URL is explicitly set, use it.
// 2. In production without an explicit env var, connect directly to the production Render backend.
// 3. In local development, connect to the local FastAPI dev server.
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
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000, // 60 seconds to accommodate Render free-tier cold starts
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
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('smartlens_refresh_token');
      if (refreshToken) {
        try {
          const res = await axios.post(
            `${cleanBaseUrl}/auth/refresh`,
            { refresh_token: refreshToken }
          );
          const newAccessToken = res.data.access_token;
          localStorage.setItem('smartlens_access_token', newAccessToken);
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return api(originalRequest);
        } catch (refreshErr) {
          localStorage.removeItem('smartlens_access_token');
          localStorage.removeItem('smartlens_refresh_token');
          localStorage.removeItem('smartlens_user');
          window.location.href = '/login?expired=1';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
