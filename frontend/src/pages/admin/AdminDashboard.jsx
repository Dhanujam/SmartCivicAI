import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Search,
  MapPin,
  TrendingUp,
  Activity,
  Filter,
  Calendar,
  ChevronRight,
  Info,
  Eye,
  Compass,
  Crosshair,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sparkles,
  Layers,
  Wrench,
  Check,
  Bell,
  SlidersHorizontal,
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function AdminDashboard() {
  const { user } = useAuth();

  // Primary Data States
  const [analytics, setAnalytics] = useState(null);
  const [allComplaints, setAllComplaints] = useState([]);
  const [slaAlerts, setSlaAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Filter & Search Controls
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [trendTimeRange, setTrendTimeRange] = useState('30D'); // 7D, 30D, 90D

  // Heatmap Interaction States
  const [selectedClusterId, setSelectedClusterId] = useState(null);
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [mapZoom, setMapZoom] = useState(1);
  const [riskFilter, setRiskFilter] = useState('ALL'); // ALL, CRITICAL, HIGH, MEDIUM, LOW

  const fetchDashboardData = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      // Fetch analytics summary, complaints registry (up to 200), and SLA alerts
      const [analyticsData, complaintsData, alertsData] = await Promise.all([
        api.getAnalyticsSummary(),
        api.getAdminComplaints({ limit: 200, sort_by: 'newest' }),
        api.getAdminSlaAlerts(12).catch(() => []),
      ]);

      setAnalytics(analyticsData);
      setAllComplaints(complaintsData || []);
      setSlaAlerts(alertsData || []);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError('Failed to fetch municipal operational metrics. Please verify backend connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Filtered complaints based on search query, category, and status filters
  const filteredComplaints = useMemo(() => {
    return allComplaints.filter((c) => {
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const cid = (c.complaint_id || c.id || '').toLowerCase();
        const desc = (c.description || '').toLowerCase();
        const summary = (c.ai_analysis?.problem_summary || '').toLowerCase();
        const loc = (c.location_address || c.ai_analysis?.location || '').toLowerCase();
        const citizen = (c.citizen_name || '').toLowerCase();
        if (!cid.includes(q) && !desc.includes(q) && !summary.includes(q) && !loc.includes(q) && !citizen.includes(q)) {
          return false;
        }
      }

      // Category filter
      if (categoryFilter !== 'ALL') {
        const cat = c.ai_analysis?.category || 'Other';
        if (cat !== categoryFilter) return false;
      }

      // Status filter
      if (statusFilter !== 'ALL') {
        if (c.status !== statusFilter) return false;
      }

      return true;
    });
  }, [allComplaints, searchQuery, categoryFilter, statusFilter]);

  // Extract Neighborhood/Area Name helper
  const getAreaName = (c) => {
    const raw = c.location_address || c.ai_analysis?.location || '';
    if (!raw) return 'Central Ward';

    // Parse area from comma-delimited strings like:
    // "Ward 144, Zone 11 Valasaravakkam, Maduravoyal, Chennai" -> "Valasaravakkam"
    const parts = raw.split(',').map((p) => p.trim());
    if (parts.length > 2) {
      // Look for neighborhood token
      for (const p of parts) {
        if (p.includes('Valasaravakkam')) return 'Valasaravakkam';
        if (p.includes('Ambattur')) return 'Ambattur';
        if (p.includes('Maduravoyal')) return 'Maduravoyal';
        if (p.includes('T. Nagar') || p.includes('T Nagar')) return 'T. Nagar';
        if (p.includes('Sector')) return p;
        if (p.includes('Zone')) return p;
      }
      return parts[1] || parts[0];
    }
    return parts[0] || 'Municipal Area';
  };

  // Geospatial Heatmap Cluster Computation from Real Complaints
  const heatmapClusters = useMemo(() => {
    if (!allComplaints.length) return [];

    // Valid coordinate points
    const pointsWithCoords = allComplaints.map((c, index) => {
      let lat = c.latitude;
      let lng = c.longitude;
      const area = getAreaName(c);

      // Deterministic layout coordinates if lat/lng are missing
      if (lat === null || lat === undefined || isNaN(lat)) {
        // Hash area name to deterministic coordinates within municipal map bounds
        let hash = 0;
        for (let i = 0; i < area.length; i++) {
          hash = (hash << 5) - hash + area.charCodeAt(i);
          hash |= 0;
        }
        const angle = Math.abs(hash % 360) * (Math.PI / 180);
        const radius = 0.025 + (Math.abs(hash % 50) / 1000);
        // Base around Chennai civic center coordinates
        lat = 13.075 + Math.sin(angle) * radius;
        lng = 80.170 + Math.cos(angle) * radius;
      }

      return {
        id: c.complaint_id || c.id || `pt-${index}`,
        complaint: c,
        lat: Number(lat),
        lng: Number(lng),
        area,
        category: c.ai_analysis?.category || 'Civic Infrastructure',
        urgency: c.ai_analysis?.urgency || 'MEDIUM',
        priority: c.ai_analysis?.priority_score ?? 50,
        status: c.status || 'REQUESTED',
        slaStatus: c.sla_status || 'WITHIN_SLA',
      };
    });

    // Compute bounding box
    const lats = pointsWithCoords.map((p) => p.lat);
    const lngs = pointsWithCoords.map((p) => p.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const latSpan = maxLat - minLat || 0.05;
    const lngSpan = maxLng - minLng || 0.05;

    // Project into SVG 800 x 480 viewBox
    const projectedPoints = pointsWithCoords.map((p) => {
      const normX = (p.lng - minLng) / lngSpan;
      const normY = (p.lat - minLat) / latSpan;
      // Invert Y for screen coordinates (north is up)
      const x = Math.round(70 + normX * 660);
      const y = Math.round(410 - normY * 340);
      return { ...p, x, y };
    });

    // Group into spatial neighborhood clusters
    const clusterMap = new Map();
    projectedPoints.forEach((p) => {
      const key = p.area;
      if (!clusterMap.has(key)) {
        clusterMap.set(key, {
          id: `cluster-${key.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
          areaName: key,
          points: [],
          x: p.x,
          y: p.y,
        });
      }
      const cl = clusterMap.get(key);
      cl.points.push(p);
    });

    // Calculate cluster centroids, density, categories, and risks
    const clusters = Array.from(clusterMap.values()).map((cl) => {
      const count = cl.points.length;
      const avgX = Math.round(cl.points.reduce((sum, p) => sum + p.x, 0) / count);
      const avgY = Math.round(cl.points.reduce((sum, p) => sum + p.y, 0) / count);

      // Top category
      const catCounts = {};
      cl.points.forEach((p) => {
        catCounts[p.category] = (catCounts[p.category] || 0) + 1;
      });
      const topCategory = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Infrastructure';

      // Open and Breached counts
      const openCount = cl.points.filter((p) => p.status !== 'COMPLETED').length;
      const breachedCount = cl.points.filter((p) => p.slaStatus === 'BREACHED').length;
      const avgPriority = Math.round(cl.points.reduce((sum, p) => sum + p.priority, 0) / count);

      // Density level
      let density = 'LOW';
      let densityColor = '#3B82F6'; // Blue
      let bgGrad = 'rgba(59, 130, 246, 0.25)';

      if (count >= 10 || breachedCount >= 3) {
        density = 'CRITICAL';
        densityColor = '#DC2626'; // Red
        bgGrad = 'rgba(220, 38, 38, 0.35)';
      } else if (count >= 6 || avgPriority >= 75) {
        density = 'HIGH';
        densityColor = '#EA580C'; // Orange
        bgGrad = 'rgba(234, 88, 12, 0.3)';
      } else if (count >= 3) {
        density = 'MEDIUM';
        densityColor = '#F59E0B'; // Amber
        bgGrad = 'rgba(245, 158, 11, 0.25)';
      }

      return {
        id: cl.id,
        areaName: cl.areaName,
        x: avgX,
        y: avgY,
        count,
        density,
        densityColor,
        bgGrad,
        topCategory,
        openCount,
        breachedCount,
        avgPriority,
        points: cl.points,
      };
    });

    // Sort by count descending so highest density zones are first
    return clusters.sort((a, b) => b.count - a.count);
  }, [allComplaints]);

  // Selected or Top Hotspot Cluster for Side Panel
  const activeCluster = useMemo(() => {
    if (!heatmapClusters.length) return null;
    if (selectedClusterId) {
      const found = heatmapClusters.find((c) => c.id === selectedClusterId);
      if (found) return found;
    }
    // Default to #1 Most Affected Area
    return heatmapClusters[0];
  }, [heatmapClusters, selectedClusterId]);

  // Filtered heatmap clusters based on risk filter
  const visibleClusters = useMemo(() => {
    if (riskFilter === 'ALL') return heatmapClusters;
    return heatmapClusters.filter((c) => c.density === riskFilter);
  }, [heatmapClusters, riskFilter]);

  // Complaint Trends Computation (Real Timestamps)
  const trendData = useMemo(() => {
    if (!allComplaints.length) return [];

    const daysCount = trendTimeRange === '7D' ? 7 : trendTimeRange === '30D' ? 30 : 90;
    const now = new Date();
    const dateMap = {};

    // Initialize days
    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dateMap[key] = { key, label, total: 0, completed: 0, in_progress: 0, requested: 0 };
    }

    // Aggregate real complaint timestamps
    allComplaints.forEach((c) => {
      const ts = c.created_at || c.updated_at;
      if (!ts) return;
      const key = new Date(ts).toISOString().split('T')[0];
      if (dateMap[key]) {
        dateMap[key].total += 1;
        if (c.status === 'COMPLETED') dateMap[key].completed += 1;
        else if (c.status === 'IN_PROGRESS') dateMap[key].in_progress += 1;
        else dateMap[key].requested += 1;
      }
    });

    // Cumulative progression if dataset is sparse
    const dates = Object.values(dateMap);
    let cumulative = 0;
    dates.forEach((d) => {
      cumulative += d.total;
      d.cumulativeTotal = cumulative;
    });

    return dates;
  }, [allComplaints, trendTimeRange]);

  // Priority Distribution Analytics Calculation
  const priorityMetrics = useMemo(() => {
    const total = allComplaints.length || 1;
    let critical = 0;
    let high = 0;
    let medium = 0;
    let low = 0;

    allComplaints.forEach((c) => {
      const score = c.ai_analysis?.priority_score ?? 50;
      const urg = c.ai_analysis?.urgency;
      if (urg === 'CRITICAL' || score >= 85) critical++;
      else if (urg === 'HIGH' || score >= 70) high++;
      else if (urg === 'MEDIUM' || score >= 40) medium++;
      else low++;
    });

    return {
      critical: { count: critical, pct: Math.round((critical / total) * 100) },
      high: { count: high, pct: Math.round((high / total) * 100) },
      medium: { count: medium, pct: Math.round((medium / total) * 100) },
      low: { count: low, pct: Math.round((low / total) * 100) },
    };
  }, [allComplaints]);

  // Department Performance Analytics Calculation
  const departmentMetrics = useMemo(() => {
    const deptMap = {};

    allComplaints.forEach((c) => {
      const dept = c.ai_analysis?.department || 'General Administration';
      if (!deptMap[dept]) {
        deptMap[dept] = { name: dept, total: 0, completed: 0, in_progress: 0, breached: 0 };
      }
      deptMap[dept].total += 1;
      if (c.status === 'COMPLETED') deptMap[dept].completed += 1;
      else if (c.status === 'IN_PROGRESS') deptMap[dept].in_progress += 1;
      if (c.sla_status === 'BREACHED') deptMap[dept].breached += 1;
    });

    return Object.values(deptMap)
      .map((d) => ({
        ...d,
        completionRate: Math.round((d.completed / (d.total || 1)) * 100),
      }))
      .sort((a, b) => b.total - a.total);
  }, [allComplaints]);

  // Attention Required Categorized Lists (SLA Breached, Due Soon, Critical/High Risk)
  const attentionItems = useMemo(() => {
    const breached = allComplaints
      .filter((c) => c.sla_status === 'BREACHED' && c.status !== 'COMPLETED')
      .slice(0, 4);

    const dueSoon = allComplaints
      .filter((c) => c.sla_status === 'DUE_SOON' && c.status !== 'COMPLETED')
      .slice(0, 4);

    const highRisk = allComplaints
      .filter(
        (c) =>
          c.status !== 'COMPLETED' &&
          c.sla_status !== 'BREACHED' &&
          (c.ai_analysis?.urgency === 'CRITICAL' || (c.ai_analysis?.priority_score ?? 0) >= 80)
      )
      .slice(0, 4);

    return { breached, dueSoon, highRisk };
  }, [allComplaints]);

  // Status badge styling
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

  const getSlaBadge = (slaStatus, completedLate) => {
    switch (slaStatus) {
      case 'BREACHED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
            <span>Breached</span>
          </span>
        );
      case 'DUE_SOON':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            <span>Due Soon</span>
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>{completedLate ? 'Completed (Late)' : 'Completed'}</span>
          </span>
        );
      case 'WITHIN_SLA':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Within SLA</span>
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto py-20 text-center">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-800">Initializing Municipal Command Center</h3>
        <p className="text-sm text-slate-500 mt-1">Aggregating live geospatial telemetry, triage queues, and SLA windows...</p>
      </div>
    );
  }

  // Values for the 6 primary KPI cards (Strictly using dynamic real backend data)
  const totalCount = analytics?.total_complaints ?? allComplaints.length;
  const requestedCount = analytics?.requested ?? allComplaints.filter((c) => c.status === 'REQUESTED').length;
  const inProgressCount = analytics?.in_progress ?? allComplaints.filter((c) => c.status === 'IN_PROGRESS').length;
  const completedCount = analytics?.completed ?? allComplaints.filter((c) => c.status === 'COMPLETED').length;
  const overdueCount = analytics?.sla_breached ?? allComplaints.filter((c) => c.sla_status === 'BREACHED').length;
  const dueSoonCount = analytics?.sla_due_soon ?? allComplaints.filter((c) => c.sla_status === 'DUE_SOON').length;

  return (
    <div className="w-full max-w-7xl mx-auto py-6 space-y-6 animate-fadeIn">
      {/* ==================================================
          SECTION 4: DASHBOARD HEADER
      ================================================== */}
      <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold uppercase tracking-wider">
              <Activity className="w-3.5 h-3.5 text-blue-600" />
              Civic Operations Center
            </span>
            <span className="text-[11px] font-mono text-slate-400">Live Telemetry Active</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Government Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-600">
            Real-time civic intelligence for faster municipal action.
          </p>
        </div>

        {/* Right side controls: Search, Filters, Refresh & Profile */}
        <div className="flex items-center flex-wrap gap-2.5 w-full lg:w-auto">
          {/* Quick Search */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by ID, keyword, area..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            />
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 transition"
          >
            <option value="ALL">All Categories</option>
            <option value="Roads & Infrastructure">Roads & Infrastructure</option>
            <option value="Waste Management">Waste Management</option>
            <option value="Water Supply">Water Supply</option>
            <option value="Electricity & Streetlights">Electricity & Lights</option>
            <option value="Drainage & Sewage">Drainage & Sewage</option>
          </select>

          {/* Refresh Button */}
          <button
            onClick={() => fetchDashboardData(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 shadow-sm transition"
            title="Refresh live telemetry"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          {/* Official Profile Badge */}
          <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-200">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-sm">
              GOV
            </div>
            <div className="text-left text-xs leading-tight">
              <span className="block font-bold text-slate-800 truncate max-w-[110px]">
                {user?.name || 'Administrator'}
              </span>
              <span className="text-[10px] text-blue-600 font-semibold uppercase">Official</span>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-center gap-2.5 shadow-sm">
          <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ==================================================
          SECTION 2 & 3: MAIN KPI ROW (ONLY 6 CARDS)
          ❌ Removed High Priority, Critical, Duplicates
      ================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* 1. TOTAL COMPLAINTS */}
        <div className="bg-white rounded-2xl p-4 sm:p-4.5 border border-slate-200 shadow-sm flex flex-col justify-between hover:border-slate-300 transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Total Complaints
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {totalCount}
          </div>
          <span className="text-[10px] text-slate-500 mt-1 font-medium">All civic reports</span>
        </div>

        {/* 2. REQUESTED */}
        <div className="bg-white rounded-2xl p-4 sm:p-4.5 border border-slate-200 shadow-sm flex flex-col justify-between hover:border-slate-300 transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Requested
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-blue-600 tracking-tight">
            {requestedCount}
          </div>
          <span className="text-[10px] text-slate-500 mt-1 font-medium">Pending triage</span>
        </div>

        {/* 3. IN PROGRESS */}
        <div className="bg-white rounded-2xl p-4 sm:p-4.5 border border-slate-200 shadow-sm flex flex-col justify-between hover:border-slate-300 transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              In Progress
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-600 tracking-tight">
            {inProgressCount}
          </div>
          <span className="text-[10px] text-slate-500 mt-1 font-medium">Field active</span>
        </div>

        {/* 4. COMPLETED */}
        <div className="bg-white rounded-2xl p-4 sm:p-4.5 border border-slate-200 shadow-sm flex flex-col justify-between hover:border-slate-300 transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Completed
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600 tracking-tight">
            {completedCount}
          </div>
          <span className="text-[10px] text-slate-500 mt-1 font-medium">Resolved</span>
        </div>

        {/* 5. OVERDUE */}
        <div className="bg-white rounded-2xl p-4 sm:p-4.5 border border-slate-200 shadow-sm flex flex-col justify-between hover:border-rose-300 transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">
              Overdue
            </span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-rose-600 tracking-tight">
            {overdueCount}
          </div>
          <span className="text-[10px] text-rose-600 mt-1 font-medium">SLA breached</span>
        </div>

        {/* 6. DUE SOON */}
        <div className="bg-white rounded-2xl p-4 sm:p-4.5 border border-slate-200 shadow-sm flex flex-col justify-between hover:border-amber-300 transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">
              Due Soon
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-600 tracking-tight">
            {dueSoonCount}
          </div>
          <span className="text-[10px] text-amber-700 mt-1 font-medium">Approaching SLA</span>
        </div>
      </div>

      {/* ==================================================
          SECTION 5 & 6: PRIMARY SECTION —
          CIVIC INCIDENT HEATMAP (60-65%) + INCIDENT INSIGHTS (35-40%)
      ================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Heatmap Area (7 Cols on 12-grid => ~58-62% width) */}
        <div className="lg:col-span-8 bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
          {/* Header & Map Controls */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Compass className="w-5 h-5 text-blue-600" />
                Civic Incident Heatmap
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Complaint concentration and high-risk civic zones
              </p>
            </div>

            {/* Risk Density Filter Tabs */}
            <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200 text-xs">
              {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setRiskFilter(lvl)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition ${
                    riskFilter === lvl
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Geospatial Heatmap Canvas */}
          <div className="relative w-full h-[380px] sm:h-[440px] rounded-xl overflow-hidden bg-slate-50/70 border border-slate-200 select-none">
            {/* Map Grid Background Layers */}
            <svg
              viewBox="0 0 800 480"
              className="w-full h-full object-cover transition-transform duration-300"
              style={{ transform: `scale(${mapZoom})` }}
            >
              <defs>
                {/* Heatmap Gradients */}
                <radialGradient id="gradCritical" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#DC2626" stopOpacity="0.75" />
                  <stop offset="50%" stopColor="#EA580C" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#EA580C" stopOpacity="0" />
                </radialGradient>
                <radialGradient id="gradHigh" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#EA580C" stopOpacity="0.65" />
                  <stop offset="60%" stopColor="#F59E0B" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
                </radialGradient>
                <radialGradient id="gradMedium" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.6" />
                  <stop offset="60%" stopColor="#3B82F6" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
                </radialGradient>
                <radialGradient id="gradLow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.5" />
                  <stop offset="70%" stopColor="#93C5FD" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#93C5FD" stopOpacity="0" />
                </radialGradient>
                {/* Subtle Grid Pattern */}
                <pattern id="civicGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#E2E8F0" strokeWidth="0.8" />
                </pattern>
              </defs>

              {/* Background Grid */}
              <rect width="800" height="480" fill="#F8FAFC" />
              <rect width="800" height="480" fill="url(#civicGrid)" />

              {/* Vector Municipal Arterial Roads & District Outlines */}
              <g stroke="#CBD5E1" strokeWidth="1.5" fill="none" opacity="0.85">
                {/* Main Arterials */}
                <path d="M 40 180 Q 220 160 410 240 T 780 220" strokeWidth="2.5" stroke="#94A3B8" />
                <path d="M 280 40 Q 320 210 390 440" strokeWidth="2" stroke="#94A3B8" />
                <path d="M 120 440 Q 240 310 580 320 T 760 380" strokeWidth="2" stroke="#94A3B8" />
                <path d="M 520 40 Q 510 230 680 440" strokeWidth="1.8" stroke="#94A3B8" />
                {/* Secondary Civic Wards */}
                <path d="M 80 80 Q 220 90 280 200" strokeDasharray="4 3" />
                <path d="M 460 140 Q 620 110 740 160" strokeDasharray="4 3" />
                <path d="M 180 360 Q 360 420 520 380" strokeDasharray="4 3" />
              </g>

              {/* Municipal Zone Labels */}
              <g fill="#94A3B8" fontSize="11" fontFamily="sans-serif" fontWeight="600" opacity="0.85">
                <text x="70" y="70">NORTH SECTOR</text>
                <text x="650" y="70">EAST INDUSTRIAL</text>
                <text x="70" y="440">SOUTH CORRIDOR</text>
                <text x="640" y="440">METRO EXPRESSWAY</text>
                <text x="360" y="60">CENTRAL ZONE</text>
              </g>

              {/* Heat Density Radii (Plotted under pins for seamless heatmap glow) */}
              {visibleClusters.map((cluster) => {
                const radius = Math.min(80, Math.max(38, cluster.count * 6.5));
                let gradId = 'gradLow';
                if (cluster.density === 'CRITICAL') gradId = 'gradCritical';
                else if (cluster.density === 'HIGH') gradId = 'gradHigh';
                else if (cluster.density === 'MEDIUM') gradId = 'gradMedium';

                return (
                  <circle
                    key={`heat-${cluster.id}`}
                    cx={cluster.x}
                    cy={cluster.y}
                    r={radius}
                    fill={`url(#${gradId})`}
                    className="transition-all duration-300 pointer-events-none"
                  />
                );
              })}

              {/* Interactive Hotspot Nodes & Pins */}
              {visibleClusters.map((cluster) => {
                const isSelected = activeCluster?.id === cluster.id;
                return (
                  <g
                    key={`node-${cluster.id}`}
                    className="cursor-pointer transition-transform duration-200"
                    onClick={() => setSelectedClusterId(cluster.id)}
                    onMouseEnter={() => setHoveredPoint(cluster)}
                    onMouseLeave={() => setHoveredPoint(null)}
                  >
                    {/* Pulsing indicator for Critical & High Risk zones */}
                    {(cluster.density === 'CRITICAL' || cluster.density === 'HIGH') && (
                      <circle
                        cx={cluster.x}
                        cy={cluster.y}
                        r={isSelected ? 26 : 20}
                        fill="none"
                        stroke={cluster.densityColor}
                        strokeWidth="1.8"
                        className="animate-ping opacity-60"
                      />
                    )}

                    {/* Outer selected aura */}
                    {isSelected && (
                      <circle
                        cx={cluster.x}
                        cy={cluster.y}
                        r="22"
                        fill="none"
                        stroke="#2563EB"
                        strokeWidth="2.5"
                        strokeDasharray="4 2"
                      />
                    )}

                    {/* Main Node Circle */}
                    <circle
                      cx={cluster.x}
                      cy={cluster.y}
                      r={isSelected ? 16 : 13}
                      fill={cluster.densityColor}
                      stroke="#FFFFFF"
                      strokeWidth="2.5"
                      className="shadow-sm filter drop-shadow"
                    />

                    {/* Complaint Count Number inside pin */}
                    <text
                      x={cluster.x}
                      y={cluster.y + 4}
                      fill="#FFFFFF"
                      fontSize="10"
                      fontWeight="bold"
                      textAnchor="middle"
                      className="pointer-events-none"
                    >
                      {cluster.count}
                    </text>

                    {/* Label Badge below node */}
                    <text
                      x={cluster.x}
                      y={cluster.y + 24}
                      fill="#1E293B"
                      fontSize="10"
                      fontWeight="700"
                      textAnchor="middle"
                      className="filter drop-shadow-sm select-none"
                    >
                      {cluster.areaName}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Hover Tooltip Overlay */}
            {hoveredPoint && (
              <div
                className="absolute z-20 pointer-events-none bg-white/95 backdrop-blur-sm rounded-xl p-3 border border-slate-200 shadow-xl text-xs space-y-1.5 transition-all"
                style={{
                  left: `${Math.min(75, Math.max(15, (hoveredPoint.x / 800) * 100))}%`,
                  top: `${Math.min(75, Math.max(15, (hoveredPoint.y / 480) * 100))}%`,
                  transform: 'translate(-50%, -120%)',
                }}
              >
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-1">
                  <span className="font-bold text-slate-900">{hoveredPoint.areaName}</span>
                  <span
                    className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded text-white"
                    style={{ backgroundColor: hoveredPoint.densityColor }}
                  >
                    {hoveredPoint.density}
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 space-y-0.5">
                  <div className="flex justify-between gap-4">
                    <span>Complaints:</span>
                    <strong className="text-slate-900">{hoveredPoint.count} reports</strong>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span>Top Category:</span>
                    <strong className="text-blue-600 truncate max-w-[120px]">{hoveredPoint.topCategory}</strong>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span>Open Issues:</span>
                    <strong className="text-amber-600">{hoveredPoint.openCount}</strong>
                  </div>
                  {hoveredPoint.breachedCount > 0 && (
                    <div className="flex justify-between gap-4 text-rose-600 font-bold">
                      <span>SLA Breaches:</span>
                      <span>{hoveredPoint.breachedCount} Overdue</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Map Controls (Zoom & Reset) */}
            <div className="absolute top-3 right-3 flex flex-col gap-1.5 bg-white/90 backdrop-blur-sm p-1 rounded-xl border border-slate-200 shadow-sm">
              <button
                onClick={() => setMapZoom((z) => Math.min(1.8, z + 0.2))}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-700 transition"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => setMapZoom((z) => Math.max(0.9, z - 0.2))}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-700 transition"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setMapZoom(1);
                  setSelectedClusterId(null);
                }}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-700 transition"
                title="Reset View"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Heatmap Legend Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs text-slate-600 border-t border-slate-100">
            <span className="font-semibold text-slate-700 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              Incident Density Scale:
            </span>
            <div className="flex items-center gap-4 text-[11px] font-bold">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                LOW (1–2)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                MEDIUM (3–5)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-600" />
                HIGH (6–9)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse" />
                CRITICAL (10+)
              </span>
            </div>
          </div>
        </div>

        {/* Map Side Panel: "Incident Insights" (4 Cols on 12-grid => ~38-42% width) */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              GEOSPATIAL INTELLIGENCE
            </span>
            <h3 className="text-base font-bold text-slate-900 mt-1">Incident Insights</h3>
            <p className="text-xs text-slate-500">Live operational impact for selected civic zone</p>
          </div>

          {activeCluster ? (
            <div className="space-y-3.5 flex-1">
              {/* Most Affected Area */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Zone Focus:</span>
                  <span
                    className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded text-white"
                    style={{ backgroundColor: activeCluster.densityColor }}
                  >
                    {activeCluster.density} DENSITY
                  </span>
                </div>
                <h4 className="text-base font-bold text-slate-900 mt-1 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  {activeCluster.areaName}
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {(
                    (activeCluster.count / (allComplaints.length || 1)) *
                    100
                  ).toFixed(1)}
                  % of municipal complaint volume
                </p>
              </div>

              {/* 2x2 Metric Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[11px] text-slate-500 block mb-1">Total Reports</span>
                  <div className="text-xl font-black text-slate-900">{activeCluster.count}</div>
                  <span className="text-[10px] text-slate-400">Citizen filings</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[11px] text-slate-500 block mb-1">Top Issue</span>
                  <div className="text-xs font-bold text-blue-600 truncate mt-1">
                    {activeCluster.topCategory}
                  </div>
                  <span className="text-[10px] text-slate-400">Primary category</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[11px] text-slate-500 block mb-1">Active Triage</span>
                  <div className="text-xl font-black text-amber-600">{activeCluster.openCount}</div>
                  <span className="text-[10px] text-slate-400">Field unresolved</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[11px] text-slate-500 block mb-1">SLA Breaches</span>
                  <div className="text-xl font-black text-rose-600">{activeCluster.breachedCount}</div>
                  <span className="text-[10px] text-rose-600/80 font-medium">Overdue cases</span>
                </div>
              </div>

              {/* Quick Area Switcher / Top Hotspot Zones */}
              <div className="space-y-2 pt-1">
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                  Top Municipal Hotspots:
                </span>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {heatmapClusters.slice(0, 4).map((cl) => (
                    <button
                      key={cl.id}
                      onClick={() => setSelectedClusterId(cl.id)}
                      className={`w-full p-2 rounded-xl text-left text-xs border transition flex items-center justify-between ${
                        activeCluster.id === cl.id
                          ? 'bg-blue-50 border-blue-200 text-blue-900 font-bold'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: cl.densityColor }}
                        />
                        <span className="truncate">{cl.areaName}</span>
                      </div>
                      <span className="font-mono text-[11px] text-slate-500">
                        {cl.count} issues
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-slate-400">
              No spatial data available.
            </div>
          )}

          <div className="pt-2 border-t border-slate-100">
            <Link
              to="/admin/complaints"
              className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
            >
              <span>Inspect Full Complaint Registry</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* ==================================================
          SECTION 7 & 8: ANALYTICS ROW 1 —
          COMPLAINT TREND CHART + COMPLAINTS BY CATEGORY
      ================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 7. Complaint Trends (Area/Line Chart) (7 Cols => ~60%) */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                Complaint Trends
              </h3>
              <p className="text-xs text-slate-500">Complaint registration and resolution volume over time</p>
            </div>

            {/* Time range selector: 7 Days, 30 Days, All Time */}
            <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200 text-xs">
              {['7D', '30D', '90D'].map((range) => (
                <button
                  key={range}
                  onClick={() => setTrendTimeRange(range)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                    trendTimeRange === range
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {range === '90D' ? 'All Time' : range}
                </button>
              ))}
            </div>
          </div>

          {/* SVG Trend Line & Area Visualization */}
          <div className="relative w-full h-[220px]">
            {trendData.length > 0 ? (
              <svg viewBox="0 0 600 200" className="w-full h-full overflow-visible">
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563EB" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="#2563EB" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal Light Grid Lines */}
                <line x1="40" y1="20" x2="590" y2="20" stroke="#E2E8F0" strokeDasharray="4 4" />
                <line x1="40" y1="65" x2="590" y2="65" stroke="#E2E8F0" strokeDasharray="4 4" />
                <line x1="40" y1="110" x2="590" y2="110" stroke="#E2E8F0" strokeDasharray="4 4" />
                <line x1="40" y1="155" x2="590" y2="155" stroke="#E2E8F0" strokeWidth="1.2" />

                {/* Y-Axis Value Labels */}
                <text x="30" y="24" fill="#94A3B8" fontSize="10" textAnchor="end">
                  {Math.max(10, Math.ceil(Math.max(...trendData.map((d) => d.total)) * 1.2))}
                </text>
                <text x="30" y="114" fill="#94A3B8" fontSize="10" textAnchor="end">
                  {Math.round(Math.max(...trendData.map((d) => d.total)) / 2) || 5}
                </text>
                <text x="30" y="159" fill="#94A3B8" fontSize="10" textAnchor="end">
                  0
                </text>

                {(() => {
                  const maxVal = Math.max(8, Math.max(...trendData.map((d) => d.total)));
                  const stepX = 550 / Math.max(1, trendData.length - 1);

                  // Calculate point coordinates
                  const points = trendData.map((d, i) => {
                    const x = 40 + i * stepX;
                    const y = 155 - (d.total / maxVal) * 135;
                    return { x, y, ...d };
                  });

                  // Build smooth path
                  const pathD = points.reduce((acc, p, i) => {
                    if (i === 0) return `M ${p.x} ${p.y}`;
                    const prev = points[i - 1];
                    const cx1 = prev.x + (p.x - prev.x) / 2;
                    const cy1 = prev.y;
                    const cx2 = prev.x + (p.x - prev.x) / 2;
                    const cy2 = p.y;
                    return `${acc} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${p.x} ${p.y}`;
                  }, '');

                  const areaD = `${pathD} L ${points[points.length - 1].x} 155 L ${points[0].x} 155 Z`;

                  return (
                    <>
                      {/* Gradient Fill under Total Curve */}
                      <path d={areaD} fill="url(#areaGrad)" />

                      {/* Main Line Stroke */}
                      <path
                        d={pathD}
                        fill="none"
                        stroke="#2563EB"
                        strokeWidth="2.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />

                      {/* Data Point Nodes */}
                      {points.map((p, i) => (
                        <g key={i}>
                          <circle
                            cx={p.x}
                            cy={p.y}
                            r="3.5"
                            fill="#FFFFFF"
                            stroke="#2563EB"
                            strokeWidth="2"
                            className="hover:r-5 transition-all cursor-pointer"
                          >
                            <title>{`${p.label}: ${p.total} complaints (${p.completed} completed, ${p.in_progress} in progress)`}</title>
                          </circle>
                          {/* X-axis date labels for alternating intervals */}
                          {(i === 0 || i === Math.floor(points.length / 2) || i === points.length - 1) && (
                            <text
                              x={p.x}
                              y="178"
                              fill="#64748B"
                              fontSize="10"
                              textAnchor="middle"
                              fontWeight="600"
                            >
                              {p.label}
                            </text>
                          )}
                        </g>
                      ))}
                    </>
                  );
                })()}
              </svg>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No trend events recorded.
              </div>
            )}
          </div>

          {/* Chart Legend */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 font-bold text-blue-700">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                Total Volume
              </span>
              <span className="flex items-center gap-1.5 font-semibold text-emerald-700">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                Completed
              </span>
              <span className="flex items-center gap-1.5 font-semibold text-amber-700">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-600" />
                In Progress
              </span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">Dynamic Grouping</span>
          </div>
        </div>

        {/* 8. Complaints by Category (Bar Chart) (5 Cols => ~40%) */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-600" />
              Complaints by Category
            </h3>
            <p className="text-xs text-slate-500">Distribution across municipal public service domains</p>
          </div>

          <div className="space-y-3 pt-1">
            {analytics?.category_breakdown &&
              Object.entries(analytics.category_breakdown)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([cat, count]) => {
                  const percent = Math.round((count / (totalCount || 1)) * 100);
                  return (
                    <div key={cat} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-800 font-bold truncate max-w-[200px]">{cat}</span>
                        <span className="text-slate-500 font-mono font-medium">
                          {count} ({percent}%)
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-blue-600 transition-all duration-500"
                          style={{ width: `${Math.max(6, percent)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
          </div>

          <div className="pt-2 text-right">
            <Link
              to="/admin/analytics"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
            >
              <span>View Full Domain Analytics</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* ==================================================
          SECTION 9 & 10: ANALYTICS ROW 2 —
          PRIORITY DISTRIBUTION + DEPARTMENT PERFORMANCE
      ================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 10. Priority Distribution (Analytics Visualization, NOT a KPI card) */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-600" />
              Priority Distribution
            </h3>
            <p className="text-xs text-slate-500">Triage urgency and hazard risk score segmentation</p>
          </div>

          {/* Stacked Percentage Bar */}
          <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden flex shadow-inner">
            <div
              style={{ width: `${priorityMetrics.critical.pct}%` }}
              className="bg-rose-600 h-full transition-all"
              title={`Critical: ${priorityMetrics.critical.count} (${priorityMetrics.critical.pct}%)`}
            />
            <div
              style={{ width: `${priorityMetrics.high.pct}%` }}
              className="bg-orange-500 h-full transition-all"
              title={`High: ${priorityMetrics.high.count} (${priorityMetrics.high.pct}%)`}
            />
            <div
              style={{ width: `${priorityMetrics.medium.pct}%` }}
              className="bg-amber-500 h-full transition-all"
              title={`Medium: ${priorityMetrics.medium.count} (${priorityMetrics.medium.pct}%)`}
            />
            <div
              style={{ width: `${priorityMetrics.low.pct}%` }}
              className="bg-blue-500 h-full transition-all"
              title={`Low: ${priorityMetrics.low.count} (${priorityMetrics.low.pct}%)`}
            />
          </div>

          {/* 4 Semantic Priority Breakdown Cards */}
          <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
            {/* Critical */}
            <div className="p-3 rounded-xl bg-rose-50/50 border border-rose-200">
              <div className="flex items-center justify-between">
                <span className="font-bold text-rose-700 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-600" />
                  Critical
                </span>
                <span className="font-mono text-rose-700 font-bold">{priorityMetrics.critical.pct}%</span>
              </div>
              <div className="text-xl font-black text-rose-700 mt-1">{priorityMetrics.critical.count}</div>
              <span className="text-[10px] text-rose-600/80">Hazard score &ge; 85</span>
            </div>

            {/* High */}
            <div className="p-3 rounded-xl bg-orange-50/50 border border-orange-200">
              <div className="flex items-center justify-between">
                <span className="font-bold text-orange-700 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-orange-500" />
                  High
                </span>
                <span className="font-mono text-orange-700 font-bold">{priorityMetrics.high.pct}%</span>
              </div>
              <div className="text-xl font-black text-orange-700 mt-1">{priorityMetrics.high.count}</div>
              <span className="text-[10px] text-orange-600/80">Hazard score 70–84</span>
            </div>

            {/* Medium */}
            <div className="p-3 rounded-xl bg-amber-50/50 border border-amber-200">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-700 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Medium
                </span>
                <span className="font-mono text-amber-700 font-bold">{priorityMetrics.medium.pct}%</span>
              </div>
              <div className="text-xl font-black text-amber-700 mt-1">{priorityMetrics.medium.count}</div>
              <span className="text-[10px] text-amber-600/80">Hazard score 40–69</span>
            </div>

            {/* Low */}
            <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-200">
              <div className="flex items-center justify-between">
                <span className="font-bold text-blue-700 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  Low
                </span>
                <span className="font-mono text-blue-700 font-bold">{priorityMetrics.low.pct}%</span>
              </div>
              <div className="text-xl font-black text-blue-700 mt-1">{priorityMetrics.low.count}</div>
              <span className="text-[10px] text-blue-600/80">Routine maintenance</span>
            </div>
          </div>
        </div>

        {/* 9. Department Performance (Horizontal Bars / Compact Table) */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Building2 className="w-4 h-4 text-teal-600" />
                Department Performance
              </h3>
              <p className="text-xs text-slate-500">Caseload resolution and SLA adherence across municipal divisions</p>
            </div>
            <span className="text-[11px] font-mono text-slate-400">Live Workload</span>
          </div>

          <div className="space-y-3 pt-1">
            {departmentMetrics.slice(0, 4).map((dept) => (
              <div key={dept.name} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{dept.name}</span>
                    <span className="px-2 py-0.5 rounded-full bg-white text-slate-600 font-mono text-[10px] border border-slate-200">
                      {dept.total} assigned
                    </span>
                  </div>

                  <div className="flex items-center gap-3 font-semibold">
                    <span className="text-emerald-700">{dept.completed} Resolved</span>
                    <span className="text-amber-700">{dept.in_progress} Active</span>
                    {dept.breached > 0 && (
                      <span className="text-rose-700 font-bold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                        {dept.breached} Overdue
                      </span>
                    )}
                  </div>
                </div>

                {/* Completion Progress Bar */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-teal-600 transition-all duration-500"
                      style={{ width: `${Math.max(5, dept.completionRate)}%` }}
                    />
                  </div>
                  <span className="font-mono text-slate-500 text-[11px] font-bold">
                    {dept.completionRate}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ==================================================
          SECTION 11 & 13: ATTENTION REQUIRED SECTION
          Subtle 3-column triage queue:
          [ SLA BREACHED ] [ DUE SOON ] [ HIGH RISK ]
      ================================================== */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-600" />
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Attention Required
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Priority operational triage queue partitioned by critical SLA triggers
              </p>
            </div>
          </div>

          <Link
            to="/admin/complaints"
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <span>View All Operational Issues</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Column 1: SLA BREACHED (Red) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-rose-200">
              <span className="text-xs font-bold text-rose-700 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
                SLA Breached ({attentionItems.breached.length})
              </span>
              <span className="text-[10px] font-mono text-rose-600">Immediate Action</span>
            </div>

            {attentionItems.breached.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-xs text-center">
                No active SLA breaches.
              </div>
            ) : (
              attentionItems.breached.map((c) => (
                <div
                  key={c.id || c.complaint_id}
                  className="p-3.5 rounded-xl bg-rose-50/50 border border-rose-200 flex flex-col justify-between space-y-2.5 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-slate-900">
                      #{c.complaint_id || c.id}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                      SLA BREACHED
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 line-clamp-1">
                    {c.ai_analysis?.problem_summary || c.description}
                  </h4>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-rose-200/60">
                    <span className="truncate max-w-[130px] flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-rose-500" />
                      {getAreaName(c)}
                    </span>
                    <Link
                      to={`/admin/complaints/${c.complaint_id || c.id}`}
                      className="font-bold text-rose-700 hover:text-rose-800 flex items-center gap-1"
                    >
                      <span>View</span>
                      <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Column 2: DUE SOON (Amber) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-amber-200">
              <span className="text-xs font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                Due Soon ({attentionItems.dueSoon.length})
              </span>
              <span className="text-[10px] font-mono text-amber-600">Approaching SLA</span>
            </div>

            {attentionItems.dueSoon.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-xs text-center">
                No complaints due soon.
              </div>
            ) : (
              attentionItems.dueSoon.map((c) => (
                <div
                  key={c.id || c.complaint_id}
                  className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-200 flex flex-col justify-between space-y-2.5 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-slate-900">
                      #{c.complaint_id || c.id}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
                      DUE SOON
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 line-clamp-1">
                    {c.ai_analysis?.problem_summary || c.description}
                  </h4>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-amber-200/60">
                    <span className="truncate max-w-[130px] flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-amber-500" />
                      {getAreaName(c)}
                    </span>
                    <Link
                      to={`/admin/complaints/${c.complaint_id || c.id}`}
                      className="font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1"
                    >
                      <span>View</span>
                      <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Column 3: HIGH RISK (Orange) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-orange-200">
              <span className="text-xs font-bold text-orange-700 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-orange-600" />
                High Risk ({attentionItems.highRisk.length})
              </span>
              <span className="text-[10px] font-mono text-orange-600">Score &ge; 80</span>
            </div>

            {attentionItems.highRisk.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-xs text-center">
                No high-risk open issues.
              </div>
            ) : (
              attentionItems.highRisk.map((c) => (
                <div
                  key={c.id || c.complaint_id}
                  className="p-3.5 rounded-xl bg-orange-50/50 border border-orange-200 flex flex-col justify-between space-y-2.5 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-slate-900">
                      #{c.complaint_id || c.id}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-700 border border-orange-200">
                      PRIORITY {c.ai_analysis?.priority_score ?? 80}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 line-clamp-1">
                    {c.ai_analysis?.problem_summary || c.description}
                  </h4>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-orange-200/60">
                    <span className="truncate max-w-[130px] flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-orange-500" />
                      {getAreaName(c)}
                    </span>
                    <Link
                      to={`/admin/complaints/${c.complaint_id || c.id}`}
                      className="font-bold text-orange-700 hover:text-orange-800 flex items-center gap-1"
                    >
                      <span>View</span>
                      <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ==================================================
          SECTION 12: RECENT COMPLAINTS TABLE
      ================================================== */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              Recent Complaints
            </h3>
            <p className="text-xs text-slate-500">Chronological civic complaint registry</p>
          </div>
          <Link
            to="/admin/complaints"
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <span>View All Registry</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold uppercase text-[10px]">
                <th className="py-3 px-3">Complaint ID</th>
                <th className="py-3 px-3">Issue</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Department</th>
                <th className="py-3 px-3">Priority</th>
                <th className="py-3 px-3">SLA</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Created</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredComplaints.slice(0, 8).map((c) => (
                <tr key={c.id || c.complaint_id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3 px-3 font-mono font-bold whitespace-nowrap">
                    <span className="text-blue-600">{c.complaint_id || c.id}</span>
                  </td>
                  <td className="py-3 px-3 text-slate-800 max-w-xs truncate font-medium">
                    {c.ai_analysis?.problem_summary || c.description}
                  </td>
                  <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                    {c.ai_analysis?.category || 'Civic'}
                  </td>
                  <td className="py-3 px-3 text-slate-700 max-w-[150px] truncate font-medium">
                    {c.ai_analysis?.department || 'Unassigned'}
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-bold text-slate-900 font-mono">
                      {c.ai_analysis?.priority_score ?? 50}
                    </span>
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap">
                    {getSlaBadge(c.sla_status, c.sla_completed_late)}
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
                  <td className="py-3 px-3 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                    {new Date(c.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </td>
                  <td className="py-3 px-3 text-right whitespace-nowrap">
                    <Link
                      to={`/admin/complaints/${c.complaint_id || c.id}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold transition"
                    >
                      View
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
