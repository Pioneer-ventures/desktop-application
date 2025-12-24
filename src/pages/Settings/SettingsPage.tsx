/**
 * Settings Page - Minimal, compact design
 * Organized by sections with role-based access
 */

import React, { useState } from 'react';
import { authStore } from '@/store/authStore';
import { UserRole } from '@/types';
import { PersonalSettings } from './sections/PersonalSettings';
import { AttendanceSettings } from './sections/AttendanceSettings';
import { ReportsSettings } from './sections/ReportsSettings';
import { EmployeeSettings } from './sections/EmployeeSettings';
import './SettingsPage.css';

type SettingsSection = 'personal' | 'attendance' | 'reports' | 'employees';

export const SettingsPage: React.FC = () => {
  const { user } = authStore();
  const [activeSection, setActiveSection] = useState<SettingsSection>('personal');

  const canManageEmployees = user?.role === UserRole.HR || user?.role === UserRole.ADMIN;

  const sections = [
    { id: 'personal' as const, label: 'Personal', icon: '👤' },
    { id: 'attendance' as const, label: 'Attendance', icon: '📅' },
    { id: 'reports' as const, label: 'Reports', icon: '📊' },
    ...(canManageEmployees ? [{ id: 'employees' as const, label: 'Employees', icon: '👥' }] : []),
  ];

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1 className="settings-title">Settings</h1>
        <p className="settings-subtitle">Manage your account settings and preferences</p>
      </div>

      <div className="settings-container">
        <div className="settings-sidebar">
          <nav className="settings-nav">
            {sections.map((section) => (
              <button
                key={section.id}
                className={`settings-nav-item ${activeSection === section.id ? 'active' : ''}`}
                onClick={() => setActiveSection(section.id)}
              >
                <span className="settings-nav-icon">{section.icon}</span>
                <span className="settings-nav-label">{section.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="settings-content">
          {activeSection === 'personal' && <PersonalSettings />}
          {activeSection === 'attendance' && <AttendanceSettings />}
          {activeSection === 'reports' && <ReportsSettings />}
          {activeSection === 'employees' && canManageEmployees && <EmployeeSettings />}
        </div>
      </div>
    </div>
  );
};
