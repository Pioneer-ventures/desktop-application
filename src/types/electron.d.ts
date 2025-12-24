/**
 * Electron API Type Definitions
 */

export interface ElectronAPI {
  platform: string;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

