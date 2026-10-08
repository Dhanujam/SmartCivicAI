import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  LogIn,
  Mail,
  Lock,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Building2,
  User,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please provide both your email address and password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const loggedInUser = await login(email.trim(), password);
      // Backend determines the role:
      if (loggedInUser.role === 'ADMIN') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (err) {
      console.error('Login error:', err);
      const detail =
        err.response?.data?.detail ||
        err.message ||
        'Authentication failed. Please verify your credentials.';
      setError(detail);
    } finally {
      setLoading(false);
    }
  };

  // Quick Demo Credentials Fillers for Hackathon Reviewers
  const fillCitizenDemo = () => {
    setEmail('citizen_test@example.com');
    setPassword('Password@123');
    setError(null);
  };

  const fillAdminDemo = () => {
    setEmail('admin@smartcivic.gov');
    setPassword('Admin@12345');
    setError(null);
  };

  return (
    <div className="w-full max-w-md mx-auto my-auto py-8">
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-2xl relative overflow-hidden">
        {/* Decorative Top Accent Glow */}
        <div className="absolute top-0 left-1/4 right-1/4 h-[2px] bg-gradient-to-r from-transparent via-sky-500/80 to-transparent blur-sm" />

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-sky-500/20">
            <ShieldCheck className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">
            Sign In to SmartCivic
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Access your civic reporting account or government portal
          </p>
        </div>

        {/* Quick Demo Fillers */}
        <div className="mb-6 p-3 rounded-2xl bg-slate-900/70 border border-slate-800">
          <p className="text-[11px] font-semibold text-slate-400 mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-amber-400" />
            Quick Demo Accounts (1-Click Fill):
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={fillCitizenDemo}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/70 text-left text-xs transition"
            >
              <div className="flex items-center gap-1 font-bold text-sky-400">
                <User className="w-3 h-3" />
                Citizen Demo
              </div>
              <div className="text-[10px] text-slate-400 truncate">citizen_test@example.com</div>
            </button>

            <button
              type="button"
              onClick={fillAdminDemo}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/70 text-left text-xs transition"
            >
              <div className="flex items-center gap-1 font-bold text-indigo-400">
                <Building2 className="w-3 h-3" />
                Gov Official
              </div>
              <div className="text-[10px] text-slate-400 truncate">admin@smartcivic.gov</div>
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            role="alert"
            className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 animate-fadeIn"
          >
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
            <p className="flex-1">{error}</p>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5"
            >
              <Mail className="w-3.5 h-3.5 text-sky-400" />
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
              placeholder="name@example.com or admin@smartcivic.gov"
              autoComplete="email"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500 transition disabled:opacity-50"
            />
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="password"
              className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5 text-indigo-400" />
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
              placeholder="••••••••"
              autoComplete="current-password"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500 transition disabled:opacity-50"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-sky-500 via-indigo-600 to-sky-600 hover:from-sky-400 hover:via-indigo-500 hover:to-sky-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-sky-500/25 transition cursor-pointer flex items-center justify-center gap-2 mt-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </>
            )}
          </button>
        </form>

        {/* Footer / Register Link */}
        <div className="mt-6 text-center text-xs text-slate-400 pt-4 border-t border-slate-800">
          <span>Don't have a citizen account? </span>
          <Link to="/register" className="font-semibold text-sky-400 hover:text-sky-300 underline">
            Register as a Citizen
          </Link>
        </div>
      </div>
    </div>
  );
}
