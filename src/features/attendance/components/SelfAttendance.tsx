/**
 * Self Attendance Component
 * Shows current user's attendance status and actions
 * Role-aware: Admin cannot mark attendance
 */

import React, { useState, useEffect } from 'react';
import { attendanceService } from '@/services/attendance.service';
import { wifiService } from '@/services/wifi.service';
import { socketService } from '@/services/socket.service';
import { authStore } from '@/store/authStore';
import {
  AttendanceSessionStatus,
  AttendanceSource,
  AttendanceStatusResponse,
  AttendanceRecord,
  UserRole,
} from '@/types';
import { WifiInfo } from '@/types/electron';
import './SelfAttendance.css';

interface SelfAttendanceProps {
  canMarkAttendance: boolean; // Whether user can check in/out
}

interface WifiValidationState {
  isValid: boolean | null; // null = checking, true = valid, false = invalid
  currentWifi: WifiInfo | null;
  reason?: string;
  loading: boolean;
}

export const SelfAttendance: React.FC<SelfAttendanceProps> = ({ canMarkAttendance }) => {
  const { user } = authStore();
  const [status, setStatus] = useState<AttendanceStatusResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [wifiValidation, setWifiValidation] = useState<WifiValidationState>({
    isValid: null,
    currentWifi: null,
    loading: false,
  });
  const isCheckingWifi = React.useRef(false);

  useEffect(() => {
    loadStatus();
    checkWifiStatus();
    
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

  // Check Wi-Fi status when window gains focus (user switches back to app)
  useEffect(() => {
    if (!canMarkAttendance || !window.electronAPI) return;

    const handleFocus = () => {
      // Check Wi-Fi when user switches back to the app
      checkWifiStatus();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [canMarkAttendance]);

  // Check Wi-Fi status when window gains focus (user switches back to app)
  useEffect(() => {
    if (!canMarkAttendance || !window.electronAPI) return;

    const handleFocus = () => {
      // Check Wi-Fi when user switches back to the app (may have changed networks)
      checkWifiStatus();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [canMarkAttendance]);

  // Check Wi-Fi status periodically (every 20 seconds) if on desktop
  useEffect(() => {
    if (!canMarkAttendance) return;

    const interval = setInterval(() => {
      checkWifiStatus();
    }, 20000); // Check every 20 seconds

    return () => clearInterval(interval);
  }, [canMarkAttendance]);

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

  const checkWifiStatus = async () => {
    // Only check Wi-Fi if Electron API is available (desktop app)
    if (!window.electronAPI) {
      // Not in desktop app - Wi-Fi validation not applicable
      setWifiValidation({
        isValid: true, // Allow attendance for non-desktop sources
        currentWifi: null,
        loading: false,
      });
      return;
    }

    // Don't start a new check if one is already in progress
    if (isCheckingWifi.current) {
      return;
    }

    isCheckingWifi.current = true;
    setWifiValidation(prev => ({ ...prev, loading: true }));

    try {
      // Get current Wi-Fi info from Electron
      const wifiInfo: WifiInfo = await window.electronAPI.getCurrentWifi();

      if (!wifiInfo.ssid || wifiInfo.ssid.trim() === '') {
        setWifiValidation({
          isValid: false,
          currentWifi: { ssid: null, bssid: null },
          reason: 'No Wi-Fi network detected. Please connect to a Wi-Fi network.',
          loading: false,
        });
        isCheckingWifi.current = false;
        return;
      }

      // Validate Wi-Fi with backend
      const validation = await wifiService.validateWifi({
        ssid: wifiInfo.ssid,
        bssid: wifiInfo.bssid || undefined,
      });

      setWifiValidation({
        isValid: validation.allowed,
        currentWifi: wifiInfo,
        reason: validation.reason,
        loading: false,
      });
    } catch (err: any) {
      console.error('Failed to check Wi-Fi status:', err);
      // On error, show the error but don't mark as invalid if we can't verify
      // This allows the user to try again
      setWifiValidation({
        isValid: false,
        currentWifi: null,
        reason: err.response?.data?.message || 'Failed to verify Wi-Fi network. Please check your connection and try again.',
        loading: false,
      });
    } finally {
      isCheckingWifi.current = false;
    }
  };

  const handleCheckIn = async () => {
    if (!canMarkAttendance) return;
    
    // Re-validate Wi-Fi before check-in
    await checkWifiStatus();
    
    // Check if Wi-Fi is valid after validation
    if (wifiValidation.isValid === false) {
      setError(wifiValidation.reason || 'Wi-Fi network is not approved for attendance');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get Wi-Fi info if available
      let wifiInfo: WifiInfo | null = null;
      if (window.electronAPI) {
        try {
          wifiInfo = await window.electronAPI.getCurrentWifi();
        } catch (err) {
          console.error('Failed to get Wi-Fi info:', err);
        }
      }

      const record = await attendanceService.checkIn({
        source: AttendanceSource.DESKTOP,
        wifi: wifiInfo?.ssid ? {
          ssid: wifiInfo.ssid,
          bssid: wifiInfo.bssid || undefined,
        } : undefined,
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
    
    // Re-validate Wi-Fi before check-out
    await checkWifiStatus();
    
    // Check if Wi-Fi is valid after validation
    if (wifiValidation.isValid === false) {
      setError(wifiValidation.reason || 'Wi-Fi network is not approved for attendance');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get Wi-Fi info if available
      let wifiInfo: WifiInfo | null = null;
      if (window.electronAPI) {
        try {
          wifiInfo = await window.electronAPI.getCurrentWifi();
        } catch (err) {
          console.error('Failed to get Wi-Fi info:', err);
        }
      }

      const record = await attendanceService.checkOut({
        source: AttendanceSource.DESKTOP,
        wifi: wifiInfo?.ssid ? {
          ssid: wifiInfo.ssid,
          bssid: wifiInfo.bssid || undefined,
        } : undefined,
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

      {/* Wi-Fi Status Section - Only show in desktop app */}
      {window.electronAPI && canMarkAttendance && (
        <div className="self-attendance-wifi">
          <div className="wifi-info-header">
            <div className="wifi-info">
              <span className="wifi-label">Current Wi-Fi:</span>
              <span className="wifi-name">
                {wifiValidation.loading
                  ? 'Checking...'
                  : wifiValidation.currentWifi?.ssid || 'Not connected'}
              </span>
            </div>
            <button
              className="wifi-refresh-btn"
              onClick={checkWifiStatus}
              disabled={wifiValidation.loading}
              title="Refresh Wi-Fi status"
            >
              ↻
            </button>
          </div>
          {wifiValidation.isValid === false && (
            <div className="wifi-error">
              {wifiValidation.reason || 'Wi-Fi network is not approved for attendance'}
            </div>
          )}
          {wifiValidation.isValid === true && wifiValidation.currentWifi?.ssid && (
            <div className="wifi-success">✓ Connected to approved network</div>
          )}
        </div>
      )}

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
            disabled={
              loading || 
              !status.canCheckIn || 
              wifiValidation.loading ||
              (window.electronAPI && wifiValidation.isValid === false)
            }
            title={
              window.electronAPI && wifiValidation.isValid === false
                ? wifiValidation.reason || 'Wi-Fi network not approved'
                : undefined
            }
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

