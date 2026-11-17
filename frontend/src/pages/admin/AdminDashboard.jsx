import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '../../components/Navbar';
import { Sidebar } from '../../components/Sidebar';
import api from '../../services/api';
import { Shield, Users, Activity, Sliders, Bell, AlertTriangle } from 'lucide-react';

export const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [statsRes, settingsRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/settings'),
      ]);
      setStats(statsRes.data);
      setSettings(settingsRes.data);
    } catch (err) {
      setError('Failed to load administrator data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleToggleTool = async (toolKey, currentVal) => {
    const updatedTools = { ...settings.tools_enabled, [toolKey]: !currentVal };
    try {
      await api.patch('/admin/settings', { tools_enabled: updatedTools });
      setSettings((prev) => ({ ...prev, tools_enabled: updatedTools }));
    } catch (err) {
      alert('Failed to update tool state.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a1a]">
      <Navbar />

      <div className="flex-grow flex">
        <Sidebar />

        <main className="flex-1 p-6 lg:p-8 max-w-6xl mx-auto w-full">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-violet-500/20 text-violet-400 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-display text-white">System Administrator Portal</h1>
              <p className="text-xs text-slate-400">
                Live monitoring, platform usage metrics, user management, and security controls.
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="glass-panel p-12 rounded-2xl text-center text-xs text-slate-400">
              Loading administration metrics...
            </div>
          ) : stats ? (
            <div className="space-y-6">
              {/* TOP METRIC CARDS */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="glass-panel p-5 rounded-2xl border border-white/10">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-400 font-medium">Registered Users</p>
                    <Users className="w-4 h-4 text-indigo-400" />
                  </div>
                  <p className="text-2xl font-extrabold text-white mt-2 font-display">{stats.total_users}</p>
                  <p className="text-[11px] text-emerald-400 mt-1 font-medium">{stats.active_users} active accounts</p>
                </div>

                <div className="glass-panel p-5 rounded-2xl border border-white/10">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-400 font-medium">Total AI Runs</p>
                    <Activity className="w-4 h-4 text-violet-400" />
                  </div>
                  <p className="text-2xl font-extrabold text-white mt-2 font-display">{stats.total_analyses}</p>
                  <p className="text-[11px] text-slate-400 mt-1 font-medium">Measured across all 5 features</p>
                </div>

                <div className="glass-panel p-5 rounded-2xl border border-white/10">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-400 font-medium">Per-User Daily Quota</p>
                    <Sliders className="w-4 h-4 text-cyan-400" />
                  </div>
                  <p className="text-2xl font-extrabold text-cyan-400 mt-2 font-display">
                    {settings?.daily_ai_request_limit || 50}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">Configurable via System Settings</p>
                </div>
              </div>

              {/* TOOL BREAKDOWN & TOOL MASTER SWITCHES */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* USAGE BY TOOL BAR GRAPH */}
                <div className="glass-panel p-6 rounded-2xl border border-white/10 flex flex-col justify-between">
                  <h3 className="text-sm font-bold text-white mb-4 font-display">
                    Processed Tasks by Tool Engine
                  </h3>
                  <div className="space-y-3.5">
                    {Object.entries(stats.analyses_by_tool || {}).map(([tool, count]) => {
                      const maxVal = Math.max(...Object.values(stats.analyses_by_tool), 1);
                      const pct = Math.round((count / maxVal) * 100);
                      return (
                        <div key={tool} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="capitalize font-medium text-slate-300">
                              {tool.replace('_', ' ')}
                            </span>
                            <span className="font-mono text-slate-400">{count} runs</span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* TOOL MASTER ENABLE / DISABLE */}
                <div className="glass-panel p-6 rounded-2xl border border-white/10">
                  <h3 className="text-sm font-bold text-white mb-2 font-display">
                    Tool Availability Controls
                  </h3>
                  <p className="text-xs text-slate-400 mb-4">
                    Disabling a tool renders it locked or inaccessible for standard users (FR-02-005).
                  </p>
                  <div className="divide-y divide-white/5">
                    {settings?.tools_enabled &&
                      Object.entries(settings.tools_enabled).map(([toolKey, isEnabled]) => (
                        <div key={toolKey} className="py-2.5 flex items-center justify-between">
                          <span className="text-xs font-medium capitalize text-slate-200">
                            {toolKey.replace('_', ' ')}
                          </span>
                          <button
                            onClick={() => handleToggleTool(toolKey, isEnabled)}
                            className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all ${
                              isEnabled
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            }`}
                          >
                            {isEnabled ? 'Enabled' : 'Disabled'}
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
};
