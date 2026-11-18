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
  const [oauthLoading, setOauthLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleGoogleSignUp = async () => {
    setError('');
    setOauthLoading(true);
    try {
      const res = await api.get('/auth/google/url', {
        params: { origin: window.location.origin }
      });
      if (res.data?.url) {
        window.location.href = res.data.url;
      }
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(detail || 'Google sign-up is not configured yet. Please register with your email.');
    } finally {
      setOauthLoading(false);
    }
  };

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
      const data = err.response?.data;
      if (data?.detail) {
        if (Array.isArray(data.detail)) {
          setError(data.detail.map((d) => d.msg || JSON.stringify(d)).join('. '));
        } else if (typeof data.detail === 'string') {
          setError(data.detail);
        } else {
          setError(JSON.stringify(data.detail));
        }
      } else if (data?.error) {
        setError(typeof data.error === 'string' ? data.error : JSON.stringify(data.error));
      } else if (!err.response) {
        setError('Server is momentarily restarting or waking up. Please wait 10 seconds and try again.');
      } else {
        setError('Registration failed. Please check your details and try again.');
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
            <>
              {/* GOOGLE SIGN UP */}
              <button
                type="button"
                onClick={handleGoogleSignUp}
                disabled={oauthLoading}
                className="w-full py-2.5 px-4 rounded-xl border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-white font-medium text-xs flex items-center justify-center gap-2.5 transition-all mb-4 disabled:opacity-50"
              >
                {oauthLoading ? (
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                )}
                <span>Continue with Google</span>
              </button>

              <div className="relative flex items-center justify-center my-4">
                <div className="border-t border-white/10 w-full" />
                <span className="bg-[#0f0f26] px-3 text-[11px] text-slate-500 uppercase tracking-wider">or register with email</span>
                <div className="border-t border-white/10 w-full" />
              </div>

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
            </>
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
