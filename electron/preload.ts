import { contextBridge, ipcRenderer } from 'electron';

export interface WifiInfo {
  ssid: string | null;
  bssid: string | null;
}

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Platform information
  platform: process.platform,
  
  // Wi-Fi detection
  getCurrentWifi: (): Promise<WifiInfo> => {
    return ipcRenderer.invoke('get-current-wifi');
  },
});

