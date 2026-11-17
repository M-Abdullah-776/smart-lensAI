import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import {
  LayoutDashboard,
  FileText,
  Youtube,
  MessageSquare,
  FileCheck2,
  Globe,
  History,
  User,
  Shield,
  LogOut,
  Bell,
  Sliders,
  Users,
  ScrollText
} from 'lucide-react';

export const Sidebar = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItemClass = ({ isActive }) =>
    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
      isActive
        ? 'bg-gradient-to-r from-indigo-600/30 to-violet-600/30 text-indigo-300 border border-indigo-500/40 shadow-sm'
        : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
    }`;

  return (
    <aside className="w-64 flex-shrink-0 min-h-[calc(100vh-65px)] glass-panel border-r border-white/10 p-4 flex flex-col justify-between hidden md:flex">
      <div className="space-y-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 px-3 mb-2">
            AI Tool Suite
          </p>
          <nav className="space-y-1">
            <NavLink to="/dashboard" end className={navItemClass}>
              <LayoutDashboard className="w-4 h-4 text-indigo-400" />
              <span>Overview</span>
            </NavLink>
            <NavLink to="/document-analyzer" className={navItemClass}>
              <FileText className="w-4 h-4 text-blue-400" />
              <span>Document Analyzer</span>
            </NavLink>
            <NavLink to="/youtube-summarizer" className={navItemClass}>
              <Youtube className="w-4 h-4 text-red-400" />
              <span>YouTube Summarizer</span>
            </NavLink>
            <NavLink to="/pdf-qa" className={navItemClass}>
              <MessageSquare className="w-4 h-4 text-emerald-400" />
              <span>PDF Question & Answer</span>
            </NavLink>
            <NavLink to="/resume-analyzer" className={navItemClass}>
              <FileCheck2 className="w-4 h-4 text-amber-400" />
              <span>Resume Analyzer</span>
            </NavLink>
            <NavLink to="/url-analyzer" className={navItemClass}>
              <Globe className="w-4 h-4 text-cyan-400" />
              <span>URL Content Analyzer</span>
            </NavLink>
          </nav>
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 px-3 mb-2">
            Personal Space
          </p>
          <nav className="space-y-1">
            <NavLink to="/history" className={navItemClass}>
              <History className="w-4 h-4 text-slate-400" />
              <span>Analysis History</span>
            </NavLink>
            <NavLink to="/profile" className={navItemClass}>
              <User className="w-4 h-4 text-slate-400" />
              <span>Account Settings</span>
            </NavLink>
          </nav>
        </div>

        {user?.role === 'admin' && (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-violet-400/90 px-3 mb-2 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-violet-400" />
              Admin Portal
            </p>
            <nav className="space-y-1">
              <NavLink to="/admin" end className={navItemClass}>
                <Sliders className="w-4 h-4 text-violet-400" />
                <span>Admin Overview</span>
              </NavLink>
              <NavLink to="/admin/users" className={navItemClass}>
                <Users className="w-4 h-4 text-violet-400" />
                <span>Manage Users</span>
              </NavLink>
              <NavLink to="/admin/announcements" className={navItemClass}>
                <Bell className="w-4 h-4 text-violet-400" />
                <span>Announcements</span>
              </NavLink>
              <NavLink to="/admin/logs" className={navItemClass}>
                <ScrollText className="w-4 h-4 text-violet-400" />
                <span>Audit & Error Logs</span>
              </NavLink>
            </nav>
          </div>
        )}
      </div>

      <div className="pt-4 border-t border-white/10">
        <div className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5">
          <div className="overflow-hidden pr-2">
            <p className="text-sm font-medium text-slate-200 truncate">{user?.full_name || 'User'}</p>
            <p className="text-xs text-slate-500 truncate">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            title="Sign Out"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
