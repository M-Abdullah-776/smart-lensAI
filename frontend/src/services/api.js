import axios from 'axios';

// When VITE_API_URL is set (e.g. https://smart-lensai.onrender.com), API calls go
// directly to that origin. When it is empty (default for Vercel), requests go to the
// same origin and Vercel rewrites proxy them to the Render backend.
const rawUrl = (import.meta.env.VITE_API_URL || '').trim();
const cleanBaseUrl = rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl;

const api = axios.create({
  baseURL: cleanBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30-second timeout for Render cold starts
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
