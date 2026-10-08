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
    <div className="w-full max-w-md mx-auto my-auto py-10">
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm relative">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center mx-auto mb-3 text-blue-600 shadow-sm">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Welcome back
          </h2>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            Sign in to your civic reporting account
          </p>
        </div>

        {/* Quick Demo Fillers */}
        <div className="mb-6 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
          <p className="text-[11px] font-bold text-slate-700 mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            Quick Demo Accounts (1-Click Fill):
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={fillCitizenDemo}
              className="p-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-left text-xs transition shadow-sm"
            >
              <div className="flex items-center gap-1 font-bold text-blue-600">
                <User className="w-3 h-3" />
                Citizen Demo
              </div>
              <div className="text-[10px] text-slate-500 truncate mt-0.5">citizen_test@example.com</div>
            </button>

            <button
              type="button"
              onClick={fillAdminDemo}
              className="p-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-left text-xs transition shadow-sm"
            >
              <div className="flex items-center gap-1 font-bold text-teal-700">
                <Building2 className="w-3 h-3 text-teal-600" />
                Gov Official
              </div>
              <div className="text-[10px] text-slate-500 truncate mt-0.5">admin@smartcivic.gov</div>
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            role="alert"
            className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 shadow-sm"
          >
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
            <p className="flex-1 font-medium">{error}</p>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5"
            >
              <Mail className="w-3.5 h-3.5 text-blue-600" />
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
              className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition disabled:opacity-50"
            />
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="password"
              className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5 text-blue-600" />
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
              className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition disabled:opacity-50"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl font-bold text-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition cursor-pointer flex items-center justify-center gap-2 mt-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Signing In...</span>
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
        <div className="mt-6 text-center text-xs text-slate-500 pt-4 border-t border-slate-100">
          <span>Don't have a citizen account? </span>
          <Link to="/register" className="font-semibold text-blue-600 hover:text-blue-700 underline">
            Register as a Citizen
          </Link>
        </div>
      </div>
    </div>
  );
}
