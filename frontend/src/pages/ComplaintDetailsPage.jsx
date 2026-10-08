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
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
        <p className="text-sm font-medium text-slate-500">Loading complaint details and resolution timeline...</p>
      </div>
    );
  }

  if (error || !complaint) {
    return (
      <div className="w-full max-w-2xl mx-auto py-12">
        <div className="bg-white rounded-2xl p-8 border border-rose-200 shadow-sm text-center">
          <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto mb-3">
            <AlertCircle className="w-6 h-6 text-rose-600" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">Complaint Unavailable</h2>
          <p className="text-sm text-slate-600 mb-6">{error || 'Complaint not found.'}</p>
          <Link
            to="/my-complaints"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition"
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

  const backendBase = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/+$/, '');
  const fullImageUrl = image_url ? `${backendBase}${image_url}` : null;

  const isMerged = status === 'MERGED';
  const effectiveStatus = isMerged ? (master_status || 'REQUESTED') : status;

  // Timeline Steps Calculation based on effective status
  const isRejected = effectiveStatus === 'REJECTED' || effectiveStatus === 'Rejected';
  const isCompleted = effectiveStatus === 'COMPLETED' || effectiveStatus === 'Resolved';
  const isInProgress = effectiveStatus === 'IN_PROGRESS' || effectiveStatus === 'In Progress' || isCompleted;

  return (
    <div className="w-full max-w-4xl mx-auto py-6 space-y-6">
      {/* Top Breadcrumb & Actions */}
      <div className="flex items-center justify-between gap-3">
        <Link
          to="/my-complaints"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-blue-600 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to My Complaints</span>
        </Link>

        <div className="flex items-center gap-2">
          {is_master_complaint && (
            <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold uppercase tracking-wider">
              MASTER ISSUE
            </span>
          )}
          {isMerged && (
            <span className="px-3 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-xs font-bold uppercase tracking-wider">
              MERGED
            </span>
          )}
          <button
            onClick={() => copyComplaintId(complaint_id || complaint.id)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-mono font-medium border border-slate-200 shadow-sm transition"
            title="Copy Complaint ID"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
            <span>{complaint_id || complaint.id}</span>
          </button>
        </div>
      </div>

      {/* Requirement 6 & 16: CITIZEN MERGED COMPLAINT EXPERIENCE */}
      {isMerged && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-200 shadow-sm space-y-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-white border border-amber-200 text-amber-600 flex-shrink-0 shadow-sm">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            </div>
            <div className="flex-1">
              <span className="font-mono text-xs font-bold text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded border border-amber-200">
                {complaint_id}
              </span>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-1">
                This complaint was linked to an existing civic issue.
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-white border border-amber-200/80 text-xs shadow-sm">
            <div>
              <span className="text-slate-500 block mb-1">Master Complaint ID:</span>
              <span className="font-mono font-bold text-blue-600 text-sm">
                {master_complaint_id || 'CIV-MASTER'}
              </span>
            </div>

            <div>
              <span className="text-slate-500 block mb-1">Master Case Status:</span>
              <span className="inline-flex items-center gap-1.5 font-bold px-2.5 py-0.5 rounded-full text-xs bg-blue-50 text-blue-700 border border-blue-200">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                {master_status || 'IN_PROGRESS'}
              </span>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
            {master_status === 'COMPLETED' || master_status === 'Resolved' ? (
              <span className="text-emerald-700 font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Resolved through master civic issue.
              </span>
            ) : (
              'Your report is being actively handled as part of this master civic case. Updates to the master issue reflect directly here.'
            )}
          </p>

          {master_complaint_id && (
            <div>
              <Link
                to={`/complaints/${master_complaint_id}`}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition"
              >
                <span>View Master Complaint</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Requirement 8: CITIZEN STATUS TIMELINE */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              Resolution Lifecycle & Status Tracker
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Live status managed directly by Municipal Operations
            </p>
          </div>

          <div className="text-left sm:text-right text-xs text-slate-500">
            Last Updated:{' '}
            <span className="text-slate-800 font-semibold">
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
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-800">
            <XCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-rose-900">Complaint Rejected</p>
              <p className="text-xs text-rose-700 mt-0.5 leading-relaxed">
                The municipal department reviewed this submission and determined it cannot be acted upon
                (duplicate, outside municipal jurisdiction, or insufficient evidence).
              </p>
            </div>
          </div>
        ) : (
          /* Standard 3-Step Civic Progress Tracker */
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
            {/* Step 1: Requested */}
            <div className="flex items-center sm:flex-col sm:items-center text-center gap-3 sm:gap-2 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-emerald-100 text-emerald-700 border border-emerald-300 font-bold text-sm">
                ✓
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">1. Requested</p>
                <p className="text-[11px] text-slate-500">Triage complete & registered</p>
              </div>
            </div>

            {/* Step 2: In Progress */}
            <div
              className={`flex items-center sm:flex-col sm:items-center text-center gap-3 sm:gap-2 p-4 rounded-xl border transition ${
                isInProgress
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : 'bg-slate-50/50 border-slate-200 text-slate-400 opacity-70'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                  isCompleted
                    ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                    : isInProgress
                    ? 'bg-amber-100 text-amber-700 border border-amber-300 animate-pulse'
                    : 'bg-slate-200 text-slate-500 border border-slate-300'
                }`}
              >
                {isCompleted ? '✓' : isInProgress ? '●' : '2'}
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">2. In Progress</p>
                <p className="text-[11px] text-slate-500">Field team actively dispatched</p>
              </div>
            </div>

            {/* Step 3: Completed */}
            <div
              className={`flex items-center sm:flex-col sm:items-center text-center gap-3 sm:gap-2 p-4 rounded-xl border transition ${
                isCompleted
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-slate-50/50 border-slate-200 text-slate-400 opacity-70'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                  isCompleted
                    ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                    : 'bg-slate-200 text-slate-500 border border-slate-300'
                }`}
              >
                {isCompleted ? '✓' : '3'}
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">3. Completed</p>
                <p className="text-[11px] text-slate-500">Hazard resolved & verified</p>
              </div>
            </div>
          </div>
        )}

        {/* Citizen Expected Resolution Target */}
        {complaint.sla_hours && !isCompleted && !isRejected && (
          <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
            <span className="flex items-center gap-1.5 text-slate-600">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span>Target resolution timeframe:</span>
            </span>
            <span className="font-bold text-slate-900">
              Within approximately {complaint.sla_hours} hours
            </span>
          </div>
        )}
      </div>

      {/* Requirement 18: DUPLICATE UI - CITIZEN */}
      {duplicate_found && duplicate_details.length > 0 && (
        <div className="bg-amber-50/70 rounded-2xl p-5 border border-amber-200 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-bold text-amber-900 flex items-center gap-2">
                Potential Duplicate Complaints Detected
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-mono font-bold border border-amber-200">
                  {duplicate_details.length} Similar Found
                </span>
              </h3>
              <p className="text-xs text-amber-800/90 mt-1">
                Similar complaints were found in the municipal registry for this issue or area.
                The civic body cross-references these reports to avoid redundant field team dispatches.
              </p>

              <div className="mt-3 space-y-2">
                {duplicate_details.map((dup, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-white border border-amber-200/80 flex items-center justify-between gap-3 text-xs shadow-sm"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-blue-600 font-bold">{dup.complaint_id}</span>
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]">
                          {dup.similarity_score}% similarity
                        </span>
                      </div>
                      <p className="text-slate-700 text-xs mt-1">{dup.problem_summary}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Details Grid */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        {/* Top Triage Metrics */}
        {ai_analysis && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] font-medium text-slate-500 block mb-1">Category</span>
              <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">{ai_analysis.category}</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] font-medium text-slate-500 block mb-1">Urgency</span>
              <p className="text-xs sm:text-sm font-bold text-amber-700">{ai_analysis.urgency}</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] font-medium text-slate-500 block mb-1">Priority Score</span>
              <p className="text-xs sm:text-sm font-extrabold text-blue-600">
                {ai_analysis.priority_score}<span className="text-xs font-normal text-slate-400">/100</span>
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] font-medium text-slate-500 block mb-1">Est. Resolution</span>
              <p className="text-xs sm:text-sm font-bold text-emerald-700">
                {ai_analysis.estimated_resolution_time || '24-48 hours'}
              </p>
            </div>
          </div>
        )}

        {/* Original Complaint Text */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-blue-600" />
            Reported Issue Description
          </h3>
          <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">{description}</p>
        </div>

        {/* AI Action Plan */}
        {ai_analysis?.recommended_solution && (
          <div className="p-5 rounded-xl bg-blue-50/60 border border-blue-200">
            <h3 className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Wrench className="w-4 h-4 text-blue-600" />
              Municipal Action Guidance
            </h3>
            <p className="text-sm text-slate-800 leading-relaxed font-medium">
              {ai_analysis.recommended_solution}
            </p>

            {ai_analysis.resolution_steps && ai_analysis.resolution_steps.length > 0 && (
              <div className="mt-4 space-y-2 border-t border-blue-200/60 pt-3">
                <p className="text-xs text-blue-900 font-bold">Field Team Execution Steps:</p>
                {ai_analysis.resolution_steps.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-slate-700">
                    <span className="font-mono text-blue-600 font-bold mt-0.5">{idx + 1}.</span>
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
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-rose-600" />
              Reported Location
            </h3>
            <p className="text-xs sm:text-sm text-slate-900 font-medium">
              {location_address || ai_analysis?.location || 'Not specified'}
            </p>
            {latitude !== null && latitude !== undefined && longitude !== null && longitude !== undefined && (
              <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-slate-200 text-[11px] font-mono text-slate-700 shadow-sm">
                <span className="text-slate-400">GPS:</span>
                <span className="font-semibold">{latitude.toFixed(4)}°, {longitude.toFixed(4)}°</span>
              </div>
            )}
          </div>

          {/* Photographic Evidence */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
              Attached Photographic Evidence
            </h3>
            {fullImageUrl ? (
              <div className="rounded-xl overflow-hidden border border-slate-200 max-h-48 bg-slate-100">
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
