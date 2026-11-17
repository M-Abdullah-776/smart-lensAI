import { create } from 'zustand';
import api from '../services/api';

export const useSettingsStore = create((set) => ({
  particlesEnabled: localStorage.getItem('smartlens_particles') !== 'false',
  announcements: [],

  toggleParticles: () => {
    set((state) => {
      const next = !state.particlesEnabled;
      localStorage.setItem('smartlens_particles', String(next));
      return { particlesEnabled: next };
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
