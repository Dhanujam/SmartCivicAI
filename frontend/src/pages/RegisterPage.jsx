import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  UserPlus,
  User,
  Mail,
  Lock,
  AlertCircle,
  Loader2,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Please enter your full name.');
      return;
    }

    if (!email.trim()) {
      setError('Please enter a valid email address.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);

    try {
      await register(name.trim(), email.trim(), password, confirmPassword);
      navigate('/');
    } catch (err) {
      console.error('Registration failed:', err);
      const detail =
        err.response?.data?.detail ||
        err.message ||
        'Registration failed. Please check your information.';
      setError(detail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto my-auto py-10">
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm relative">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center mx-auto mb-3 text-blue-600 shadow-sm">
            <UserPlus className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Create Citizen Account
          </h2>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            Register to report municipal hazards and track resolution progress in real time
          </p>
        </div>

        {/* Role Notice */}
        <div className="mb-5 p-3 rounded-xl bg-blue-50 border border-blue-200 text-[11px] text-blue-800 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <span>
            Citizen Registration: You will receive direct access to file issues and track your submissions.
          </span>
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

        <form onSubmit={handleRegister} className="space-y-4">
          {/* Full Name */}
          <div>
            <label
              htmlFor="name"
              className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5"
            >
              <User className="w-3.5 h-3.5 text-blue-600" />
              Full Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              required
              placeholder="e.g., Alex Johnson"
              autoComplete="name"
              className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition disabled:opacity-50"
            />
          </div>

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
              placeholder="name@example.com"
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
              placeholder="At least 6 characters"
              autoComplete="new-password"
              className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition disabled:opacity-50"
            />
          </div>

          {/* Confirm Password */}
          <div>
            <label
              htmlFor="confirm_password"
              className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5 text-blue-600" />
              Confirm Password
            </label>
            <input
              id="confirm_password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              required
              placeholder="Re-type your password"
              autoComplete="new-password"
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
                <span>Creating Account...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Create Citizen Account</span>
              </>
            )}
          </button>
        </form>

        {/* Footer / Login Link */}
        <div className="mt-6 text-center text-xs text-slate-500 pt-4 border-t border-slate-100">
          <span>Already have an account? </span>
          <Link to="/login" className="font-semibold text-blue-600 hover:text-blue-700 underline">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
