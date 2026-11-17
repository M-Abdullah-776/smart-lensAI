import React, { useEffect, useState } from 'react';
import { Navbar } from '../../components/Navbar';
import { Sidebar } from '../../components/Sidebar';
import api from '../../services/api';
import { Sliders, Save, CheckCircle2, AlertCircle } from 'lucide-react';

export const AdminSettings = () => {
  const [maxUploadSize, setMaxUploadSize] = useState(10);
  const [dailyLimit, setDailyLimit] = useState(50);
  const [toolsEnabled, setToolsEnabled] = useState({
    document: true,
    youtube: true,
    pdf_qa: true,
    resume: true,
    url: true,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await api.get('/admin/settings');
        setMaxUploadSize(res.data.max_upload_size_mb || 10);
        setDailyLimit(res.data.daily_ai_request_limit || 50);
        if (res.data.tools_enabled) {
          setToolsEnabled(res.data.tools_enabled);
        }
      } catch (e) {
        setError('Failed to fetch settings.');
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setSaving(true);

    try {
      await api.patch('/admin/settings', {
        max_upload_size_mb: Number(maxUploadSize),
        daily_ai_request_limit: Number(dailyLimit),
        tools_enabled: toolsEnabled,
      });
      setMessage('System configuration saved successfully.');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = (toolKey) => {
    setToolsEnabled((prev) => ({
      ...prev,
      [toolKey]: !prev[toolKey],
    }));
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a1a]">
      <Navbar />

      <div className="flex-grow flex">
        <Sidebar />

        <main className="flex-1 p-6 lg:p-8 max-w-4xl mx-auto w-full">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-violet-500/20 text-violet-400 flex items-center justify-center">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-display text-white">System Global Settings</h1>
              <p className="text-xs text-slate-400">
                Configure global upload boundaries, user consumption limits, and service toggles.
              </p>
            </div>
          </div>

          <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-white/10 shadow-xl">
            {error && (
              <div className="mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {message && (
              <div className="mb-6 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{message}</span>
              </div>
            )}

            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading settings...</div>
            ) : (
              <form onSubmit={handleSave} className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">
                    Resource Constraints
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">
                        Max Upload Size (MB)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={maxUploadSize}
                        onChange={(e) => setMaxUploadSize(e.target.value)}
                        required
                        className="w-full glass-input rounded-xl px-4 py-2.5 text-sm"
                      />
                      <p className="text-[11px] text-slate-500 mt-1">Default 10MB (Rule BRL-002)</p>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">
                        Daily AI Requests Per User
                      </label>
                      <input
                        type="number"
                        min="5"
                        max="500"
                        value={dailyLimit}
                        onChange={(e) => setDailyLimit(e.target.value)}
                        required
                        className="w-full glass-input rounded-xl px-4 py-2.5 text-sm"
                      />
                      <p className="text-[11px] text-slate-500 mt-1">Default 50 requests/day (Rule BRL-007)</p>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-white/10">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">
                    Feature Master Switches
                  </h3>
                  <div className="space-y-3">
                    {Object.entries(toolsEnabled).map(([key, val]) => (
                      <div
                        key={key}
                        className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5"
                      >
                        <div>
                          <p className="text-xs font-semibold capitalize text-slate-200">
                            {key.replace('_', ' ')}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {val ? 'Active and operational' : 'Inaccessible to general users'}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleToggle(key)}
                          className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                            val
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          }`}
                        >
                          {val ? 'Enabled' : 'Disabled'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs transition-all shadow-md shadow-violet-600/25 disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>{saving ? 'Saving...' : 'Apply System Settings'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};
