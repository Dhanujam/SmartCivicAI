import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  Building2,
  MapPin,
  Sparkles,
  ArrowRight,
  RotateCcw,
  ShieldAlert,
  Wrench,
  FileText,
  User,
  Image as ImageIcon,
} from 'lucide-react';

export default function AIAnalysisCard({ complaint, onReset }) {
  if (!complaint || !complaint.ai_analysis) {
    return null;
  }

  const { ai_analysis } = complaint;
  const {
    category,
    urgency = 'MEDIUM',
    department,
    priority_score = 50,
    location,
    problem_summary,
    recommended_solution,
    resolution_steps = [],
    priority_reason,
    estimated_resolution_time,
  } = ai_analysis;

  // Urgency styling mapping
  const urgencyUpper = (urgency || '').toUpperCase();
  const getUrgencyConfig = (level) => {
    switch (level) {
      case 'CRITICAL':
        return {
          label: 'CRITICAL',
          badgeClass: 'bg-rose-500/15 text-rose-400 border-rose-500/40 animate-pulse',
          barColor: 'from-rose-600 to-rose-500',
          textColor: 'text-rose-400',
        };
      case 'HIGH':
        return {
          label: 'HIGH',
          badgeClass: 'bg-orange-500/15 text-orange-400 border-orange-500/40',
          barColor: 'from-orange-500 to-amber-500',
          textColor: 'text-orange-400',
        };
      case 'MEDIUM':
        return {
          label: 'MEDIUM',
          badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/40',
          barColor: 'from-amber-500 to-yellow-400',
          textColor: 'text-amber-400',
        };
      case 'LOW':
      default:
        return {
          label: 'LOW',
          badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40',
          barColor: 'from-emerald-500 to-teal-400',
          textColor: 'text-emerald-400',
        };
    }
  };

  const urgencyConfig = getUrgencyConfig(urgencyUpper);

  // Priority score color class
  const getScoreColor = (score) => {
    if (score >= 80) return 'text-rose-400';
    if (score >= 60) return 'text-orange-400';
    if (score >= 40) return 'text-amber-400';
    return 'text-emerald-400';
  };

  const backendBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
  const fullImageUrl = complaint.image_url ? `${backendBase}${complaint.image_url}` : null;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 animate-fadeIn">
      {/* Success Notification Banner */}
      <div className="glass-panel rounded-2xl p-6 border border-emerald-500/30 bg-emerald-950/20 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 flex-shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              Complaint Registered & Triaged
              <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-300 border border-sky-500/30">
                {complaint.complaint_id || complaint.id}
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Assigned ID <strong className="text-white font-mono">{complaint.complaint_id || complaint.id}</strong> • Status: <span className="text-sky-400 font-semibold">{complaint.status || 'REQUESTED'}</span>
            </p>
          </div>
        </div>

        <button
          onClick={onReset}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition shadow-sm"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Report Another Issue</span>
        </button>
      </div>

      {/* Duplicate Notice Banner if found */}
      {complaint.duplicate_found && (
        <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-amber-500/30 bg-amber-950/20 text-amber-200 text-xs flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-sm text-amber-300">
              Potential Duplicate Complaints Found in Municipal Registry
            </p>
            <p className="text-amber-300/80 mt-0.5">
              Similar complaints already exist for this location or problem ({complaint.duplicate_complaint_ids?.length || 1} related). The municipal department will cross-reference your submission.
            </p>
          </div>
        </div>
      )}

      {/* Main Analysis Card */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-2xl space-y-8">
        
        {/* Top Triage Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Category */}
          <div className="glass-card rounded-2xl p-4 border border-slate-800/80">
            <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5 mb-1.5">
              <FileText className="w-3.5 h-3.5 text-sky-400" />
              Civic Category
            </span>
            <div className="text-sm font-bold text-white tracking-tight">
              {category}
            </div>
          </div>

          {/* Urgency */}
          <div className="glass-card rounded-2xl p-4 border border-slate-800/80">
            <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5 mb-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              Urgency Level
            </span>
            <div>
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold border ${urgencyConfig.badgeClass}`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                {urgencyConfig.label}
              </span>
            </div>
          </div>

          {/* Department */}
          <div className="glass-card rounded-2xl p-4 border border-slate-800/80">
            <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5 mb-1.5">
              <Building2 className="w-3.5 h-3.5 text-indigo-400" />
              Assigned Department
            </span>
            <div className="text-sm font-bold text-white truncate" title={department}>
              {department}
            </div>
          </div>

          {/* Estimated Resolution Time */}
          <div className="glass-card rounded-2xl p-4 border border-slate-800/80">
            <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5 mb-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              Estimated Timeframe
            </span>
            <div className="text-sm font-bold text-slate-100">
              {estimated_resolution_time}
            </div>
          </div>
        </div>

        {/* Priority Score Bar & Location Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {/* Priority Score Gauge */}
          <div className="md:col-span-2 glass-card rounded-2xl p-5 border border-slate-800/80 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-sky-400" />
                  Priority Score
                </span>
                <span className={`text-2xl font-black ${getScoreColor(priority_score)}`}>
                  {priority_score}<span className="text-xs font-normal text-slate-500">/100</span>
                </span>
              </div>
              
              {/* Visual Progress Bar */}
              <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-800 p-0.5">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${urgencyConfig.barColor} transition-all duration-1000 ease-out`}
                  style={{ width: `${Math.max(5, Math.min(100, priority_score))}%` }}
                />
              </div>
            </div>

            <p className="text-xs text-slate-400 mt-3 italic border-t border-slate-800/60 pt-2.5">
              <span className="font-semibold text-slate-300 not-italic">Priority Reason:</span> {priority_reason}
            </p>
          </div>

          {/* Location Details */}
          <div className="glass-card rounded-2xl p-5 border border-slate-800/80 flex flex-col justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-2">
                <MapPin className="w-4 h-4 text-rose-400" />
                Verified Location
              </span>
              <p className="text-sm font-bold text-white">
                {location || 'Not specified'}
              </p>
              {complaint.latitude !== null && complaint.latitude !== undefined && complaint.longitude !== null && complaint.longitude !== undefined && (
                <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-300 font-mono text-[11px]">
                  <span>GPS:</span>
                  <span>{complaint.latitude.toFixed(4)}°, {complaint.longitude.toFixed(4)}°</span>
                </div>
              )}
            </div>
            {complaint.citizen_name && (
              <div className="text-xs text-slate-500 flex flex-col gap-0.5 mt-3 pt-2 border-t border-slate-800/60">
                <div className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>Reported by: <span className="text-slate-300 font-medium">{complaint.citizen_name}</span></span>
                </div>
                {complaint.citizen_contact && (
                  <span className="text-[11px] text-slate-400 pl-5 font-mono">
                    {complaint.citizen_contact}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Problem Summary */}
        <div className="glass-card rounded-2xl p-5 border border-slate-800/80">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            AI Problem Summary
          </h3>
          <p className="text-slate-200 text-sm leading-relaxed">
            {problem_summary}
          </p>
        </div>

        {/* FEATURED: Recommended Practical Solution (Project Differentiator) */}
        <div className="relative rounded-2xl p-6 sm:p-7 bg-gradient-to-br from-sky-950/70 via-indigo-950/60 to-slate-900 border-2 border-sky-500/40 shadow-xl shadow-sky-500/10 overflow-hidden">
          <div className="absolute top-0 right-0 px-3 py-1 bg-sky-500/20 border-b border-l border-sky-500/40 rounded-bl-xl text-[10px] font-extrabold uppercase tracking-widest text-sky-300">
            HN-AI-02 Core Differentiator
          </div>

          <div className="flex items-start gap-3.5 mb-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-500/50 flex items-center justify-center text-sky-300 flex-shrink-0 shadow-md shadow-sky-500/20">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white tracking-tight flex items-center gap-2">
                Recommended Department Action Plan
              </h3>
              <p className="text-xs text-sky-200/80">
                Actionable engineering guidance provided directly to field responders
              </p>
            </div>
          </div>

          <div className="mt-3 p-4 rounded-xl bg-slate-950/60 border border-sky-500/20 text-slate-100 font-medium text-sm sm:text-base leading-relaxed">
            {recommended_solution}
          </div>
        </div>

        {/* Resolution Steps (Numbered Action Items) */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
            <ArrowRight className="w-3.5 h-3.5 text-indigo-400" />
            Field Officer Action Steps ({resolution_steps.length} Steps)
          </h3>
          <div className="space-y-2.5">
            {resolution_steps.map((step, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3.5 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition"
              >
                <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 font-mono text-xs font-bold flex-shrink-0 mt-0.5">
                  {idx + 1}
                </div>
                <p className="text-xs sm:text-sm text-slate-200 leading-normal">
                  {step}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Uploaded Evidence Image if present */}
        {fullImageUrl && (
          <div className="border-t border-slate-800/80 pt-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
              <ImageIcon className="w-3.5 h-3.5 text-sky-400" />
              Attached Photographic Evidence
            </h3>
            <div className="inline-block rounded-2xl overflow-hidden border border-slate-700/80 max-w-md bg-slate-950">
              <img
                src={fullImageUrl}
                alt="Complaint evidence"
                className="w-full h-auto max-h-64 object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            </div>
          </div>
        )}

        {/* Bottom Action Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800/80">
          <div className="text-xs text-slate-500">
            Registered at: <span className="text-slate-400">{new Date(complaint.created_at).toLocaleString()}</span>
          </div>
          <button
            onClick={onReset}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-sky-500/20 transition cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            File Another Civic Complaint
          </button>
        </div>

      </div>
    </div>
  );
}
