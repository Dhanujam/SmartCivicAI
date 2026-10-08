import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  ShieldCheck,
  FileText,
  LayoutDashboard,
  BarChart3,
  LogOut,
  LogIn,
  UserPlus,
  User,
  Building2,
  FolderOpen,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ backendStatus }) {
  const { user, isAuthenticated, isAdmin, isCitizen, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-slate-800 px-4 sm:px-6 py-3.5">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Left: Branding & Role Badge */}
        <div className="flex items-center space-x-3 w-full md:w-auto justify-between md:justify-start">
          <Link to={isAdmin ? '/admin' : '/'} className="flex items-center space-x-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20 group-hover:scale-105 transition">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-extrabold text-white tracking-tight">
                  SmartCivic <span className="text-sky-400">AI</span>
                </span>
                {isAdmin ? (
                  <span className="text-[10px] uppercase font-extrabold tracking-wider bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Building2 className="w-3 h-3" />
                    Government Official
                  </span>
                ) : (
                  <span className="text-[10px] uppercase font-extrabold tracking-wider bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2 py-0.5 rounded-full">
                    Citizen Portal
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                {isAdmin ? 'Municipal Administration & Triage Operations' : 'Civic Complaint Triage & Resolution Platform'}
              </p>
            </div>
          </Link>

          {/* Mobile Status Dot */}
          <div className="flex md:hidden items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-[10px]">
            <span
              className={`w-2 h-2 rounded-full ${
                backendStatus === 'online' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
          </div>
        </div>

        {/* Center/Right: Navigation Links */}
        <div className="flex items-center flex-wrap justify-center gap-2 sm:gap-3 w-full md:w-auto">
          {/* Government Official Navigation */}
          {isAuthenticated && isAdmin && (
            <nav className="flex items-center gap-1 sm:gap-1.5 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
              <Link
                to="/admin"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  isActive('/admin')
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Dashboard</span>
              </Link>

              <Link
                to="/admin/complaints"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  isActive('/admin/complaints')
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>All Complaints</span>
              </Link>

              <Link
                to="/admin/analytics"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  isActive('/admin/analytics')
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Analytics</span>
              </Link>
            </nav>
          )}

          {/* Citizen Navigation */}
          {isAuthenticated && isCitizen && (
            <nav className="flex items-center gap-1 sm:gap-1.5 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
              <Link
                to="/"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  isActive('/')
                    ? 'bg-sky-500 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Submit Complaint</span>
              </Link>

              <Link
                to="/my-complaints"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  isActive('/my-complaints')
                    ? 'bg-sky-500 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>My Complaints</span>
              </Link>
            </nav>
          )}

          {/* Unauthenticated Nav Links */}
          {!isAuthenticated && (
            <nav className="flex items-center gap-1.5">
              <Link
                to="/"
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  isActive('/')
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                Report Issue
              </Link>
            </nav>
          )}

          {/* User Account / Auth Actions */}
          <div className="flex items-center gap-2 pl-1 border-l border-slate-800/80">
            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/60 border border-slate-700/60 text-xs text-slate-300">
                  <User className="w-3.5 h-3.5 text-sky-400" />
                  <span className="font-medium max-w-[120px] truncate">{user?.name}</span>
                </div>

                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-500/40 text-xs font-semibold transition"
                  title="Sign out of account"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
                >
                  <LogIn className="w-3.5 h-3.5 text-sky-400" />
                  <span>Sign In</span>
                </Link>

                <Link
                  to="/register"
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-sky-500/20 transition"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Register</span>
                </Link>
              </div>
            )}

            {/* Desktop API Status Indicator */}
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/60 border border-slate-700/60 text-[11px]">
              <span
                className={`w-2 h-2 rounded-full ${
                  backendStatus === 'online' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
              <span className="text-slate-400 text-[10px]">
                {backendStatus === 'online' ? 'API Online' : 'Connecting'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
