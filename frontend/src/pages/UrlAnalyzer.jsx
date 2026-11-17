import React, { useState } from 'react';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';
import { ResultCard } from '../components/ResultCard';
import api from '../services/api';
import {
  Globe,
  Search,
  Loader2,
  RefreshCw,
  AlertTriangle,
  Clock,
  BookOpen,
  CheckCircle,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';

export const UrlAnalyzer = () => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!url.trim()) {
      setError('Please provide a valid webpage URL.');
      return;
    }

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      setError('URL must start with http:// or https://');
      return;
    }

    setError('');
    setLoading(true);
    setResult(null);

    try {
      const res = await api.post('/api/url/analyze', { url: url.trim() });
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to analyze webpage content.');
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
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-display text-white">URL Content Analyzer</h1>
              <p className="text-xs text-slate-400">
                Extract readable text from any public website, strip ads & clutter, and synthesize executive briefs.
              </p>
            </div>
          </div>

          {!result ? (
            <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-white/10 space-y-6">
              <form onSubmit={handleAnalyze} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-2">
                    Webpage or Article URL
                  </label>
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://example.com/article-name"
                      required
                      className="w-full glass-input rounded-xl pl-11 pr-4 py-3 text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-500">
                    <ShieldAlert className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                    <span>Protected by server-side SSRF validation (internal/private IPs strictly blocked).</span>
                  </div>
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
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-cyan-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Fetching Live Page & Analyzing...</span>
                    </>
                  ) : (
                    <span>Analyze Webpage</span>
                  )}
                </button>
              </form>
            </div>
          ) : (
            <div className="space-y-6">
              {/* WEBPAGE METADATA BAR */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="glass-panel p-3.5 rounded-xl border border-white/10">
                  <p className="text-[11px] text-slate-400">HTTP Status</p>
                  <p className="text-base font-bold text-emerald-400 mt-0.5">
                    {result.status_code} OK
                  </p>
                </div>
                <div className="glass-panel p-3.5 rounded-xl border border-white/10">
                  <p className="text-[11px] text-slate-400">Word Count</p>
                  <p className="text-base font-bold text-white mt-0.5">
                    {result.word_count.toLocaleString()} words
                  </p>
                </div>
                <div className="glass-panel p-3.5 rounded-xl border border-white/10">
                  <p className="text-[11px] text-slate-400">Reading Time</p>
                  <p className="text-base font-bold text-indigo-400 mt-0.5">
                    ~{result.reading_time_minutes} min read
                  </p>
                </div>
                <div className="glass-panel p-3.5 rounded-xl border border-white/10">
                  <p className="text-[11px] text-slate-400">Domain Source</p>
                  <p className="text-xs font-semibold text-slate-200 mt-1 truncate">
                    {result.domain}
                  </p>
                </div>
              </div>

              <ResultCard title={`Page Synthesis: ${result.title}`} rawContent={result.summary}>
                <div className="space-y-6">
                  {/* TITLE & LINK */}
                  <div className="pb-4 border-b border-white/5 flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-white font-display">{result.title}</h3>
                      <a
                        href={result.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 mt-1 font-mono"
                      >
                        <span className="truncate max-w-md">{result.url}</span>
                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      </a>
                    </div>
                  </div>

                  {/* SUMMARY */}
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                      Synthesized Summary
                    </h4>
                    <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-line">
                      {result.summary}
                    </p>
                  </div>

                  {/* KEY POINTS */}
                  {result.key_points && result.key_points.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5">
                        Key Points & Takeaways
                      </h4>
                      <ul className="space-y-2">
                        {result.key_points.map((pt, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-slate-200">
                            <CheckCircle className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                            <span>{pt}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* TOPICS */}
                  {result.main_topics && result.main_topics.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                        Identified Topics
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {result.main_topics.map((t, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-300"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
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
                  <span>Analyze Another URL</span>
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
