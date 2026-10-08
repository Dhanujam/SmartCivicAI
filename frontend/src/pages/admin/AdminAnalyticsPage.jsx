import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Building2,
  PieChart,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Flame,
  FileText,
  Loader2,
  RefreshCw,
  TrendingUp,
  GitMerge,
} from 'lucide-react';
import { api } from '../../services/api';

export default function AdminAnalyticsPage() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getAnalyticsSummary();
      setAnalytics(data);
    } catch (err) {
      console.error('Failed to load analytics:', err);
      setError('Failed to fetch analytics from backend service.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto py-16 text-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
        <p className="text-sm font-medium text-slate-500">Computing real-time municipal aggregations in database...</p>
      </div>
    );
  }

  const total = analytics?.total_complaints || 0;

  return (
    <div className="w-full max-w-7xl mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold mb-2">
            <BarChart3 className="w-3.5 h-3.5 text-blue-600" />
            Municipal Intelligence & Analytics
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Civic Operations Analytics
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Real MongoDB aggregation metrics on issue volume, department workload, and resolution velocities
          </p>
        </div>

        <button
          onClick={fetchAnalytics}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 shadow-sm transition"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
          <span>Refresh Analytics</span>
        </button>
      </div>

      {/* Top KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-9 gap-3">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Total</span>
          <span className="text-2xl font-black text-slate-900">{total}</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Requested</span>
          <span className="text-2xl font-black text-blue-600">{analytics?.requested || 0}</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">In Progress</span>
          <span className="text-2xl font-black text-amber-600">{analytics?.in_progress || 0}</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Completed</span>
          <span className="text-2xl font-black text-emerald-600">{analytics?.completed || 0}</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">High Priority</span>
          <span className="text-2xl font-black text-orange-600">{analytics?.high_priority || 0}</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-rose-200 shadow-sm bg-rose-50/30">
          <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider block mb-1">Critical</span>
          <span className="text-2xl font-black text-rose-600">{analytics?.critical || 0}</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-purple-200 shadow-sm bg-purple-50/30">
          <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider block mb-1 flex items-center gap-1">
            <GitMerge className="w-3 h-3 text-purple-600" />
            Duplicates
          </span>
          <span className="text-2xl font-black text-purple-700">{analytics?.duplicate_groups ?? 0}</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-rose-200 shadow-sm bg-rose-50/40">
          <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider block mb-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
            SLA Breached
          </span>
          <span className="text-2xl font-black text-rose-600">{analytics?.sla_breached || 0}</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-amber-200 shadow-sm bg-amber-50/40">
          <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block mb-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            Due Soon
          </span>
          <span className="text-2xl font-black text-amber-600">{analytics?.sla_due_soon || 0}</span>
        </div>
      </div>

      {/* SLA PERFORMANCE PANEL */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                SLA Performance & Resolution Adherence
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Prototype SLA compliance metrics derived dynamically from live municipal response times
              </p>
            </div>
          </div>

          <span className="text-[11px] font-mono text-slate-600 bg-slate-50 px-3 py-1 rounded-full border border-slate-200">
            Real Database Aggregations
          </span>
        </div>

        {total === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-slate-50 border border-slate-200 text-slate-500 text-xs">
            No civic complaints currently logged. SLA performance indicators will generate automatically.
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 flex flex-col justify-between">
                <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5 mb-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Within SLA Target</span>
                </span>
                <span className="text-3xl font-black text-emerald-700">
                  {analytics?.sla_performance?.within_percent ?? 0}%
                </span>
                <span className="text-[11px] text-emerald-600 mt-1 font-mono">
                  {analytics?.sla_within || 0} active complaints
                </span>
              </div>

              <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200 flex flex-col justify-between">
                <span className="text-xs font-bold text-amber-800 flex items-center gap-1.5 mb-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <span>Due Soon</span>
                </span>
                <span className="text-3xl font-black text-amber-700">
                  {analytics?.sla_performance?.due_soon_percent ?? 0}%
                </span>
                <span className="text-[11px] text-amber-600 mt-1 font-mono">
                  {analytics?.sla_due_soon || 0} active complaints
                </span>
              </div>

              <div className="p-4 rounded-xl bg-rose-50/60 border border-rose-200 flex flex-col justify-between">
                <span className="text-xs font-bold text-rose-800 flex items-center gap-1.5 mb-1">
                  <span className="w-2 h-2 rounded-full bg-rose-600" />
                  <span>SLA Breached</span>
                </span>
                <span className="text-3xl font-black text-rose-700">
                  {analytics?.sla_performance?.breached_percent ?? 0}%
                </span>
                <span className="text-[11px] text-rose-600 mt-1 font-mono">
                  {analytics?.sla_breached || 0} active complaints
                </span>
              </div>
            </div>

            {/* Visual Distribution Bar */}
            {analytics?.sla_performance?.total_active > 0 ? (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-slate-600">
                  <span className="font-semibold">Active Resolution Adherence Distribution</span>
                  <span className="font-mono text-slate-500">
                    Total Active Triage: {analytics?.sla_performance?.total_active}
                  </span>
                </div>
                <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden flex">
                  <div
                    style={{ width: `${analytics?.sla_performance?.within_percent || 0}%` }}
                    className="bg-emerald-500 h-full transition-all"
                    title={`Within SLA: ${analytics?.sla_performance?.within_percent}%`}
                  />
                  <div
                    style={{ width: `${analytics?.sla_performance?.due_soon_percent || 0}%` }}
                    className="bg-amber-500 h-full transition-all"
                    title={`Due Soon: ${analytics?.sla_performance?.due_soon_percent}%`}
                  />
                  <div
                    style={{ width: `${analytics?.sla_performance?.breached_percent || 0}%` }}
                    className="bg-rose-500 h-full transition-all"
                    title={`Breached: ${analytics?.sla_performance?.breached_percent}%`}
                  />
                </div>
                <div className="flex items-center gap-4 text-[11px] text-slate-600 pt-1">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Within SLA ({analytics?.sla_performance?.within_percent}%)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    Due Soon ({analytics?.sla_performance?.due_soon_percent}%)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    Breached ({analytics?.sla_performance?.breached_percent}%)
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-2 text-xs text-slate-500">
                All currently reported issues have been closed or resolved.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Charts / Distribution Grids */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Complaints by Category */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            Complaints by Civic Category
          </h3>
          <div className="space-y-3">
            {analytics?.category_breakdown &&
              Object.entries(analytics.category_breakdown).map(([cat, count]) => {
                const pct = Math.round((count / (total || 1)) * 100);
                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-700 font-semibold">{cat}</span>
                      <span className="text-slate-500 font-mono">
                        {count} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-blue-600"
                        style={{ width: `${Math.max(5, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Complaints by Department */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-teal-600" />
            Complaints Routed by Department
          </h3>
          <div className="space-y-3">
            {analytics?.department_breakdown &&
              Object.entries(analytics.department_breakdown).map(([dept, count]) => {
                const pct = Math.round((count / (total || 1)) * 100);
                return (
                  <div key={dept} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-700 font-semibold truncate max-w-[240px]">
                        {dept}
                      </span>
                      <span className="text-slate-500 font-mono">
                        {count} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-teal-500"
                        style={{ width: `${Math.max(5, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Complaints by Urgency Level */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            Complaints by Urgency Triage Level
          </h3>
          <div className="space-y-3">
            {analytics?.urgency_breakdown &&
              Object.entries(analytics.urgency_breakdown).map(([urgency, count]) => {
                const pct = Math.round((count / (total || 1)) * 100);
                let color = 'bg-emerald-500';
                if (urgency === 'CRITICAL') color = 'bg-rose-500';
                else if (urgency === 'HIGH') color = 'bg-orange-500';
                else if (urgency === 'MEDIUM') color = 'bg-amber-500';

                return (
                  <div key={urgency} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-700 font-bold">{urgency}</span>
                      <span className="text-slate-500 font-mono">
                        {count} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${color}`}
                        style={{ width: `${Math.max(5, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Complaints by Status */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <PieChart className="w-4 h-4 text-blue-600" />
            Complaints by Lifecycle Status
          </h3>
          <div className="space-y-3">
            {analytics?.status_chart &&
              Object.entries(analytics.status_chart).map(([status, count]) => {
                const pct = Math.round((count / (total || 1)) * 100);
                let color = 'bg-blue-600';
                if (status === 'IN_PROGRESS') color = 'bg-amber-500';
                else if (status === 'COMPLETED') color = 'bg-emerald-500';
                else if (status === 'REJECTED') color = 'bg-rose-500';

                return (
                  <div key={status} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-700 font-bold">{status}</span>
                      <span className="text-slate-500 font-mono">
                        {count} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${color}`}
                        style={{ width: `${Math.max(5, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
}
