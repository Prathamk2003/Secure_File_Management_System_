import React, { useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation, useNavigate } from 'react-router-dom';
import SecureFileManager from './components/secure-file-manager';
import NotificationsPage from './pages/NotificationsPage';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import Reports from './pages/Reports';
import { useAuth } from './context/AuthContext';
import { RefreshProvider, useRefresh } from './context/RefreshContext';
import { ThemeProvider } from './context/ThemeContext';
import { FiRefreshCw, FiBell, FiUser } from "react-icons/fi"; // Add FiUser import

function AppRoutes() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handlePopState = () => {
      if (location.pathname !== '/dashboard' && isAuthenticated) {
        navigate('/dashboard', { replace: true });
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [location, isAuthenticated, navigate]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/login"
          element={
            isAuthenticated ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <LoginPage />
            )
          }
        />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/reports" element={<Reports />} />
        <Route
          path="/dashboard"
          element={
            isAuthenticated ? (
              <SecureFileManager />
            ) : (
              <Navigate to="/login" state={{ from: location }} replace />
            )
          }
        />
        <Route
          path="/"
          element={
            isAuthenticated ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Navigate to="/login" state={{ from: location }} replace />
            )
          }
        />
        {/* Redirect any unknown routes to login or a 404 page */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <Router>
        <RefreshProvider>
          <AppRoutes />
        </RefreshProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;

const notificationCount = 0; // Replace with your actual logic

<div className="flex items-center gap-4">
  {/* Notifications Icon */}
  <button className="relative">
    <FiBell className="w-6 h-6" />
    <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full px-1">
      {notificationCount}
    </span>
  </button>
  {/* Refresh Button */}
  <button
    onClick={() => window.location.reload()}
    title="Refresh"
    className="p-2 hover:bg-gray-200 rounded-full"
  >
    <FiRefreshCw className="w-6 h-6" />
  </button>
  {/* User Icon */}
  <FiUser className="w-6 h-6" />
</div>