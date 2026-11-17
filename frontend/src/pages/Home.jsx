import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { ParticleBackground } from '../components/ParticleBackground';
import api from '../services/api';
import {
  FileText,
  Youtube,
  MessageSquare,
  FileCheck2,
  Globe,
  ArrowRight,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Sparkles
} from 'lucide-react';

export const Home = () => {
  const [stats, setStats] = useState({ total_analyses: 0, total_users: 0, tools_count: 5 });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/api/stats/public');
        setStats(res.data);
      } catch (e) {
        // Fallback default
      }
    };
    fetchStats();
  }, []);

  const tools = [
    {
      title: 'Document Analyzer',
      desc: 'Deep multi-page text extraction and hierarchical summarization for PDF, DOCX, and TXT files.',
      icon: <FileText className="w-6 h-6 text-blue-400" />,
      link: '/document-analyzer',
      gradient: 'from-blue-500/20 to-indigo-500/10',
      tag: 'Hierarchical AI',
    },
    {
      title: 'YouTube Summarizer',
      desc: 'Automatic closed-caption extraction and time-coded key takeaways for long lectures and podcasts.',
      icon: <Youtube className="w-6 h-6 text-red-400" />,
      link: '/youtube-summarizer',
      gradient: 'from-red-500/20 to-rose-500/10',
      tag: 'Timestamped',
    },
    {
      title: 'PDF Interactive Q&A',
      desc: 'Fact-checked document retrieval chat powered by BM25 search. Strict page citations with zero hallucination.',
      icon: <MessageSquare className="w-6 h-6 text-emerald-400" />,
      link: '/pdf-qa',
      gradient: 'from-emerald-500/20 to-teal-500/10',
      tag: 'Page-Cited',
    },
    {
      title: 'Resume & Job Matcher',
      desc: 'Deterministic ATS scoring with four-pillar diagnostics and role-matching alignment.',
      icon: <FileCheck2 className="w-6 h-6 text-amber-400" />,
      link: '/resume-analyzer',
      gradient: 'from-amber-500/20 to-orange-500/10',
      tag: 'Deterministic',
    },
    {
      title: 'URL Content Analyzer',
      desc: 'SSRF-protected web scraper with smart boilerplate removal and synthesized executive briefs.',
      icon: <Globe className="w-6 h-6 text-cyan-400" />,
      link: '/url-analyzer',
      gradient: 'from-cyan-500/20 to-blue-500/10',
      tag: 'SSRF-Safe',
    },
  ];

  return (
    <div className="relative min-h-screen flex flex-col bg-[#0a0a1a]">
      <ParticleBackground />
      <Navbar />

      <main className="relative z-10 flex-grow">
        {/* HERO SECTION */}
        <section className="pt-20 pb-16 px-4 text-center max-w-5xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass-panel border border-indigo-500/30 text-indigo-300 text-xs font-medium mb-8 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>SmartLens AI Platform • Production Edition</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold font-display tracking-tight leading-[1.1] mb-6">
            Multi-Source Content Analysis,{' '}
            <span className="bg-gradient-to-r from-indigo-400 via-violet-300 to-cyan-400 bg-clip-text text-transparent">
              Powered by Precision AI
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed font-light">
            Instantly synthesize documents, YouTube lectures, live websites, and resumes. 
            Real metrics, verifiable page citations, and zero simulated responses.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-semibold text-base shadow-xl shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 group"
            >
              <span>Start Free Analysis</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              to="/login"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl glass-panel hover:bg-white/10 text-slate-200 font-semibold text-base transition-all"
            >
              Sign In to Account
            </Link>
          </div>

          {/* REAL STATS COUNTER BAR */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-3xl mx-auto mt-16 p-4 rounded-2xl glass-panel border border-white/10">
            <div className="p-4 text-center">
              <p className="text-2xl sm:text-3xl font-extrabold text-white font-display">
                {stats.total_analyses}
              </p>
              <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider">Processed Items</p>
            </div>
            <div className="p-4 text-center border-l border-white/10">
              <p className="text-2xl sm:text-3xl font-extrabold text-indigo-400 font-display">
                {stats.total_users}
              </p>
              <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider">Active Users</p>
            </div>
            <div className="p-4 text-center border-l border-white/10 col-span-2 md:col-span-1">
              <p className="text-2xl sm:text-3xl font-extrabold text-cyan-400 font-display">
                5 Tools
              </p>
              <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider">Unified Workspace</p>
            </div>
          </div>
        </section>

        {/* 5 TOOL CARDS GRID */}
        <section className="py-16 px-4 max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold font-display text-white">
              Five Specialized Analysis Engines
            </h2>
            <p className="text-sm text-slate-400 mt-2">
              Engineered with genuine data scrapers, real text extraction, and strict guardrails.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tools.map((tool, idx) => (
              <Link
                key={idx}
                to={tool.link}
                className={`glass-panel glass-panel-hover rounded-2xl p-6 flex flex-col justify-between border border-white/10 bg-gradient-to-br ${tool.gradient}`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center shadow-md">
                      {tool.icon}
                    </div>
                    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white/10 text-slate-300 border border-white/10">
                      {tool.tag}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2 font-display">{tool.title}</h3>
                  <p className="text-sm text-slate-300 font-light leading-relaxed">{tool.desc}</p>
                </div>
                <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs font-semibold text-indigo-400">
                  <span>Open Tool</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="py-16 px-4 max-w-5xl mx-auto border-t border-white/10">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold font-display text-white">
              Transparent, Verifiable Processing
            </h2>
            <p className="text-sm text-slate-400 mt-2">No canned answers. No hardcoded statistics.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-panel p-6 rounded-2xl border border-white/10 text-center">
              <div className="w-10 h-10 rounded-full bg-indigo-500/20 text-indigo-400 font-bold mx-auto flex items-center justify-center mb-4">
                1
              </div>
              <h4 className="text-base font-semibold text-white mb-2">Real Input Extraction</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Raw byte parsing of PDF/DOCX, YouTube API caption streaming, and live SSRF-checked web fetching.
              </p>
            </div>
            <div className="glass-panel p-6 rounded-2xl border border-white/10 text-center">
              <div className="w-10 h-10 rounded-full bg-violet-500/20 text-violet-400 font-bold mx-auto flex items-center justify-center mb-4">
                2
              </div>
              <h4 className="text-base font-semibold text-white mb-2">Deterministic Scoring & BM25</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Zero temperature resume scoring ensures repeatable ATS results; vector BM25 cites genuine page numbers.
              </p>
            </div>
            <div className="glass-panel p-6 rounded-2xl border border-white/10 text-center">
              <div className="w-10 h-10 rounded-full bg-cyan-500/20 text-cyan-400 font-bold mx-auto flex items-center justify-center mb-4">
                3
              </div>
              <h4 className="text-base font-semibold text-white mb-2">Ephemeral Privacy</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Uploaded files are discarded from memory immediately upon completion. Only your personal history is preserved.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 glass-panel border-t border-white/10 py-6 px-4 text-center text-xs text-slate-500">
        <p>© 2026 SmartLens AI Platform. All analytical models labelled with standard safety notices.</p>
      </footer>
    </div>
  );
};
