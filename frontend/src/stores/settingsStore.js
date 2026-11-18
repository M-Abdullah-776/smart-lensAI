import { create } from 'zustand';
import api from '../services/api';

// Apply saved theme on load
const _savedDark = localStorage.getItem('smartlens_theme') !== 'light';
if (!_savedDark) document.body.classList.add('light-mode');

export const useSettingsStore = create((set) => ({
  particlesEnabled: localStorage.getItem('smartlens_particles') !== 'false',
  darkMode: localStorage.getItem('smartlens_theme') !== 'light',
  announcements: [],

  toggleParticles: () => {
    set((state) => {
      const next = !state.particlesEnabled;
      localStorage.setItem('smartlens_particles', String(next));
      return { particlesEnabled: next };
    });
  },

  toggleTheme: () => {
    set((state) => {
      const nextDark = !state.darkMode;
      localStorage.setItem('smartlens_theme', nextDark ? 'dark' : 'light');
      if (nextDark) {
        document.body.classList.remove('light-mode');
      } else {
        document.body.classList.add('light-mode');
      }
      return { darkMode: nextDark };
    });
  },

  fetchAnnouncements: async () => {
    try {
      const res = await api.get('/api/announcements/active');
      set({ announcements: res.data });
    } catch (err) {
      // Announcements non-blocking
    }
  }
}));
