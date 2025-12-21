const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // Bridge control
    startBridge: () => ipcRenderer.send('start-bridge'),
    stopBridge: () => ipcRenderer.send('stop-bridge'),
    updateTrayStatus: (status) => ipcRenderer.send('update-tray-status', status),

    // Receive events from main process
    onBridgeStarting: (callback) => ipcRenderer.on('bridge-starting', callback),
    onBridgeConnected: (callback) => ipcRenderer.on('bridge-connected', callback),
    onBridgeStopped: (callback) => ipcRenderer.on('bridge-stopped', callback),
    onBridgeError: (callback) => ipcRenderer.on('bridge-error', (event, error) => callback(error)),
    onBridgeLog: (callback) => ipcRenderer.on('bridge-log', (event, log) => callback(log)),
    onToggleBridge: (callback) => ipcRenderer.on('toggle-bridge', callback),
    onOpenSettings: (callback) => ipcRenderer.on('open-settings', callback),

    // Remove listeners
    removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
});
