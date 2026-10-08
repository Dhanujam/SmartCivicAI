import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FolderOpen,
  Search,
  Filter,
  SlidersHorizontal,
  AlertTriangle,
  ArrowUpDown,
  Building2,
  Calendar,
  Loader2,
  AlertCircle,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { api } from '../../services/api';

export default function AdminComplaintsPage() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter & Search States
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [urgencyFilter, setUrgencyFilter] = useState('ALL');
  const [slaFilter, setSlaFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('priority');

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {
        sort_by: sortBy,
      };
      if (search.trim()) params.search = search.trim();
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (categoryFilter !== 'ALL') params.category = categoryFilter;
      if (urgencyFilter !== 'ALL') params.urgency = urgencyFilter;
      if (slaFilter !== 'ALL') params.sla_status = slaFilter;

      const data = await api.getAdminComplaints(params);
      setComplaints(data);
    } catch (err) {
      console.error('Failed to load admin complaints:', err);
      setError('Failed to fetch municipal complaints. Please check your privileges.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, [statusFilter, categoryFilter, urgencyFilter, slaFilter, sortBy]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchComplaints();
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'IN_PROGRESS':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'COMPLETED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'REJECTED':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'MERGED':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'REQUESTED':
      default:
        return 'bg-blue-50 text-blue-700 border-blue-200';
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

  const getSlaBadge = (slaStatus, completedLate) => {
    switch (slaStatus) {
      case 'BREACHED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
            <span>Breached</span>
          </span>
        );
      case 'DUE_SOON':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            <span>Due Soon</span>
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span>✓</span>
            <span>{completedLate ? 'Completed (Late)' : 'Completed'}</span>
          </span>
        );
      case 'WITHIN_SLA':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Within SLA</span>
          </span>
        );
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto py-6 space-y-6">
      {/* Top Header */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold mb-2">
            <FolderOpen className="w-3.5 h-3.5 text-blue-600" />
            Municipal Master Registry
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            All Civic Complaints
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Search, triage, prioritize, and update resolution lifecycle across all citizen submissions
          </p>
        </div>

        <button
          onClick={fetchComplaints}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 shadow-sm transition"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Complaint ID, citizen, landmark, problem description..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-sm flex items-center gap-1.5"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search</span>
          </button>
        </form>

        {/* Filter Dropdowns Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
          {/* Status Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="REQUESTED">REQUESTED</option>
              <option value="IN_PROGRESS">IN PROGRESS</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="REJECTED">REJECTED</option>
              <option value="MERGED">MERGED</option>
            </select>
          </div>

          {/* SLA Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">SLA Status</label>
            <select
              value={slaFilter}
              onChange={(e) => setSlaFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All SLA Statuses</option>
              <option value="WITHIN_SLA">🟢 Within SLA</option>
              <option value="DUE_SOON">🟡 Due Soon</option>
              <option value="BREACHED">🔴 Breached</option>
              <option value="COMPLETED">✓ Completed</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Categories</option>
              <option value="Roads & Infrastructure">Roads & Infrastructure</option>
              <option value="Waste Management">Waste Management</option>
              <option value="Water Supply">Water Supply</option>
              <option value="Electricity & Streetlights">Electricity & Streetlights</option>
              <option value="Drainage & Sewage">Drainage & Sewage</option>
              <option value="Public Safety">Public Safety</option>
              <option value="Traffic & Transportation">Traffic & Transportation</option>
              <option value="Parks & Public Spaces">Parks & Public Spaces</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Urgency Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Urgency</label>
            <select
              value={urgencyFilter}
              onChange={(e) => setUrgencyFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Urgencies</option>
              <option value="CRITICAL">CRITICAL</option>
              <option value="HIGH">HIGH</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="LOW">LOW</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500"
            >
              <option value="priority">Priority (Highest first)</option>
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-500">Loading municipal complaints table...</p>
        </div>
      )}

      {/* Error Alert */}
      {error && !loading && (
        <div className="p-5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-3 shadow-sm">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {/* Table */}
      {!loading && !error && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Showing {complaints.length} municipal records</span>
            <span className="font-mono text-slate-400">FastAPI • MongoDB Atlas</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Complaint ID</th>
                  <th className="py-3.5 px-4">Citizen</th>
                  <th className="py-3.5 px-4">Problem</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Department</th>
                  <th className="py-3.5 px-4">Urgency</th>
                  <th className="py-3.5 px-4">Priority</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">SLA</th>
                  <th className="py-3.5 px-4">Duplicates</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {complaints.length === 0 ? (
                  <tr>
                    <td colSpan="11" className="py-12 text-center text-slate-400 text-sm">
                      No complaints match the current filter criteria.
                    </td>
                  </tr>
                ) : (
                  complaints.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition group">
                      <td className="py-3.5 px-4 font-mono font-bold whitespace-nowrap">
                        <div className="flex flex-col gap-1 items-start">
                          <span className="text-blue-600">{c.complaint_id || c.id}</span>
                          {c.is_master_complaint && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                              MASTER • {c.merged_complaint_ids?.length || 0} REPORTS
                            </span>
                          )}
                          {c.status === 'MERGED' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full">
                              MERGED → {c.master_complaint_id}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-slate-800 whitespace-nowrap">
                        {c.citizen_name || 'Anonymous'}
                      </td>

                      <td className="py-3.5 px-4 max-w-xs truncate text-slate-700">
                        {c.ai_analysis?.problem_summary || c.description}
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                        {c.ai_analysis?.category || 'Civic'}
                      </td>

                      <td className="py-3.5 px-4 text-slate-700 max-w-[160px] truncate font-medium">
                        {c.ai_analysis?.department || 'Unassigned'}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-md font-bold text-[10px] border ${getUrgencyBadge(
                            c.ai_analysis?.urgency
                          )}`}
                        >
                          {c.ai_analysis?.urgency || 'MEDIUM'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {c.ai_analysis?.priority_score ?? 50}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex flex-col gap-0.5 items-start">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(
                              c.status
                            )}`}
                          >
                            {c.status}
                          </span>
                          {c.status === 'MERGED' && c.master_complaint_id && (
                            <span className="text-[10px] text-slate-500 font-mono">
                              Master: {c.master_complaint_id}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* SLA Column */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex flex-col gap-0.5 items-start">
                          {getSlaBadge(c.sla_status, c.sla_completed_late)}
                          {c.sla_remaining_text && (
                            <span className="text-[10px] text-slate-500">
                              {c.sla_remaining_text}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Duplicate Indicator */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {c.duplicate_found ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold">
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            <span>
                              {c.duplicate_complaint_ids?.length || 1} Related
                            </span>
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <Link
                          to={`/admin/complaints/${c.complaint_id || c.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View & Triage</span>
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
