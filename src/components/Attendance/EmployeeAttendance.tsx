/**
 * Employee Attendance Component
 * Allows employees to check in and check out
 */

import React, { useState, useEffect } from 'react';
import { attendanceService } from '@/services/attendance.service';
import { socketService } from '@/services/socket.service';
import {
  AttendanceSessionStatus,
  AttendanceSource,
  AttendanceStatusResponse,
  AttendanceRecord,
} from '@/types';
import './EmployeeAttendance.css';

export const EmployeeAttendance: React.FC = () => {
  const [status, setStatus] = useState<AttendanceStatusResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);

  // Load initial status
  useEffect(() => {
    loadStatus();
    
    // Connect to Socket.IO
    socketService.connect();

    // Subscribe to real-time updates
    socketService.onAttendanceUpdate(() => {
      loadStatus(); // Refresh status
    });

    return () => {
      socketService.offAttendanceUpdate();
    };
  }, []);

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
      second: '2-digit',
    });
  };

  const formatDuration = (minutes?: number): string => {
    if (!minutes) return '--';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getStatusBadgeClass = (status?: AttendanceSessionStatus): string => {
    switch (status) {
      case AttendanceSessionStatus.CHECKED_IN:
        return 'status-badge checked-in';
      case AttendanceSessionStatus.CHECKED_OUT:
        return 'status-badge checked-out';
      default:
        return 'status-badge not-started';
    }
  };

  const getStatusText = (status?: AttendanceSessionStatus): string => {
    switch (status) {
      case AttendanceSessionStatus.CHECKED_IN:
        return 'Checked In';
      case AttendanceSessionStatus.CHECKED_OUT:
        return 'Checked Out';
      default:
        return 'Not Started';
    }
  };

  if (!status) {
    return (
      <div className="employee-attendance">
        <div className="attendance-loading">Loading attendance status...</div>
      </div>
    );
  }

  return (
    <div className="employee-attendance">
      <div className="attendance-header">
        <h2>My Attendance</h2>
        <div className={`status-indicator ${getStatusBadgeClass(status.status)}`}>
          {getStatusText(status.status)}
        </div>
      </div>

      {error && <div className="attendance-error">{error}</div>}

      <div className="attendance-card">
        <div className="attendance-date">
          <h3>Today</h3>
          <p>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>

        <div className="attendance-details">
          <div className="detail-row">
            <span className="detail-label">Check-In Time:</span>
            <span className="detail-value">{formatTime(todayRecord?.checkInTime)}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Check-Out Time:</span>
            <span className="detail-value">{formatTime(todayRecord?.checkOutTime)}</span>
          </div>
          {todayRecord?.totalDuration !== undefined && (
            <div className="detail-row">
              <span className="detail-label">Total Duration:</span>
              <span className="detail-value">{formatDuration(todayRecord.totalDuration)}</span>
            </div>
          )}
        </div>

        <div className="attendance-actions">
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
      </div>

      {status.status === AttendanceSessionStatus.CHECKED_IN && (
        <div className="attendance-info">
          <p>✓ You are currently checked in. Don't forget to check out at the end of your shift.</p>
        </div>
      )}
    </div>
  );
};

