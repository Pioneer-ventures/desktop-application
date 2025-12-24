/**
 * Electron API Type Definitions
 */

export interface WifiInfo {
  ssid: string | null;
  bssid: string | null;
}

export interface ElectronAPI {
  platform: string;
  getCurrentWifi: () => Promise<WifiInfo>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

