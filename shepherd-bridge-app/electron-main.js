const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const axios = require('axios');

let mainWindow;
let tray;
let bridgeProcess = null;
let bridgeReady = false;

const BACKEND_URL = 'https://shepherd-ai-backend.onrender.com';

// Find system Node.js executable (must be v20+ for Baileys)
// Electron's built-in Node.js is v18 which is incompatible with Baileys 6.6.0
const NODE_PATHS = [
    'C:\\Users\\Owner\\AppData\\Local\\Author Software\\nvm\\installs\\v24.21.0\\node.exe',
    'C:\\Users\\Owner\\AppData\\Local\\Author Software\\nvm\\.nodejs\\node.exe',
    'node'
];

function getNodePath() {
    const fs = require('fs');
    for (const p of NODE_PATHS) {
        try {
            if (p === 'node' || fs.existsSync(p)) return p;
        } catch (e) {}
    }
    return 'node';
}

// ─── Window ────────────────────────────────────────────────────
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 480,
        height: 680,
        minWidth: 400,
        minHeight: 580,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        },
        icon: path.join(__dirname, 'assets', 'icon.png'),
        autoHideMenuBar: true,
        frame: true,
        backgroundColor: '#ffffff'
    });

    mainWindow.loadFile(path.join(__dirname, 'ui', 'index.html'));

    mainWindow.on('close', (event) => {
        if (!app.isQuitting) {
            event.preventDefault();
            mainWindow.hide();
        }
    });
}

// ─── Tray ──────────────────────────────────────────────────────
function createTray() {
    try {
        const icon = nativeImage.createFromPath(path.join(__dirname, 'assets', 'icon.png'));
        tray = new Tray(icon.resize({ width: 16, height: 16 }));
    } catch (e) {
        tray = new Tray(nativeImage.createEmpty());
    }

    tray.setToolTip('Shepherd AI Bridge');
    tray.setContextMenu(Menu.buildFromTemplate([
        { label: 'Show App', click: () => mainWindow.show() },
        { type: 'separator' },
        { label: 'Quit', click: () => { app.isQuitting = true; killBridge(); app.quit(); } }
    ]));
    tray.on('double-click', () => mainWindow.show());
}

// ─── Bridge Process ────────────────────────────────────────────
function killBridge() {
    if (bridgeProcess) {
        try { bridgeProcess.kill('SIGTERM'); } catch (e) {}
        try { bridgeProcess.kill('SIGKILL'); } catch (e) {}
        bridgeProcess = null;
        bridgeReady = false;
    }
}

// Free a port by killing the process using it (Windows: netstat + taskkill)
function freePort(port) {
    return new Promise((resolve) => {
        const { exec } = require('child_process');
        exec(`netstat -ano | findstr :${port}`, (err, stdout) => {
            if (err || !stdout) return resolve();
            const lines = stdout.trim().split('\n');
            const pids = new Set();
            lines.forEach(line => {
                const parts = line.trim().split(/\s+/);
                const pid = parts[parts.length - 1];
                if (pid && /^\d+$/.test(pid) && pid !== '0') pids.add(pid);
            });
            if (pids.size === 0) return resolve();
            const pidList = [...pids].join(' ');
            console.log(`[Main] Freeing port ${port}, killing PIDs: ${pidList}`);
            exec(`taskkill /F /PID ${pidList.split(' ').join(' /PID ')}`, () => {
                setTimeout(resolve, 500);
            });
        });
    });
}

function startBridgeProcess(connectionCode) {
    return new Promise(async (resolve, reject) => {
        killBridge(); // kill our own tracked process

        // Also free ports 3001/3002 from any zombie processes
        await freePort(3001);
        await freePort(3002);

        const nodePath = getNodePath();
        const bridgePath = path.join(__dirname, 'bridge-core.js');
        console.log('[Main] Spawning bridge with:', nodePath, bridgePath);

        bridgeProcess = spawn(nodePath, [bridgePath], {
            cwd: __dirname,
            stdio: ['ignore', 'pipe', 'pipe'],
            env: {
                ...process.env,
                CONNECTION_CODE: connectionCode,
                BACKEND_URL: BACKEND_URL,
                NODE_ENV: 'production'
            }
        });

        bridgeProcess.stdout.on('data', (data) => {
            const line = data.toString().trim();
            console.log('[Bridge]', line);
            if (line.includes('Ready! Waiting') || line.includes('REST API:')) {
                bridgeReady = true;
            }
        });

        bridgeProcess.stderr.on('data', (data) => {
            console.error('[Bridge ERR]', data.toString().trim());
        });

        bridgeProcess.on('error', (err) => {
            console.error('[Main] Bridge process error:', err.message);
            reject(err);
        });

        bridgeProcess.on('exit', (code) => {
            console.log('[Main] Bridge exited with code:', code);
            bridgeProcess = null;
            bridgeReady = false;
            if (mainWindow) {
                mainWindow.webContents.send('bridge-status', { status: 'disconnected' });
            }
        });

        // Wait up to 8 seconds for bridge REST API to be ready
        let waited = 0;
        const checkInterval = setInterval(async () => {
            waited += 500;
            try {
                const r = await axios.get('http://localhost:3001/api/status', { timeout: 1000 });
                if (r.data.status) {
                    clearInterval(checkInterval);
                    bridgeReady = true;
                    resolve(true);
                }
            } catch (e) {
                if (waited >= 8000) {
                    clearInterval(checkInterval);
                    // Resolve anyway — bridge may still be starting
                    resolve(true);
                }
            }
        }, 500);
    });
}

// ─── IPC Handlers ─────────────────────────────────────────────
ipcMain.handle('connect-bridge', async (event, connectionCode) => {
    try {
        console.log('[Main] Connecting with code:', connectionCode);

        // Step 1: Register with Shepherd AI backend
        const response = await axios.post(`${BACKEND_URL}/api/bridge/register`, {
            code: connectionCode,
            bridge_url: 'http://localhost:3001'
        }, { timeout: 15000 });

        console.log('[Main] Backend response:', response.data);

        if (!response.data.success) {
            return { success: false, message: response.data.message || 'Invalid connection code' };
        }

        // Step 2: Spawn bridge process using system Node.js
        await startBridgeProcess(connectionCode);

        // Step 3: Tell bridge to connect to WhatsApp with this code
        await new Promise(res => setTimeout(res, 1500)); // let bridge REST boot
        try {
            await axios.post('http://localhost:3001/api/connect', { code: connectionCode }, { timeout: 5000 });
            console.log('[Main] Bridge told to connect to WhatsApp');
        } catch (e) {
            console.warn('[Main] /api/connect call failed (bridge may auto-connect):', e.message);
        }

        return { success: true, message: 'Bridge started! Scan the QR code with WhatsApp.' };

    } catch (error) {
        console.error('[Main] Connect error:', error.message, error.response?.data);
        return {
            success: false,
            message: `Connection failed: ${error.message}`
        };
    }
});

ipcMain.handle('check-status', async () => {
    if (!bridgeProcess) return { running: false, status: 'stopped' };
    try {
        const r = await axios.get('http://localhost:3001/api/status', { timeout: 2000 });
        return { running: true, status: r.data.status };
    } catch (e) {
        return { running: bridgeReady, status: 'starting' };
    }
});

ipcMain.handle('stop-bridge', async () => {
    killBridge();
    return { success: true };
});

ipcMain.on('minimize-to-tray', () => {
    if (mainWindow) mainWindow.hide();
});

// ─── App Lifecycle ─────────────────────────────────────────────
app.whenReady().then(() => {
    createWindow();
    createTray();
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
    app.isQuitting = true;
    killBridge();
});
