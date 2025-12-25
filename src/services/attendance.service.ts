/**
 * Attendance Service - API calls for attendance
 */

import { api } from './api';
import {
  AttendanceStatusResponse,
  AttendanceRecord,
  CheckInRequest,
  CheckOutRequest,
  AttendanceDashboardData,
  AttendanceSource,
} from '@/types';
import { WifiInfo } from '@/types/electron';
import { getSystemFingerprint } from '@/utils/systemFingerprint';

class AttendanceService {
  /**
   * Check-in
   * For desktop source, automatically includes Wi-Fi information and system fingerprint (REQUIRED)
   */
  async checkIn(request: CheckInRequest): Promise<AttendanceRecord> {
    // For desktop source, try to get Wi-Fi info if not provided
    if (request.source === AttendanceSource.DESKTOP && !request.wifi && window.electronAPI) {
      try {
        const wifiInfo: WifiInfo = await window.electronAPI.getCurrentWifi();
        if (wifiInfo.ssid) {
          request.wifi = {
            ssid: wifiInfo.ssid,
            bssid: wifiInfo.bssid || undefined,
          };
        }
      } catch (error) {
        console.error('Failed to get Wi-Fi info:', error);
        // Continue without Wi-Fi info - backend will reject if required
      }
    }

    // Add system fingerprint for device tracking (REQUIRED for desktop)
    if (request.source === AttendanceSource.DESKTOP) {
      try {
        const fingerprint = await getSystemFingerprint();
        if (!fingerprint || fingerprint.trim() === '') {
          throw new Error('Generated fingerprint is empty');
        }
        request.systemFingerprint = fingerprint;
      } catch (error) {
        console.error('[AttendanceService] Failed to get system fingerprint:', error);
        throw new Error('Failed to generate system fingerprint. Cannot mark attendance.');
      }
    } else {
      // For non-desktop, try to get fingerprint but don't fail if it doesn't work
      try {
        const fingerprint = await getSystemFingerprint();
        if (fingerprint && fingerprint.trim() !== '') {
          request.systemFingerprint = fingerprint;
        }
      } catch (error) {
        console.warn('[AttendanceService] Failed to get system fingerprint for non-desktop:', error);
        // Continue without fingerprint for non-desktop
      }
    }

    const response = await api.post('/attendance/check-in', request);
    return response.data.data;
  }

  /**
   * Check-out
   * For desktop source, automatically includes Wi-Fi information and system fingerprint (REQUIRED)
   */
  async checkOut(request: CheckOutRequest): Promise<AttendanceRecord> {
    // For desktop source, try to get Wi-Fi info if not provided
    if (request.source === AttendanceSource.DESKTOP && !request.wifi && window.electronAPI) {
      try {
        const wifiInfo: WifiInfo = await window.electronAPI.getCurrentWifi();
        if (wifiInfo.ssid) {
          request.wifi = {
            ssid: wifiInfo.ssid,
            bssid: wifiInfo.bssid || undefined,
          };
        }
      } catch (error) {
        console.error('Failed to get Wi-Fi info:', error);
        // Continue without Wi-Fi info - backend will reject if required
      }
    }

    // Add system fingerprint for device tracking (REQUIRED for desktop)
    if (request.source === AttendanceSource.DESKTOP) {
      try {
        const fingerprint = await getSystemFingerprint();
        if (!fingerprint || fingerprint.trim() === '') {
          throw new Error('Generated fingerprint is empty');
        }
        request.systemFingerprint = fingerprint;
      } catch (error) {
        console.error('[AttendanceService] Failed to get system fingerprint:', error);
        throw new Error('Failed to generate system fingerprint. Cannot mark attendance.');
      }
    } else {
      // For non-desktop, try to get fingerprint but don't fail if it doesn't work
      try {
        const fingerprint = await getSystemFingerprint();
        if (fingerprint && fingerprint.trim() !== '') {
          request.systemFingerprint = fingerprint;
        }
      } catch (error) {
        console.warn('[AttendanceService] Failed to get system fingerprint for non-desktop:', error);
        // Continue without fingerprint for non-desktop
      }
    }

    const response = await api.post('/attendance/check-out', request);
    return response.data.data;
  }

  /**
   * Get current attendance status
   */
  async getStatus(): Promise<AttendanceStatusResponse> {
    const response = await api.get('/attendance/status');
    return response.data.data;
  }

  /**
   * Get attendance history
   */
  async getHistory(params?: {
    startDate?: string;
    endDate?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    records: AttendanceRecord[];
    total: number;
    page: number;
    limit: number;
  }> {
    const response = await api.get('/attendance/history', { params });
    return response.data.data;
  }

  /**
   * Get dashboard data (HR/Manager/Admin only)
   */
  async getDashboard(params?: {
    date?: string;
    department?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<AttendanceDashboardData> {
    const response = await api.get('/attendance/dashboard', { params });
    return response.data.data;
  }
}

export const attendanceService = new AttendanceService();

