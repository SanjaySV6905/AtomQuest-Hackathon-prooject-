import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/common/Layout';

// Auth
import LoginPage from './pages/LoginPage';

// Employee
import EmpDashboard from './pages/employee/Dashboard';
import GoalSheet from './pages/employee/GoalSheet';
import MyGoals from './pages/employee/MyGoals';
import Achievements from './pages/employee/Achievements';
import MyAnalytics from './pages/employee/MyAnalytics';

// Manager
import ManagerDashboard from './pages/manager/Dashboard';
import TeamGoals from './pages/manager/TeamGoals';
import Checkins from './pages/manager/Checkins';
import ManagerAnalytics from './pages/manager/Analytics';

// Admin
import AdminDashboard from './pages/admin/Dashboard';
import GoalManagement from './pages/admin/GoalManagement';
import EscalationCenter from './pages/admin/EscalationCenter';
import AuditTrail from './pages/admin/AuditTrail';
import Reports from './pages/admin/Reports';
import AdminAnalytics from './pages/admin/Analytics';
import CycleManagement from './pages/admin/CycleManagement';

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen bg-bg"><div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin"></div></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={`/${user.role}/dashboard`} replace />;
  return children;
}

function RoleRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={`/${user.role}/dashboard`} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<RoleRedirect />} />

          {/* Employee routes */}
          <Route path="/employee" element={<ProtectedRoute roles={['employee']}><Layout /></ProtectedRoute>}>
            <Route path="dashboard" element={<EmpDashboard />} />
            <Route path="goals/new" element={<GoalSheet />} />
            <Route path="goals" element={<MyGoals />} />
            <Route path="achievements" element={<Achievements />} />
            <Route path="analytics" element={<MyAnalytics />} />
          </Route>

          {/* Manager routes */}
          <Route path="/manager" element={<ProtectedRoute roles={['manager']}><Layout /></ProtectedRoute>}>
            <Route path="dashboard" element={<ManagerDashboard />} />
            <Route path="goals" element={<TeamGoals />} />
            <Route path="checkins" element={<Checkins />} />
            <Route path="analytics" element={<ManagerAnalytics />} />
          </Route>

          {/* Admin routes */}
          <Route path="/admin" element={<ProtectedRoute roles={['admin']}><Layout /></ProtectedRoute>}>
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="goals" element={<GoalManagement />} />
            <Route path="escalations" element={<EscalationCenter />} />
            <Route path="audit" element={<AuditTrail />} />
            <Route path="reports" element={<Reports />} />
            <Route path="analytics" element={<AdminAnalytics />} />
            <Route path="cycle" element={<CycleManagement />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
