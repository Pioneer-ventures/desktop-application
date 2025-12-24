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

class AttendanceService {
  /**
   * Check-in
   * For desktop source, automatically includes Wi-Fi information if available
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

    const response = await api.post('/attendance/check-in', request);
    return response.data.data;
  }

  /**
   * Check-out
   * For desktop source, automatically includes Wi-Fi information if available
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

