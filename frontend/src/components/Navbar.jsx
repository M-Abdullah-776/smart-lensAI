import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useSettingsStore } from '../stores/settingsStore';
import { Sparkles, User, LogOut, Shield, LayoutDashboard, Sun, Moon } from 'lucide-react';

export const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const { particlesEnabled, toggleParticles, darkMode, toggleTheme } = useSettingsStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav className="sticky top-0 z-50 w-full glass-panel border-b border-white/10 backdrop-blur-xl px-4 lg:px-8 py-3.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-cyan-400 flex items-center justify-center text-lg shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform">
            🔍
          </div>
          <span className="text-xl font-bold font-display tracking-tight bg-gradient-to-r from-white via-indigo-200 to-cyan-300 bg-clip-text text-transparent">
            SmartLens AI
          </span>
        </Link>

        <div className="flex items-center gap-3 md:gap-4">

          {/* 3D FX toggle — icon only, no text */}
          <button
            onClick={toggleParticles}
            title={particlesEnabled ? "Disable Background Particles" : "Enable Background Particles"}
            className={`p-2 rounded-lg border transition-colors ${
              particlesEnabled
                ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300'
                : 'bg-white/5 border-white/10 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
          </button>

          {/* Dark / Light mode toggle */}
          <button
            onClick={toggleTheme}
            title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            className={`p-2 rounded-lg border transition-colors ${
              darkMode
                ? 'bg-white/5 border-white/10 text-amber-300 hover:text-amber-200 hover:bg-amber-500/10'
                : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-600 hover:bg-indigo-500/20'
            }`}
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <Link
                to="/dashboard"
                className="flex items-center gap-1.5 text-sm font-medium px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-600/20"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </Link>

              {user?.role === 'admin' && (
                <Link
                  to="/admin"
                  className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-500/30 transition-all"
                  title="Admin Dashboard"
                >
                  <Shield className="w-4 h-4 text-violet-400" />
                  <span className="hidden sm:inline">Admin</span>
                </Link>
              )}

              <Link
                to="/profile"
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all"
                title="Profile Settings"
              >
                <User className="w-4 h-4" />
              </Link>

              <button
                onClick={handleLogout}
                className="p-2 rounded-lg bg-white/5 hover:bg-rose-500/20 border border-white/10 text-slate-400 hover:text-rose-300 transition-all"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <Link
                to="/login"
                className="text-sm font-medium text-slate-300 hover:text-white px-3 py-1.5 transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="text-sm font-medium px-4 py-1.5 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white shadow-lg shadow-indigo-500/25 transition-all"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};
