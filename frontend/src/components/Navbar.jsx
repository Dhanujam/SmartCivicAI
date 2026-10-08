import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  ShieldCheck,
  ShieldAlert,
  FileText,
  LayoutDashboard,
  BarChart3,
  LogOut,
  LogIn,
  UserPlus,
  User,
  Building2,
  FolderOpen,
  Globe,
  Sun,
  Moon,
  Menu,
  X,
  Bell,
  Info,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

export default function Navbar({ backendStatus }) {
  const { user, isAuthenticated, isAdmin, isCitizen, logout } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
    setMobileMenuOpen(false);
  };

  const isActive = (path) => location.pathname === path;

  const scrollToSection = (sectionId) => {
    setMobileMenuOpen(false);
    if (location.pathname !== '/') {
      navigate('/');
      setTimeout(() => {
        const el = document.getElementById(sectionId);
        el?.scrollIntoView({ behavior: 'smooth' });
      }, 150);
    } else {
      const el = document.getElementById(sectionId);
      el?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shadow-2xs px-4 sm:px-6 py-2.5 transition-colors duration-200">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Left: Branding & Tagline */}
        <div className="flex items-center space-x-3">
          <Link
            to={isAdmin ? '/admin' : '/'}
            className="flex items-center space-x-3 group"
            onClick={() => setMobileMenuOpen(false)}
          >
            <div className="w-9 h-9 rounded-xl bg-blue-600 dark:bg-blue-600 flex items-center justify-center shadow-xs shadow-blue-500/20 group-hover:scale-105 transition">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
                  SmartCivic<span className="text-blue-600 dark:text-blue-400">AI</span>
                </span>
                {isAdmin ? (
                  <span className="text-[10px] uppercase font-bold tracking-wider bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Building2 className="w-3 h-3" />
                    {t('governmentOfficial')}
                  </span>
                ) : null}
              </div>
              <p className="text-[10px] sm:text-[11px] font-medium text-slate-500 dark:text-slate-400">
                {t('tagline')}
              </p>
            </div>
          </Link>
        </div>

        {/* Center: Main Navigation (Desktop) */}
        <div className="hidden md:flex items-center gap-1">
          {/* Government Official Navigation */}
          {isAuthenticated && isAdmin ? (
            <nav className="flex items-center gap-1 bg-slate-100/90 dark:bg-slate-800/90 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <Link
                to="/admin"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  isActive('/admin')
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>{t('dashboard')}</span>
              </Link>

              <Link
                to="/admin/complaints"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  isActive('/admin/complaints')
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
                }`}
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>{t('allComplaints')}</span>
              </Link>

              <Link
                to="/admin/analytics"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  isActive('/admin/analytics')
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>{t('analytics')}</span>
              </Link>

              <Link
                to="/admin/security"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  isActive('/admin/security')
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
                <span>{t('securitySoc')}</span>
              </Link>
            </nav>
          ) : (
            /* Citizen / Public Navigation */
            <nav className="flex items-center gap-1 sm:gap-2">
              {/* Home Link with active underline */}
              <Link
                to="/"
                className={`relative px-3 py-1.5 text-xs font-semibold transition ${
                  isActive('/')
                    ? 'text-blue-600 dark:text-blue-400 font-bold'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>{t('home')}</span>
                {isActive('/') && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full" />
                )}
              </Link>

              {/* Report Link */}
              <button
                type="button"
                onClick={() => scrollToSection('complaint-form')}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
              >
                {t('report')}
              </button>

              {/* Track Link */}
              <Link
                to={isAuthenticated ? '/my-complaints' : '/login'}
                className={`px-3 py-1.5 text-xs font-semibold transition ${
                  isActive('/my-complaints')
                    ? 'text-blue-600 dark:text-blue-400 font-bold'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {t('track')}
              </Link>

              {/* Alerts Link */}
              <button
                type="button"
                onClick={() => scrollToSection('live-operations-card')}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
              >
                {t('alerts')}
              </button>

              {/* About Link */}
              <button
                type="button"
                onClick={() => scrollToSection('how-it-works')}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
              >
                {t('about')}
              </button>
            </nav>
          )}
        </div>

        {/* Right: Controls (Language, Theme, Auth) */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Language Selector */}
          <div
            className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-0.5 border border-slate-200 dark:border-slate-700"
            role="group"
            aria-label="Select language"
          >
            <div className="pl-2 pr-1 text-slate-400 dark:text-slate-500">
              <Globe className="w-3.5 h-3.5" />
            </div>
            <button
              type="button"
              onClick={() => setLanguage('en')}
              className={`px-2 py-1 text-xs rounded-lg font-semibold transition cursor-pointer ${
                language === 'en'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              aria-label="English language"
            >
              EN
            </button>
            <span className="text-slate-300 dark:text-slate-600 text-xs">|</span>
            <button
              type="button"
              onClick={() => setLanguage('ta')}
              className={`px-2 py-1 text-xs rounded-lg font-semibold transition cursor-pointer ${
                language === 'ta'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              aria-label="Tamil language"
            >
              தமிழ்
            </button>
          </div>

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
            title={isDark ? "Switch to Light mode" : "Switch to Dark mode"}
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600" />
            )}
          </button>

          {/* User Account / Auth Actions (Desktop) */}
          <div className="hidden sm:flex items-center gap-2 pl-1 border-l border-slate-200 dark:border-slate-700">
            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-200">
                  <User className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span className="font-semibold max-w-[110px] truncate">{user?.name}</span>
                </div>

                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-700 dark:text-slate-200 hover:text-rose-600 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-700 hover:border-rose-200 dark:hover:border-rose-800 text-xs font-semibold transition shadow-2xs cursor-pointer"
                  title="Sign out of account"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{t('logout')}</span>
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>{t('login')}</span>
              </Link>
            )}
          </div>

          {/* Mobile Hamburger Menu Button */}
          <div className="flex md:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden mt-2.5 pt-2.5 border-t border-slate-200 dark:border-slate-800 flex flex-col space-y-2.5 animate-fadeIn">
          {isAuthenticated && isAdmin ? (
            <div className="flex flex-col space-y-1">
              <Link
                to="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold ${
                  isActive('/admin')
                    ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>{t('dashboard')}</span>
              </Link>
              <Link
                to="/admin/complaints"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold ${
                  isActive('/admin/complaints')
                    ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <FolderOpen className="w-4 h-4" />
                <span>{t('allComplaints')}</span>
              </Link>
              <Link
                to="/admin/analytics"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold ${
                  isActive('/admin/analytics')
                    ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                <span>{t('analytics')}</span>
              </Link>
              <Link
                to="/admin/security"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold ${
                  isActive('/admin/security')
                    ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <ShieldAlert className="w-4 h-4 text-rose-500" />
                <span>{t('securitySoc')}</span>
              </Link>
            </div>
          ) : (
            <div className="flex flex-col space-y-1">
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold ${
                  isActive('/')
                    ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {t('home')}
              </Link>
              <button
                type="button"
                onClick={() => scrollToSection('complaint-form')}
                className="text-left px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                {t('report')}
              </button>
              <Link
                to={isAuthenticated ? '/my-complaints' : '/login'}
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                {t('track')}
              </Link>
              <button
                type="button"
                onClick={() => scrollToSection('live-operations-card')}
                className="text-left px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                {t('alerts')}
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('how-it-works')}
                className="text-left px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                {t('about')}
              </button>
            </div>
          )}

          {/* Mobile Auth Actions */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            {isAuthenticated ? (
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{user?.name}</span>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 text-xs font-semibold"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{t('logout')}</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 w-full">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex-1 text-center py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold shadow-xs"
                >
                  {t('login')}
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex-1 text-center py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700"
                >
                  {t('register')}
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
