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
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
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
import AdminSecurityPage from './pages/admin/AdminSecurityPage';

import { Loader2 } from 'lucide-react';

// Route Guard component
function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, role, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
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
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
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
  const { t } = useLanguage();

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
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 selection:bg-blue-600 selection:text-white transition-colors duration-200">
      {/* Dynamic Role-Based Top Navigation with Theme & Language Controls */}
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
          <Route
            path="/admin/security"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminSecurityPage />
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-6 px-6 text-center text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-950 transition-colors duration-200">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800 dark:text-slate-200">SmartCivic AI</span>
            <span>— {t('footerTagline', 'Civic Body Complaint Triage & Resolution Platform')}</span>
          </div>
          <span className="font-mono text-slate-400 dark:text-slate-500">{t('footerStack', 'FastAPI • Gemini 2.5 • MongoDB Atlas • React 18')}</span>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <MainApp />
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
