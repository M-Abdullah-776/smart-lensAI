import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { ParticleBackground } from '../components/ParticleBackground';
import api from '../services/api';
import { User, Mail, Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';

export const Register = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const getPasswordStrength = (pass) => {
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[a-zA-Z]/.test(pass) && /[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    if (pass.length >= 12) score++;
    return score;
  };

  const strength = getPasswordStrength(password);
  const strengthLabels = ['Too weak', 'Fair', 'Good', 'Strong'];
  const strengthColors = ['bg-rose-500', 'bg-amber-500', 'bg-indigo-500', 'bg-emerald-500'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      setError('Password must be at least 8 characters and contain letters and numbers.');
      return;
    }
    if (!termsAccepted) {
      setError('Please agree to the Terms of Service to continue.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/register', {
        full_name: fullName,
        email,
        password,
        confirm_password: confirmPassword,
        terms_accepted: termsAccepted,
      });
      setSuccessMessage(res.data.message || 'Registration successful!');
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (detail) {
        setError(detail);
      } else if (!err.response) {
        setError('Could not reach the server. Please try again in a moment.');
      } else {
        setError('Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col bg-[#0a0a1a]">
      <ParticleBackground />
      <Navbar />

      <div className="relative z-10 flex-grow flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg glass-panel p-8 rounded-3xl border border-white/10 shadow-2xl backdrop-blur-2xl">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold font-display text-white">Create Your Account</h2>
            <p className="text-xs text-slate-400 mt-1">Unlock real-time AI content analysis</p>
          </div>

          {/* 3-STEP PROGRESS INDICATOR */}
          <div className="flex items-center justify-between mb-8 px-4">
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center ${
                fullName && email ? 'bg-indigo-600 text-white' : 'bg-white/10 text-slate-400'
              }`}>1</div>
              <span className="text-xs font-medium text-slate-300 hidden sm:inline">Identity</span>
            </div>
            <div className="flex-1 h-0.5 mx-2 bg-white/10" />
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center ${
                password && confirmPassword ? 'bg-indigo-600 text-white' : 'bg-white/10 text-slate-400'
              }`}>2</div>
              <span className="text-xs font-medium text-slate-300 hidden sm:inline">Security</span>
            </div>
            <div className="flex-1 h-0.5 mx-2 bg-white/10" />
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center ${
                termsAccepted ? 'bg-indigo-600 text-white' : 'bg-white/10 text-slate-400'
              }`}>3</div>
              <span className="text-xs font-medium text-slate-300 hidden sm:inline">Verify</span>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMessage ? (
            <div className="text-center py-6">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Account Created!</h3>
              <p className="text-sm text-slate-300 mb-6 max-w-sm mx-auto">{successMessage}</p>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all"
              >
                <span>Proceed to Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Muhammad Zubair"
                    required
                    className="w-full glass-input rounded-xl pl-10 pr-4 py-2.5 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    required
                    className="w-full glass-input rounded-xl pl-10 pr-4 py-2.5 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 8 letters & numbers"
                      required
                      className="w-full glass-input rounded-xl pl-10 pr-9 py-2.5 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Confirm Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat password"
                      required
                      className="w-full glass-input rounded-xl pl-10 pr-4 py-2.5 text-sm"
                    />
                  </div>
                </div>
              </div>

              {password && (
                <div className="space-y-1 pt-1">
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Password Strength</span>
                    <span className="font-semibold text-slate-200">
                      {strengthLabels[Math.min(strength, 3)]}
                    </span>
                  </div>
                  <div className="flex gap-1 h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                    <div className={`h-full ${strengthColors[Math.min(strength, 3)]} transition-all duration-300`} style={{ width: `${(strength / 4) * 100}%` }} />
                  </div>
                </div>
              )}

              <div className="flex items-start gap-2 pt-2">
                <input
                  type="checkbox"
                  id="terms"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-0.5 rounded border-white/20 bg-white/5 text-indigo-600 focus:ring-0 cursor-pointer"
                />
                <label htmlFor="terms" className="text-xs text-slate-400 cursor-pointer leading-tight">
                  I agree to the Terms of Service and acknowledge that analytical outputs are AI-generated suggestions.
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-4 py-3 rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Create Free Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          <p className="mt-6 text-center text-xs text-slate-400">
            Already registered?{' '}
            <Link to="/login" className="font-semibold text-indigo-400 hover:text-indigo-300">
              Sign in instead
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
