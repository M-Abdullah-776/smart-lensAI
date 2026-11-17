import React, { useEffect, useState } from 'react';
import { Navbar } from '../../components/Navbar';
import { Sidebar } from '../../components/Sidebar';
import api from '../../services/api';
import { ScrollText, AlertTriangle, ShieldCheck } from 'lucide-react';

export const AdminLogs = () => {
  const [tab, setTab] = useState('audit'); // 'audit' or 'errors'
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const endpoint = tab === 'audit' ? '/admin/logs/audit' : '/admin/logs/errors';
      const res = await api.get(endpoint);
      setLogs(res.data);
    } catch (e) {
      alert('Failed to retrieve system logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [tab]);

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a1a]">
      <Navbar />

      <div className="flex-grow flex">
        <Sidebar />

        <main className="flex-1 p-6 lg:p-8 max-w-6xl mx-auto w-full">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-violet-500/20 text-violet-400 flex items-center justify-center">
              <ScrollText className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-display text-white">System Security & Audit Logs</h1>
              <p className="text-xs text-slate-400">
                Traceable administrative audit records and system diagnostics.
              </p>
            </div>
          </div>

          {/* TABS */}
          <div className="flex items-center gap-2 mb-6">
            <button
              onClick={() => setTab('audit')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
                tab === 'audit'
                  ? 'bg-violet-600 text-white shadow-md shadow-violet-600/25'
                  : 'glass-panel text-slate-400 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Audit Log Trail</span>
            </button>

            <button
              onClick={() => setTab('errors')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
                tab === 'errors'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/25'
                  : 'glass-panel text-slate-400 hover:text-white'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Failed Operations & Errors</span>
            </button>
          </div>

          <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden shadow-xl">
            {loading ? (
              <div className="p-12 text-center text-xs text-slate-400">Loading log records...</div>
            ) : logs.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400">No log entries found.</div>
            ) : (
              <div className="divide-y divide-white/5 font-mono text-xs">
                {logs.map((item) => (
                  <div key={item.id} className="p-4 hover:bg-white/[0.02] flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-violet-300">
                          {item.action || item.tool || 'SYSTEM'}
                        </span>
                        <span className="text-slate-500 text-[11px]">
                          User #{item.user_id || 'Anon'}
                        </span>
                      </div>
                      <p className="text-slate-300 font-sans text-xs">{item.detail || item.error_message}</p>
                    </div>
                    <span className="text-[11px] text-slate-500 whitespace-nowrap">
                      {new Date(item.created_at).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};
