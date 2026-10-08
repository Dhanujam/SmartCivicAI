import React, { useState, useEffect } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from 'react-router-dom';
import Navbar from './components/Navbar';
import { AuthProvider, useAuth } from './context/AuthContext';
import { api } from './services/api';

// Pages
import CitizenPortal from './pages/CitizenPortal';
import MyComplaintsPage from './pages/MyComplaintsPage';
import ComplaintDetailsPage from './pages/ComplaintDetailsPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminComplaintsPage from './pages/admin/AdminComplaintsPage';
import AdminComplaintDetailPage from './pages/admin/AdminComplaintDetailPage';
import AdminAnalyticsPage from './pages/admin/AdminAnalyticsPage';

import { Loader2 } from 'lucide-react';

// Route Guard component
function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, role, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    // If citizen tries to access admin routes, redirect to citizen portal
    if (role === 'CITIZEN') {
      return <Navigate to="/" replace />;
    }
    // If admin tries to access citizen-specific routes, redirect to admin dashboard
    if (role === 'ADMIN') {
      return <Navigate to="/admin" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return children;
}

// Root page resolver: redirect admin to /admin or render CitizenPortal
function HomeResolver() {
  const { isAdmin, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
      </div>
    );
  }

  if (isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  return <CitizenPortal />;
}

function MainApp() {
  const [health, setHealth] = useState(null);

  useEffect(() => {
    const checkBackend = async () => {
      try {
        const data = await api.getHealth();
        setHealth(data);
      } catch (err) {
        console.error('Failed to reach backend:', err);
        setHealth({ status: 'offline' });
      }
    };

    checkBackend();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-sky-500 selection:text-white">
      {/* Dynamic Role-Based Top Navigation */}
      <Navbar backendStatus={health?.status === 'healthy' ? 'online' : 'offline'} />

      {/* Main Page Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10 flex flex-col justify-start">
        <Routes>
          {/* Public / Citizen Submission Portal */}
          <Route path="/" element={<HomeResolver />} />

          {/* Authentication */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Citizen Protected Routes */}
          <Route
            path="/my-complaints"
            element={
              <ProtectedRoute allowedRoles={['CITIZEN']}>
                <MyComplaintsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/complaints/:id"
            element={
              <ProtectedRoute allowedRoles={['CITIZEN', 'ADMIN']}>
                <ComplaintDetailsPage />
              </ProtectedRoute>
            }
          />

          {/* Government Official (ADMIN) Protected Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/complaints"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminComplaintsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/complaints/:id"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminComplaintDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/analytics"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminAnalyticsPage />
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-5 px-6 text-center text-xs text-slate-500 bg-slate-950/80">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>SmartCivic AI — Civic Body Complaint Triage & Resolution Platform (HN-AI-02)</span>
          <span className="font-mono text-slate-600">FastAPI • Gemini 2.5 • MongoDB Atlas • React 18</span>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </BrowserRouter>
  );
}
