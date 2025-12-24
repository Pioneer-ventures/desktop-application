/**
 * Self Attendance Component
 * Shows current user's attendance status and actions
 * Role-aware: Admin cannot mark attendance
 */

import React, { useState, useEffect } from 'react';
import { attendanceService } from '@/services/attendance.service';
import { socketService } from '@/services/socket.service';
import { authStore } from '@/store/authStore';
import {
  AttendanceSessionStatus,
  AttendanceSource,
  AttendanceStatusResponse,
  AttendanceRecord,
  UserRole,
} from '@/types';
import './SelfAttendance.css';

interface SelfAttendanceProps {
  canMarkAttendance: boolean; // Whether user can check in/out
}

export const SelfAttendance: React.FC<SelfAttendanceProps> = ({ canMarkAttendance }) => {
  const { user } = authStore();
  const [status, setStatus] = useState<AttendanceStatusResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);

  useEffect(() => {
    loadStatus();
    
    // Connect to Socket.IO
    socketService.connect();

    // Subscribe to real-time updates
    socketService.onAttendanceUpdate((data) => {
      if (data.data.employeeId === user?.id) {
        loadStatus(); // Refresh status
      }
    });

    return () => {
      socketService.offAttendanceUpdate();
    };
  }, [user?.id]);

  const loadStatus = async () => {
    try {
      const statusData = await attendanceService.getStatus();
      setStatus(statusData);
      setTodayRecord(statusData.today || null);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load attendance status');
    }
  };

  const handleCheckIn = async () => {
    if (!canMarkAttendance) return;
    
    setLoading(true);
    setError(null);

    try {
      const record = await attendanceService.checkIn({
        source: AttendanceSource.DESKTOP,
      });
      setTodayRecord(record);
      await loadStatus();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to check in');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!canMarkAttendance) return;
    
    setLoading(true);
    setError(null);

    try {
      const record = await attendanceService.checkOut({
        source: AttendanceSource.DESKTOP,
      });
      setTodayRecord(record);
      await loadStatus();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to check out');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (isoString?: string): string => {
    if (!isoString) return '--';
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (minutes?: number): string => {
    if (!minutes) return '--';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getStatusText = (status?: AttendanceSessionStatus): string => {
    switch (status) {
      case AttendanceSessionStatus.CHECKED_IN:
        return 'Checked In';
      case AttendanceSessionStatus.CHECKED_OUT:
        return 'Checked Out';
      default:
        return 'Not Checked In';
    }
  };

  const getStatusClass = (status?: AttendanceSessionStatus): string => {
    switch (status) {
      case AttendanceSessionStatus.CHECKED_IN:
        return 'status-checked-in';
      case AttendanceSessionStatus.CHECKED_OUT:
        return 'status-checked-out';
      default:
        return 'status-not-started';
    }
  };

  if (!status) {
    return (
      <div className="self-attendance">
        <div className="self-attendance-loading">Loading attendance status...</div>
      </div>
    );
  }

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="self-attendance">
      <div className="self-attendance-header">
        <div>
          <h2 className="self-attendance-title">My Attendance</h2>
          <p className="self-attendance-date">{today}</p>
        </div>
        <div className={`self-attendance-status ${getStatusClass(status.status)}`}>
          {getStatusText(status.status)}
        </div>
      </div>

      {error && <div className="self-attendance-error">{error}</div>}

      <div className="self-attendance-details">
        <table className="self-attendance-table">
          <tbody>
            <tr>
              <td className="detail-label">Check-in Time</td>
              <td className="detail-value">{formatTime(todayRecord?.checkInTime)}</td>
            </tr>
            <tr>
              <td className="detail-label">Check-out Time</td>
              <td className="detail-value">{formatTime(todayRecord?.checkOutTime)}</td>
            </tr>
            {todayRecord?.totalDuration !== undefined && (
              <tr>
                <td className="detail-label">Total Duration</td>
                <td className="detail-value">{formatDuration(todayRecord.totalDuration)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {canMarkAttendance && (
        <div className="self-attendance-actions">
          <button
            className="btn-check-in"
            onClick={handleCheckIn}
            disabled={loading || !status.canCheckIn}
          >
            {loading ? 'Processing...' : 'Check In'}
          </button>
          <button
            className="btn-check-out"
            onClick={handleCheckOut}
            disabled={loading || !status.canCheckOut}
          >
            {loading ? 'Processing...' : 'Check Out'}
          </button>
        </div>
      )}

      {!canMarkAttendance && (
        <div className="self-attendance-info">
          <p>Attendance marking is not available for your role. You can view attendance records only.</p>
        </div>
      )}
    </div>
  );
};

