import React, { useState } from 'react';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';
import { ResultCard } from '../components/ResultCard';
import api from '../services/api';
import { Youtube, Search, Loader2, RefreshCw, AlertTriangle, Clock, CheckCircle } from 'lucide-react';

export const YouTubeSummarizer = () => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const handleSummarize = async (e) => {
    e.preventDefault();
    if (!url.trim()) {
      setError('Please provide a valid YouTube link.');
      return;
    }

    setError('');
    setLoading(true);
    setResult(null);

    try {
      const res = await api.post('/api/youtube/summarize', { url: url.trim() });
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to summarize YouTube video.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setUrl('');
    setResult(null);
    setError('');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a1a]">
      <Navbar />

      <div className="flex-grow flex">
        <Sidebar />

        <main className="flex-1 p-6 lg:p-8 max-w-5xl mx-auto w-full">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center">
              <Youtube className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-display text-white">YouTube Summarizer</h1>
              <p className="text-xs text-slate-400">
                Extract captions and synthesize timestamped insights from lectures, talks, and tutorials.
              </p>
            </div>
          </div>

          {!result ? (
            <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-white/10 space-y-6">
              <form onSubmit={handleSummarize} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-2">
                    YouTube Video URL
                  </label>
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
                      required
                      className="w-full glass-input rounded-xl pl-11 pr-4 py-3 text-sm"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2">
                    * Requires public closed captions/transcripts enabled on YouTube.
                  </p>
                </div>

                {error && (
                  <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !url}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-indigo-600 hover:from-red-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-red-600/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Fetching Captions & Analyzing...</span>
                    </>
                  ) : (
                    <span>Summarize Video</span>
                  )}
                </button>
              </form>
            </div>
          ) : (
            <div className="space-y-6">
              {/* VIDEO HEADER CARD */}
              <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-white/10 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                {result.thumbnail && (
                  <img
                    src={result.thumbnail}
                    alt={result.title}
                    className="w-full sm:w-44 h-28 object-cover rounded-xl border border-white/10 shadow-md flex-shrink-0"
                  />
                )}
                <div className="overflow-hidden">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                    YouTube Source
                  </span>
                  <h3 className="text-base sm:text-lg font-bold text-white mt-1.5 line-clamp-2">
                    {result.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Channel: {result.channel}</p>
                </div>
              </div>

              <ResultCard title="Video Insights & Summary" rawContent={result.summary}>
                <div className="space-y-6">
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                      Overview
                    </h4>
                    <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-line">
                      {result.summary}
                    </p>
                  </div>

                  {result.key_points_with_timestamps && result.key_points_with_timestamps.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-indigo-400" />
                        Timestamped Key Moments
                      </h4>
                      <div className="space-y-2">
                        {result.key_points_with_timestamps.map((pt, idx) => (
                          <div
                            key={idx}
                            className="flex items-start gap-3 p-2.5 rounded-xl bg-white/[0.02] border border-white/5"
                          >
                            <span className="text-xs font-mono font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20 flex-shrink-0">
                              {pt.timestamp}
                            </span>
                            <span className="text-xs sm:text-sm text-slate-200">{pt.point}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {result.takeaways && result.takeaways.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                        Core Takeaways
                      </h4>
                      <ul className="space-y-2">
                        {result.takeaways.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-slate-200">
                            <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </ResultCard>

              <div className="flex justify-end">
                <button
                  onClick={handleReset}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl glass-panel hover:bg-white/10 text-slate-200 text-xs font-semibold border border-white/10 transition-all"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Summarize Another Video</span>
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
