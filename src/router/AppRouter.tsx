/**
 * Application Router
 */

import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute/ProtectedRoute';
import { AppLayout } from '@/components/Layout/AppLayout';
import { LoginPage } from '@/pages/Login/LoginPage';
import { DashboardRedirect } from '@/components/DashboardRedirect/DashboardRedirect';
import { AttendancePage } from '@/pages/Attendance/AttendancePage';
import { ReportsPage } from '@/pages/Reports/ReportsPage';
import { AdminPage } from '@/pages/Admin/AdminPage';
import { HRPage } from '@/pages/HR/HRPage';
import { ManagerPage } from '@/pages/Manager/ManagerPage';
import { EmployeePage } from '@/pages/Employee/EmployeePage';
import { UserRole } from '@/types';

export const AppRouter: React.FC = () => {
  return (
    <HashRouter>
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

