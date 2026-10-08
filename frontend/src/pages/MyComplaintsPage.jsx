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

  useEffect(() => {
    const fetchComplaints = async () => {
      try {
        setLoading(true);
        const data = await api.getMyComplaints();
        setComplaints(data);
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
          className: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
          dot: 'bg-amber-400 animate-pulse',
        };
      case 'COMPLETED':
      case 'Resolved':
        return {
          label: 'COMPLETED',
          className: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
          dot: 'bg-emerald-400',
        };
      case 'REJECTED':
      case 'Rejected':
        return {
          label: 'REJECTED',
          className: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
          dot: 'bg-rose-400',
        };
      case 'MERGED':
        return {
          label: 'MERGED',
          className: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
          dot: 'bg-purple-400',
        };
      case 'REQUESTED':
      case 'Pending':
      default:
        return {
          label: 'REQUESTED',
          className: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
          dot: 'bg-sky-400',
        };
    }
  };

  const getUrgencyBadge = (urgency) => {
    switch (urgency) {
      case 'CRITICAL':
        return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
      case 'HIGH':
        return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
      case 'MEDIUM':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      default:
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto py-6 sm:py-8 space-y-6 animate-fadeIn">
      {/* Top Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-panel rounded-2xl p-6 border border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-400 text-xs font-semibold mb-2">
            <FolderOpen className="w-3.5 h-3.5" />
            Citizen Tracking Registry
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            My Submitted Complaints
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Track real-time status updates and municipal triage progress for your reports
          </p>
        </div>

        <Link
          to="/"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-sky-500/20 transition"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Report New Issue</span>
        </Link>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="p-12 text-center glass-panel rounded-2xl border border-slate-800 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
          <p className="text-sm text-slate-400">Loading your civic complaints from MongoDB Atlas...</p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && complaints.length === 0 && (
        <div className="glass-panel rounded-3xl p-12 text-center border border-slate-800 max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center mx-auto mb-4 text-slate-400">
            <FolderOpen className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">No complaints found</h3>
          <p className="text-xs sm:text-sm text-slate-400 mb-6 leading-relaxed">
            You have not submitted any civic complaints yet. If you notice road damage, sanitation
            overflow, or broken utility infrastructure, report it to dispatch municipal field teams.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold shadow-md shadow-sky-500/20 transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Submit Your First Complaint</span>
          </Link>
        </div>
      )}

      {/* Complaints Cards Grid */}
      {!loading && !error && complaints.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {complaints.map((item) => {
            const statusBadge = getStatusBadge(item.status);
            const urgencyClass = getUrgencyBadge(item.ai_analysis?.urgency);

            return (
              <div
                key={item.id}
                className="glass-panel rounded-2xl p-5 sm:p-6 border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between shadow-lg group relative overflow-hidden"
              >
                <div>
                  {/* Top Header: ID & Status Badge */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="font-mono text-xs font-bold text-sky-400 px-2.5 py-1 rounded-lg bg-sky-500/10 border border-sky-500/20">
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
                  <h3 className="text-sm sm:text-base font-bold text-white line-clamp-2 mb-2 group-hover:text-sky-300 transition">
                    {item.ai_analysis?.problem_summary || item.description}
                  </h3>

                  {/* Category & Department */}
                  <div className="space-y-1 mb-4 text-xs text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                      <span className="truncate">{item.ai_analysis?.category || 'Civic Issue'}</span>
                    </div>
                    {item.ai_analysis?.department && (
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                        <span className="truncate">{item.ai_analysis.department}</span>
                      </div>
                    )}
                  </div>

                  {/* Priority & Urgency Pills */}
                  <div className="flex items-center gap-2 mb-4">
                    {item.ai_analysis?.priority_score !== undefined && (
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-900 border border-slate-700 text-slate-300">
                        Priority: <strong className="text-white">{item.ai_analysis.priority_score}</strong>/100
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

                  {/* Requirement 15: Linked Master Complaint Notice */}
                  {item.status === 'MERGED' && item.master_complaint_id && (
                    <div className="p-3 mb-4 rounded-xl bg-purple-950/40 border border-purple-500/30 flex items-center justify-between gap-2 text-xs animate-fadeIn">
                      <div className="flex items-center gap-2">
                        <GitMerge className="w-4 h-4 text-purple-400 flex-shrink-0" />
                        <div>
                          <p className="text-purple-200 font-semibold">
                            Linked to master complaint{' '}
                            <span className="font-mono text-white font-bold">{item.master_complaint_id}</span>
                          </p>
                          {item.master_status && (
                            <p className="text-[11px] text-purple-300/80 mt-0.5">
                              Master status:{' '}
                              <strong className="text-white uppercase font-bold">{item.master_status}</strong>
                            </p>
                          )}
                        </div>
                      </div>

                      <Link
                        to={`/complaints/${item.master_complaint_id}`}
                        className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-[11px] whitespace-nowrap shadow-md shadow-purple-500/20 transition"
                      >
                        View Master
                      </Link>
                    </div>
                  )}

                  {item.is_master_complaint && (
                    <div className="p-2.5 mb-4 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-xs text-indigo-200 flex items-center gap-2">
                      <GitMerge className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                      <span>
                        <strong>Master Civic Issue</strong> • Consolidating {item.merged_complaint_ids?.length || 0} citizen reports
                      </span>
                    </div>
                  )}
                </div>

                {/* Footer Dates & Action */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2 text-[11px] text-slate-400">
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
                    className="inline-flex items-center gap-1.5 text-sky-400 hover:text-sky-300 font-semibold text-xs group-hover:translate-x-0.5 transition"
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
