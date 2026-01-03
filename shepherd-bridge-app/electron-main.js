const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const axios = require('axios');

let mainWindow;
let tray;
let bridgeServer;
const BACKEND_URL = 'https://shepherd-ai-backend.onrender.com'; // Production backend

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 500,
        height: 700,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        },
        icon: path.join(__dirname, 'assets', 'icon.png'),
        autoHideMenuBar: true
    });

    mainWindow.loadFile(path.join(__dirname, 'ui', 'index.html'));

    // Open DevTools in development
    if (process.env.NODE_ENV === 'development') {
        mainWindow.webContents.openDevTools();
    }

    mainWindow.on('close', (event) => {
        if (!app.isQuitting) {
            event.preventDefault();
            mainWindow.hide();
        }
        return false;
    });
}

function createTray() {
    const icon = nativeImage.createFromPath(path.join(__dirname, 'assets', 'icon.png'));
    tray = new Tray(icon.resize({ width: 16, height: 16 }));

    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Show App',
            click: () => {
                mainWindow.show();
            }
        },
        {
            label: 'Bridge Status',
            click: () => {
                mainWindow.webContents.send('show-status');
            }
        },
        { type: 'separator' },
        {
            label: 'Quit',
            click: () => {
                app.isQuitting = true;
                if (bridgeServer) {
                    bridgeServer.close();
                }
                app.quit();
            }
        }
    ]);

    tray.setToolTip('Shepherd AI Bridge');
    tray.setContextMenu(contextMenu);

    tray.on('double-click', () => {
        mainWindow.show();
    });
}

// IPC Handlers

ipcMain.handle('connect-bridge', async (event, connectionCode) => {
    try {
        console.log('🔗 Attempting to connect to:', BACKEND_URL);
        console.log('📝 Connection code:', connectionCode);

        // Register with backend
        const response = await axios.post(`${BACKEND_URL}/api/bridge/register`, {
            code: connectionCode,
            bridge_url: 'http://localhost:3001'
        });

        console.log('✅ Backend response:', response.data);

        if (response.data.success) {
            // Start the bridge server
            startBridgeServer();

            return {
                success: true,
                message: 'Connected successfully! Scan QR code with WhatsApp.'
            };
        } else {
            return {
                success: false,
                message: 'Invalid connection code'
            };
        }
    } catch (error) {
        console.error('❌ Connection error FULL:', error);
        console.error('❌ Error message:', error.message);
        console.error('❌ Error response:', error.response?.data);
        console.error('❌ Error status:', error.response?.status);

        return {
            success: false,
            message: `Connection failed: ${error.message}. Check console for details.`
        };
    }
});

ipcMain.handle('check-status', async () => {
    // Check if bridge is running
    if (bridgeServer && bridgeServer.listening) {
        return {
            running: true,
            status: 'connected'
        };
    }
    return {
        running: false,
        status: 'disconnected'
    };
});

ipcMain.handle('stop-bridge', async () => {
    if (bridgeServer) {
        bridgeServer.close();
        bridgeServer = null;
        return { success: true };
    }
    return { success: false };
});

function startBridgeServer() {
    // Import and start the bridge server
    // bridge-core.js starts automatically when required
    require('./bridge-core');

    // Send status updates to UI
    mainWindow.webContents.send('bridge-status', { status: 'starting' });

    setTimeout(() => {
        mainWindow.webContents.send('bridge-status', { status: 'running' });
    }, 5000);
}

// App lifecycle

app.whenReady().then(() => {
    createWindow();
    createTray();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('before-quit', () => {
    app.isQuitting = true;
    if (bridgeServer) {
        bridgeServer.close();
    }
});
