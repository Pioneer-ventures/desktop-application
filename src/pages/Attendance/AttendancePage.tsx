/**
 * Attendance Page
 * Role-aware attendance page with self-attendance and list views
 */

import React from 'react';
import { authStore } from '@/store/authStore';
import { SelfAttendance } from '@/components/Attendance/SelfAttendance';
import { AttendanceList } from '@/components/Attendance/AttendanceList';
import { UserRole } from '@/types';
import './AttendancePage.css';

export const AttendancePage: React.FC = () => {
  const { user } = authStore();

  if (!user) {
    return null;
  }

  // Determine if user can mark attendance
  // Employee, Manager, HR can mark attendance
  // Admin CANNOT mark attendance
  const canMarkAttendance = 
    user.role === UserRole.EMPLOYEE ||
    user.role === UserRole.MANAGER ||
    user.role === UserRole.HR;

  // Determine if attendance list should be shown
  // Employee: No list (only self)
  // Manager: Team members (same department)
  // HR: All employees and managers
  // Admin: All HRs, managers, and employees
  const showAttendanceList = 
    user.role === UserRole.MANAGER ||
    user.role === UserRole.HR ||
    user.role === UserRole.ADMIN;

  return (
    <div className="attendance-page">
      <div className="attendance-page-header">
        <h1>Attendance</h1>
      </div>

      {/* Self Attendance Section - Always visible */}
      <SelfAttendance canMarkAttendance={canMarkAttendance} />

      {/* Attendance List Section - Role-based visibility */}
      {showAttendanceList && (
        <AttendanceList role={user.role} />
      )}
    </div>
  );
};

