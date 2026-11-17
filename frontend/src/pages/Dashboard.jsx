import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';
import { AnnouncementBanner } from '../components/AnnouncementBanner';
import { DailyLimitBadge } from '../components/DailyLimitBadge';
import { useAuthStore } from '../stores/authStore';
import { useSettingsStore } from '../stores/settingsStore';
import api from '../services/api';
import {
  FileText,
  Youtube,
  MessageSquare,
  FileCheck2,
  Globe,
  ArrowRight,
  Clock,
  Sparkles,
  ChevronRight
} from 'lucide-react';

export const Dashboard = () => {
  const { user, fetchProfile } = useAuthStore();
  const { fetchAnnouncements } = useSettingsStore();
  const [recentHistory, setRecentHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    fetchProfile();
    fetchAnnouncements();

    const loadHistory = async () => {
      try {
        const res = await api.get('/api/history?limit=5');
        setRecentHistory(res.data.items || []);
      } catch (err) {
        // Handled silently
      } finally {
        setLoadingHistory(false);
      }
    };
    loadHistory();
  }, []);

  const toolCards = [
    {
      title: 'Document Analyzer',
      desc: 'Summarize contracts, research papers, reports in PDF, DOCX, TXT.',
      icon: <FileText className="w-5 h-5 text-blue-400" />,
      link: '/document-analyzer',
      color: 'border-blue-500/20 hover:border-blue-500/40',
    },
    {
      title: 'YouTube Summarizer',
      desc: 'Instant time-coded key insights & takeaways from video captions.',
      icon: <Youtube className="w-5 h-5 text-red-400" />,
      link: '/youtube-summarizer',
      color: 'border-red-500/20 hover:border-red-500/40',
    },
    {
      title: 'PDF Question Answering',
      desc: 'Chat directly with your uploaded PDF. Verifiable page citations.',
      icon: <MessageSquare className="w-5 h-5 text-emerald-400" />,
      link: '/pdf-qa',
      color: 'border-emerald-500/20 hover:border-emerald-500/40',
    },
    {
      title: 'Resume Analyzer',
      desc: 'Deterministic ATS score breakdown & job description matching.',
      icon: <FileCheck2 className="w-5 h-5 text-amber-400" />,
      link: '/resume-analyzer',
      color: 'border-amber-500/20 hover:border-amber-500/40',
    },
    {
      title: 'URL Content Analyzer',
      desc: 'SSRF-protected web scraper with synthesized executive summaries.',
      icon: <Globe className="w-5 h-5 text-cyan-400" />,
      link: '/url-analyzer',
      color: 'border-cyan-500/20 hover:border-cyan-500/40',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a1a]">
      <AnnouncementBanner />
      <Navbar />

      <div className="flex-grow flex">
        <Sidebar />

        <main className="flex-1 p-6 lg:p-8 max-w-6xl mx-auto w-full">
          {/* TOP WELCOME & METRICS */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl lg:text-3xl font-bold font-display text-white">
                  Welcome back, {user?.full_name?.split(' ')[0] || 'User'} 👋
                </h1>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Select an analytical tool to begin processing or review past results below.
              </p>
            </div>
            <DailyLimitBadge />
          </div>

          {/* 5 TOOL TILES */}
          <div className="mb-10">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              Available Tools
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {toolCards.map((tool, idx) => (
                <Link
                  key={idx}
                  to={tool.link}
                  className={`glass-panel glass-panel-hover rounded-2xl p-5 border ${tool.color} flex flex-col justify-between group`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                        {tool.icon}
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
                    </div>
                    <h3 className="text-base font-bold text-white mb-1.5">{tool.title}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">{tool.desc}</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-white/5 text-[11px] font-medium text-indigo-400">
                    Launch Analysis →
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* RECENT ACTIVITY TABLE */}
          <div className="glass-panel rounded-2xl p-6 border border-white/10 shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-400" />
                <h2 className="text-base font-bold text-white font-display">Recent Activity</h2>
              </div>
              <Link
                to="/history"
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
              >
                <span>View Full History</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {loadingHistory ? (
              <div className="py-8 text-center text-xs text-slate-500">Loading activity...</div>
            ) : recentHistory.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-xs text-slate-400">No analyses performed yet.</p>
                <p className="text-[11px] text-slate-500 mt-1">Upload a document or analyze a URL above to get started.</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {recentHistory.map((item) => (
                  <div key={item.id} className="py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-xs text-indigo-400 flex-shrink-0 font-bold uppercase">
                        {item.tool.slice(0, 3)}
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-sm font-medium text-slate-200 truncate">{item.input_name}</p>
                        <p className="text-[11px] text-slate-500">
                          {new Date(item.created_at).toLocaleDateString()} at{' '}
                          {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    <Link
                      to="/history"
                      className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-medium text-slate-300 transition-colors flex-shrink-0"
                    >
                      Inspect
                    </Link>
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
