import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ComplaintForm from '../components/ComplaintForm';
import AIAnalysisCard from '../components/AIAnalysisCard';
import {
  Sparkles,
  Camera,
  Cpu,
  Clock,
  ShieldCheck,
  CheckCircle2,
  FolderOpen,
  ArrowRight,
  TrendingUp,
  MapPin,
  Building2,
  Activity,
  AlertTriangle,
  Radio,
  Zap,
  Globe,
  Search,
  Mic,
  Navigation,
  Plus,
  Minus,
  RotateCcw,
  Compass,
  FileText,
  Layers,
  ChevronRight,
  X,
  Sliders,
  Check,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../services/api';

export default function CitizenPortal() {
  const [submittedComplaint, setSubmittedComplaint] = useState(null);
  const { isAuthenticated, isCitizen } = useAuth();
  const { t, isTamil, language } = useLanguage();
  const navigate = useNavigate();

  // Floating Quick Action Panels state: 'report' | 'track' | null
  const [activeMenu, setActiveMenu] = useState(null);
  const [trackSearchId, setTrackSearchId] = useState('');

  // Map state
  const [mapZoom, setMapZoom] = useState(1);
  const [activePin, setActivePin] = useState('CIV-2026-0842');

  // Real backend summary data (with fallback to demo values)
  const [stats, setStats] = useState({
    total: 124,
    resolved: 76,
    inProgress: 37,
    overdue: 11,
  });

  const formRef = useRef(null);
  const reportButtonRef = useRef(null);
  const trackButtonRef = useRef(null);
  const floatingPanelRef = useRef(null);

  // Fetch live stats from backend if available
  useEffect(() => {
    let isMounted = true;
    api
      .getAnalyticsSummary()
      .then((data) => {
        if (isMounted && data && typeof data.total_complaints === 'number') {
          setStats({
            total: data.total_complaints || 124,
            resolved: data.resolved_complaints || 76,
            inProgress: data.in_progress_complaints || 37,
            overdue: data.overdue_complaints || 11,
          });
        }
      })
      .catch(() => {
        // Keep visual demo data in hero if backend analytics endpoint requires admin
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Close floating menus on click outside or Escape key
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        floatingPanelRef.current &&
        !floatingPanelRef.current.contains(e.target) &&
        !reportButtonRef.current?.contains(e.target) &&
        !trackButtonRef.current?.contains(e.target)
      ) {
        setActiveMenu(null);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setActiveMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const scrollToForm = (actionType = null) => {
    setActiveMenu(null);
    formRef.current?.scrollIntoView({ behavior: 'smooth' });

    if (actionType) {
      setTimeout(() => {
        if (actionType === 'photo') {
          const fileInput = document.getElementById('complaint-photo-input');
          fileInput?.click();
        } else if (actionType === 'voice') {
          const voiceBtn = document.getElementById('voice-record-btn');
          voiceBtn?.click();
        } else if (actionType === 'location') {
          const locBtn = document.getElementById('gps-detect-btn');
          locBtn?.click();
        } else {
          const descInput = document.getElementById('complaint-desc-input');
          descInput?.focus();
        }
      }, 400);
    }
  };

  const handleTrackSubmit = (e) => {
    e.preventDefault();
    if (!trackSearchId.trim()) return;
    setActiveMenu(null);
    if (isAuthenticated) {
      navigate(`/complaints/${trackSearchId.trim()}`);
    } else {
      navigate('/login', { state: { lookupId: trackSearchId.trim() } });
    }
  };

  const toggleMenu = (menuName) => {
    setActiveMenu((prev) => (prev === menuName ? null : menuName));
  };

  // Map markers dataset
  const mapMarkers = [
    {
      id: 'CIV-2026-0842',
      x: 52,
      y: 42,
      title: t('sampleIncident1', 'Major road crater near Central Hospital'),
      dept: t('publicWorks', 'Public Works'),
      location: 'Central Hospital · Sector 4',
      status: 'IN PROGRESS',
      severity: 'HIGH',
      priority: 84,
      color: 'rose',
    },
    {
      id: 'CIV-2026-0791',
      x: 38,
      y: 62,
      title: t('sampleIncident2', 'Street light not working'),
      dept: 'Electrical',
      location: 'Anna Nagar · Sector 2',
      status: 'OPEN',
      severity: 'MEDIUM',
      priority: 62,
      color: 'amber',
    },
    {
      id: 'CIV-2026-0715',
      x: 68,
      y: 74,
      title: t('sampleIncident3', 'Garbage overflow'),
      dept: 'Sanitation',
      location: 'Velachery · Sector 7',
      status: 'RESOLVED',
      severity: 'LOW',
      priority: 35,
      color: 'emerald',
    },
    {
      id: 'CIV-2026-0690',
      x: 46,
      y: 28,
      title: 'Water pipeline burst',
      dept: 'Water Supply',
      location: 'T. Nagar · Sector 3',
      status: 'IN PROGRESS',
      severity: 'HIGH',
      priority: 88,
      color: 'blue',
    },
  ];

  const selectedMarker =
    mapMarkers.find((m) => m.id === activePin) || mapMarkers[0];

  return (
    <div className="w-full flex flex-col items-center justify-center">
      {!submittedComplaint ? (
        <div className="w-full flex flex-col items-center space-y-12 animate-fadeIn">
          {/* ============================================================== */}
          {/* REDESIGNED HERO: CIVIC INTELLIGENCE PLATFORM (APPROVED REF)    */}
          {/* ============================================================== */}
          <section className="w-full relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-gradient-to-b from-sky-50/70 via-white to-emerald-50/20 dark:from-slate-900 dark:via-slate-900/95 dark:to-slate-950 p-6 sm:p-8 lg:p-10 xl:p-12 shadow-sm transition-colors duration-200">
            {/* Subtle City Atmosphere Background (SVG grid pattern & soft ambient glows) */}
            <div className="absolute inset-0 opacity-[0.035] dark:opacity-[0.06] pointer-events-none">
              <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="city-grid" width="48" height="48" patternUnits="userSpaceOnUse">
                    <path d="M 48 0 L 0 0 0 48" fill="none" stroke="currentColor" strokeWidth="1" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#city-grid)" />
              </svg>
            </div>

            {/* Soft sky-blue and mint ambient gradients */}
            <div className="absolute top-0 right-1/4 w-[480px] h-[480px] bg-sky-200/25 dark:bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 right-10 w-96 h-96 bg-emerald-200/20 dark:bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute top-1/3 left-4 w-72 h-72 bg-blue-100/30 dark:bg-blue-900/10 rounded-full blur-2xl pointer-events-none" />

            {/* TWO-COLUMN VIEWPORT LAYOUT */}
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 xl:gap-12 items-center">
              {/* ========================================================== */}
              {/* LEFT COLUMN: HERO CONTENT & FLOATING QUICK ACTIONS         */}
              {/* ========================================================== */}
              <div className="lg:col-span-6 xl:col-span-6 space-y-6 text-left">
                {/* 1. HERO BADGE */}
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200/90 dark:border-blue-800/80 text-blue-700 dark:text-blue-300 text-xs font-semibold shadow-2xs">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600 dark:bg-blue-400"></span>
                  </span>
                  <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span className="tracking-tight">{t('heroBadge')}</span>
                </div>

                {/* 2. HERO HEADLINE */}
                <h1
                  className={`font-black tracking-tight text-slate-900 dark:text-white leading-[1.08] ${
                    isTamil
                      ? 'text-4xl sm:text-5xl lg:text-5xl xl:text-[3.6rem]'
                      : 'text-4xl sm:text-5xl lg:text-6xl xl:text-[4.2rem]'
                  }`}
                >
                  {t('heroTitlePrefix')}{' '}
                  <span className="block mt-1 text-blue-600 dark:text-blue-400">
                    {t('heroTitleHighlight')}
                  </span>
                </h1>

                {/* 3. HERO DESCRIPTION */}
                <p className="text-slate-600 dark:text-slate-300 text-base sm:text-lg leading-relaxed max-w-[560px]">
                  {t('heroDescription')}
                </p>

                {/* 4. PRIMARY ACTIONS WITH FLOATING QUICK ACTION MENUS */}
                <div className="relative pt-1">
                  <div className="flex flex-wrap items-center gap-3">
                    {/* PRIMARY CTA: "Report a Complaint →" */}
                    <div className="relative">
                      <button
                        ref={reportButtonRef}
                        type="button"
                        onClick={() => toggleMenu('report')}
                        aria-expanded={activeMenu === 'report'}
                        aria-haspopup="true"
                        aria-label="Report a Complaint"
                        className={`inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-md hover:shadow-lg shadow-blue-500/20 transition-all duration-200 transform hover:-translate-y-0.5 active:scale-95 cursor-pointer ${
                          activeMenu === 'report' ? 'ring-2 ring-blue-400 ring-offset-2 dark:ring-offset-slate-900' : ''
                        }`}
                      >
                        <span>{t('reportComplaintCta')}</span>
                      </button>
                    </div>

                    {/* SECONDARY CTA: "Track Complaint" */}
                    <div className="relative">
                      <button
                        ref={trackButtonRef}
                        type="button"
                        onClick={() => toggleMenu('track')}
                        aria-expanded={activeMenu === 'track'}
                        aria-haspopup="true"
                        aria-label="Track Complaint"
                        className={`inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 text-sm font-bold border border-slate-200/90 dark:border-slate-700 shadow-xs hover:shadow-md transition-all duration-200 transform hover:-translate-y-0.5 active:scale-95 cursor-pointer ${
                          activeMenu === 'track' ? 'ring-2 ring-slate-400 ring-offset-2 dark:ring-offset-slate-900' : ''
                        }`}
                      >
                        <Search className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                        <span>{t('trackComplaintCta')}</span>
                      </button>
                    </div>
                  </div>

                  {/* ======================================================== */}
                  {/* FLOATING QUICK ACTION PANEL: REPORT A COMPLAINT          */}
                  {/* ======================================================== */}
                  {activeMenu === 'report' && (
                    <div
                      ref={floatingPanelRef}
                      role="menu"
                      className="absolute left-0 top-full mt-3 w-80 sm:w-96 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 shadow-2xl p-3 z-40 transition-all transform origin-top animate-fadeIn space-y-1"
                    >
                      <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700/80 flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">
                          {t('reportActionTitle')}
                        </span>
                        <button
                          type="button"
                          onClick={() => setActiveMenu(null)}
                          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                          aria-label="Close menu"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Option 1: File standard issue */}
                      <button
                        type="button"
                        onClick={() => scrollToForm('general')}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl text-left hover:bg-blue-50 dark:hover:bg-slate-700/70 transition group cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/70 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-105 transition">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900 dark:text-white">
                              {t('reportActionTitle')}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">
                              {t('reportActionSubtitle')}
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition" />
                      </button>

                      {/* Option 2: Upload Photos */}
                      <button
                        type="button"
                        onClick={() => scrollToForm('photo')}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl text-left hover:bg-blue-50 dark:hover:bg-slate-700/70 transition group cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/70 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition">
                            <Camera className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900 dark:text-white">
                              {t('uploadPhotosTitle')}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">
                              {t('uploadPhotosSubtitle')}
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition" />
                      </button>

                      {/* Option 3: Voice Input */}
                      <button
                        type="button"
                        onClick={() => scrollToForm('voice')}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl text-left hover:bg-blue-50 dark:hover:bg-slate-700/70 transition group cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/70 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-105 transition">
                            <Mic className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900 dark:text-white">
                              {t('voiceInputTitle')}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">
                              {t('voiceInputSubtitle')}
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition" />
                      </button>

                      {/* Option 4: Use Location */}
                      <button
                        type="button"
                        onClick={() => scrollToForm('location')}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl text-left hover:bg-blue-50 dark:hover:bg-slate-700/70 transition group cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-950/70 flex items-center justify-center text-rose-600 dark:text-rose-400 group-hover:scale-105 transition">
                            <Navigation className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900 dark:text-white">
                              {t('locationTitle')}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">
                              {t('locationSubtitle')}
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition" />
                      </button>
                    </div>
                  )}

                  {/* ======================================================== */}
                  {/* FLOATING QUICK ACTION PANEL: TRACK A COMPLAINT           */}
                  {/* ======================================================== */}
                  {activeMenu === 'track' && (
                    <div
                      ref={floatingPanelRef}
                      role="menu"
                      className="absolute left-0 sm:left-48 top-full mt-3 w-80 sm:w-96 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 shadow-2xl p-3 z-40 transition-all transform origin-top animate-fadeIn space-y-2"
                    >
                      <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700/80 flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">
                          {t('trackActionTitle')}
                        </span>
                        <button
                          type="button"
                          onClick={() => setActiveMenu(null)}
                          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                          aria-label="Close menu"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Quick ID Input Field */}
                      <form onSubmit={handleTrackSubmit} className="p-2 space-y-2">
                        <div className="relative">
                          <input
                            type="text"
                            value={trackSearchId}
                            onChange={(e) => setTrackSearchId(e.target.value)}
                            placeholder={t('enterComplaintId')}
                            className="w-full text-xs px-3 py-2.5 pr-16 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white font-mono"
                          />
                          <button
                            type="submit"
                            className="absolute right-1 top-1 bottom-1 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold"
                          >
                            Go
                          </button>
                        </div>
                      </form>

                      {/* Tracking Option Links */}
                      <div className="space-y-1">
                        <Link
                          to={isAuthenticated ? '/my-complaints' : '/login'}
                          onClick={() => setActiveMenu(null)}
                          className="w-full flex items-center justify-between p-2 rounded-xl text-left hover:bg-slate-50 dark:hover:bg-slate-700/70 transition group"
                        >
                          <div className="flex items-center gap-2.5">
                            <FolderOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                              {t('checkStatusTitle')}
                            </span>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                        </Link>

                        <button
                          type="button"
                          onClick={() => {
                            setActiveMenu(null);
                            const el = document.getElementById('recent-complaints-card');
                            el?.scrollIntoView({ behavior: 'smooth' });
                          }}
                          className="w-full flex items-center justify-between p-2 rounded-xl text-left hover:bg-slate-50 dark:hover:bg-slate-700/70 transition group cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5">
                            <Clock className="w-4 h-4 text-amber-500" />
                            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                              {t('recentComplaintsActionTitle')}
                            </span>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setActiveMenu(null);
                            const el = document.getElementById('civic-map-visualization');
                            el?.scrollIntoView({ behavior: 'smooth' });
                          }}
                          className="w-full flex items-center justify-between p-2 rounded-xl text-left hover:bg-slate-50 dark:hover:bg-slate-700/70 transition group cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5">
                            <MapPin className="w-4 h-4 text-rose-500" />
                            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                              {t('viewOnMapTitle')}
                            </span>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* 5. BENEFIT INDICATORS (PASTEL CIRCLE ICONS) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-4 border-t border-slate-200/90 dark:border-slate-800/80">
                  {/* Benefit 1: AI Triage (Green pastel circle) */}
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <Cpu className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        {t('aiTriageTitle')}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {t('aiTriageSubtitle')}
                      </div>
                    </div>
                  </div>

                  {/* Benefit 2: Multilingual (Purple/Indigo pastel circle) */}
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-purple-100 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                      <Globe className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        {t('multilingualTitle')}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {t('multilingualSubtitle')}
                      </div>
                    </div>
                  </div>

                  {/* Benefit 3: Real-Time Updates (Amber pastel circle) */}
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                      <Activity className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        {t('realtimeUpdatesTitle')}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {t('realtimeUpdatesSubtitle')}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ========================================================== */}
              {/* RIGHT COLUMN: INTERACTIVE CIVIC INTELLIGENCE VISUALIZATION */}
              {/* ========================================================== */}
              <div
                id="civic-map-visualization"
                className="lg:col-span-6 xl:col-span-6 w-full space-y-4"
              >
                {/* 1. MAIN CITY HEATMAP COMPOSITION WITH FLOATING OVERLAYS */}
                <div className="relative rounded-2xl bg-white dark:bg-slate-850 border border-slate-200/90 dark:border-slate-700/90 shadow-lg shadow-slate-200/50 dark:shadow-black/40 overflow-hidden">
                  {/* Subtle top border illumination */}
                  <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent z-20 pointer-events-none" />

                  {/* FLOATING MAP CONTROLS (+ / - / Reset) */}
                  <div className="absolute top-4 right-4 z-20 flex flex-col gap-1.5">
                    <button
                      type="button"
                      onClick={() => setMapZoom((z) => Math.min(z + 0.2, 1.6))}
                      aria-label="Zoom in"
                      className="w-7 h-7 rounded-lg bg-white/95 dark:bg-slate-800/95 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-bold transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setMapZoom((z) => Math.max(z - 0.2, 0.8))}
                      aria-label="Zoom out"
                      className="w-7 h-7 rounded-lg bg-white/95 dark:bg-slate-800/95 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-bold transition"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMapZoom(1);
                        setActivePin('CIV-2026-0842');
                      }}
                      aria-label="Reset view"
                      className="w-7 h-7 rounded-lg bg-white/95 dark:bg-slate-800/95 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-bold transition"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </button>
                  </div>

                  {/* MAP CANVAS VISUALIZATION (CHENNAI URBAN CIVIC MAP) */}
                  <div className="h-72 sm:h-80 w-full relative bg-slate-100/90 dark:bg-slate-900 overflow-hidden select-none">
                    <div
                      className="w-full h-full transition-transform duration-300 ease-out origin-center"
                      style={{ transform: `scale(${mapZoom})` }}
                    >
                      {/* SVG Urban Grid, Arterial Roads & Heatmap Zones */}
                      <svg
                        viewBox="0 0 500 320"
                        className="w-full h-full object-cover"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <defs>
                          {/* Heat Gradients */}
                          <radialGradient id="heatRed" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.45" />
                            <stop offset="60%" stopColor="#ef4444" stopOpacity="0.15" />
                            <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
                          </radialGradient>
                          <radialGradient id="heatOrange" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.4" />
                            <stop offset="70%" stopColor="#f59e0b" stopOpacity="0.12" />
                            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                          </radialGradient>
                          <radialGradient id="heatGreen" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                            <stop offset="75%" stopColor="#10b981" stopOpacity="0.08" />
                            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                          </radialGradient>
                        </defs>

                        {/* Coastal line on the East (Bay of Bengal contour) */}
                        <path
                          d="M 430 0 Q 405 90 420 180 T 445 320 L 500 320 L 500 0 Z"
                          className="fill-sky-100 dark:fill-blue-950/40"
                        />
                        <path
                          d="M 430 0 Q 405 90 420 180 T 445 320"
                          fill="none"
                          className="stroke-sky-300/80 dark:stroke-sky-700/50"
                          strokeWidth="2"
                          strokeDasharray="4 3"
                        />

                        {/* City Zones (Polygons with subtle tint) */}
                        {/* Zone 5 - Central */}
                        <path
                          d="M 220 50 L 320 60 L 330 140 L 210 130 Z"
                          className="fill-blue-50/50 dark:fill-blue-900/10 stroke-slate-200 dark:stroke-slate-800"
                          strokeWidth="1"
                        />
                        {/* Zone 8 - Anna Nagar */}
                        <path
                          d="M 120 120 L 220 130 L 210 210 L 100 190 Z"
                          className="fill-emerald-50/40 dark:fill-emerald-950/10 stroke-slate-200 dark:stroke-slate-800"
                          strokeWidth="1"
                        />
                        {/* Zone 9 - T. Nagar */}
                        <path
                          d="M 220 140 L 340 145 L 320 230 L 220 220 Z"
                          className="fill-amber-50/40 dark:fill-amber-950/10 stroke-slate-200 dark:stroke-slate-800"
                          strokeWidth="1"
                        />
                        {/* Zone 13 - Velachery */}
                        <path
                          d="M 280 220 L 400 210 L 420 300 L 290 310 Z"
                          className="fill-purple-50/30 dark:fill-purple-950/10 stroke-slate-200 dark:stroke-slate-800"
                          strokeWidth="1"
                        />

                        {/* Arterial Roads */}
                        {/* Poonamallee High Road */}
                        <path
                          d="M 0 100 Q 150 110 320 90 L 430 70"
                          fill="none"
                          className="stroke-slate-300 dark:stroke-slate-700"
                          strokeWidth="3.5"
                        />
                        {/* Anna Salai / Mount Road */}
                        <path
                          d="M 290 60 Q 240 160 170 320"
                          fill="none"
                          className="stroke-slate-300 dark:stroke-slate-700"
                          strokeWidth="4"
                        />
                        {/* Inner Ring Road */}
                        <path
                          d="M 140 0 Q 190 140 280 240 L 400 300"
                          fill="none"
                          className="stroke-slate-300 dark:stroke-slate-700"
                          strokeWidth="2.5"
                        />
                        {/* OMR Expressway */}
                        <path
                          d="M 370 170 L 410 320"
                          fill="none"
                          className="stroke-blue-300 dark:stroke-blue-700"
                          strokeWidth="3"
                        />

                        {/* Heatmap Area Concentric Radii */}
                        {/* Hotspot Central Hospital (Red) */}
                        <circle cx="260" cy="135" r="55" fill="url(#heatRed)" />
                        {/* Hotspot T. Nagar (Orange) */}
                        <circle cx="190" cy="200" r="45" fill="url(#heatOrange)" />
                        {/* Clean Zone Velachery (Green) */}
                        <circle cx="340" cy="240" r="50" fill="url(#heatGreen)" />

                        {/* Road Labels */}
                        <text
                          x="300"
                          y="80"
                          className="text-[9px] fill-slate-400 dark:fill-slate-500 font-mono"
                        >
                          Anna Salai
                        </text>
                        <text
                          x="385"
                          y="260"
                          className="text-[9px] fill-slate-400 dark:fill-slate-500 font-mono"
                        >
                          OMR
                        </text>
                        <text
                          x="440"
                          y="150"
                          className="text-[9px] fill-sky-500/70 font-semibold uppercase tracking-wider"
                        >
                          Bay of Bengal
                        </text>
                      </svg>

                      {/* Interactive Incident Markers Overlay */}
                      {mapMarkers.map((marker) => {
                        const isSelected = activePin === marker.id;
                        return (
                          <div
                            key={marker.id}
                            style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
                            className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer z-10 group"
                            onClick={() => setActivePin(marker.id)}
                          >
                            {/* Pulsing ring for high severity */}
                            {marker.severity === 'HIGH' && (
                              <span className="absolute -inset-1 rounded-full bg-rose-500 opacity-50 animate-ping" />
                            )}

                            {/* Marker Pin Icon */}
                            <div
                              className={`w-6 h-6 rounded-full flex items-center justify-center shadow-md transition-transform transform ${
                                isSelected ? 'scale-125 ring-2 ring-white dark:ring-slate-900' : 'group-hover:scale-110'
                              } ${
                                marker.color === 'rose'
                                  ? 'bg-rose-600 text-white'
                                  : marker.color === 'amber'
                                  ? 'bg-amber-500 text-white'
                                  : marker.color === 'emerald'
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-blue-600 text-white'
                              }`}
                            >
                              <MapPin className="w-3.5 h-3.5 fill-current" />
                            </div>

                            {/* Marker Tooltip on Hover */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:flex flex-col items-center pointer-events-none z-30">
                              <div className="px-2 py-1 rounded-lg bg-slate-900 text-white text-[10px] font-semibold whitespace-nowrap shadow-lg">
                                {marker.id} · {marker.status}
                              </div>
                              <div className="w-1.5 h-1.5 bg-slate-900 rotate-45 -mt-0.5" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 2. OVERLAY FLOATING CARD: LIVE CIVIC OPERATIONS */}
                  <div
                    id="live-operations-card"
                    className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md space-y-3.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                        </span>
                        <div>
                          <div className="text-xs font-extrabold text-slate-900 dark:text-white tracking-tight">
                            {t('liveCivicOperations')}
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400">
                            {t('realtimeMonitoring')}
                          </div>
                        </div>
                      </div>

                      <div className="inline-flex items-center gap-1.5 text-[10px] font-mono font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/70 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                        <Zap className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                        <span>{t('geminiActive')}</span>
                      </div>
                    </div>

                    {/* Operational Counter Chips */}
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/80">
                        <div className="text-xs font-black text-slate-900 dark:text-white font-mono">
                          {stats.total}
                        </div>
                        <div className="text-[9px] text-slate-500 dark:text-slate-400 font-medium">
                          {t('totalComplaints')}
                        </div>
                      </div>

                      <div className="p-2 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60">
                        <div className="text-xs font-black text-emerald-600 dark:text-emerald-400 font-mono">
                          {stats.resolved}
                        </div>
                        <div className="text-[9px] text-emerald-700 dark:text-emerald-300 font-medium">
                          {t('resolved')}
                        </div>
                      </div>

                      <div className="p-2 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60">
                        <div className="text-xs font-black text-amber-600 dark:text-amber-400 font-mono">
                          {stats.inProgress}
                        </div>
                        <div className="text-[9px] text-amber-700 dark:text-amber-300 font-medium">
                          {t('inProgress')}
                        </div>
                      </div>

                      <div className="p-2 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-800/60">
                        <div className="text-xs font-black text-rose-600 dark:text-rose-400 font-mono">
                          {stats.overdue}
                        </div>
                        <div className="text-[9px] text-rose-700 dark:text-rose-300 font-medium">
                          {t('overdue')}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. CIVIC INCIDENT CARD (ACTIVE SELECTION / DEMO PREVIEW) */}
                <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700/90 shadow-md p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                        {selectedMarker.id}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          selectedMarker.status === 'IN PROGRESS'
                            ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                            : selectedMarker.status === 'RESOLVED'
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                            : 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                        }`}
                      >
                        {selectedMarker.status}
                      </span>
                    </div>

                    <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                      Live Incident Preview
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white line-clamp-1">
                    {selectedMarker.title}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>{selectedMarker.dept}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-rose-500" />
                      <span>{selectedMarker.location}</span>
                    </div>
                  </div>

                  {/* Priority Bar (Orange to Red Gradient) */}
                  <div className="pt-1 space-y-1">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">
                        {t('aiPriorityScore')}
                      </span>
                      <span className="font-extrabold text-amber-600 dark:text-amber-400 font-mono">
                        {selectedMarker.priority}/100 — {selectedMarker.severity}
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 rounded-full transition-all duration-500"
                        style={{ width: `${selectedMarker.priority}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* 4. TWO COMPACT FLOATING CARDS: RECENT COMPLAINTS & CITY INSIGHTS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Recent Complaints Card */}
                  <div
                    id="recent-complaints-card"
                    className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700/90 shadow-sm space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {t('recentComplaintsTitle')}
                        </span>
                      </div>
                      <Link
                        to={isAuthenticated ? '/my-complaints' : '/login'}
                        className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {t('viewAll')}
                      </Link>
                    </div>

                    <div className="space-y-2">
                      {/* Item 1 */}
                      <div
                        onClick={() => setActivePin('CIV-2026-0842')}
                        className={`p-2 rounded-xl text-left cursor-pointer transition ${
                          activePin === 'CIV-2026-0842'
                            ? 'bg-blue-50/70 dark:bg-slate-700/80 border border-blue-200 dark:border-slate-600'
                            : 'bg-slate-50/70 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-700/40'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                          <span className="truncate max-w-[130px]">{t('sampleIncident1')}</span>
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                            {t('inProgressUpper')}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                          {t('sampleLoc1')}
                        </div>
                      </div>

                      {/* Item 2 */}
                      <div
                        onClick={() => setActivePin('CIV-2026-0791')}
                        className={`p-2 rounded-xl text-left cursor-pointer transition ${
                          activePin === 'CIV-2026-0791'
                            ? 'bg-blue-50/70 dark:bg-slate-700/80 border border-blue-200 dark:border-slate-600'
                            : 'bg-slate-50/70 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-700/40'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                          <span className="truncate max-w-[130px]">{t('sampleIncident2')}</span>
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                            {t('openUpper')}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                          {t('sampleLoc2')}
                        </div>
                      </div>

                      {/* Item 3 */}
                      <div
                        onClick={() => setActivePin('CIV-2026-0715')}
                        className={`p-2 rounded-xl text-left cursor-pointer transition ${
                          activePin === 'CIV-2026-0715'
                            ? 'bg-blue-50/70 dark:bg-slate-700/80 border border-blue-200 dark:border-slate-600'
                            : 'bg-slate-50/70 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-700/40'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                          <span className="truncate max-w-[130px]">{t('sampleIncident3')}</span>
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                            {t('resolvedUpper')}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                          {t('sampleLoc3')}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* City Insights Card */}
                  <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700/90 shadow-sm space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {t('cityInsightsTitle')}
                        </span>
                      </div>
                      <span className="text-[10px] font-semibold text-slate-400">
                        {t('thisWeek')}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-center pt-0.5">
                      <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                        <div className="text-xs font-bold text-rose-600 dark:text-rose-400 font-mono">
                          3
                        </div>
                        <div className="text-[9px] text-slate-500 dark:text-slate-400 leading-tight">
                          {t('highPriorityAreas')}
                        </div>
                      </div>

                      <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                        <div className="text-xs font-bold text-blue-600 dark:text-blue-400 font-mono">
                          8
                        </div>
                        <div className="text-[9px] text-slate-500 dark:text-slate-400 leading-tight">
                          {t('activeZones')}
                        </div>
                      </div>

                      <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                        <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                          94.8%
                        </div>
                        <div className="text-[9px] text-slate-500 dark:text-slate-400 leading-tight">
                          {t('resolutionRate')}
                        </div>
                      </div>

                      <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                        <div className="text-xs font-bold text-purple-600 dark:text-purple-400 font-mono">
                          &lt; 2s
                        </div>
                        <div className="text-[9px] text-slate-500 dark:text-slate-400 leading-tight">
                          {t('aiTriageTime')}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ============================================================== */}
          {/* 4 CORE CIVIC FEATURE CARDS ("HOW SMARTCIVIC AI WORKS")          */}
          {/* ============================================================== */}
          <div id="how-it-works" className="w-full space-y-4 pt-2">
            <div className="text-center max-w-xl mx-auto">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                {t('howItWorksTitle')}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                {t('howItWorksSubtitle')}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
              {/* Feature 1: Report Issues */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs hover:shadow-md transition text-left space-y-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/70 border border-blue-100 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <Camera className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">{t('feature1Title')}</h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {t('feature1Desc')}
                </p>
              </div>

              {/* Feature 2: AI Analysis */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs hover:shadow-md transition text-left space-y-2.5">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-100 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <Cpu className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">{t('feature2Title')}</h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {t('feature2Desc')}
                </p>
              </div>

              {/* Feature 3: Real-time Updates */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs hover:shadow-md transition text-left space-y-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-100 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">{t('feature3Title')}</h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {t('feature3Desc')}
                </p>
              </div>

              {/* Feature 4: Safer Communities */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs hover:shadow-md transition text-left space-y-2.5">
                <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/70 border border-teal-100 dark:border-teal-800 flex items-center justify-center text-teal-600 dark:text-teal-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">{t('feature4Title')}</h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {t('feature4Desc')}
                </p>
              </div>
            </div>
          </div>

          {/* ============================================================== */}
          {/* ANCHOR FOR COMPLAINT SUBMISSION FORM                           */}
          {/* ============================================================== */}
          <div id="complaint-form" ref={formRef} className="w-full pt-4">
            <ComplaintForm onSuccess={(result) => setSubmittedComplaint(result)} />
          </div>
        </div>
      ) : (
        <div className="w-full flex flex-col items-center space-y-6">
          {/* Post-submission Navigation Helper */}
          {isAuthenticated && isCitizen && (
            <div className="w-full max-w-4xl flex items-center justify-between p-4 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300 text-xs shadow-xs">
              <span>This issue is now logged under your citizen tracking account.</span>
              <Link
                to="/my-complaints"
                className="font-bold underline hover:text-blue-900 dark:hover:text-blue-200 flex items-center gap-1"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>View all your submissions</span>
              </Link>
            </div>
          )}

          <AIAnalysisCard
            complaint={submittedComplaint}
            onReset={() => setSubmittedComplaint(null)}
          />
        </div>
      )}
    </div>
  );
}
