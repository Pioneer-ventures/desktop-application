/**
 * Application Router
 */

import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { ProtectedRoute, DashboardRedirect } from '@/shared/components/routing';
import { AppLayout } from '@/shared/components/layout';
import { LoginPage } from '@/pages/Login/LoginPage';
import { AttendancePage } from '@/pages/Attendance/AttendancePage';
import { ReportsPage } from '@/pages/Reports/ReportsPage';
import { AdminReportsPage } from '@/pages/Reports/AdminReportsPage';
import { CalendarPage } from '@/pages/Calendar/CalendarPage';
import { SettingsPage } from '@/pages/Settings/SettingsPage';
import { AdminPage } from '@/pages/Admin/AdminPage';
import { HRPage } from '@/pages/HR/HRPage';
import { ManagerPage } from '@/pages/Manager/ManagerPage';
import { EmployeePage } from '@/pages/Employee/EmployeePage';
import { EmployeeDetailsPage } from '@/pages/Employee/EmployeeDetailsPage';
import { UserRole } from '@/types';

// Component to handle IPC messages for logs viewer (must be inside Router)
const LogsViewerHandler: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Listen for IPC message from tray menu to open logs viewer
    const handleOpenLogsViewer = () => {
      navigate('/settings#logs');
      // Also trigger a custom event that SettingsPage can listen to
      window.dispatchEvent(new CustomEvent('open-logs-viewer'));
    };

    // Listen for custom event from preload script
    window.addEventListener('open-logs-viewer', handleOpenLogsViewer);

    return () => {
      window.removeEventListener('open-logs-viewer', handleOpenLogsViewer);
    };
  }, [navigate]);

  return null; // This component doesn't render anything
};

export const AppRouter: React.FC = () => {
  return (
    <HashRouter>
      <LogsViewerHandler />
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            {/* Dashboard redirects to role-specific dashboard */}
            <Route path="/dashboard" element={<DashboardRedirect />} />
            <Route path="/attendance" element={<AttendancePage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route
              path="/reports/admin"
              element={
                <ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
                  <AdminReportsPage />
                </ProtectedRoute>
              }
            />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/settings" element={<SettingsPage />} />

            {/* Role-specific routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
                  <AdminPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/hr"
              element={
                <ProtectedRoute allowedRoles={[UserRole.HR]}>
                  <HRPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/manager"
              element={
                <ProtectedRoute allowedRoles={[UserRole.MANAGER]}>
                  <ManagerPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/employee"
              element={
                <ProtectedRoute allowedRoles={[UserRole.EMPLOYEE]}>
                  <EmployeePage />
                </ProtectedRoute>
              }
            />

            {/* Employee Details (HR/Admin/Manager) */}
            <Route
              path="/employees/:id/details"
              element={
                <ProtectedRoute allowedRoles={[UserRole.HR, UserRole.ADMIN, UserRole.MANAGER]}>
                  <EmployeeDetailsPage />
                </ProtectedRoute>
              }
            />

            {/* Default redirect - goes to dashboard which redirects to role-specific */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Route>

        {/* Catch all - redirect to login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </HashRouter>
  );
};
