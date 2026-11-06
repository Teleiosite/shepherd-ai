const { contextBridge, ipcRenderer, shell } = require('electron');

// Expose protected methods to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
    // Connect bridge with code
    connectBridge: (code) => ipcRenderer.invoke('connect-bridge', code),

    // Check bridge status
    checkStatus: () => ipcRenderer.invoke('check-status'),

    // Stop bridge
    stopBridge: () => ipcRenderer.invoke('stop-bridge'),

    // Listen for QR code pushed from main process
    onQRReceived: (callback) => {
        ipcRenderer.on('qr-received', (event, data) => callback(data));
    },

    // Listen for bridge status updates
    onBridgeStatus: (callback) => {
        ipcRenderer.on('bridge-status', (event, status) => callback(status));
    },

    // Open external links
    openExternal: (url) => shell.openExternal(url),

    // Minimize to tray
    minimize: () => ipcRenderer.send('minimize-to-tray')
});
