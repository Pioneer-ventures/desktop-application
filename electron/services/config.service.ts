/**
 * Config Service - User preferences for auto attendance
 */

import { storageService } from './storage.service';

// Local type definitions
interface AutoAttendanceConfig {
  autoCheckInEnabled: boolean;
  autoStartEnabled: boolean;
  showNotifications: boolean;
}

class ConfigService {
  /**
   * Get current config
   */
  getConfig(): AutoAttendanceConfig {
    return storageService.getConfig();
  }

  /**
   * Update config
   */
  updateConfig(updates: Partial<AutoAttendanceConfig>): void {
    storageService.updateConfig(updates);
  }

  /**
   * Check if auto check-in is enabled
   */
  isAutoCheckInEnabled(): boolean {
    return this.getConfig().autoCheckInEnabled;
  }

  /**
   * Set auto check-in enabled
   */
  setAutoCheckInEnabled(enabled: boolean): void {
    this.updateConfig({ autoCheckInEnabled: enabled });
  }

  /**
   * Check if auto-start is enabled
   */
  isAutoStartEnabled(): boolean {
    return this.getConfig().autoStartEnabled;
  }

  /**
   * Set auto-start enabled
   */
  setAutoStartEnabled(enabled: boolean): void {
    this.updateConfig({ autoStartEnabled: enabled });
  }

  /**
   * Check if notifications are enabled
   */
  areNotificationsEnabled(): boolean {
    return this.getConfig().showNotifications;
  }

  /**
   * Set notifications enabled
   */
  setNotificationsEnabled(enabled: boolean): void {
    this.updateConfig({ showNotifications: enabled });
  }
}

export const configService = new ConfigService();

