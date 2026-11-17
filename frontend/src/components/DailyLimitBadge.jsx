import React from 'react';
import { useAuthStore } from '../stores/authStore';
import { Zap } from 'lucide-react';

export const DailyLimitBadge = () => {
  const { user } = useAuthStore();
  if (!user) return null;

  const used = user.daily_requests_used ?? 0;
  const limit = 50; // standard limit

  const pct = Math.min(100, Math.round((used / limit) * 100));

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs">
      <Zap className="w-3.5 h-3.5 text-amber-400" />
      <span className="text-slate-400">Daily Quota:</span>
      <span className="font-semibold text-slate-200">{used} / {limit}</span>
      <div className="w-12 h-1.5 rounded-full bg-white/10 overflow-hidden ml-1">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            pct > 85 ? 'bg-rose-500' : pct > 60 ? 'bg-amber-500' : 'bg-indigo-500'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};
