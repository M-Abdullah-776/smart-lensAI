import React, { useState } from 'react';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';
import { UploadZone } from '../components/UploadZone';
import { ResultCard } from '../components/ResultCard';
import api from '../services/api';
import { FileText, Loader2, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';

export const DocumentAnalyzer = () => {
  const [file, setFile] = useState(null);
  const [keyPoints, setKeyPoints] = useState(true);
  const [detailed, setDetailed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const handleAnalyze = async () => {
    if (!file) {
      setError('Please select a document file to analyze.');
      return;
    }

    setError('');
    setLoading(true);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post(
        `/api/document/analyze?key_points=${keyPoints}&detailed=${detailed}`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        }
      );
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'An error occurred during document analysis.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
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
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-display text-white">Document Analyzer</h1>
              <p className="text-xs text-slate-400">
                Deep text extraction & hierarchical summarization for PDF, DOCX, and TXT files.
              </p>
            </div>
          </div>

          {!result ? (
            <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-white/10 space-y-6">
              <UploadZone
                onFileSelect={(f) => setFile(f)}
                accept=".pdf,.docx,.txt"
                maxSizeMB={10}
                label="Drop your document here or click to browse"
                hint="Supported formats: PDF, DOCX, TXT (Maximum 10MB)"
              />

              {/* OPTIONS */}
              <div className="flex flex-wrap items-center gap-6 pt-2 border-t border-white/10">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={keyPoints}
                    onChange={(e) => setKeyPoints(e.target.checked)}
                    className="rounded border-white/20 bg-white/5 text-indigo-600 focus:ring-0"
                  />
                  <span>Extract Bulleted Key Points</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={detailed}
                    onChange={(e) => setDetailed(e.target.checked)}
                    className="rounded border-white/20 bg-white/5 text-indigo-600 focus:ring-0"
                  />
                  <span>Detailed Executive Synthesis</span>
                </label>
              </div>

              {error && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                onClick={handleAnalyze}
                disabled={!file || loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Extracting & Summarizing (under 10s)...</span>
                  </>
                ) : (
                  <span>Analyze Document</span>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {result.is_duplicate && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>Note: An identical document was analyzed earlier in this session.</span>
                </div>
              )}

              {/* DOCUMENT METRICS BAR */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="glass-panel p-3.5 rounded-xl border border-white/10">
                  <p className="text-[11px] text-slate-400">Total Word Count</p>
                  <p className="text-lg font-bold text-white mt-0.5">{result.word_count.toLocaleString()} words</p>
                </div>
                <div className="glass-panel p-3.5 rounded-xl border border-white/10">
                  <p className="text-[11px] text-slate-400">Page Count</p>
                  <p className="text-lg font-bold text-indigo-400 mt-0.5">{result.page_count} pages</p>
                </div>
                <div className="glass-panel p-3.5 rounded-xl border border-white/10 col-span-2 sm:col-span-1">
                  <p className="text-[11px] text-slate-400">Document Name</p>
                  <p className="text-sm font-semibold text-slate-200 mt-1 truncate">{result.filename}</p>
                </div>
              </div>

              <ResultCard title={`Analysis: ${result.filename}`} rawContent={result.summary}>
                <div className="space-y-6">
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                      Executive Summary
                    </h4>
                    <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-line">
                      {result.summary}
                    </p>
                  </div>

                  {result.key_points && result.key_points.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5">
                        Key Points & Findings
                      </h4>
                      <ul className="space-y-2">
                        {result.key_points.map((pt, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-slate-200">
                            <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                            <span>{pt}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {result.main_topics && result.main_topics.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                        Identified Topics
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {result.main_topics.map((t, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-indigo-300"
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
                  <span>Upload Another Document</span>
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
