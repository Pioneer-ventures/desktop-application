/**
 * API Service - Axios instance configuration
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { config } from '@/config';
import { authStore } from '@/store/authStore';

class ApiService {
  private instance: AxiosInstance;

  constructor() {
    this.instance = axios.create({
      baseURL: config.api.baseURL,
      timeout: config.api.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor - Add auth token
    this.instance.interceptors.request.use(
      (config) => {
        const token = authStore.getState().accessToken;
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        // For FormData, don't set Content-Type - browser will set it with boundary
        if (config.data instanceof FormData) {
          delete config.headers['Content-Type'];
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
        if (error.response?.status === 401) {
          authStore.getState().logout();
        }
        return Promise.reject(error);
      }
    );
  }

  public getInstance(): AxiosInstance {
    return this.instance;
  }
}

export const apiService = new ApiService();
export const api = apiService.getInstance();

