import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Building2,
  MapPin,
  Sparkles,
  AlertTriangle,
  FileText,
  User,
  Wrench,
  Image as ImageIcon,
  Loader2,
  AlertCircle,
  Copy,
  Check,
  Calendar,
  XCircle,
  ShieldAlert,
  GitMerge,
  ExternalLink,
} from 'lucide-react';
import { api } from '../services/api';

export default function ComplaintDetailsPage() {
  const { id } = useParams();
  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await api.getComplaintById(id);
        setComplaint(data);
      } catch (err) {
        console.error('Failed to load complaint details:', err);
        const detail =
          err.response?.data?.detail ||
          'Failed to load complaint details. You may not have permission to view this issue.';
        setError(detail);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchDetails();
  }, [id]);

  const copyComplaintId = (cid) => {
    navigator.clipboard.writeText(cid);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="w-full max-w-4xl mx-auto py-16 text-center">
        <Loader2 className="w-8 h-8 text-sky-400 animate-spin mx-auto mb-3" />
        <p className="text-sm text-slate-400">Loading complaint details and resolution timeline...</p>
      </div>
    );
  }

  if (error || !complaint) {
    return (
      <div className="w-full max-w-2xl mx-auto py-12">
        <div className="glass-panel rounded-2xl p-8 border border-rose-500/30 bg-rose-950/10 text-center">
          <AlertCircle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-white mb-2">Complaint Unavailable</h2>
          <p className="text-xs sm:text-sm text-slate-300 mb-6">{error || 'Complaint not found.'}</p>
          <Link
            to="/my-complaints"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to My Complaints</span>
          </Link>
        </div>
      </div>
    );
  }

  const {
    complaint_id,
    description,
    citizen_name,
    citizen_contact,
    location_address,
    latitude,
    longitude,
    image_url,
    status = 'REQUESTED',
    created_at,
    updated_at,
    duplicate_found,
    duplicate_details = [],
    ai_analysis,
    is_master_complaint,
    master_complaint_id,
    master_status,
    merged_complaint_ids = [],
  } = complaint;

  const backendBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
  const fullImageUrl = image_url ? `${backendBase}${image_url}` : null;

  const isMerged = status === 'MERGED';
  const effectiveStatus = isMerged ? (master_status || 'REQUESTED') : status;

  // Timeline Steps Calculation based on effective status
  const isRejected = effectiveStatus === 'REJECTED' || effectiveStatus === 'Rejected';
  const isCompleted = effectiveStatus === 'COMPLETED' || effectiveStatus === 'Resolved';
  const isInProgress = effectiveStatus === 'IN_PROGRESS' || effectiveStatus === 'In Progress' || isCompleted;

  return (
    <div className="w-full max-w-4xl mx-auto py-6 space-y-6 animate-fadeIn">
      {/* Top Breadcrumb & Actions */}
      <div className="flex items-center justify-between gap-3">
        <Link
          to="/my-complaints"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to My Complaints</span>
        </Link>

        <div className="flex items-center gap-2">
          {is_master_complaint && (
            <span className="px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold">
              MASTER ISSUE
            </span>
          )}
          {isMerged && (
            <span className="px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-bold">
              MERGED
            </span>
          )}
          <button
            onClick={() => copyComplaintId(complaint_id || complaint.id)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-mono border border-slate-700 transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{complaint_id || complaint.id}</span>
          </button>
        </div>
      </div>

      {/* Requirement 6 & 16: CITIZEN MERGED COMPLAINT EXPERIENCE */}
      {isMerged && (
        <div className="glass-panel rounded-2xl p-6 border-2 border-amber-500/50 bg-gradient-to-r from-amber-950/40 via-slate-900 to-purple-950/30 shadow-xl space-y-4 animate-fadeIn">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 flex-shrink-0">
              <AlertTriangle className="w-6 h-6 text-amber-400" />
            </div>
            <div className="flex-1">
              <span className="font-mono text-xs font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                {complaint_id}
              </span>
              <h3 className="text-base sm:text-lg font-extrabold text-white mt-1 flex items-center gap-2">
                This complaint was linked to an existing civic issue.
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-slate-900/90 border border-slate-800 text-xs">
            <div>
              <span className="text-slate-400 block mb-1">Master Complaint:</span>
              <span className="font-mono font-bold text-sky-400 text-sm">
                {master_complaint_id || 'CIV-MASTER'}
              </span>
            </div>

            <div>
              <span className="text-slate-400 block mb-1">Linked Complaint Status:</span>
              <span className="inline-flex items-center gap-1.5 font-bold px-2.5 py-0.5 rounded-full text-xs bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                {master_status || 'IN_PROGRESS'}
              </span>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            {master_status === 'COMPLETED' || master_status === 'Resolved' ? (
              <span className="text-emerald-300 font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Resolved through master civic issue.
              </span>
            ) : (
              'Your report is being handled as part of the same civic issue.'
            )}
          </p>

          {master_complaint_id && (
            <div>
              <Link
                to={`/complaints/${master_complaint_id}`}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-sky-500/20 transition"
              >
                <span>View Master Complaint</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Requirement 8: CITIZEN STATUS TIMELINE */}
      <div className="glass-panel rounded-2xl p-6 sm:p-8 border border-slate-800">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-base font-extrabold text-white tracking-tight flex items-center gap-2">
              <Clock className="w-4 h-4 text-sky-400" />
              Resolution Lifecycle & Status Tracker
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Live status managed directly by Municipal Operations
            </p>
          </div>

          <div className="text-right text-[11px] text-slate-400">
            Last Updated:{' '}
            <span className="text-slate-300 font-medium">
              {new Date(updated_at || created_at).toLocaleDateString('en-US', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </span>
          </div>
        </div>

        {isRejected ? (
          /* Separate Rejected State */
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-3 text-rose-300">
            <XCircle className="w-6 h-6 text-rose-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-bold text-rose-200">Complaint Rejected</p>
              <p className="text-xs text-rose-300/90 mt-0.5">
                The municipal department reviewed this submission and determined it cannot be acted upon
                (duplicate, invalid civic jurisdiction, or insufficient evidence).
              </p>
            </div>
          </div>
        ) : (
          /* Standard 3-Step Civic Progress Tracker */
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            {/* Step 1: Requested */}
            <div className="flex items-center sm:flex-col sm:items-center text-center gap-3 sm:gap-2 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold text-sm">
                ✓
              </div>
              <div>
                <p className="text-xs font-bold text-white">1. Requested</p>
                <p className="text-[11px] text-slate-400">Triage complete & registered</p>
              </div>
            </div>

            {/* Step 2: In Progress */}
            <div
              className={`flex items-center sm:flex-col sm:items-center text-center gap-3 sm:gap-2 p-3 rounded-xl border ${
                isInProgress
                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-200'
                  : 'bg-slate-900/30 border-slate-800/60 text-slate-500 opacity-60'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                  isCompleted
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : isInProgress
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 animate-pulse'
                    : 'bg-slate-800 text-slate-500 border border-slate-700'
                }`}
              >
                {isCompleted ? '✓' : isInProgress ? '●' : '2'}
              </div>
              <div>
                <p className="text-xs font-bold text-white">2. In Progress</p>
                <p className="text-[11px] text-slate-400">Field team actively dispatched</p>
              </div>
            </div>

            {/* Step 3: Completed */}
            <div
              className={`flex items-center sm:flex-col sm:items-center text-center gap-3 sm:gap-2 p-3 rounded-xl border ${
                isCompleted
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-200'
                  : 'bg-slate-900/30 border-slate-800/60 text-slate-500 opacity-60'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                  isCompleted
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-slate-800 text-slate-500 border border-slate-700'
                }`}
              >
                {isCompleted ? '✓' : '3'}
              </div>
              <div>
                <p className="text-xs font-bold text-white">3. Completed</p>
                <p className="text-[11px] text-slate-400">Hazard resolved & verified</p>
              </div>
            </div>
          </div>
        )}

        {/* Citizen Expected Resolution Target */}
        {complaint.sla_hours && !isCompleted && !isRejected && (
          <div className="mt-4 pt-4 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs text-slate-400">
            <span className="flex items-center gap-1.5 text-slate-300">
              <Clock className="w-3.5 h-3.5 text-sky-400" />
              <span>Expected resolution timeframe:</span>
            </span>
            <span className="font-semibold text-white">
              Within approximately {complaint.sla_hours} hours
            </span>
          </div>
        )}
      </div>

      {/* Requirement 18: DUPLICATE UI - CITIZEN */}
      {duplicate_found && duplicate_details.length > 0 && (
        <div className="glass-panel rounded-2xl p-5 border border-amber-500/30 bg-amber-950/20 animate-fadeIn">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-bold text-amber-200 flex items-center gap-2">
                Potential Duplicate Complaints Detected
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono">
                  {duplicate_details.length} Similar Found
                </span>
              </h3>
              <p className="text-xs text-amber-300/80 mt-0.5">
                Similar complaints were found in the municipal registry for this issue or area.
                The civic body cross-references these reports to avoid redundant work.
              </p>

              <div className="mt-3 space-y-2">
                {duplicate_details.map((dup, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sky-400 font-semibold">{dup.complaint_id}</span>
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 font-bold text-[10px]">
                          {dup.similarity_score}% similar
                        </span>
                      </div>
                      <p className="text-slate-300 text-xs mt-1">{dup.problem_summary}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Details Grid */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-800 space-y-6">
        {/* Top Triage Metrics */}
        {ai_analysis && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800">
              <span className="text-[11px] text-slate-400 block mb-1">Category</span>
              <p className="text-xs sm:text-sm font-bold text-white truncate">{ai_analysis.category}</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800">
              <span className="text-[11px] text-slate-400 block mb-1">Urgency</span>
              <p className="text-xs sm:text-sm font-bold text-amber-400">{ai_analysis.urgency}</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800">
              <span className="text-[11px] text-slate-400 block mb-1">Priority Score</span>
              <p className="text-xs sm:text-sm font-extrabold text-sky-400">
                {ai_analysis.priority_score}<span className="text-xs text-slate-500">/100</span>
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800">
              <span className="text-[11px] text-slate-400 block mb-1">Timeframe</span>
              <p className="text-xs sm:text-sm font-bold text-emerald-400">
                {ai_analysis.estimated_resolution_time || '24-48 hours'}
              </p>
            </div>
          </div>
        )}

        {/* Original Complaint Text */}
        <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-indigo-400" />
            Reported Issue Description
          </h3>
          <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">{description}</p>
        </div>

        {/* AI Action Plan */}
        {ai_analysis?.recommended_solution && (
          <div className="p-5 rounded-2xl bg-gradient-to-br from-sky-950/50 via-slate-900 to-indigo-950/40 border border-sky-500/30">
            <h3 className="text-xs font-bold text-sky-300 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Wrench className="w-4 h-4 text-sky-400" />
              Municipal Action Guidance
            </h3>
            <p className="text-sm text-slate-200 leading-relaxed font-medium">
              {ai_analysis.recommended_solution}
            </p>

            {ai_analysis.resolution_steps && ai_analysis.resolution_steps.length > 0 && (
              <div className="mt-4 space-y-2 border-t border-sky-500/20 pt-3">
                <p className="text-xs text-slate-400 font-semibold">Field Team Execution Steps:</p>
                {ai_analysis.resolution_steps.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                    <span className="font-mono text-sky-400 font-bold mt-0.5">{idx + 1}.</span>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Evidence & Location Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Location */}
          <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-rose-400" />
              Reported Location
            </h3>
            <p className="text-xs sm:text-sm text-white font-medium">
              {location_address || ai_analysis?.location || 'Not specified'}
            </p>
            {latitude !== null && latitude !== undefined && longitude !== null && longitude !== undefined && (
              <div className="mt-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-800 border border-slate-700 text-[11px] font-mono text-sky-300">
                <span>GPS:</span>
                <span>{latitude.toFixed(4)}°, {longitude.toFixed(4)}°</span>
              </div>
            )}
          </div>

          {/* Photographic Evidence */}
          <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
              Attached Photographic Evidence
            </h3>
            {fullImageUrl ? (
              <div className="rounded-xl overflow-hidden border border-slate-700 max-h-48 bg-black">
                <img
                  src={fullImageUrl}
                  alt="Evidence"
                  className="w-full h-48 object-cover hover:scale-105 transition"
                />
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic mt-4">
                No photographic evidence was uploaded with this complaint.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
