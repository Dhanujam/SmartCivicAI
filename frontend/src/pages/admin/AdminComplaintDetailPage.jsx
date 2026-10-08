import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  Clock,
  MapPin,
  AlertTriangle,
  Wrench,
  Image as ImageIcon,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  FileText,
  User,
  Phone,
  Calendar,
  Send,
  ExternalLink,
  ShieldAlert,
  Copy,
  Check,
  GitMerge,
  Layers,
  CheckSquare,
  Square,
} from 'lucide-react';
import { api } from '../../services/api';

export default function AdminComplaintDetailPage() {
  const { id } = useParams();
  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Status Update state
  const [newStatus, setNewStatus] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [updating, setUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(null);
  const [copied, setCopied] = useState(false);

  // Stretch Goal 1: Duplicate Merging states
  const [selectedDuplicates, setSelectedDuplicates] = useState([]);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [merging, setMerging] = useState(false);
  const [mergeSuccess, setMergeSuccess] = useState(null);
  const [mergeError, setMergeError] = useState(null);

  const fetchComplaint = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getAdminComplaintById(id);
      setComplaint(data);
      setNewStatus(data.status);
    } catch (err) {
      console.error('Failed to load complaint for admin:', err);
      setError('Failed to fetch complaint details. Verify official permissions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchComplaint();
  }, [id]);

  const handleStatusUpdate = async (e) => {
    e.preventDefault();
    if (!newStatus) return;

    setUpdating(true);
    setUpdateSuccess(null);

    try {
      await api.updateAdminComplaintStatus(
        complaint.complaint_id || complaint.id,
        newStatus,
        adminNotes
      );
      setComplaint((prev) => ({
        ...prev,
        status: newStatus,
        updated_at: new Date().toISOString(),
      }));
      setUpdateSuccess(`Status successfully updated to ${newStatus}`);
      setTimeout(() => setUpdateSuccess(null), 4000);
    } catch (err) {
      console.error('Failed to update status:', err);
      alert('Failed to update status. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const toggleSelectDuplicate = (dupId) => {
    setSelectedDuplicates((prev) =>
      prev.includes(dupId) ? prev.filter((id) => id !== dupId) : [...prev, dupId]
    );
  };

  const handleSelectAllDuplicates = () => {
    if (selectedDuplicates.length === complaint.duplicate_details?.length) {
      setSelectedDuplicates([]);
    } else {
      setSelectedDuplicates(complaint.duplicate_details?.map((d) => d.complaint_id) || []);
    }
  };

  const handleConfirmMerge = async () => {
    if (selectedDuplicates.length === 0) return;
    setMerging(true);
    setMergeError(null);
    try {
      const res = await api.mergeComplaints(
        complaint.complaint_id || complaint.id,
        selectedDuplicates
      );
      setMergeSuccess(res.message || 'Complaints successfully merged');
      setShowMergeModal(false);
      setSelectedDuplicates([]);
      await fetchComplaint();
      setTimeout(() => setMergeSuccess(null), 6000);
    } catch (err) {
      console.error('Merge error:', err);
      const detail = err.response?.data?.detail || 'Failed to merge selected complaints.';
      setMergeError(detail);
    } finally {
      setMerging(false);
    }
  };

  const copyId = (cid) => {
    navigator.clipboard.writeText(cid);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-5xl mx-auto py-16 text-center">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mx-auto mb-3" />
        <p className="text-sm text-slate-400">Loading municipal case file from MongoDB Atlas...</p>
      </div>
    );
  }

  if (error || !complaint) {
    return (
      <div className="w-full max-w-2xl mx-auto py-12">
        <div className="glass-panel rounded-2xl p-8 border border-rose-500/30 text-center">
          <AlertCircle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-white mb-2">Error Loading Case</h2>
          <p className="text-xs text-slate-300 mb-6">{error || 'Complaint not found.'}</p>
          <Link
            to="/admin/complaints"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to All Complaints</span>
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
    status,
    created_at,
    updated_at,
    duplicate_found,
    duplicate_details = [],
    ai_analysis,
    is_master_complaint,
    master_complaint_id,
    master_status,
    merged_complaint_ids = [],
    merged_complaints_details = [],
  } = complaint;

  const backendBase = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/+$/, '');
  const fullImageUrl = image_url ? `${backendBase}${image_url}` : null;
  const isMerged = status === 'MERGED';

  return (
    <div className="w-full max-w-5xl mx-auto py-6 space-y-6 animate-fadeIn">
      {/* Top Header / Breadcrumbs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <Link
          to="/admin/complaints"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Complaints</span>
        </Link>

        <div className="flex items-center gap-2">
          {is_master_complaint && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-xs font-bold">
              <Layers className="w-3.5 h-3.5" />
              <span>MASTER COMPLAINT • {merged_complaint_ids?.length || 0} LINKED</span>
            </span>
          )}

          {isMerged && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/40 text-xs font-bold">
              <GitMerge className="w-3.5 h-3.5" />
              <span>MERGED → {master_complaint_id}</span>
            </span>
          )}

          <button
            onClick={() => copyId(complaint_id || complaint.id)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 text-xs font-mono text-slate-300 border border-slate-700"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{complaint_id || complaint.id}</span>
          </button>
        </div>
      </div>

      {/* Requirement 10: After Merge Success Banner */}
      {mergeSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-200 text-xs sm:text-sm flex items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <div>
              <p className="font-bold text-white">✓ Complaints successfully merged</p>
              <p className="text-emerald-300/80 text-xs mt-0.5">{mergeSuccess}</p>
            </div>
          </div>
          <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/20 px-2 py-1 rounded-lg">
            Master: {complaint_id}
          </span>
        </div>
      )}

      {/* Requirement 16: If this complaint is MERGED, show prominent banner */}
      {isMerged && (
        <div className="glass-panel rounded-2xl p-5 border-2 border-purple-500/40 bg-purple-950/20 text-purple-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <GitMerge className="w-6 h-6 text-purple-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-white text-sm">Complaint Merged into Master Civic Issue</h3>
              <p className="text-xs text-purple-300/90 mt-0.5">
                This report is linked to master case <strong className="font-mono text-white">{master_complaint_id}</strong>.
                Its lifecycle is actively controlled through the master issue.
              </p>
            </div>
          </div>
          {master_complaint_id && (
            <Link
              to={`/admin/complaints/${master_complaint_id}`}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 whitespace-nowrap shadow-md shadow-purple-500/25 transition"
            >
              <span>View Master Case</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      )}

      {/* Requirement 11: MASTER CIVIC ISSUE SECTION */}
      {is_master_complaint && (
        <div className="glass-panel rounded-2xl p-6 border-2 border-indigo-500/50 bg-gradient-to-r from-indigo-950/40 via-slate-900 to-slate-950 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-indigo-500/20 pb-3">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-400 bg-indigo-500/20 px-2.5 py-0.5 rounded-full">
                MASTER CIVIC ISSUE
              </span>
              <h3 className="text-lg font-extrabold text-white mt-1">
                {complaint_id}
              </h3>
            </div>
            <div className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold">
              Related Citizen Reports: <strong className="text-white ml-1">{merged_complaint_ids?.length || 0}</strong>
            </div>
          </div>

          <div>
            <span className="text-xs text-slate-400 block mb-1">Original Problem:</span>
            <p className="text-sm font-semibold text-white">
              {ai_analysis?.problem_summary || description}
            </p>
          </div>

          <div className="pt-2">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              <span>Related Merged Reports ({merged_complaint_ids?.length || 0})</span>
            </h4>
            <div className="space-y-2">
              {merged_complaints_details && merged_complaints_details.length > 0 ? (
                merged_complaints_details.map((rep, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:border-slate-700 transition"
                  >
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <span className="font-mono font-bold text-sky-400 text-xs">{rep.complaint_id}</span>
                      <span className="text-slate-500 text-xs">•</span>
                      <span className="text-slate-400 text-xs whitespace-nowrap">Citizen report</span>
                      <span className="text-slate-300 text-xs truncate max-w-sm">
                        {rep.problem_summary}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold text-[10px] border border-purple-500/30">
                        MERGED
                      </span>
                      <Link
                        to={`/admin/complaints/${rep.complaint_id}`}
                        className="text-indigo-400 hover:text-indigo-300 font-semibold text-xs flex items-center gap-1"
                      >
                        <span>Inspect</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                merged_complaint_ids?.map((cid, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sky-400 text-xs">{cid}</span>
                      <span className="text-slate-400 text-xs">• Citizen report</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold text-[10px] border border-purple-500/30">
                        MERGED
                      </span>
                      <Link
                        to={`/admin/complaints/${cid}`}
                        className="text-indigo-400 hover:text-indigo-300 font-semibold text-xs flex items-center gap-1"
                      >
                        <span>Inspect</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Requirement 15: SERVICE LEVEL AGREEMENT (SLA) CARD */}
      <div
        className={`glass-panel rounded-2xl p-6 border-2 transition shadow-xl space-y-4 ${
          complaint.sla_status === 'BREACHED'
            ? 'border-rose-500/50 bg-rose-950/20'
            : complaint.sla_status === 'DUE_SOON'
            ? 'border-amber-500/50 bg-amber-950/20'
            : complaint.sla_status === 'COMPLETED'
            ? 'border-emerald-500/40 bg-emerald-950/15'
            : 'border-sky-500/40 bg-slate-900/60'
        }`}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-850 pb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-400" />
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-400">
                PROTOTYPE SLA MONITORING
              </span>
              <h3 className="text-base font-extrabold text-white tracking-tight">
                Service Level Agreement (SLA)
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {complaint.sla_status === 'BREACHED' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
                <span>🚨</span>
                <span>SLA BREACHED</span>
              </span>
            )}
            {complaint.sla_status === 'DUE_SOON' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                <span>🟡</span>
                <span>DUE SOON</span>
              </span>
            )}
            {complaint.sla_status === 'WITHIN_SLA' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                <span>🟢</span>
                <span>WITHIN SLA</span>
              </span>
            )}
            {complaint.sla_status === 'COMPLETED' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                <span>✓</span>
                <span>COMPLETED</span>
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
            <span className="text-slate-400 block text-[11px] mb-1">Priority / Urgency</span>
            <span className="font-bold text-white text-sm">
              {complaint.ai_analysis?.urgency || 'MEDIUM'}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
            <span className="text-slate-400 block text-[11px] mb-1">Prototype SLA Target</span>
            <span className="font-bold text-white text-sm">
              {complaint.sla_hours || 48} hours
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
            <span className="text-slate-400 block text-[11px] mb-1">Created</span>
            <span className="font-medium text-slate-200">
              {formatDateTime(complaint.created_at)}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
            <span className="text-slate-400 block text-[11px] mb-1">Target Due</span>
            <span className="font-medium text-slate-200">
              {formatDateTime(complaint.sla_due_at)}
            </span>
          </div>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-t border-slate-800/80 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Operational Status:</span>
            {complaint.status === 'MERGED' ? (
              <span className="text-purple-300 font-semibold">
                Follows Master Complaint {complaint.master_complaint_id}
              </span>
            ) : complaint.sla_status === 'COMPLETED' ? (
              <span className="text-emerald-300 font-semibold">
                {complaint.sla_completed_late ? 'Completed after SLA deadline' : 'Resolved before SLA deadline'}
              </span>
            ) : complaint.sla_status === 'BREACHED' ? (
              <span className="text-rose-300 font-semibold">
                {complaint.sla_remaining_text || 'Overdue'} • Immediate municipal attention required
              </span>
            ) : complaint.sla_status === 'DUE_SOON' ? (
              <span className="text-amber-300 font-semibold">
                Approaching deadline: {complaint.sla_remaining_text}
              </span>
            ) : (
              <span className="text-emerald-300 font-semibold">
                Time remaining: {complaint.sla_remaining_text || 'Active'}
              </span>
            )}
          </div>

          <span className="text-[11px] text-slate-500 font-mono">
            Prototype SLA Rule • Non-statutory
          </span>
        </div>
      </div>

      {/* Requirement 16: GOVERNMENT STATUS MANAGEMENT PANEL */}
      <div className="glass-panel rounded-2xl p-6 border-2 border-indigo-500/40 bg-gradient-to-r from-indigo-950/40 via-slate-900 to-slate-950 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-400 bg-indigo-500/20 px-2 py-0.5 rounded-full">
              Municipal Action Console
            </span>
            <h2 className="text-lg font-extrabold text-white mt-1">
              Complaint Lifecycle Management
            </h2>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Current Status:</span>
            <span
              className={`px-3 py-1 rounded-full font-bold text-xs border ${
                isMerged
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                  : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
              }`}
            >
              {status}
            </span>
          </div>
        </div>

        {updateSuccess && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{updateSuccess}</span>
          </div>
        )}

        {isMerged ? (
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300">
            <p>
              Status tracking for this report is linked to master issue{' '}
              <strong className="text-white font-mono">{master_complaint_id}</strong>.
              Update the master complaint to progress this civic issue.
            </p>
          </div>
        ) : (
          <form onSubmit={handleStatusUpdate} className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <div className="flex-1">
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                disabled={updating}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs sm:text-sm font-semibold focus:outline-none focus:border-indigo-500"
              >
                <option value="REQUESTED">REQUESTED (Initial triage logged)</option>
                <option value="IN_PROGRESS">IN_PROGRESS (Field officer dispatched)</option>
                <option value="COMPLETED">COMPLETED (Issue resolved & verified)</option>
                <option value="REJECTED">REJECTED (Duplicate or out of jurisdiction)</option>
              </select>
            </div>

            <div className="flex-1">
              <input
                type="text"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                disabled={updating}
                placeholder="Official notes (optional, e.g., Work order #WO-402 assigned)"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={updating || newStatus === status}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold text-xs transition flex items-center justify-center gap-2 whitespace-nowrap shadow-md shadow-indigo-500/25"
            >
              {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>Update Status</span>
            </button>
          </form>
        )}
      </div>

      {/* Requirements 7 & 8: POTENTIAL DUPLICATE COMPLAINTS - GOVERNMENT */}
      {duplicate_found && duplicate_details.length > 0 && !isMerged && (
        <div className="glass-panel rounded-2xl p-6 border border-amber-500/40 bg-amber-950/20 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-base font-extrabold text-amber-200 flex items-center gap-2">
                  Potential Duplicate Complaints
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono">
                    {duplicate_details.length} related reports found
                  </span>
                </h3>
                <p className="text-xs text-amber-300/80 mt-1">
                  Select related complaints to merge into this complaint as MASTER.
                  Original citizen reports will be preserved in the system with status MERGED.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                type="button"
                onClick={handleSelectAllDuplicates}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition"
              >
                {selectedDuplicates.length === duplicate_details.length ? 'Deselect All' : 'Select All'}
              </button>

              <button
                type="button"
                disabled={selectedDuplicates.length === 0}
                onClick={() => setShowMergeModal(true)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 disabled:opacity-40 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition whitespace-nowrap"
              >
                <GitMerge className="w-4 h-4" />
                <span>Merge Selected Complaints ({selectedDuplicates.length})</span>
              </button>
            </div>
          </div>

          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {duplicate_details.map((dup, idx) => {
              const isSelected = selectedDuplicates.includes(dup.complaint_id);
              return (
                <div
                  key={idx}
                  onClick={() => toggleSelectDuplicate(dup.complaint_id)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition flex flex-col justify-between space-y-2 select-none ${
                    isSelected
                      ? 'bg-indigo-950/70 border-indigo-500/80 ring-1 ring-indigo-500/50 shadow-md'
                      : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}} // handled by parent div onClick
                        className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                      />
                      <span className="font-mono text-sky-400 font-bold text-xs">{dup.complaint_id}</span>
                    </div>

                    <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono text-[10px] font-bold">
                      {dup.similarity_score}% similar
                    </span>
                  </div>

                  <p className="text-xs text-slate-200 line-clamp-2">{dup.problem_summary}</p>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px] text-slate-400">
                    <span className="truncate max-w-[150px]">{dup.location || 'Local area'}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                        {dup.status || 'REQUESTED'}
                      </span>
                      <Link
                        to={`/admin/complaints/${dup.complaint_id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
                      >
                        <span>Inspect</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Requirement 9: CONFIRMATION MODAL */}
      {showMergeModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="glass-panel rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-slate-700 bg-slate-950 shadow-2xl space-y-5 animate-scaleUp">
            <div className="flex items-start gap-3">
              <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex-shrink-0">
                <GitMerge className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-white">Merge Duplicate Complaints?</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Link related citizen reports to this master civic issue
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3 text-xs">
              <div>
                <span className="text-slate-400 block mb-1.5">You are about to merge:</span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedDuplicates.map((cid) => (
                    <span
                      key={cid}
                      className="font-mono px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold"
                    >
                      {cid}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-2.5 border-t border-slate-800/80">
                <span className="text-slate-400 block mb-1">into:</span>
                <span className="font-mono px-2.5 py-1 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-bold inline-block">
                  MASTER {complaint_id || complaint.id}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              The selected complaints will remain in the system but will be marked as{' '}
              <strong className="text-purple-300 font-bold">MERGED</strong>.
              Their status and tracking will follow the master civic issue.
            </p>

            {mergeError && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                <span>{mergeError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={merging}
                onClick={() => {
                  setShowMergeModal(false);
                  setMergeError(null);
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={merging}
                onClick={handleConfirmMerge}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-500/25 transition flex items-center gap-2"
              >
                {merging ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Merging Cases...</span>
                  </>
                ) : (
                  <>
                    <GitMerge className="w-4 h-4" />
                    <span>Confirm Merge</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Case File Grid */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-800 space-y-6">
        {/* Top Triage Metrics Grid */}
        {ai_analysis && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
              <span className="text-[11px] text-slate-400 block mb-1">Assigned Department</span>
              <p className="text-xs sm:text-sm font-bold text-white truncate" title={ai_analysis.department}>
                {ai_analysis.department}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
              <span className="text-[11px] text-slate-400 block mb-1">Civic Category</span>
              <p className="text-xs sm:text-sm font-bold text-white truncate">{ai_analysis.category}</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
              <span className="text-[11px] text-slate-400 block mb-1">Urgency Level</span>
              <p className="text-xs sm:text-sm font-bold text-amber-400">{ai_analysis.urgency}</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
              <span className="text-[11px] text-slate-400 block mb-1">Priority Score</span>
              <p className="text-xs sm:text-sm font-black text-sky-400">
                {ai_analysis.priority_score}<span className="text-xs text-slate-500">/100</span>
              </p>
            </div>
          </div>
        )}

        {/* Citizen Information & Submitter Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-sky-400" />
              Citizen Reporter
            </h3>
            <p className="text-sm font-bold text-white">{citizen_name || 'Anonymous'}</p>
            {citizen_contact && (
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                <Phone className="w-3 h-3 text-slate-500" />
                <span>Contact: {citizen_contact}</span>
              </p>
            )}
            <p className="text-[11px] text-slate-500 mt-2">
              Submitted: {new Date(created_at).toLocaleString()}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-rose-400" />
              Location & Geotag
            </h3>
            <p className="text-xs sm:text-sm font-bold text-white">
              {location_address || ai_analysis?.location || 'Not specified'}
            </p>
            {latitude !== null && latitude !== undefined && longitude !== null && longitude !== undefined && (
              <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800 border border-slate-700 text-[11px] font-mono text-sky-300">
                <span>GPS:</span>
                <span>{latitude.toFixed(5)}°, {longitude.toFixed(5)}°</span>
              </div>
            )}
          </div>
        </div>

        {/* Original Description */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-indigo-400" />
            Citizen Original Report
          </h3>
          <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">{description}</p>
        </div>

        {/* AI Action Plan */}
        {ai_analysis && (
          <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-slate-900 to-sky-950/30 border border-indigo-500/30">
            <h3 className="text-xs font-bold text-indigo-300 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Wrench className="w-4 h-4 text-indigo-400" />
              Recommended Field Team Action Plan
            </h3>
            <p className="text-sm text-slate-100 font-medium leading-relaxed mb-4">
              {ai_analysis.recommended_solution}
            </p>

            {ai_analysis.resolution_steps && ai_analysis.resolution_steps.length > 0 && (
              <div className="space-y-2 border-t border-indigo-500/20 pt-3">
                <p className="text-xs text-slate-400 font-semibold">Standard Operating Procedures:</p>
                {ai_analysis.resolution_steps.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-300">
                    <span className="font-mono text-indigo-400 font-bold">{idx + 1}.</span>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Evidence Image */}
        {fullImageUrl && (
          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-sky-400" />
              Attached Photographic Evidence
            </h3>
            <div className="max-w-md rounded-xl overflow-hidden border border-slate-700 bg-black">
              <img src={fullImageUrl} alt="Evidence" className="w-full h-auto max-h-72 object-cover" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
