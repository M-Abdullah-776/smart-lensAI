import React, { useState } from 'react';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';
import { UploadZone } from '../components/UploadZone';
import { ResultCard } from '../components/ResultCard';
import api from '../services/api';
import {
  FileCheck2,
  CheckCircle2,
  XCircle,
  Lightbulb,
  Briefcase,
  Loader2,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';

export const ResumeAnalyzer = () => {
  const [resumeFile, setResumeFile] = useState(null);
  const [jobDescription, setJobDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const handleAnalyze = async () => {
    if (!resumeFile) {
      setError('Please upload your resume file (PDF or DOCX).');
      return;
    }

    setError('');
    setLoading(true);
    setResult(null);

    const formData = new FormData();
    formData.append('resume_file', resumeFile);
    if (jobDescription.trim()) {
      formData.append('job_description', jobDescription.trim());
    }

    try {
      const res = await api.post('/api/resume/analyze', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to analyze resume.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setResumeFile(null);
    setJobDescription('');
    setResult(null);
    setError('');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a1a]">
      <Navbar />

      <div className="flex-grow flex">
        <Sidebar />

        <main className="flex-1 p-6 lg:p-8 max-w-6xl mx-auto w-full">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-display text-white">Resume Analyzer & Job Matcher</h1>
              <p className="text-xs text-slate-400">
                Deterministic ATS diagnostic scoring (temp 0) and tailored role alignment recommendations.
              </p>
            </div>
          </div>

          {!result ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* RESUME UPLOAD */}
              <div className="glass-panel p-6 rounded-2xl border border-white/10 flex flex-col justify-between">
                <div>
                  <h3 className="text-base font-semibold text-white mb-2">1. Upload Resume</h3>
                  <p className="text-xs text-slate-400 mb-4">
                    PDF or DOCX format. Your document is processed in memory and never stored permanently.
                  </p>
                  <UploadZone
                    onFileSelect={(f) => setResumeFile(f)}
                    accept=".pdf,.docx,.txt"
                    maxSizeMB={10}
                    label="Choose Resume File"
                    hint="PDF or DOCX (Max 10MB)"
                  />
                </div>
              </div>

              {/* OPTIONAL JOB DESCRIPTION */}
              <div className="glass-panel p-6 rounded-2xl border border-white/10 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-base font-semibold text-white">2. Job Description (Optional)</h3>
                    <span className="text-[11px] text-indigo-400 font-semibold bg-indigo-500/10 px-2 py-0.5 rounded">
                      Job Matcher
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mb-4">
                    Paste the target job description to receive custom keyword matching & missing skills.
                  </p>
                  <textarea
                    rows={7}
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Paste job posting requirements, responsibilities, or skills here..."
                    className="w-full glass-input rounded-xl p-3.5 text-xs font-mono leading-relaxed resize-none"
                  />
                </div>

                {error && (
                  <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  onClick={handleAnalyze}
                  disabled={!resumeFile || loading}
                  className="w-full mt-4 py-3 rounded-xl bg-gradient-to-r from-amber-600 via-orange-600 to-indigo-600 hover:from-amber-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-amber-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Computing ATS Diagnostics...</span>
                    </>
                  ) : (
                    <span>Analyze Resume</span>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* TOP SCORE DISPLAY CARDS */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* SVG OVERALL SCORE RING */}
                <div className="glass-panel p-6 rounded-2xl border border-white/10 flex flex-col items-center justify-center text-center">
                  <div className="relative w-32 h-32 flex items-center justify-center">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        className="stroke-white/10"
                        strokeWidth="8"
                        fill="transparent"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        className="stroke-amber-400"
                        strokeWidth="8"
                        strokeDasharray={251.2}
                        strokeDashoffset={251.2 - (251.2 * result.overall_score) / 100}
                        strokeLinecap="round"
                        fill="transparent"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-3xl font-extrabold text-white font-display">
                        {result.overall_score}
                      </span>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider">out of 100</span>
                    </div>
                  </div>
                  <h4 className="text-sm font-bold text-white mt-3">ATS Compatibility Score</h4>
                  <p className="text-[11px] text-slate-400 mt-1">Deterministic standard measurement</p>
                </div>

                {/* 4 PILLARS BREAKDOWN */}
                <div className="glass-panel p-6 rounded-2xl border border-white/10 col-span-2 flex flex-col justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">
                    Four-Pillar Performance Breakdown
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(result.breakdown || {}).map(([key, val]) => (
                      <div key={key} className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="capitalize font-medium text-slate-300">{key}</span>
                          <span className="font-bold text-amber-400">{val}%</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-amber-500 to-indigo-500 rounded-full"
                            style={{ width: `${val}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {result.job_match && (
                    <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-cyan-400" />
                        <span className="text-xs font-semibold text-slate-200">Job Description Match:</span>
                      </div>
                      <span className="text-sm font-bold text-cyan-400 font-mono">
                        {result.job_match.match_percentage}% Match
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* DETAILED FEEDBACK TABS / SECTIONS */}
              <ResultCard title="Resume Diagnostic Report" rawContent={result} isResume={true}>
                <div className="space-y-6">
                  {/* STRENGTHS */}
                  {result.strengths && result.strengths.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-2 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Candidate Strengths
                      </h4>
                      <ul className="space-y-2">
                        {result.strengths.map((s, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-slate-200">
                            <span className="text-emerald-400">•</span>
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* WEAKNESSES */}
                  {result.weaknesses && result.weaknesses.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-rose-400 mb-2 flex items-center gap-1.5">
                        <XCircle className="w-3.5 h-3.5" />
                        Areas for Improvement
                      </h4>
                      <ul className="space-y-2">
                        {result.weaknesses.map((w, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-slate-200">
                            <span className="text-rose-400">•</span>
                            <span>{w}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* SUGGESTIONS */}
                  {result.suggestions && result.suggestions.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-400 mb-2 flex items-center gap-1.5">
                        <Lightbulb className="w-3.5 h-3.5" />
                        Actionable Rewrite Suggestions
                      </h4>
                      <ul className="space-y-2">
                        {result.suggestions.map((sg, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-slate-200">
                            <span className="text-amber-400">•</span>
                            <span>{sg}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* JOB MATCH DETAILS */}
                  {result.job_match && (
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                        <Briefcase className="w-3.5 h-3.5" />
                        Target Role Alignment
                      </h4>
                      {result.job_match.missing_requirements && (
                        <div>
                          <p className="text-xs font-semibold text-slate-400 mb-1">Missing Requirements:</p>
                          <div className="flex flex-wrap gap-1.5">
                            {result.job_match.missing_requirements.map((m, i) => (
                              <span key={i} className="text-xs px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-300 border border-rose-500/20">
                                {m}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {result.job_match.tailoring_advice && (
                        <p className="text-xs text-slate-300 italic">
                          Advice: {result.job_match.tailoring_advice}
                        </p>
                      )}
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
                  <span>Analyze Another Resume</span>
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
