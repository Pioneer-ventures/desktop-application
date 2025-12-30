/**
 * Storage Service - Secure storage for auto attendance state
 * Uses Electron's safeStorage API for sensitive data
 */

import { app, safeStorage } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

// Local type definitions
interface AutoAttendanceStorage {
  lastCheckInAttemptTimestamp?: string;
  lastCheckInSessionId?: string;
  lastNetworkUsed?: {
    type: 'wifi' | 'ethernet';
    ssid?: string;
    bssid?: string;
    macAddress?: string;
  };
  lastTriggerAttempts?: Record<string, string>; // timestamp per trigger
}

interface AutoAttendanceConfig {
  autoCheckInEnabled: boolean;
  autoStartEnabled: boolean;
  showNotifications: boolean;
}

const STORAGE_FILE = 'auto-attendance-storage.json';
const CONFIG_FILE = 'auto-attendance-config.json';

class StorageService {
  private storagePath: string;
  private configPath: string;
  private isEncryptionAvailable: boolean;

  constructor() {
    const userDataPath = app.getPath('userData');
    this.storagePath = path.join(userDataPath, STORAGE_FILE);
    this.configPath = path.join(userDataPath, CONFIG_FILE);
    this.isEncryptionAvailable = safeStorage.isEncryptionAvailable();
  }

  /**
   * Get storage file path
   */
  private getStoragePath(): string {
    return this.storagePath;
  }

  /**
   * Get config file path
   */
  private getConfigPath(): string {
    return this.configPath;
  }

  /**
   * Read and decrypt storage data
   */
  private readStorage(): AutoAttendanceStorage {
    try {
      if (!fs.existsSync(this.storagePath)) {
        return {};
      }

      const data = fs.readFileSync(this.storagePath, 'utf-8');
      const parsed = JSON.parse(data);

      // If encrypted, decrypt it
      if (parsed.encrypted && this.isEncryptionAvailable) {
        const encrypted = Buffer.from(parsed.data, 'base64');
        const decrypted = safeStorage.decryptString(encrypted);
        return JSON.parse(decrypted);
      }

      return parsed;
    } catch (error) {
      console.error('[StorageService] Failed to read storage:', error);
      return {};
    }
  }

  /**
   * Write and encrypt storage data
   */
  private writeStorage(data: AutoAttendanceStorage): void {
    try {
      const jsonData = JSON.stringify(data);

      // If encryption available, encrypt the data
      if (this.isEncryptionAvailable) {
        const encrypted = safeStorage.encryptString(jsonData);
        const encryptedData = {
          encrypted: true,
          data: encrypted.toString('base64'),
        };
        fs.writeFileSync(this.storagePath, JSON.stringify(encryptedData), 'utf-8');
      } else {
        // Fallback to plain JSON (less secure but functional)
        fs.writeFileSync(this.storagePath, jsonData, 'utf-8');
      }
    } catch (error) {
      console.error('[StorageService] Failed to write storage:', error);
    }
  }

  /**
   * Read config data
   */
  private readConfig(): AutoAttendanceConfig {
    try {
      if (!fs.existsSync(this.configPath)) {
        return {
          autoCheckInEnabled: true,
          autoStartEnabled: true,
          showNotifications: true,
        };
      }

      const data = fs.readFileSync(this.configPath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error('[StorageService] Failed to read config:', error);
      return {
        autoCheckInEnabled: true,
        autoStartEnabled: true,
        showNotifications: true,
      };
    }
  }

  /**
   * Write config data
   */
  private writeConfig(config: AutoAttendanceConfig): void {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2), 'utf-8');
    } catch (error) {
      console.error('[StorageService] Failed to write config:', error);
    }
  }

  /**
   * Get auto attendance storage
   */
  getStorage(): AutoAttendanceStorage {
    return this.readStorage();
  }

  /**
   * Update auto attendance storage
   */
  updateStorage(updates: Partial<AutoAttendanceStorage>): void {
    const current = this.readStorage();
    const updated = { ...current, ...updates };
    this.writeStorage(updated);
  }

  /**
   * Get last check-in attempt timestamp for today
   */
  getLastCheckInAttemptToday(): Date | null {
    const storage = this.readStorage();
    if (!storage.lastCheckInAttemptTimestamp) {
      return null;
    }

    const lastAttempt = new Date(storage.lastCheckInAttemptTimestamp);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if last attempt was today
    if (lastAttempt >= today) {
      return lastAttempt;
    }

    return null;
  }

  /**
   * Set last check-in attempt timestamp
   */
  setLastCheckInAttempt(timestamp: Date, sessionId?: string): void {
    this.updateStorage({
      lastCheckInAttemptTimestamp: timestamp.toISOString(),
      lastCheckInSessionId: sessionId,
    });
  }

  /**
   * Get last trigger attempt timestamp
   */
  getLastTriggerAttempt(trigger: string): Date | null {
    const storage = this.readStorage();
    const lastAttempts = storage.lastTriggerAttempts || {};
    const timestamp = lastAttempts[trigger as keyof typeof lastAttempts];

    if (!timestamp) {
      return null;
    }

    return new Date(timestamp);
  }

  /**
   * Set last trigger attempt timestamp
   */
  setLastTriggerAttempt(trigger: string, timestamp: Date): void {
    const storage = this.readStorage();
    const lastAttempts = storage.lastTriggerAttempts || {};
    lastAttempts[trigger as keyof typeof lastAttempts] = timestamp.toISOString();

    this.updateStorage({
      lastTriggerAttempts: lastAttempts,
    });
  }

  /**
   * Get config
   */
  getConfig(): AutoAttendanceConfig {
    return this.readConfig();
  }

  /**
   * Update config
   */
  updateConfig(updates: Partial<AutoAttendanceConfig>): void {
    const current = this.readConfig();
    const updated = { ...current, ...updates };
    this.writeConfig(updated);
  }

  /**
   * Clear storage (for testing/debugging)
   */
  clearStorage(): void {
    try {
      if (fs.existsSync(this.storagePath)) {
        fs.unlinkSync(this.storagePath);
      }
    } catch (error) {
      console.error('[StorageService] Failed to clear storage:', error);
    }
  }
}

export const storageService = new StorageService();

