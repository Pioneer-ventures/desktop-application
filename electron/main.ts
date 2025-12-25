import { app, BrowserWindow, Menu, Tray, nativeImage, dialog, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import * as path from 'path';
import * as fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
// Keep a global reference of the window object
let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

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

function createWindow(): void {
  const iconPath = getIconPath();

  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true, // Keep security enabled
    },
    titleBarStyle: 'default',
    autoHideMenuBar: true, // Hide the menu bar
    icon: iconPath, // Set window icon
  });

  // Remove the menu bar completely
  Menu.setApplicationMenu(null);

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    // Open DevTools in development
    mainWindow.webContents.openDevTools();
  } else {
    // In production, use loadURL with proper file:// path format
    const possiblePaths = [
      path.join(__dirname, '../dist/index.html'),
      path.join(__dirname, '../../dist/index.html'),
      path.join(process.resourcesPath, 'app/dist/index.html'),
      path.join(app.getAppPath(), 'dist/index.html'),
    ];

    let loaded = false;
    for (const htmlPath of possiblePaths) {
      if (fs.existsSync(htmlPath)) {
        // Convert to proper file:// URL format for Windows
        // C:\path\to\file -> file:///C:/path/to/file
        const normalizedPath = htmlPath.replace(/\\/g, '/');
        const fileUrl = `file:///${normalizedPath}`;
        
        mainWindow.loadURL(fileUrl);
        loaded = true;
        break;
      }
    }

    if (!loaded) {
      // Show user-friendly error message
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

    // Handle errors silently in production
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      // Only log critical errors
      if (errorCode !== -3) { // -3 is ERR_ABORTED, which is normal for some navigations
        console.error('Failed to load page:', errorDescription);
      }
    });
  }

  // Handle window close - hide to tray instead of closing
  mainWindow.on('close', (event) => {
    if (!appIsQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  // Emitted when the window is actually closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Create system tray
function createTray(): void {
  const iconPath = getIconPath();
  
  if (!iconPath) {
    return; // Can't create tray without icon
  }

  // Create tray icon
  const trayIcon = nativeImage.createFromPath(iconPath);
  tray = new Tray(trayIcon.resize({ width: 16, height: 16 }));

  // Create context menu
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show HRMS Desktop',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        } else {
          createWindow();
        }
      },
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

  // Double-click to show window
  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    } else {
      createWindow();
    }
  });

  // Single click to toggle (Windows)
  if (process.platform === 'win32') {
    tray.on('click', () => {
      if (mainWindow) {
        if (mainWindow.isVisible()) {
          mainWindow.hide();
        } else {
          mainWindow.show();
          mainWindow.focus();
        }
      } else {
        createWindow();
      }
    });
  }
}

// Disable hardware acceleration if causing issues (uncomment if needed)
// app.disableHardwareAcceleration();

// Prevent app from quitting when all windows are closed
let appIsQuitting = false;

// Configure auto-updater
function setupAutoUpdater(): void {
  // Disable auto-download (we'll handle it manually)
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  // GitHub provider is automatically configured from package.json
  // No need to setFeedURL when using GitHub provider
  // electron-updater will automatically detect GitHub releases

  // Check for updates on startup (only in production)
  if (!isDev) {
    // Check immediately after a short delay
    setTimeout(() => {
      autoUpdater.checkForUpdates();
    }, 5000); // Wait 5 seconds after app starts

    // Then check periodically (every 4 hours)
    setInterval(() => {
      autoUpdater.checkForUpdates();
    }, 4 * 60 * 60 * 1000); // 4 hours
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

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  // Set app icon after app is ready
  const iconPath = getIconPath();
  if (iconPath) {
    // Set dock icon for macOS
    if (process.platform === 'darwin' && app.dock) {
      app.dock.setIcon(iconPath);
    }
    
    // Set app user model ID for Windows (helps with taskbar icon)
    if (process.platform === 'win32') {
      app.setAppUserModelId('com.hrms.desktop');
    }
  }

  // Setup auto-updater
  setupAutoUpdater();

  // Create system tray first
  createTray();

  // Create main window
  createWindow();

  app.on('activate', () => {
    // On macOS, re-create window when dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
});

// Wi-Fi detection functions
interface WifiInfo {
  ssid: string | null;
  bssid: string | null;
}

/**
 * Get current Wi-Fi information (SSID and optional BSSID)
 * Cross-platform implementation
 */
async function getCurrentWifi(): Promise<WifiInfo> {
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

// Register IPC handlers for Wi-Fi detection
ipcMain.handle('get-current-wifi', async (): Promise<WifiInfo> => {
  return getCurrentWifi();
});

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

