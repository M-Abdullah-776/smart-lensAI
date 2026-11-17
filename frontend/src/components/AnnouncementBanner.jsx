import React, { useState } from 'react';
import { Bell, X } from 'lucide-react';
import { useSettingsStore } from '../stores/settingsStore';

export const AnnouncementBanner = () => {
  const { announcements } = useSettingsStore();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || !announcements || announcements.length === 0) {
    return null;
  }

  const latest = announcements[0];

  return (
    <div className="w-full bg-gradient-to-r from-indigo-900/40 via-violet-900/40 to-cyan-900/40 border-b border-indigo-500/20 px-4 py-2.5 flex items-center justify-between text-xs text-indigo-200">
      <div className="flex items-center gap-2 max-w-4xl mx-auto">
        <Bell className="w-4 h-4 text-indigo-400 flex-shrink-0 animate-pulse" />
        <span className="font-semibold text-indigo-300">Announcement:</span>
        <span className="truncate">{latest.message}</span>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
