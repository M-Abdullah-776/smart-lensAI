import React, { useEffect, useState } from 'react';
import { Navbar } from '../../components/Navbar';
import { Sidebar } from '../../components/Sidebar';
import api from '../../services/api';
import { Bell, Send, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';

export const AdminAnnouncements = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');

  const fetchAnnouncements = async () => {
    try {
      const res = await api.get('/admin/announcements');
      setAnnouncements(res.data);
    } catch (e) {
      // Handled silently
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handlePost = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    setError('');
    setFeedback('');
    setLoading(true);

    try {
      await api.post('/admin/announcements', { message: message.trim() });
      setMessage('');
      setFeedback('System-wide banner notification published.');
      fetchAnnouncements();
    } catch (err) {
      setError('Failed to broadcast announcement.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/admin/announcements/${id}`);
      fetchAnnouncements();
    } catch (e) {
      alert('Failed to delete announcement.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a1a]">
      <Navbar />

      <div className="flex-grow flex">
        <Sidebar />

        <main className="flex-1 p-6 lg:p-8 max-w-4xl mx-auto w-full">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-violet-500/20 text-violet-400 flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-display text-white">System Announcements</h1>
              <p className="text-xs text-slate-400">
                Broadcast system-wide notices, maintenance alerts, and policy changes to all active users.
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {/* POST FORM */}
            <div className="glass-panel p-6 rounded-2xl border border-white/10 shadow-xl">
              <h3 className="text-sm font-semibold text-white mb-2">Publish New Announcement</h3>
              <p className="text-xs text-slate-400 mb-4">
                This notice will display across the header banner for all logged-in members.
              </p>

              {error && (
                <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {feedback && (
                <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>{feedback}</span>
                </div>
              )}

              <form onSubmit={handlePost} className="space-y-3">
                <textarea
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="e.g. Scheduled platform maintenance tonight at 02:00 UTC. PDF uploads may experience brief pauses."
                  required
                  className="w-full glass-input rounded-xl p-3.5 text-xs leading-relaxed resize-none"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={loading || !message.trim()}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs shadow-md shadow-violet-600/25 transition-all disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{loading ? 'Publishing...' : 'Broadcast Announcement'}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* ACTIVE ANNOUNCEMENTS LIST */}
            <div className="glass-panel p-6 rounded-2xl border border-white/10 shadow-xl">
              <h3 className="text-sm font-semibold text-white mb-4">Active System Notices</h3>
              {announcements.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">No active announcements.</p>
              ) : (
                <div className="divide-y divide-white/5">
                  {announcements.map((item) => (
                    <div key={item.id} className="py-3 flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs text-slate-200">{item.message}</p>
                        <p className="text-[10px] text-slate-500 mt-1">
                          Posted on {new Date(item.created_at).toLocaleString()}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-400"
                        title="Remove Notice"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
