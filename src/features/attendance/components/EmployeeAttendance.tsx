/**
 * Employee Attendance Component
 * Allows employees to check in and check out
 */

import React, { useState, useEffect } from 'react';
import { attendanceService } from '@/services/attendance.service';
import { wifiService } from '@/services/wifi.service';
import { socketService } from '@/services/socket.service';
import {
  AttendanceSessionStatus,
  AttendanceSource,
  AttendanceStatusResponse,
  AttendanceRecord,
} from '@/types';
import { WifiInfo } from '@/types/electron';
import './EmployeeAttendance.css';

interface WifiValidationState {
  isValid: boolean | null; // null = checking, true = valid, false = invalid
  currentWifi: WifiInfo | null;
  reason?: string;
  loading: boolean;
}

export const EmployeeAttendance: React.FC = () => {
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

  // Load initial status
  useEffect(() => {
    loadStatus();
    checkWifiStatus();
    
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

  // Check Wi-Fi status when window gains focus (user switches back to app)
  useEffect(() => {
    if (!window.electronAPI) return;

    const handleFocus = () => {
      // Check Wi-Fi when user switches back to the app (may have changed networks)
      checkWifiStatus();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  // Check Wi-Fi status periodically (every 20 seconds) if on desktop
  useEffect(() => {
    if (!window.electronAPI) return;

    const interval = setInterval(() => {
      checkWifiStatus();
    }, 20000); // Check every 20 seconds

    return () => clearInterval(interval);
  }, []);

  const checkWifiStatus = async () => {
    // Prevent duplicate simultaneous checks
    if (isCheckingWifi.current || !window.electronAPI) return;

    try {
      isCheckingWifi.current = true;
      setWifiValidation((prev) => ({ ...prev, loading: true }));

      // Get current Wi-Fi info from Electron
      const wifiInfo: WifiInfo = await window.electronAPI.getCurrentWifi();

      if (!wifiInfo.ssid) {
        setWifiValidation({
          isValid: false,
          currentWifi: null,
          reason: 'No Wi-Fi network connected',
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
      console.error('Wi-Fi validation error:', err);
      setWifiValidation({
        isValid: false,
        currentWifi: null,
        reason: 'Failed to validate Wi-Fi network',
        loading: false,
      });
    } finally {
      isCheckingWifi.current = false;
    }
  };

  const loadStatus = async () => {
    try {
      const statusData = await attendanceService.getStatus();
      setStatus(statusData);
      setTodayRecord(statusData.today || null);
      setError(null);
    } catch (err: any) {
      // Extract user-friendly error message from API response
      const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to load attendance status. Please refresh the page.';
      setError(errorMessage);
    }
  };

  const handleCheckIn = async () => {
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
      // Extract user-friendly error message from API response
      const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to check in. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
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
      // Extract user-friendly error message from API response
      const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to check out. Please try again.';
      setError(errorMessage);
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

      {/* Wi-Fi Status Section - Only show in desktop app */}
      {window.electronAPI && (
        <div className="attendance-wifi">
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
          {wifiValidation.isValid === true && (
            <div className="wifi-success">✓ Connected to approved Wi-Fi network</div>
          )}
        </div>
      )}

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
            disabled={
              loading ||
              !status.canCheckIn ||
              (window.electronAPI && wifiValidation.isValid === false) ||
              (window.electronAPI && wifiValidation.loading)
            }
          >
            {loading ? 'Processing...' : 'Check In'}
          </button>
          <button
            className="btn-check-out"
            onClick={handleCheckOut}
            disabled={
              loading ||
              !status.canCheckOut ||
              (window.electronAPI && wifiValidation.isValid === false) ||
              (window.electronAPI && wifiValidation.loading)
            }
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

