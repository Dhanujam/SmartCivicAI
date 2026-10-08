import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  FolderOpen,
  BarChart3,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ShieldAlert,
  ArrowRight,
  Loader2,
  RefreshCw,
  Flame,
  FileText,
  GitMerge,
  Layers,
} from 'lucide-react';
import { api } from '../../services/api';

export default function AdminDashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [recentComplaints, setRecentComplaints] = useState([]);
  const [slaAlerts, setSlaAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [analyticsData, complaintsData, alertsData] = await Promise.all([
        api.getAnalyticsSummary(),
        api.getAdminComplaints({ limit: 6, sort_by: 'newest' }),
        api.getAdminSlaAlerts(6).catch(() => []),
      ]);
      setAnalytics(analyticsData);
      setRecentComplaints(complaintsData);
      setSlaAlerts(alertsData || []);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError('Failed to fetch municipal operational metrics. Please verify backend connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'IN_PROGRESS':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      case 'COMPLETED':
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
      case 'REJECTED':
        return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
      case 'MERGED':
        return 'bg-purple-500/15 text-purple-300 border-purple-500/30';
      case 'REQUESTED':
      default:
        return 'bg-sky-500/15 text-sky-300 border-sky-500/30';
    }
  };

  const getSlaBadge = (slaStatus, completedLate) => {
    switch (slaStatus) {
      case 'BREACHED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
            <span>🔴</span>
            <span>Breached</span>
          </span>
        );
      case 'DUE_SOON':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <span>🟡</span>
            <span>Due Soon</span>
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            <span>✓</span>
            <span>{completedLate ? 'Completed (Late)' : 'Completed'}</span>
          </span>
        );
      case 'WITHIN_SLA':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            <span>🟢</span>
            <span>Within SLA</span>
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto py-16 text-center">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mx-auto mb-3" />
        <p className="text-sm text-slate-400">Loading municipal operational metrics from MongoDB Atlas...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto py-6 space-y-8 animate-fadeIn">
      {/* Top Header */}
      <div className="glass-panel rounded-2xl p-6 sm:p-8 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-semibold mb-2">
            <Building2 className="w-3.5 h-3.5" />
            Government Administration
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Municipal Command & Triage Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time municipal triage tracking, department routing, and field operations overview
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchDashboardData}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 text-xs font-semibold border border-slate-700 transition"
            title="Refresh metrics"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>

          <Link
            to="/admin/complaints"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-500/25 transition"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>Manage Complaints</span>
          </Link>
        </div>
      </div>

      {/* Requirement 12 & 13: REAL MONGODB DASHBOARD METRIC CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-9 gap-3 sm:gap-4">
        {/* Total Complaints */}
        <div className="glass-card rounded-2xl p-4 sm:p-5 border border-slate-800 flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5 mb-2">
            <FileText className="w-3.5 h-3.5 text-sky-400" />
            Total
          </span>
          <span className="text-2xl sm:text-3xl font-black text-white">
            {analytics?.total_complaints || 0}
          </span>
          <span className="text-[10px] text-slate-500 mt-1">All civic reports</span>
        </div>

        {/* Requested */}
        <div className="glass-card rounded-2xl p-4 sm:p-5 border border-slate-800 flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5 mb-2">
            <Clock className="w-3.5 h-3.5 text-sky-400" />
            Requested
          </span>
          <span className="text-2xl sm:text-3xl font-black text-sky-400">
            {analytics?.requested || 0}
          </span>
          <span className="text-[10px] text-slate-500 mt-1">Pending triage</span>
        </div>

        {/* In Progress */}
        <div className="glass-card rounded-2xl p-4 sm:p-5 border border-slate-800 flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5 mb-2">
            <Building2 className="w-3.5 h-3.5 text-amber-400" />
            In Progress
          </span>
          <span className="text-2xl sm:text-3xl font-black text-amber-400">
            {analytics?.in_progress || 0}
          </span>
          <span className="text-[10px] text-slate-500 mt-1">Field active</span>
        </div>

        {/* Completed */}
        <div className="glass-card rounded-2xl p-4 sm:p-5 border border-slate-800 flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5 mb-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Completed
          </span>
          <span className="text-2xl sm:text-3xl font-black text-emerald-400">
            {analytics?.completed || 0}
          </span>
          <span className="text-[10px] text-slate-500 mt-1">Resolved</span>
        </div>

        {/* High Priority */}
        <div className="glass-card rounded-2xl p-4 sm:p-5 border border-slate-800 flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5 mb-2">
            <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />
            High Priority
          </span>
          <span className="text-2xl sm:text-3xl font-black text-orange-400">
            {analytics?.high_priority || 0}
          </span>
          <span className="text-[10px] text-slate-500 mt-1">Score &gt;= 70</span>
        </div>

        {/* Critical */}
        <div className="glass-card rounded-2xl p-4 sm:p-5 border border-slate-800 flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5 mb-2">
            <Flame className="w-3.5 h-3.5 text-rose-400" />
            Critical
          </span>
          <span className="text-2xl sm:text-3xl font-black text-rose-400">
            {analytics?.critical || 0}
          </span>
          <span className="text-[10px] text-slate-500 mt-1">Immediate danger</span>
        </div>

        {/* Requirements 13 & 14: Duplicate Groups KPI */}
        <div className="glass-card rounded-2xl p-4 sm:p-5 border border-purple-500/30 bg-purple-950/20 flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-purple-300 flex items-center gap-1.5 mb-2">
            <GitMerge className="w-3.5 h-3.5 text-purple-400" />
            Duplicates
          </span>
          <span className="text-2xl sm:text-3xl font-black text-purple-200">
            {analytics?.duplicate_groups ?? 0}
          </span>
          <span className="text-[10px] text-purple-400 mt-1 font-medium">
            Master Groups
          </span>
        </div>

        {/* Stretch Goal 2: SLA Breached KPI */}
        <div className="glass-card rounded-2xl p-4 sm:p-5 border border-rose-500/40 bg-rose-950/30 flex flex-col justify-between">
          <span className="text-[11px] font-bold text-rose-300 flex items-center gap-1 mb-2">
            <span>🚨</span>
            <span>SLA Breached</span>
          </span>
          <span className="text-2xl sm:text-3xl font-black text-rose-200">
            {analytics?.sla_breached ?? 0}
          </span>
          <span className="text-[10px] text-rose-400 mt-1 font-medium">
            Requires attention
          </span>
        </div>

        {/* Stretch Goal 2: Due Soon KPI */}
        <div className="glass-card rounded-2xl p-4 sm:p-5 border border-amber-500/40 bg-amber-950/30 flex flex-col justify-between">
          <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1 mb-2">
            <span>⚠️</span>
            <span>Due Soon</span>
          </span>
          <span className="text-2xl sm:text-3xl font-black text-amber-200">
            {analytics?.sla_due_soon ?? 0}
          </span>
          <span className="text-[10px] text-amber-400 mt-1 font-medium">
            Approaching SLA
          </span>
        </div>
      </div>

      {/* Requirement 16: ATTENTION REQUIRED - SLA ALERT SECTION */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-400" />
            <h2 className="text-base font-extrabold text-white tracking-tight uppercase">
              Attention Required
            </h2>
            <span className="hidden sm:inline text-xs text-slate-400">
              (Prototype SLA Critical & Approaching Deadlines)
            </span>
          </div>
          <Link
            to="/admin/complaints"
            className="text-xs font-semibold text-rose-400 hover:text-rose-300 flex items-center gap-1"
          >
            <span>View All Operational Issues</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {slaAlerts.length === 0 ? (
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>All active civic complaints are currently within prototype SLA resolution windows.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {slaAlerts.slice(0, 6).map((alert) => {
              const isBreached = alert.sla_status === 'BREACHED';
              return (
                <div
                  key={alert.id || alert.complaint_id}
                  className={`p-4 rounded-xl border flex flex-col justify-between gap-3 transition ${
                    isBreached
                      ? 'bg-rose-950/20 border-rose-500/40 hover:border-rose-500/70'
                      : 'bg-amber-950/20 border-amber-500/40 hover:border-amber-500/70'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{isBreached ? '🚨' : '🟡'}</span>
                      <span className="font-mono font-bold text-xs text-white">
                        {alert.complaint_id || alert.id}
                      </span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        isBreached
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      }`}
                    >
                      {isBreached ? 'SLA BREACHED' : 'DUE SOON'}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold text-slate-200 line-clamp-1">
                      {alert.ai_analysis?.problem_summary || alert.description}
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-2">
                      <span className="font-semibold text-slate-300">
                        {alert.ai_analysis?.urgency || 'HIGH'}
                      </span>
                      <span>•</span>
                      <span className={isBreached ? 'text-rose-300 font-semibold' : 'text-amber-300 font-semibold'}>
                        {alert.sla_remaining_text || (isBreached ? 'Overdue' : 'Approaching SLA')}
                      </span>
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
                    <span className="text-[10px] text-slate-500 font-mono">
                      Priority: {alert.ai_analysis?.priority_score ?? 50}
                    </span>
                    <Link
                      to={`/admin/complaints/${alert.complaint_id || alert.id}`}
                      className={`text-xs font-bold flex items-center gap-1 ${
                        isBreached ? 'text-rose-400 hover:text-rose-300' : 'text-amber-400 hover:text-amber-300'
                      }`}
                    >
                      <span>View Complaint</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Breakdowns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Categories Breakdown */}
        <div className="glass-panel rounded-2xl p-6 border border-slate-800">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-sky-400" />
            Complaints by Civic Category
          </h3>
          <div className="space-y-3">
            {analytics?.category_breakdown &&
              Object.entries(analytics.category_breakdown).map(([cat, count]) => {
                const percent = Math.round(
                  (count / (analytics.total_complaints || 1)) * 100
                );
                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300 font-medium">{cat}</span>
                      <span className="text-slate-400 font-mono">
                        {count} ({percent}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-sky-500 to-indigo-500"
                        style={{ width: `${Math.max(5, percent)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Departments Breakdown */}
        <div className="glass-panel rounded-2xl p-6 border border-slate-800">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-400" />
            Complaints Routed by Department
          </h3>
          <div className="space-y-3">
            {analytics?.department_breakdown &&
              Object.entries(analytics.department_breakdown).map(([dept, count]) => {
                const percent = Math.round(
                  (count / (analytics.total_complaints || 1)) * 100
                );
                return (
                  <div key={dept} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300 font-medium truncate max-w-[240px]">
                        {dept}
                      </span>
                      <span className="text-slate-400 font-mono">
                        {count} ({percent}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
                        style={{ width: `${Math.max(5, percent)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* Recent Complaints Table */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-sky-400" />
            Recent Civic Submissions
          </h3>
          <Link
            to="/admin/complaints"
            className="text-xs font-semibold text-sky-400 hover:text-sky-300 flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                <th className="py-2.5 px-3">Complaint ID</th>
                <th className="py-2.5 px-3">Citizen</th>
                <th className="py-2.5 px-3">Problem Summary</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Priority</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">SLA</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {recentComplaints.map((c) => (
                <tr key={c.id} className="hover:bg-slate-900/60 transition">
                  <td className="py-3 px-3 font-mono font-bold whitespace-nowrap">
                    <div className="flex flex-col gap-0.5 items-start">
                      <span className="text-sky-400">{c.complaint_id || c.id}</span>
                      {c.is_master_complaint && (
                        <span className="text-[9px] font-bold text-indigo-300 bg-indigo-500/20 border border-indigo-500/40 px-1.5 py-0.5 rounded-full">
                          MASTER • {c.merged_complaint_ids?.length || 0}
                        </span>
                      )}
                      {c.status === 'MERGED' && (
                        <span className="text-[9px] font-bold text-purple-300 bg-purple-500/20 border border-purple-500/40 px-1.5 py-0.5 rounded-full">
                          MERGED
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-slate-300 font-medium whitespace-nowrap">
                    {c.citizen_name || 'Anonymous'}
                  </td>
                  <td className="py-3 px-3 text-slate-200 max-w-xs truncate">
                    {c.ai_analysis?.problem_summary || c.description}
                  </td>
                  <td className="py-3 px-3 text-slate-400 whitespace-nowrap">
                    {c.ai_analysis?.category || 'Civic'}
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-bold text-slate-200 font-mono">
                      {c.ai_analysis?.priority_score ?? 50}
                    </span>
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(
                        c.status
                      )}`}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap">
                    {getSlaBadge(c.sla_status, c.sla_completed_late)}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <Link
                      to={`/admin/complaints/${c.complaint_id || c.id}`}
                      className="text-indigo-400 hover:text-indigo-300 font-semibold"
                    >
                      Manage
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
