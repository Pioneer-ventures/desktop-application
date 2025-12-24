/**
 * Wi-Fi Service - API calls for Wi-Fi validation and management
 */

import { api } from './api';

export interface WifiNetwork {
  id: string;
  ssid: string;
  bssid?: string;
  location?: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface WifiValidationRequest {
  ssid: string;
  bssid?: string;
}

export interface WifiValidationResponse {
  allowed: boolean;
  reason?: string;
  wifiNetworkId?: string;
}

export interface CreateWifiNetworkRequest {
  ssid: string;
  bssid?: string;
  location?: string;
}

export interface UpdateWifiNetworkRequest {
  ssid?: string;
  bssid?: string;
  location?: string;
  isActive?: boolean;
}

class WifiService {
  /**
   * Validate Wi-Fi network for attendance
   */
  async validateWifi(request: WifiValidationRequest): Promise<WifiValidationResponse> {
    const response = await api.post('/wifi/validate', request);
    return response.data.data;
  }

  /**
   * Get all Wi-Fi networks (HR/Admin only)
   */
  async getAllWifiNetworks(includeInactive = false): Promise<WifiNetwork[]> {
    const response = await api.get('/wifi', {
      params: { includeInactive },
    });
    return response.data.data;
  }

  /**
   * Get Wi-Fi network by ID (HR/Admin only)
   */
  async getWifiNetworkById(id: string): Promise<WifiNetwork> {
    const response = await api.get(`/wifi/${id}`);
    return response.data.data;
  }

  /**
   * Create Wi-Fi network (HR/Admin only)
   */
  async createWifiNetwork(request: CreateWifiNetworkRequest): Promise<WifiNetwork> {
    const response = await api.post('/wifi', request);
    return response.data.data;
  }

  /**
   * Update Wi-Fi network (HR/Admin only)
   */
  async updateWifiNetwork(id: string, request: UpdateWifiNetworkRequest): Promise<WifiNetwork> {
    const response = await api.put(`/wifi/${id}`, request);
    return response.data.data;
  }

  /**
   * Delete Wi-Fi network (HR/Admin only)
   */
  async deleteWifiNetwork(id: string): Promise<void> {
    await api.delete(`/wifi/${id}`);
  }
}

export const wifiService = new WifiService();

