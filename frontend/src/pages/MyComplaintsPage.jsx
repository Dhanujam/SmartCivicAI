import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FolderOpen,
  PlusCircle,
  Clock,
  Building2,
  AlertTriangle,
  ArrowRight,
  Loader2,
  AlertCircle,
  FileText,
  Calendar,
  Sparkles,
  GitMerge,
} from 'lucide-react';
import { api } from '../services/api';

export default function MyComplaintsPage() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('ALL');

  useEffect(() => {
    const fetchComplaints = async () => {
      try {
        setLoading(true);
        const data = await api.getMyComplaints();
        setComplaints(data || []);
      } catch (err) {
        console.error('Failed to fetch personal complaints:', err);
        setError('Failed to load your complaints. Please check your connection.');
      } finally {
        setLoading(false);
      }
    };

    fetchComplaints();
  }, []);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'IN_PROGRESS':
      case 'In Progress':
        return {
          label: 'IN PROGRESS',
          className: 'bg-amber-50 text-amber-700 border-amber-200',
          dot: 'bg-amber-500 animate-pulse',
        };
      case 'COMPLETED':
      case 'Resolved':
        return {
          label: 'COMPLETED',
          className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          dot: 'bg-emerald-500',
        };
      case 'REJECTED':
      case 'Rejected':
        return {
          label: 'REJECTED',
          className: 'bg-rose-50 text-rose-700 border-rose-200',
          dot: 'bg-rose-500',
        };
      case 'MERGED':
        return {
          label: 'MERGED',
          className: 'bg-purple-50 text-purple-700 border-purple-200',
          dot: 'bg-purple-500',
        };
      case 'REQUESTED':
      case 'Pending':
      default:
        return {
          label: 'REQUESTED',
          className: 'bg-blue-50 text-blue-700 border-blue-200',
          dot: 'bg-blue-500',
        };
    }
  };

  const getUrgencyBadge = (urgency) => {
    switch (urgency) {
      case 'CRITICAL':
        return 'text-rose-700 bg-rose-50 border-rose-200';
      case 'HIGH':
        return 'text-orange-700 bg-orange-50 border-orange-200';
      case 'MEDIUM':
        return 'text-amber-700 bg-amber-50 border-amber-200';
      default:
        return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    }
  };

  // KPIs
  const totalCount = complaints.length;
  const inProgressCount = complaints.filter(
    (c) => c.status === 'IN_PROGRESS' || c.status === 'In Progress'
  ).length;
  const resolvedCount = complaints.filter(
    (c) => c.status === 'COMPLETED' || c.status === 'Resolved'
  ).length;
  const pendingCount = complaints.filter(
    (c) => c.status === 'REQUESTED' || c.status === 'Pending' || !c.status
  ).length;

  const filteredComplaints = complaints.filter((c) => {
    if (activeTab === 'IN_PROGRESS') return c.status === 'IN_PROGRESS' || c.status === 'In Progress';
    if (activeTab === 'RESOLVED') return c.status === 'COMPLETED' || c.status === 'Resolved';
    if (activeTab === 'PENDING') return c.status === 'REQUESTED' || c.status === 'Pending';
    return true;
  });

  return (
    <div className="w-full max-w-6xl mx-auto py-6 sm:py-8 space-y-6 animate-fadeIn">
      {/* Top Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold mb-2">
            <FolderOpen className="w-3.5 h-3.5 text-blue-600" />
            <span>Citizen Tracking Registry</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            My Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Track your complaints and stay updated with real-time municipal triage progress.
          </p>
        </div>

        <Link
          to="/"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Report New Issue</span>
        </Link>
      </div>

      {/* KPI Cards Grid (Requirement 7) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Total Complaints */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5 mb-1">
            <FileText className="w-4 h-4 text-blue-600" />
            Total Complaints
          </span>
          <span className="text-3xl font-black text-slate-900">{totalCount}</span>
          <span className="text-[11px] text-slate-400 mt-1">All personal submissions</span>
        </div>

        {/* In Progress */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5 mb-1">
            <Clock className="w-4 h-4 text-amber-600" />
            In Progress
          </span>
          <span className="text-3xl font-black text-amber-600">{inProgressCount}</span>
          <span className="text-[11px] text-slate-400 mt-1">Field officer dispatched</span>
        </div>

        {/* Resolved */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5 mb-1">
            <Building2 className="w-4 h-4 text-emerald-600" />
            Resolved
          </span>
          <span className="text-3xl font-black text-emerald-600">{resolvedCount}</span>
          <span className="text-[11px] text-slate-400 mt-1">Completed & verified</span>
        </div>

        {/* Pending */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5 mb-1">
            <AlertTriangle className="w-4 h-4 text-blue-500" />
            Pending Triage
          </span>
          <span className="text-3xl font-black text-blue-600">{pendingCount}</span>
          <span className="text-[11px] text-slate-400 mt-1">Awaiting dispatch</span>
        </div>
      </div>

      {/* Tabs Navigation (Requirement 7) */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('ALL')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
            activeTab === 'ALL'
              ? 'bg-blue-50 text-blue-700 border border-blue-200 font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          My Complaints ({totalCount})
        </button>
        <button
          onClick={() => setActiveTab('IN_PROGRESS')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
            activeTab === 'IN_PROGRESS'
              ? 'bg-amber-50 text-amber-700 border border-amber-200 font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          In Progress ({inProgressCount})
        </button>
        <button
          onClick={() => setActiveTab('RESOLVED')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
            activeTab === 'RESOLVED'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Resolved ({resolvedCount})
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-sm text-slate-500">Loading your civic complaints from MongoDB Atlas...</p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredComplaints.length === 0 && (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-xs max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto mb-4 text-slate-400">
            <FolderOpen className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">No complaints found</h3>
          <p className="text-xs sm:text-sm text-slate-600 mb-6 leading-relaxed">
            {activeTab === 'ALL'
              ? "You have not submitted any civic complaints yet. Submit your first civic complaint and we'll help route it to the right department."
              : 'No complaints match the selected filter tab.'}
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Submit a Civic Complaint</span>
          </Link>
        </div>
      )}

      {/* Complaints Cards Grid */}
      {!loading && !error && filteredComplaints.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredComplaints.map((item) => {
            const statusBadge = getStatusBadge(item.status);
            const urgencyClass = getUrgencyBadge(item.ai_analysis?.urgency);

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 hover:border-slate-300 hover:shadow-md transition flex flex-col justify-between shadow-xs group relative overflow-hidden"
              >
                <div>
                  {/* Top Header: ID & Status Badge */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="font-mono text-xs font-bold text-blue-700 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200">
                      {item.complaint_id || `CIV-2026-${item.id.slice(-6).toUpperCase()}`}
                    </span>

                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${statusBadge.className}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${statusBadge.dot}`} />
                      {statusBadge.label}
                    </span>
                  </div>

                  {/* Problem Description */}
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 line-clamp-2 mb-2 group-hover:text-blue-600 transition">
                    {item.ai_analysis?.problem_summary || item.description}
                  </h3>

                  {/* Category & Department */}
                  <div className="space-y-1 mb-4 text-xs text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                      <span className="truncate">{item.ai_analysis?.category || 'Civic Issue'}</span>
                    </div>
                    {item.ai_analysis?.department && (
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
                        <span className="truncate">{item.ai_analysis.department}</span>
                      </div>
                    )}
                  </div>

                  {/* Priority & Urgency Pills */}
                  <div className="flex items-center gap-2 mb-4">
                    {item.ai_analysis?.priority_score !== undefined && (
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700">
                        Priority: <strong className="text-slate-900">{item.ai_analysis.priority_score}</strong>/100
                      </span>
                    )}
                    {item.ai_analysis?.urgency && (
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${urgencyClass}`}
                      >
                        {item.ai_analysis.urgency}
                      </span>
                    )}
                  </div>

                  {/* Linked Master Complaint Notice */}
                  {item.status === 'MERGED' && item.master_complaint_id && (
                    <div className="p-3 mb-4 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-between gap-2 text-xs animate-fadeIn">
                      <div className="flex items-center gap-2">
                        <GitMerge className="w-4 h-4 text-purple-600 flex-shrink-0" />
                        <div>
                          <p className="text-purple-900 font-semibold">
                            Linked to master complaint{' '}
                            <span className="font-mono text-purple-700 font-bold">{item.master_complaint_id}</span>
                          </p>
                          {item.master_status && (
                            <p className="text-[11px] text-purple-700 mt-0.5">
                              Master status:{' '}
                              <strong className="uppercase font-bold">{item.master_status}</strong>
                            </p>
                          )}
                        </div>
                      </div>

                      <Link
                        to={`/complaints/${item.master_complaint_id}`}
                        className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-[11px] whitespace-nowrap shadow-xs transition"
                      >
                        View Master
                      </Link>
                    </div>
                  )}

                  {item.is_master_complaint && (
                    <div className="p-2.5 mb-4 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-center gap-2">
                      <GitMerge className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                      <span>
                        <strong>Master Civic Issue</strong> • Consolidating {item.merged_complaint_ids?.length || 0} citizen reports
                      </span>
                    </div>
                  )}
                </div>

                {/* Footer Dates & Action */}
                <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-2 text-[11px] text-slate-500">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      {new Date(item.created_at).toLocaleDateString('en-US', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  <Link
                    to={`/complaints/${item.complaint_id || item.id}`}
                    className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 font-bold text-xs group-hover:translate-x-0.5 transition"
                  >
                    <span>View Details</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
