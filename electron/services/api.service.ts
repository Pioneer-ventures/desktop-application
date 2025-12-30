/**
 * API Service - Backend communication for main process
 * Uses axios for HTTP requests
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { sessionService } from './session.service';

// Local type definitions (to avoid importing from renderer)
interface AttendanceStatusResponse {
  status: 'NOT_STARTED' | 'CHECKED_IN' | 'CHECKED_OUT';
  today?: any;
  canCheckIn: boolean;
  canCheckOut: boolean;
}

interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  checkInTime: string;
  checkOutTime?: string;
  status: string;
  source: string;
  totalDuration?: number;
  createdAt: string;
  updatedAt: string;
}

interface CheckInRequest {
  source: string;
  location?: {
    latitude?: number;
    longitude?: number;
    address?: string;
  };
  wifi?: {
    ssid: string;
    bssid?: string;
  };
  ethernet?: {
    macAddress: string;
  };
  systemFingerprint?: string;
}

interface WifiValidationRequest {
  ssid?: string;
  bssid?: string;
  macAddress?: string;
}

interface WifiValidationResponse {
  allowed: boolean;
  reason?: string;
  wifiNetworkId?: string;
}

// Get API base URL from environment or use default
const API_BASE_URL = process.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v1';
const API_TIMEOUT = 30000;

class ApiService {
  private instance: AxiosInstance;

  constructor() {
    this.instance = axios.create({
      baseURL: API_BASE_URL,
      timeout: API_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  /**
   * Setup request/response interceptors
   */
  private setupInterceptors(): void {
    // Request interceptor - Add auth token
    this.instance.interceptors.request.use(
      async (config) => {
        const token = await sessionService.getAccessToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor - Handle errors
    this.instance.interceptors.response.use(
      (response) => {
        return response;
      },
      async (error: AxiosError) => {
        // Handle 401 Unauthorized - token might be expired
        if (error.response?.status === 401) {
          console.error('[ApiService] Authentication failed - session may be expired');
          // Don't retry - let the caller handle it
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * Get attendance status
   */
  async getAttendanceStatus(): Promise<AttendanceStatusResponse> {
    console.log('[ApiService] Getting attendance status...');
    try {
      const token = await sessionService.getAccessToken();
      console.log(`[ApiService] Access token available for status check: ${!!token}`);
      
      const response = await this.instance.get('/attendance/status');
      console.log('[ApiService] Attendance status response:', JSON.stringify(response.data, null, 2));
      return response.data.data;
    } catch (error: any) {
      console.error('[ApiService] Failed to get attendance status:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
      throw error;
    }
  }

  /**
   * Validate network (WiFi or Ethernet)
   */
  async validateNetwork(request: WifiValidationRequest): Promise<WifiValidationResponse> {
    console.log('[ApiService] Validating network with request:', JSON.stringify(request, null, 2));
    try {
      const token = await sessionService.getAccessToken();
      console.log(`[ApiService] Access token available for network validation: ${!!token}`);
      
      const response = await this.instance.post('/wifi/validate', request);
      console.log('[ApiService] Network validation response:', JSON.stringify(response.data, null, 2));
      return response.data.data;
    } catch (error: any) {
      console.error('[ApiService] Failed to validate network:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
      throw error;
    }
  }

  /**
   * Extract error message from axios error response
   */
  private extractErrorMessage(error: any): string {
    if (error.response?.data?.error) {
      return error.response.data.error;
    }
    if (error.response?.data?.message) {
      return error.response.data.message;
    }
    if (error.message) {
      return error.message;
    }
    return 'Unknown error occurred';
  }

  /**
   * Check in
   */
  async checkIn(request: CheckInRequest): Promise<AttendanceRecord> {
    console.log('[ApiService] Calling check-in API...');
    console.log('[ApiService] Check-in request:', JSON.stringify(request, null, 2));
    
    try {
      // Get access token before making request
      const token = await sessionService.getAccessToken();
      console.log(`[ApiService] Access token available: ${!!token}, length: ${token?.length || 0}`);
      
      const response = await this.instance.post('/attendance/check-in', request);
      console.log('[ApiService] ✅ Check-in API call successful');
      console.log('[ApiService] Response:', JSON.stringify(response.data, null, 2));
      return response.data.data;
    } catch (error: any) {
      console.error('[ApiService] ❌ Check-in API call failed');
      console.error('[ApiService] Error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers ? Object.keys(error.config.headers) : null,
        }
      });
      
      // Extract user-friendly error message
      const errorMessage = this.extractErrorMessage(error);
      
      // Create a custom error with the message
      const customError: any = new Error(errorMessage);
      customError.statusCode = error.response?.status || 500;
      customError.response = error.response;
      
      throw customError;
    }
  }

  /**
   * Get instance for custom requests
   */
  getInstance(): AxiosInstance {
    return this.instance;
  }
}

export const apiService = new ApiService();

