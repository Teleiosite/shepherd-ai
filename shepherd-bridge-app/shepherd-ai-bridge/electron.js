const { app, BrowserWindow, Tray, Menu, ipcMain, dialog } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const net = require('net');

let mainWindow = null;
let tray = null;
let bridgeProcess = null;
let isQuitting = false;
let restartAttempts = 0;
const maxRestarts = 5;

// Check if port is in use
function isPortInUse(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(true));
    server.once('listening', () => {
      server.close();
      resolve(false);
    });
    server.listen(port);
  });
}

// Create main window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 650,
    height: 500,
    resizable: false,
    frame: true,
    icon: path.join(__dirname, 'src/assets/icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    show: false
  });

  mainWindow.loadFile('src/index.html');
  mainWindow.setMenuBarVisibility(false);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Handle window close
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Create system tray
function createTray() {
  const trayIconPath = path.join(__dirname, 'src/assets/tray-icon.png');
  tray = new Tray(trayIconPath);

  updateTrayMenu('disconnected');

  tray.setToolTip('Shepherd AI WhatsApp Bridge');

  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
      }
    }
  });
}

// Update tray menu based on status
function updateTrayMenu(status) {
  const contextMenu = Menu.buildFromTemplate([
    {
      label: status === 'connected' ? '✅ Status: Connected' : '● Status: Disconnected',
      enabled: false
    },
    { type: 'separator' },
    {
      label: '🪟 Show Window',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    {
      label: status === 'connected' ? '🔌 Disconnect' : '▶ Connect',
      click: () => {
        if (mainWindow) {
          mainWindow.webContents.send('toggle-bridge');
        }
      }
    },
    { type: 'separator' },
    {
      label: '⚙️ Settings',
      click: () => {
        if (mainWindow) {
          mainWindow.webContents.send('open-settings');
        }
      }
    },
    { type: 'separator' },
    {
      label: '❌ Exit',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);
}

// Start bridge as child process
async function startBridge() {
  // Check if ports are available
  const port3002InUse = await isPortInUse(3002);
  const port3003InUse = await isPortInUse(3003);

  if (port3002InUse || port3003InUse) {
    const portsInUse = [];
    if (port3002InUse) portsInUse.push('3002');
    if (port3003InUse) portsInUse.push('3003');
    
    if (mainWindow) {
      mainWindow.webContents.send('bridge-error', `Port(s) ${portsInUse.join(', ')} already in use. Please close other applications using these ports.`);
    }
    return;
  }

  const nodePath = process.execPath.replace('electron.exe', 'node.exe');
  const bridgePath = path.join(__dirname, 'bridge', 'bridge.js');

  bridgeProcess = spawn(nodePath, [bridgePath], {
    cwd: path.join(__dirname, 'bridge'),
    stdio: ['pipe', 'pipe', 'pipe'],
    detached: false,
    windowsHide: true  //Hide console window on Windows
  });

  console.log('Bridge process started with PID:', bridgeProcess.pid);

  if (mainWindow) {
    mainWindow.webContents.send('bridge-starting');
  }

  // Handle bridge output
  bridgeProcess.stdout.on('data', (data) => {
    const output = data.toString();
    console.log(`[Bridge]: ${output}`);
    
    if (mainWindow) {
      mainWindow.webContents.send('bridge-log', output);
    }

    // Detect successful connection
    if (output.includes('WPPConnect Bot connected') || output.includes('connected')) {
      if (mainWindow) {
        mainWindow.webContents.send('bridge-connected');
        updateTrayMenu('connected');
      }
    }
  });

  // Handle bridge errors
  bridgeProcess.stderr.on('data', (data) => {
    const error = data.toString();
    console.error(`[Bridge Error]: ${error}`);
    
    if (mainWindow) {
      mainWindow.webContents.send('bridge-error', error);
    }
  });

  // Handle bridge crash/exit
  bridgeProcess.on('close', (code) => {
    console.log(`Bridge exited with code ${code}`);
    bridgeProcess = null;

    if (mainWindow) {
      mainWindow.webContents.send('bridge-stopped');
      updateTrayMenu('disconnected');
    }

    // Auto-restart if crashed (not manually stopped)
    if (code !== 0 && code !== null && restartAttempts < maxRestarts) {
      const delay = Math.pow(2, restartAttempts) * 1000; // Exponential backoff
      console.log(`Restarting bridge in ${delay}ms (attempt ${restartAttempts + 1}/${maxRestarts})`);
      
      setTimeout(() => {
        if (!isQuitting) {
          startBridge();
          restartAttempts++;
        }
      }, delay);
    } else if (restartAttempts >= maxRestarts) {
      if (mainWindow) {
        mainWindow.webContents.send('bridge-error', 'Bridge failed to start after 5 attempts. Please restart the app.');
      }
    }
  });

  bridgeProcess.on('error', (error) => {
    console.error('Failed to start bridge:', error);
    if (mainWindow) {
      mainWindow.webContents.send('bridge-error', `Failed to start bridge: ${error.message}`);
    }
  });
}

// Stop bridge
function stopBridge() {
  if (bridgeProcess) {
    console.log('Stopping bridge process...');
    bridgeProcess.kill('SIGTERM');
    bridgeProcess = null;
    restartAttempts = 0; // Reset restart counter

    if (mainWindow) {
      mainWindow.webContents.send('bridge-stopped');
      updateTrayMenu('disconnected');
    }
  }
}

// App lifecycle
app.whenReady().then(() => {
  createWindow();
  createTray();

  // Auto-start bridge if configured
  // TODO: Load from settings
  // For now, don't auto-start
});

app.on('window-all-closed', () => {
  // Don't quit on window close (minimize to tray instead)
  // Only quit when user clicks Exit in tray menu
});

app.on('before-quit', () => {
  isQuitting = true;
  stopBridge();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  } else if (mainWindow) {
    mainWindow.show();
  }
});

// IPC handlers
ipcMain.on('start-bridge', () => {
  console.log('Received start-bridge command');
  startBridge();
});

ipcMain.on('stop-bridge', () => {
  console.log('Received stop-bridge command');
  stopBridge();
});

ipcMain.on('update-tray-status', (event, status) => {
  updateTrayMenu(status);
});

// Handle app errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  dialog.showErrorBox('Error', `An error occurred: ${error.message}`);
});
