const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } = require('electron');
const { spawn, exec } = require('child_process');
const path = require('path');
const axios = require('axios');

let mainWindow;
let tray;
let bridgeProcess = null;
let bridgeReady = false;
let qrPollTimer = null;

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

// ─── Port Killer ───────────────────────────────────────────────
function freePort(port) {
    return new Promise((resolve) => {
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
            const pidArgs = [...pids].map(p => `/PID ${p}`).join(' ');
            console.log(`[Main] Freeing port ${port}, killing PIDs: ${[...pids].join(', ')}`);
            exec(`taskkill /F ${pidArgs}`, () => setTimeout(resolve, 600));
        });
    });
}

// ─── Bridge Process ────────────────────────────────────────────
function killBridge() {
    stopQRPoll();
    if (bridgeProcess) {
        try { bridgeProcess.kill('SIGTERM'); } catch (e) {}
        try { bridgeProcess.kill('SIGKILL'); } catch (e) {}
        bridgeProcess = null;
        bridgeReady = false;
    }
}

// Poll /api/qr and check tokens/last_qr.txt from MAIN process and push QR to renderer via IPC
function startQRPoll() {
    stopQRPoll();
    let attempts = 0;
    const maxAttempts = 120; // 4 min max (every 1s)
    const fs = require('fs');
    const qrFile = path.join(__dirname, 'tokens', 'last_qr.txt');

    qrPollTimer = setInterval(async () => {
        attempts++;
        if (attempts > maxAttempts) {
            stopQRPoll();
            return;
        }

        // Method 1: Check disk file (zero network overhead, instant)
        try {
            if (fs.existsSync(qrFile)) {
                const fileContent = fs.readFileSync(qrFile, 'utf8').trim();
                if (fileContent && fileContent.length > 50 && mainWindow) {
                    console.log('[Main] Found QR in tokens/last_qr.txt! Pushing to renderer...');
                    mainWindow.webContents.send('qr-received', { qr: fileContent });
                }
            }
        } catch (e) {}

        // Method 2: Check HTTP endpoint on 127.0.0.1
        try {
            const r = await axios.get('http://127.0.0.1:3001/api/qr', { timeout: 1500 });
            if (r.data.qr && mainWindow) {
                console.log('[Main] QR received from REST! Pushing to renderer...');
                mainWindow.webContents.send('qr-received', { qr: r.data.qr });
            }
            if (r.data.status === 'connected' && mainWindow) {
                mainWindow.webContents.send('bridge-status', { status: 'connected' });
                stopQRPoll();
            }
        } catch (e) {
            // Bridge still starting or reconnecting
        }
    }, 1000);
}

function stopQRPoll() {
    if (qrPollTimer) {
        clearInterval(qrPollTimer);
        qrPollTimer = null;
    }
}

function startBridgeProcess(connectionCode) {
    return new Promise(async (resolve, reject) => {
        killBridge(); // kill our tracked process + stop QR poll

        // Free ports from any zombie processes
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
            const lines = data.toString().split('\n');
            lines.forEach(line => {
                const trimmed = line.trim();
                if (trimmed) console.log('[Bridge]', trimmed);
                // Immediately push QR when bridge signals it's ready
                if (trimmed.includes('QR image ready')) {
                    console.log('[Main] QR ready signal! Fetching immediately...');
                    const fs = require('fs');
                    const qrFile = path.join(__dirname, 'tokens', 'last_qr.txt');
                    try {
                        if (fs.existsSync(qrFile)) {
                            const qrData = fs.readFileSync(qrFile, 'utf8').trim();
                            if (qrData && mainWindow) {
                                mainWindow.webContents.send('qr-received', { qr: qrData });
                            }
                        }
                    } catch (e) {}

                    axios.get('http://127.0.0.1:3001/api/qr', { timeout: 2000 })
                        .then(r => {
                            if (r.data.qr && mainWindow) {
                                mainWindow.webContents.send('qr-received', { qr: r.data.qr });
                            }
                        }).catch(() => {});
                }
                if (trimmed.includes('WhatsApp connected')) {
                    if (mainWindow) mainWindow.webContents.send('bridge-status', { status: 'connected' });
                    stopQRPoll();
                }
            });
            if (data.toString().includes('Ready! Waiting') || data.toString().includes('REST API:')) {
                bridgeReady = true;
            }
        });

        bridgeProcess.stderr.on('data', (data) => {
            const msg = data.toString().trim();
            if (msg) console.error('[Bridge ERR]', msg);
        });

        bridgeProcess.on('error', (err) => {
            console.error('[Main] Bridge process error:', err.message);
            reject(err);
        });

        bridgeProcess.on('exit', (code) => {
            console.log('[Main] Bridge exited with code:', code);
            bridgeProcess = null;
            bridgeReady = false;
            stopQRPoll();
            if (mainWindow) {
                mainWindow.webContents.send('bridge-status', { status: 'disconnected' });
            }
        });

        // Wait up to 10 seconds for bridge REST API to be ready
        let waited = 0;
        const checkInterval = setInterval(async () => {
            waited += 500;
            try {
                const r = await axios.get('http://127.0.0.1:3001/api/status', { timeout: 1000 });
                if (r.data.status) {
                    clearInterval(checkInterval);
                    bridgeReady = true;
                    resolve(true);
                }
            } catch (e) {
                if (waited >= 10000) {
                    clearInterval(checkInterval);
                    resolve(true); // proceed anyway
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
            bridge_url: 'http://127.0.0.1:3001'
        }, { timeout: 15000 });

        console.log('[Main] Backend response:', response.data);

        if (!response.data.success) {
            return { success: false, message: response.data.message || 'Invalid connection code' };
        }

        // Step 2: Spawn bridge process using system Node.js
        // The bridge will auto-connect via CONNECTION_CODE in env
        await startBridgeProcess(connectionCode);

        // Step 3: Also call /api/connect just in case
        await new Promise(res => setTimeout(res, 1000));
        try {
            await axios.post('http://127.0.0.1:3001/api/connect', { code: connectionCode }, { timeout: 5000 });
            console.log('[Main] Bridge /api/connect confirmed');
        } catch (e) {
            console.warn('[Main] /api/connect fallback warning:', e.message);
        }

        // Step 4: Start aggressive QR polling from main process
        startQRPoll();

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
        const r = await axios.get('http://127.0.0.1:3001/api/status', { timeout: 2000 });
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
