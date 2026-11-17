import { create } from 'zustand';
import api from '../services/api';

export const useAuthStore = create((set, get) => ({
  user: JSON.parse(localStorage.getItem('smartlens_user') || 'null'),
  token: localStorage.getItem('smartlens_access_token') || null,
  isAuthenticated: !!localStorage.getItem('smartlens_access_token'),
  isLoading: false,

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const response = await api.post('/auth/login', { email, password });
      const { access_token, refresh_token, user } = response.data;
      
      localStorage.setItem('smartlens_access_token', access_token);
      localStorage.setItem('smartlens_refresh_token', refresh_token);
      localStorage.setItem('smartlens_user', JSON.stringify(user));

      set({
        user,
        token: access_token,
        isAuthenticated: true,
        isLoading: false,
      });
      return { success: true };
    } catch (err) {
      set({ isLoading: false });
      const message = err.response?.data?.detail || (err.response ? 'Invalid email or password.' : 'Cannot connect to backend server. Please try again in a moment.');
      return { success: false, error: message };
    }
  },

  logout: async () => {
    const refreshToken = localStorage.getItem('smartlens_refresh_token');
    if (refreshToken) {
      try {
        await api.post('/auth/logout', { refresh_token: refreshToken });
      } catch (e) {
        // Continue logout locally even if network fails
      }
    }
    localStorage.removeItem('smartlens_access_token');
    localStorage.removeItem('smartlens_refresh_token');
    localStorage.removeItem('smartlens_user');
    set({ user: null, token: null, isAuthenticated: false });
  },

  fetchProfile: async () => {
    try {
      const res = await api.get('/auth/me');
      set({ user: res.data });
      localStorage.setItem('smartlens_user', JSON.stringify(res.data));
    } catch (err) {
      // In case session expired
      if (err.response?.status === 401) {
        get().logout();
      }
    }
  },

  setUser: (user) => {
    localStorage.setItem('smartlens_user', JSON.stringify(user));
    set({ user });
  }
}));
