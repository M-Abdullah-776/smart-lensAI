import React, { useEffect, useState } from 'react';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';
import { ResultCard } from '../components/ResultCard';
import api from '../services/api';
import {
  History as HistoryIcon,
  Trash2,
  Eye,
  X,
  FileText,
  Youtube,
  MessageSquare,
  FileCheck2,
  Globe,
  Filter,
  AlertCircle
} from 'lucide-react';

export const History = () => {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [toolFilter, setToolFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeItem, setActiveItem] = useState(null);
  const [error, setError] = useState('');

  const fetchHistory = async () => {
    setLoading(true);
    setError('');
    try {
      const url = `/api/history?page=${page}&limit=15${toolFilter ? `&tool=${toolFilter}` : ''}`;
      const res = await api.get(url);
      setItems(res.data.items || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      setError('Failed to load history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [page, toolFilter]);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this analysis record?')) return;
    try {
      await api.delete(`/api/history/${id}`);
      fetchHistory();
      if (activeItem?.id === id) setActiveItem(null);
    } catch (e) {
      alert('Failed to delete item.');
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Are you sure you want to clear your entire analysis history? This action cannot be undone.')) return;
    try {
      await api.delete('/api/history');
      fetchHistory();
      setActiveItem(null);
    } catch (e) {
      alert('Failed to clear history.');
    }
  };

  const getToolIcon = (tool) => {
    switch (tool) {
      case 'document':
        return <FileText className="w-4 h-4 text-blue-400" />;
      case 'youtube':
        return <Youtube className="w-4 h-4 text-red-400" />;
      case 'pdf_qa':
        return <MessageSquare className="w-4 h-4 text-emerald-400" />;
      case 'resume':
        return <FileCheck2 className="w-4 h-4 text-amber-400" />;
      case 'url':
        return <Globe className="w-4 h-4 text-cyan-400" />;
      default:
        return <HistoryIcon className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a1a]">
      <Navbar />

      <div className="flex-grow flex">
        <Sidebar />

        <main className="flex-1 p-6 lg:p-8 max-w-6xl mx-auto w-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                <HistoryIcon className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold font-display text-white">Analysis History</h1>
                <p className="text-xs text-slate-400">
                  Review and export your past summaries, answers, and evaluations.
                </p>
              </div>
            </div>

            {items.length > 0 && (
              <button
                onClick={handleClearAll}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 text-xs font-semibold transition-all self-start sm:self-auto"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All History</span>
              </button>
            )}
          </div>

          {/* FILTER BAR */}
          <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
            <Filter className="w-4 h-4 text-slate-500 flex-shrink-0" />
            {['', 'document', 'youtube', 'pdf_qa', 'resume', 'url'].map((t) => (
              <button
                key={t}
                onClick={() => {
                  setToolFilter(t);
                  setPage(1);
                }}
                className={`text-xs px-3 py-1.5 rounded-lg capitalize font-medium transition-all flex-shrink-0 ${
                  toolFilter === t
                    ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                    : 'glass-panel text-slate-400 hover:text-white'
                }`}
              >
                {t ? t.replace('_', ' ') : 'All Tools'}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="glass-panel rounded-2xl p-12 text-center text-xs text-slate-400">
              Loading your history...
            </div>
          ) : items.length === 0 ? (
            <div className="glass-panel rounded-2xl p-12 text-center">
              <p className="text-sm font-semibold text-slate-200">No records found</p>
              <p className="text-xs text-slate-400 mt-1">
                {toolFilter ? `No history entries for ${toolFilter}.` : 'Your analysis archive is currently empty.'}
              </p>
            </div>
          ) : (
            <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden shadow-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/[0.03] border-b border-white/10 text-slate-400 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-5 py-3.5 font-semibold">Tool</th>
                    <th className="px-5 py-3.5 font-semibold">Input Target</th>
                    <th className="px-5 py-3.5 font-semibold hidden sm:table-cell">Date</th>
                    <th className="px-5 py-3.5 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300">
                  {items.map((r) => (
                    <tr key={r.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-3.5 flex items-center gap-2 font-medium capitalize">
                        {getToolIcon(r.tool)}
                        <span>{r.tool.replace('_', ' ')}</span>
                      </td>
                      <td className="px-5 py-3.5 font-medium text-slate-100 max-w-xs truncate">
                        {r.input_name}
                      </td>
                      <td className="px-5 py-3.5 text-slate-400 hidden sm:table-cell">
                        {new Date(r.created_at).toLocaleDateString()} at{' '}
                        {new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-5 py-3.5 text-right space-x-2">
                        <button
                          onClick={() => setActiveItem(r)}
                          className="px-2.5 py-1 rounded bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 font-medium"
                          title="View Details"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleDelete(r.id)}
                          className="p-1 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-400"
                          title="Delete Record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* INSPECTION MODAL */}
          {activeItem && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
              <div className="glass-panel rounded-3xl border border-white/10 max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
                <div className="p-5 border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2 truncate">
                    {getToolIcon(activeItem.tool)}
                    <h3 className="text-base font-bold text-white truncate font-display">
                      {activeItem.input_name}
                    </h3>
                  </div>
                  <button
                    onClick={() => setActiveItem(null)}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-200">
                  <div className="bg-white/5 p-4 rounded-xl border border-white/5 font-mono whitespace-pre-wrap max-h-96 overflow-y-auto">
                    {activeItem.result?.summary ||
                     activeItem.result?.answer ||
                     JSON.stringify(activeItem.result, null, 2)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
