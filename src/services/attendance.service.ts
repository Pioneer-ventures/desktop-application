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
} from '@/types';

class AttendanceService {
  /**
   * Check-in
   */
  async checkIn(request: CheckInRequest): Promise<AttendanceRecord> {
    const response = await api.post('/attendance/check-in', request);
    return response.data.data;
  }

  /**
   * Check-out
   */
  async checkOut(request: CheckOutRequest): Promise<AttendanceRecord> {
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

