import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { ParticleBackground } from '../components/ParticleBackground';
import api from '../services/api';
import { CheckCircle2, XCircle, ArrowRight, Loader2 } from 'lucide-react';

export const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState('verifying'); // 'verifying', 'success', 'error'
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Missing verification token.');
      return;
    }

    const verify = async () => {
      try {
        const res = await api.get(`/auth/verify-email?token=${token}`);
        setStatus('success');
        setMessage(res.data.message || 'Email verified successfully.');
      } catch (err) {
        setStatus('error');
        setMessage(err.response?.data?.detail || 'Invalid or expired verification link.');
      }
    };

    verify();
  }, [token]);

  return (
    <div className="relative min-h-screen flex flex-col bg-[#0a0a1a]">
      <ParticleBackground />
      <Navbar />

      <div className="relative z-10 flex-grow flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md glass-panel p-8 rounded-3xl border border-white/10 shadow-2xl text-center">
          {status === 'verifying' && (
            <div>
              <Loader2 className="w-12 h-12 text-indigo-400 animate-spin mx-auto mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">Verifying Email...</h3>
              <p className="text-xs text-slate-400">Validating your security verification token</p>
            </div>
          )}

          {status === 'success' && (
            <div>
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Email Verified!</h3>
              <p className="text-xs text-slate-300 mb-6">{message}</p>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all"
              >
                <span>Proceed to Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}

          {status === 'error' && (
            <div>
              <div className="w-14 h-14 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Verification Failed</h3>
              <p className="text-xs text-slate-400 mb-6">{message}</p>
              <Link
                to="/register"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl glass-panel hover:bg-white/10 text-slate-200 font-semibold text-sm transition-all"
              >
                <span>Return to Registration</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
