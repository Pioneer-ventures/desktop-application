import { app, BrowserWindow, Menu, Tray, nativeImage, dialog, ipcMain, powerMonitor } from 'electron';
import { autoUpdater } from 'electron-updater';
import * as path from 'path';
import * as fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as os from 'os';

// Network utilities (lightweight, load immediately)
import { getCurrentNetwork, getCurrentWifi, NetworkInfo, WifiInfo } from './utils/network.util';

// CRITICAL: Lazy load heavy services - don't import at top level
// This dramatically speeds up startup time (270MB app loads instantly)
let autoAttendanceService: any = null;
let sessionService: any = null;
let configService: any = null;

// Lazy service loaders
function getConfigService() {
  if (!configService) {
    configService = require('./services/config.service').configService;
  }
  return configService;
}

function getSessionService() {
  if (!sessionService) {
    sessionService = require('./services/session.service').sessionService;
  }
  return sessionService;
}

function getAutoAttendanceService() {
  if (!autoAttendanceService) {
    autoAttendanceService = require('./services/auto-attendance.service').autoAttendanceService;
  }
  return autoAttendanceService;
}

const execAsync = promisify(exec);
// Keep a global reference of the window object
let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
const shouldStartHidden = process.argv.includes('--hidden');

// OPTIMIZATION: Performance flags for faster startup
app.commandLine.appendSwitch('--disable-renderer-backgrounding');
app.commandLine.appendSwitch('--disable-background-timer-throttling');
app.commandLine.appendSwitch('--disable-backgrounding-occluded-windows');

// Suppress Electron/Chromium cache errors on Windows
// These are harmless permission warnings that can be safely ignored
if (process.platform === 'win32') {
  // Set a custom cache directory to avoid permission issues
  const cachePath = path.join(app.getPath('userData'), 'Cache');
  app.setPath('cache', cachePath);

  // Suppress console errors for cache issues (these are non-critical)
  const originalConsoleError = console.error;
  console.error = (...args: any[]) => {
    const message = args[0]?.toString() || '';
    // Filter out cache-related errors
    if (
      message.includes('cache_util_win.cc') ||
      message.includes('Unable to move the cache') ||
      message.includes('Unable to create cache') ||
      message.includes('Gpu Cache Creation failed')
    ) {
      // Silently ignore cache errors
      return;
    }
    originalConsoleError.apply(console, args);
  };
}

// Get the logo path
function getIconPath(): string | undefined {
  // Try multiple possible locations
  const possiblePaths = [
    // Development paths
    path.join(__dirname, '../../public/assets/logo.png'),
    path.join(process.cwd(), 'public/assets/logo.png'),
    // Production paths
    path.join(__dirname, '../assets/logo.png'),
    path.join(__dirname, '../../assets/logo.png'),
    // Packaged app paths
    path.join(process.resourcesPath, 'assets/logo.png'),
    path.join(app.getAppPath(), 'assets/logo.png'),
  ];

  // Find the first path that exists
  for (const iconPath of possiblePaths) {
    if (fs.existsSync(iconPath)) {
      return iconPath;
    }
  }

  return undefined;
}

/**
 * STAGE 2: Create window only when user needs it
 * This is called on-demand when user clicks tray icon
 * Uses progressive loading: instant loading screen → actual app
 */
function createWindow(): BrowserWindow {
  if (mainWindow && !mainWindow.isDestroyed()) {
    return mainWindow;
  }

  const iconPath = getIconPath();

  // Create window but don't show yet - we'll show after content loads
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false, // Don't show until ready - prevents white flash
    backgroundColor: '#ffffff', // Match your app theme
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true,
      devTools: isDev,
      backgroundThrottling: false, // Critical: keep responsive in background
      spellcheck: false, // Save memory
    },
    titleBarStyle: 'default',
    autoHideMenuBar: true,
    icon: iconPath,
  });

  Menu.setApplicationMenu(null);

  // Load instant loading screen first (data URI - no file I/O)
  mainWindow.loadURL(`data:text/html,${encodeURIComponent(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          margin: 0;
          padding: 0;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        .loader {
          text-align: center;
        }
        .spinner {
          border: 4px solid rgba(255,255,255,0.3);
          border-top: 4px solid white;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
          margin: 0 auto 20px;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        h2 { margin: 0; font-weight: 300; }
      </style>
    </head>
    <body>
      <div class="loader">
        <div class="spinner"></div>
        <h2>Loading HRMS Desktop...</h2>
      </div>
    </body>
    </html>
  `)}`);

  // Show window immediately with loading screen (user sees instant feedback)
  mainWindow.show();

  // Now load the actual app (happens in background)
  const loadActualApp = () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;

    if (isDev) {
      mainWindow.loadURL('http://localhost:5173');
    } else {
      const possiblePaths = [
        path.join(__dirname, '../dist/index.html'),
        path.join(__dirname, '../../dist/index.html'),
        path.join(process.resourcesPath, 'app/dist/index.html'),
        path.join(app.getAppPath(), 'dist/index.html'),
      ];

      let loaded = false;
      for (const htmlPath of possiblePaths) {
        if (fs.existsSync(htmlPath)) {
          const normalizedPath = htmlPath.replace(/\\/g, '/');
          const fileUrl = `file:///${normalizedPath}`;
          mainWindow.loadURL(fileUrl);
          loaded = true;
          break;
        }
      }

      if (!loaded) {
        mainWindow.loadURL(`data:text/html,${encodeURIComponent(`
          <html>
            <head><title>Error</title></head>
            <body style="font-family: Arial; padding: 40px; text-align: center;">
              <h1>Application Error</h1>
              <p>Could not load the application files.</p>
              <p>Please reinstall the application.</p>
            </body>
          </html>
        `)}`);
      }

      mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        if (errorCode !== -3) {
          console.error('Failed to load page:', errorDescription);
        }
      });
    }
  };

  // Load actual app after a tiny delay (makes loading screen visible)
  setTimeout(loadActualApp, 100);

  if (isDev) {
    mainWindow.webContents.once('did-finish-load', () => {
      mainWindow?.webContents.openDevTools();
    });
  }

  mainWindow.on('close', (event) => {
    if (!appIsQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on('closed', () => {
    getSessionService().setMainWindow(null);
    mainWindow = null;
    windowCreated = false;
  });

  // Initialize services now that window exists
  initializeServices();

  return mainWindow;
}

/**
 * Initialize heavy services only when needed
 */
function initializeServices(): void {
  if (servicesInitialized) return;
  servicesInitialized = true;

  console.log('[Main] Initializing services (lazy load)...');

  const sessionSvc = getSessionService();
  sessionSvc.setMainWindow(mainWindow);

  // Defer auto-attendance setup (happens in background)
  setTimeout(() => {
    setupAutoAttendance();
  }, 1000);

  // Defer auto-updater (not critical for startup)
  setTimeout(() => {
    setupAutoUpdater();
  }, 5000);
}

/**
 * STAGE 1: Create ultra-lightweight tray (instant)
 * This appears immediately - no window, no React, no heavy services
 */
function createTray(): void {
  const iconPath = getIconPath();
  if (!iconPath) {
    console.error('Icon not found, using default');
    return;
  }

  const icon = nativeImage.createFromPath(iconPath);
  tray = new Tray(icon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open HRMS Desktop',
      click: () => {
        if (!windowCreated || !mainWindow || mainWindow.isDestroyed()) {
          createWindow();
          windowCreated = true;
        } else {
          if (mainWindow.isMinimized()) mainWindow.restore();
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    {
      type: 'separator',
    },
    {
      label: 'View System Logs',
      click: () => {
        if (!windowCreated || !mainWindow || mainWindow.isDestroyed()) {
          createWindow();
          windowCreated = true;
          setTimeout(() => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('open-logs-viewer');
            }
          }, 1000);
        } else {
          mainWindow.show();
          mainWindow.focus();
          mainWindow.webContents.send('open-logs-viewer');
        }
      },
    },
    {
      type: 'separator',
    },
    {
      label: 'Quit',
      click: () => {
        appIsQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setToolTip('HRMS Desktop');
  tray.setContextMenu(contextMenu);

  // Single click to open (Windows)
  if (process.platform === 'win32') {
    tray.on('click', () => {
      if (!windowCreated || !mainWindow || mainWindow.isDestroyed()) {
        createWindow();
        windowCreated = true;
      } else {
        if (mainWindow.isVisible()) {
          mainWindow.hide();
        } else {
          if (mainWindow.isMinimized()) mainWindow.restore();
          mainWindow.show();
          mainWindow.focus();
        }
      }
    });
  }

  // Double-click to show window (macOS/Linux)
  tray.on('double-click', () => {
    if (!windowCreated || !mainWindow || mainWindow.isDestroyed()) {
      createWindow();
      windowCreated = true;
    } else {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// Disable hardware acceleration if causing issues (uncomment if needed)
// app.disableHardwareAcceleration();

// Prevent app from quitting when all windows are closed
let appIsQuitting = false;
let windowCreated = false;
let servicesInitialized = false;

// Setup auto-start configuration
function setupAutoStart(): void {
  try {
    const configSvc = getConfigService();
    const autoStartEnabled = configSvc.isAutoStartEnabled();

    app.setLoginItemSettings({
      openAtLogin: autoStartEnabled,
      openAsHidden: true, // Start minimized to tray
      name: 'HRMS Desktop',
      args: ['--hidden'], // Hidden flag for startup (ultra-fast tray-only mode)
    });
  } catch (error) {
    console.error('[AutoStart] Failed to configure auto-start:', error);
  }
}

// Setup auto attendance system (deferred/lazy)
function setupAutoAttendance(): void {
  const autoAttendSvc = getAutoAttendanceService();

  // System wake detection
  if (powerMonitor) {
    powerMonitor.on('resume', () => {
      setTimeout(() => {
        autoAttendSvc.attemptAutoCheckIn('system_wake').catch((error: any) => {
          console.error('[AutoAttendance] System wake check-in failed:', error);
        });
      }, 5000);
    });
  }

  // Network change detection - deferred and lightweight
  let lastNetworkState: string | null = null;
  let networkChangeDebounceTimer: NodeJS.Timeout | null = null;

  const checkNetworkChange = async () => {
    try {
      const networkInfo = await getCurrentNetwork();
      const currentState = JSON.stringify({
        type: networkInfo.type,
        ssid: networkInfo.wifi?.ssid,
        bssid: networkInfo.wifi?.bssid,
        macAddress: networkInfo.ethernet?.macAddress,
      });

      if (lastNetworkState !== null && lastNetworkState !== currentState) {
        if (networkChangeDebounceTimer) {
          clearTimeout(networkChangeDebounceTimer);
        }
        networkChangeDebounceTimer = setTimeout(() => {
          autoAttendSvc.attemptAutoCheckIn('network_change').catch((error: any) => {
            console.error('[AutoAttendance] Network change check-in failed:', error);
          });
        }, 3000);
      }

      lastNetworkState = currentState;
    } catch (error) {
      console.error('[AutoAttendance] Network change detection error:', error);
    }
  };

  // Start polling after delay (not blocking startup)
  setTimeout(() => {
    checkNetworkChange();
    setInterval(checkNetworkChange, 10000); // Poll every 10 seconds
  }, 5000);
}

// Configure auto-updater (deferred/lazy)
function setupAutoUpdater(): void {
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  if (!isDev) {
    // Check for updates 30 seconds after startup (not blocking)
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch(() => {
        // Silently fail - updates aren't critical
      });
    }, 30000);

    setInterval(() => {
      autoUpdater.checkForUpdates();
    }, 4 * 60 * 60 * 1000);
  }

  // Handle update available
  autoUpdater.on('update-available', (info) => {
    if (!mainWindow) return;

    dialog
      .showMessageBox(mainWindow, {
        type: 'info',
        title: 'Update Available',
        message: `A new version (${info.version}) is available.`,
        detail: 'Would you like to download and install it now?',
        buttons: ['Download Now', 'Later'],
        defaultId: 0,
        cancelId: 1,
      })
      .then((result) => {
        if (result.response === 0) {
          autoUpdater.downloadUpdate();
        }
      });
  });

  // Handle update downloaded
  autoUpdater.on('update-downloaded', (info) => {
    if (!mainWindow) return;

    dialog
      .showMessageBox(mainWindow, {
        type: 'info',
        title: 'Update Ready',
        message: 'Update downloaded. The application will restart to install the update.',
        buttons: ['Restart Now', 'Later'],
        defaultId: 0,
        cancelId: 1,
      })
      .then((result) => {
        if (result.response === 0) {
          autoUpdater.quitAndInstall(false, true);
        }
      });
  });

  // Handle update errors (silently in production)
  autoUpdater.on('error', (error) => {
    if (isDev) {
      console.error('Auto-updater error:', error);
    }
  });
}

// Prevent multiple instances of the app
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  // Another instance is already running, quit this one
  app.quit();
} else {
  // Handle when a second instance is attempted
  app.on('second-instance', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.show();
      mainWindow.focus();
    } else {
      createWindow();
      windowCreated = true;
    }
  });

  // REVOLUTIONARY: Ultra-fast startup - only tray, no window
  app.whenReady().then(() => {
    console.log('[Main] App ready - starting ultra-fast initialization...');

    // Lightweight operations only
    const iconPath = getIconPath();
    if (iconPath) {
      if (process.platform === 'darwin' && app.dock) {
        app.dock.setIcon(iconPath);
      }
      if (process.platform === 'win32') {
        app.setAppUserModelId('com.hrms.desktop');
      }
    }

    setupAutoStart(); // Lightweight
    createTray(); // INSTANT - this is all user sees

    // Setup IPC handlers (lightweight)
    setupIpcHandlers();

    // If not starting hidden, create window immediately
    // Otherwise, window is created on-demand when user clicks tray
    if (!shouldStartHidden) {
      createWindow();
      windowCreated = true;
    }

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
        windowCreated = true;
      } else if (mainWindow) {
        if (mainWindow.isMinimized()) {
          mainWindow.restore();
        }
        mainWindow.show();
        mainWindow.focus();
      }
    });

    console.log('[Main] Ultra-fast startup complete! Tray icon ready.');
  });
}

// Network detection functions are now in utils/network.util.ts
// Keeping IPC handlers here for backward compatibility

/**
 * Get MAC address of Ethernet adapter (deprecated - use network.util)
 * @deprecated Use getEthernetMacAddress from utils/network.util
 */
async function getEthernetMacAddress(): Promise<{ macAddress: string | null; adapterName?: string }> {
  const platform = process.platform;
 

  try {
    if (platform === 'win32') {

      // Windows: Use getmac command and ipconfig to find active Ethernet adapters
      try {
        // Method 1: Use ipconfig /all to find active adapters with IP addresses (most reliable)

        const { stdout: ipconfigOutput } = await execAsync('ipconfig /all');

        const ipconfigLines = ipconfigOutput.split(/\r?\n/);


        let currentAdapter = '';
        let currentMac = '';
        let hasIpAddress = false;
        const activeAdapters: Array<{ name: string; mac: string }> = [];

        for (let i = 0; i < ipconfigLines.length; i++) {
          const line = ipconfigLines[i].trim();

          // Check for adapter name (ends with : and doesn't start with space, not an IP line)
          if (line && line.endsWith(':') && !line.startsWith(' ') && !line.match(/^\d+\./)) {
            // Save previous adapter if it had MAC (even without IP, as USB adapters might show "Media disconnected" but still work)
            if (currentAdapter && currentMac) {
              // Only check if it's not WiFi
              if (!/wireless|wlan|wi-fi|802\.11|wifi|qualcomm.*wireless|qca.*wireless/i.test(currentAdapter)) {
                // Skip loopback/virtual but keep USB Ethernet and all Ethernet adapters
                if (!/loopback|tunneling|isatap|teredo|6to4|vmware.*adapter|virtualbox.*adapter|hyper-v.*virtual|microsoft.*wifi.*direct|bluetooth/i.test(currentAdapter)) {
                  // Prefer adapters with IP, but also include those without (for USB Ethernet that might show "Media disconnected")
                  if (hasIpAddress) {
                    activeAdapters.unshift({ name: currentAdapter, mac: currentMac }); // Put at front
                  } else {
                    activeAdapters.push({ name: currentAdapter, mac: currentMac }); // Put at back
                  }
                }
              }
            }
            // Reset for new adapter
            currentAdapter = line.replace(/:$/, '').trim();
            currentMac = '';
            hasIpAddress = false;
          }

          // Look for Physical Address
          if (line.includes('Physical Address') || line.includes('Physical address')) {
            const macMatch = line.match(/([0-9A-F]{2}[:-]){5}([0-9A-F]{2})/i);
            if (macMatch && currentAdapter) {
              currentMac = macMatch[0].replace(/-/g, ':').toUpperCase();

            }
          }

          // Check for IPv4 Address (indicates active connection)
          // Match IPv4 Address lines, but exclude Autoconfiguration ones
          if (line.includes('IPv4 Address') && !line.includes('Autoconfiguration')) {
            // Extract IP address, handling (Preferred) suffix
            const ipMatch = line.match(/IPv4 Address[^:]*:\s*(\d+\.\d+\.\d+\.\d+)(?:\(Preferred\))?/i);
            if (ipMatch && ipMatch[1] !== '0.0.0.0') {
              hasIpAddress = true;

            }
          }
        }

        // Save last adapter if it had MAC
        if (currentAdapter && currentMac) {
          if (!/wireless|wlan|wi-fi|802\.11|wifi|qualcomm.*wireless|qca.*wireless/i.test(currentAdapter)) {
            if (!/loopback|tunneling|isatap|teredo|6to4|vmware.*adapter|virtualbox.*adapter|hyper-v.*virtual|microsoft.*wifi.*direct|bluetooth/i.test(currentAdapter)) {
              if (hasIpAddress) {
                activeAdapters.unshift({ name: currentAdapter, mac: currentMac });
              } else {
                activeAdapters.push({ name: currentAdapter, mac: currentMac });
              }
            }
          }
        }

        // Return first adapter (prioritizes those with IP addresses)
 
        if (activeAdapters.length > 0) {
          const adapter = activeAdapters[0];
 
          return { macAddress: adapter.mac, adapterName: adapter.name };
        }

        // Fallback: Try getmac as backup (for adapters not showing in ipconfig)

        try {
          const { stdout: getmacOutput } = await execAsync('getmac /fo csv /nh /v');

          const getmacLines = getmacOutput.trim().split(/\r?\n/).filter(line => line.trim());


          for (const line of getmacLines) {
            // Format: "Connection Name","Network Adapter","Physical Address","Transport Name"
            const csvMatch = line.match(/^"([^"]*)","([^"]*)","([0-9A-F-]{17})"/i);
            if (csvMatch) {
              const connectionName = csvMatch[1];
              const adapterName = csvMatch[2];
              const macAddress = csvMatch[3];



              // Skip WiFi adapters
              if (/wireless|wlan|wi-fi|802\.11|wifi/i.test(connectionName) || /wireless|wlan|wi-fi|802\.11|wifi/i.test(adapterName)) {

                continue;
              }

              // Skip Bluetooth and virtual adapters (but keep USB Ethernet)
              if (/bluetooth|microsoft.*wifi.*direct/i.test(adapterName)) {

                continue;
              }

              // Keep Ethernet adapters (including USB)
              if (/ethernet/i.test(connectionName) || /ethernet|usb.*gb/i.test(adapterName)) {
                const mac = macAddress.replace(/-/g, ':').toUpperCase();
 
                return { macAddress: mac, adapterName: adapterName };
              } else {
 
              }
            }
          }
        } catch (getmacError: any) {

        }


        return { macAddress: null };
      } catch (error: any) {
        console.error('[DEBUG] ✗ Windows Ethernet MAC detection error:', error.message || error);
        console.error('[DEBUG] Error stack:', error.stack);
        return { macAddress: null };
      }
    } else if (platform === 'darwin') {
      // macOS: Use ifconfig or networksetup
      try {
        // Get list of Ethernet adapters (en0, en1, etc., excluding en0 if it's WiFi)
        const { stdout: networksetup } = await execAsync('networksetup -listallhardwareports');
        const lines = networksetup.split(/\r?\n/);

        let currentPort = '';
        let currentDevice = '';

        for (const line of lines) {
          if (line.includes('Hardware Port:')) {
            currentPort = line.split(':')[1].trim();
          }
          if (line.includes('Device:')) {
            currentDevice = line.split(':')[1].trim();

            // Skip WiFi ports
            if (/Wi-Fi|AirPort/i.test(currentPort)) {
              continue;
            }

            // Get MAC address for this device
            if (currentDevice && currentDevice.startsWith('en')) {
              try {
                const { stdout: ifconfig } = await execAsync(`ifconfig ${currentDevice}`);
                const macMatch = ifconfig.match(/ether\s+([0-9a-f:]{17})/i);
                if (macMatch) {
                  return { macAddress: macMatch[1].toUpperCase(), adapterName: currentPort };
                }
              } catch {
                // Continue to next device
              }
            }
          }
        }
      } catch (error: any) {
        console.error('macOS Ethernet MAC detection error:', error.message || error);
        return { macAddress: null };
      }
    } else if (platform === 'linux') {
      // Linux: Use ip link or ifconfig
      try {
        const { stdout } = await execAsync('ip link show');
        const lines = stdout.split(/\r?\n/);

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];

          // Skip WiFi interfaces (wlan, wlp, etc.)
          if (/^\d+:\s+(wlan|wlp|wl-)/i.test(line)) {
            continue;
          }

          // Look for Ethernet interfaces (eth, enp, eno, etc.)
          if (/^\d+:\s+(eth|enp|eno|ens|em)/i.test(line)) {
            const nextLine = i + 1 < lines.length ? lines[i + 1] : '';
            const macMatch = nextLine.match(/link\/ether\s+([0-9a-f:]{17})/i);
            if (macMatch) {
              const adapterMatch = line.match(/^\d+:\s+([^:]+):/);
              return {
                macAddress: macMatch[1].toUpperCase(),
                adapterName: adapterMatch ? adapterMatch[1].trim() : undefined
              };
            }
          }
        }
      } catch (error: any) {
        console.error('Linux Ethernet MAC detection error:', error.message || error);
        return { macAddress: null };
      }
    }
  } catch (error) {
    console.error('Error getting Ethernet MAC address:', error);
    return { macAddress: null };
  }

  return { macAddress: null };
}

/**
 * Get current Wi-Fi information (deprecated - use network.util)
 * @deprecated Use getCurrentWifi from utils/network.util
 */
async function getCurrentWifiLocal(): Promise<WifiInfo> {
  const platform = process.platform;

  try {
    if (platform === 'win32') {
      // Windows: Use netsh wlan show interfaces
      try {
        const { stdout } = await execAsync('netsh wlan show interfaces');

        // Split output into lines for easier parsing
        const lines = stdout.split(/\r?\n/);

        let ssid: string | null = null;
        let bssid: string | null = null;

        // Parse each line to find SSID and BSSID
        for (const line of lines) {
          // SSID format: "    SSID                   : Airtel_C3 wifi"
          // Match SSID (with optional leading whitespace) followed by colon
          // Exclude "Profile" line which also contains SSID value but is a different field
          if (/^\s*SSID\s*:/.test(line) && !/Profile/.test(line)) {
            const ssidPattern = /SSID\s*:\s*(.+)/i;
            const ssidMatch = line.match(ssidPattern);
            if (ssidMatch && ssidMatch[1]) {
              const foundSsid = ssidMatch[1].trim();
              // Skip if SSID is "none" or empty (not connected)
              if (foundSsid && foundSsid.toLowerCase() !== 'none' && foundSsid.length > 0) {
                ssid = foundSsid;
              }
            }
          }

          // BSSID format: "    AP BSSID               : 14:33:75:6a:c2:16" (Windows uses "AP BSSID")
          // Also try just "BSSID" as fallback for other formats
          if (/BSSID\s*:/.test(line)) {
            // Match "AP BSSID" or just "BSSID", capture the MAC address
            const bssidPattern = /(?:AP\s+)?BSSID\s*:\s*([0-9A-Fa-f]{2}[:-][0-9A-Fa-f]{2}[:-][0-9A-Fa-f]{2}[:-][0-9A-Fa-f]{2}[:-][0-9A-Fa-f]{2}[:-][0-9A-Fa-f]{2})/i;
            const bssidMatch = line.match(bssidPattern);
            if (bssidMatch && bssidMatch[1]) {
              // Normalize BSSID format (convert - to : and uppercase)
              bssid = bssidMatch[1].replace(/-/g, ':').toUpperCase();
            }
          }
        }

        return {
          ssid,
          bssid,
        };
      } catch (error: any) {
        console.error('Windows Wi-Fi detection error:', error.message || error);
        return { ssid: null, bssid: null };
      }
    } else if (platform === 'darwin') {
      // macOS: Use airport command or networksetup
      try {
        // Try airport command first (requires full path)
        const airportPath = '/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport';
        const { stdout } = await execAsync(`${airportPath} -I`);
        const ssidMatch = stdout.match(/^\s*SSID:\s*(.+)$/m);
        const bssidMatch = stdout.match(/^\s*BSSID:\s*([0-9a-f:]{17})/mi);

        return {
          ssid: ssidMatch ? ssidMatch[1].trim() : null,
          bssid: bssidMatch ? bssidMatch[1].trim().toUpperCase() : null,
        };
      } catch (error) {
        // Fallback to networksetup (less detailed, no BSSID)
        const { stdout } = await execAsync('networksetup -getairportnetwork en0');
        const ssidMatch = stdout.match(/Current Wi-Fi Network:\s*(.+)/);

        return {
          ssid: ssidMatch ? ssidMatch[1].trim() : null,
          bssid: null, // networksetup doesn't provide BSSID
        };
      }
    } else if (platform === 'linux') {
      // Linux: Try iwgetid first, then nmcli
      try {
        // Try iwgetid (requires root for BSSID, but works for SSID)
        const { stdout } = await execAsync('iwgetid -r');
        const ssid = stdout.trim();

        // Try to get BSSID using iwgetid with more options
        let bssid: string | null = null;
        try {
          const { stdout: bssidOutput } = await execAsync('iwgetid -ar');
          const bssidMatch = bssidOutput.match(/([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}/);
          bssid = bssidMatch ? bssidMatch[0].toUpperCase() : null;
        } catch {
          // BSSID not available without root
        }

        return {
          ssid: ssid || null,
          bssid,
        };
      } catch (error) {
        // Fallback to nmcli
        try {
          const { stdout } = await execAsync('nmcli -t -f active,ssid dev wifi | grep "^yes:" | head -1');
          const ssidMatch = stdout.match(/yes:(.+)/);
          return {
            ssid: ssidMatch ? ssidMatch[1].trim() : null,
            bssid: null, // nmcli requires more complex parsing for BSSID
          };
        } catch {
          return { ssid: null, bssid: null };
        }
      }
    }
  } catch (error) {
    console.error('Error getting Wi-Fi info:', error);
    return { ssid: null, bssid: null };
  }

  return { ssid: null, bssid: null };
}

// IPC Handlers - lazy loaded (only setup when needed)
function setupIpcHandlers(): void {
  // Only setup IPC when window is created (lazy)
  if (ipcMain.listenerCount('auto-attendance:on-login') > 0) {
    return; // Already set up
  }

  // Register IPC handlers for network detection
  ipcMain.handle('get-current-wifi', async (): Promise<WifiInfo> => {
    return getCurrentWifi();
  });

  ipcMain.handle('get-current-network', async (): Promise<NetworkInfo> => {
    return getCurrentNetwork();
  });

  // Handle opening logs viewer
  ipcMain.handle('open-logs-viewer', async () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('open-logs-viewer');
      return true;
    }
    return false;
  });

  // Auto attendance IPC handlers
  ipcMain.handle('auto-attendance:on-login', async () => {
    console.log('[AutoAttendance] Received login check-in request');
    try {
      const autoAttendSvc = getAutoAttendanceService();
      const result = await autoAttendSvc.attemptAutoCheckIn('login');
 
      return result;
    } catch (error: any) {
      console.error('[AutoAttendance] Login check-in failed with error:', error);
      return {
        success: false,
        trigger: 'login',
        reason: error.message || 'Unknown error',
        timestamp: new Date(),
      };
    }
  });

  // Handle auto check-in after auth initialization (when user has saved session)
  ipcMain.handle('auto-attendance:on-auth-init', async () => {
    console.log('[AutoAttendance] Received auth-init check-in request');
    try {
      const autoAttendSvc = getAutoAttendanceService();
      const result = await autoAttendSvc.attemptAutoCheckIn('app_start');
 
      return result;
    } catch (error: any) {
      console.error('[AutoAttendance] Auth init check-in failed with error:', error);
      return {
        success: false,
        trigger: 'app_start',
        reason: error.message || 'Unknown error',
        timestamp: new Date(),
      };
    }
  });

  // Handle getting log file path
  ipcMain.handle('get-log-path', async () => {
    const logPath = path.join(app.getPath('logs'), 'main.log');
    return logPath;
  });

  // Handle getting API base URL from renderer process
  ipcMain.handle('get-api-base-url', async () => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      console.warn('[Main] Cannot get API base URL: mainWindow is null');
      return 'http://localhost:3001/api/v1'; // Default fallback
    }

    try {
      // Read the API base URL from the renderer's window global variable
      // The renderer sets window.__API_BASE_URL__ from config.api.baseURL
      const apiBaseUrl = await mainWindow.webContents.executeJavaScript(`
        (() => {
          try {
            // Get from window.__API_BASE_URL__ set by renderer's main.tsx
            return window.__API_BASE_URL__ || 'http://localhost:3001/api/v1';
          } catch (error) {
            console.error('Failed to get API base URL:', error);
            return 'http://localhost:3001/api/v1';
          }
        })()
      `);
      
      console.log('[Main] Got API base URL from renderer:', apiBaseUrl);
      return apiBaseUrl;
    } catch (error) {
      console.error('[Main] Failed to get API base URL from renderer:', error);
      return 'http://localhost:3001/api/v1'; // Default fallback
    }
  });
}


// Export getCurrentNetwork for auto-attendance service (re-export from utils)
export { getCurrentNetwork, NetworkInfo } from './utils/network.util';

// Keep app running in background - don't quit when windows are closed
app.on('window-all-closed', () => {
  // Don't quit - app runs in background via system tray
  // Only quit explicitly via tray menu or app.quit()
});

// Handle app quitting
app.on('before-quit', () => {
  appIsQuitting = true;
  if (mainWindow) {
    mainWindow.removeAllListeners('close');
  }
});

// Security: Prevent new window creation and handle navigation
app.on('web-contents-created', (_, contents) => {
  contents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });

  // Prevent navigation to file:// URLs (only allow hash-based routing)
  contents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);

    // Allow navigation within the same origin (file://) but prevent file system navigation
    if (parsedUrl.protocol === 'file:') {
      // Only allow if it's the same file (index.html) with hash changes
      const currentUrl = contents.getURL();
      if (currentUrl && !navigationUrl.includes('index.html') && !navigationUrl.includes('#')) {
        event.preventDefault();
      }
    }
  });
});

