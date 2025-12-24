import { app, BrowserWindow, Menu, Tray, nativeImage, dialog } from 'electron';
import { autoUpdater } from 'electron-updater';
import * as path from 'path';
import * as fs from 'fs';
// Keep a global reference of the window object
let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

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

