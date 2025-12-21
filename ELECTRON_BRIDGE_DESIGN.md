# 🎨 Shepherd AI WhatsApp Bridge - Design Specification

**Version:** 1.0  
**Date:** December 21, 2025  
**Type:** Electron Desktop Application  
**Purpose:** User-friendly WhatsApp bridge with zero terminal exposure

---

## 🎯 **Project Goals:**

### **Primary Goals:**
1. ✅ Hide all terminal/console windows
2. ✅ Show QR code in GUI (not browser)
3. ✅ Minimize to system tray
4. ✅ One-click start/stop
5. ✅ Visual status indicators
6. ✅ Professional, non-technical UI

### **Success Criteria:**
- ✅ Non-technical users can install and use without help
- ✅ No black windows ever appear
- ✅ Clear visual feedback (connected/disconnected)
- ✅ One .exe installer file
- ✅ Auto-start on Windows startup (optional)
- ✅ Crash recovery (auto-restart bridge)

---

## 🏗️ **Architecture:**

### **Technology Stack:**
```
Frontend:
├─ Electron (main + renderer process)
├─ HTML/CSS/JavaScript (UI)
├─ No React (keep it simple!)
└─ Vanilla JS for controls

Backend:
├─ Node.js (bundled with Electron)
├─ WPPConnect (existing bridge code)
├─ Express (REST API)
└─ WebSocket (already in bridge.js)

Packaging:
├─ electron-builder (Windows .exe)
├─ Auto-updater (future)
└─ Code signing (optional)
```

### **Process Model:**
```
Main Process (Electron):
├─ Creates GUI window
├─ Manages system tray
├─ Spawns bridge server (child process)
├─ Monitors bridge health
└─ Handles auto-restart

Renderer Process (GUI):
├─ Displays UI
├─ Shows QR code (from bridge)
├─ Connects to bridge via WebSocket
├─ Updates status indicators
└─ User interactions

Bridge Process (Node.js):
├─ Existing bridge.js code
├─ WPPConnect WhatsApp session
├─ REST API (port 3003)
├─ WebSocket (port 3002)
└─ Runs as child process
```

---

## 🎨 **UI/UX Design:**

### **Main Window (600x400px):**

```
┌─────────────────────────────────────────────────┐
│  🐑 Shepherd AI WhatsApp Bridge        [−][□][X]│
├─────────────────────────────────────────────────┤
│                                                  │
│         🐑 Shepherd AI                          │
│     WhatsApp Bridge v1.0.0                      │
│                                                  │
├─────────────────────────────────────────────────┤
│                                                  │
│  Connection Status                              │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                  │
│  ● Disconnected     [▶ Start Bridge]           │
│                                                  │
│  Last Connected: Never                          │
│  Messages Sent Today: --                        │
│                                                  │
├─────────────────────────────────────────────────┤
│                                                  │
│  [📱 View QR Code]  [🔧 Settings]  [📊 Logs]   │
│                                                  │
└─────────────────────────────────────────────────┘
```

### **When Connected:**

```
┌─────────────────────────────────────────────────┐
│  🐑 Shepherd AI WhatsApp Bridge        [−][□][X]│
├─────────────────────────────────────────────────┤
│                                                  │
│         🐑 Shepherd AI                          │
│     WhatsApp Bridge v1.0.0                      │
│                                                  │
├─────────────────────────────────────────────────┤
│                                                  │
│  Connection Status                              │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                  │
│  ✅ Connected       [⏸ Stop Bridge]            │
│                                                  │
│  Last Connected: Dec 21, 2025 1:00 PM          │
│  Messages Sent Today: 24                        │
│  Uptime: 2h 15m                                 │
│                                                  │
├─────────────────────────────────────────────────┤
│                                                  │
│  [✓ Connected]  [🔧 Settings]  [📊 Logs]       │
│                                                  │
└─────────────────────────────────────────────────┘
```

### **QR Code Modal:**

```
┌─────────────────────────────────────────────────┐
│  Scan QR Code                              [X]  │
├─────────────────────────────────────────────────┤
│                                                  │
│      ┌──────────────────────┐                  │
│      │                       │                  │
│      │    [QR CODE IMAGE]    │                  │
│      │                       │                  │
│      │                       │                  │
│      └──────────────────────┘                  │
│                                                  │
│  Steps to connect:                              │
│  1. Open WhatsApp on your phone                │
│  2. Tap Menu (⋮) → Linked Devices              │
│  3. Tap "Link a Device"                         │
│  4. Scan this QR code                           │
│                                                  │
│  Waiting for scan... ⏳                         │
│                                                  │
│              [Cancel]                            │
│                                                  │
└─────────────────────────────────────────────────┘
```

### **Settings Window:**

```
┌─────────────────────────────────────────────────┐
│  Settings                                  [X]  │
├─────────────────────────────────────────────────┤
│                                                  │
│  General                                        │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                  │
│  ☑ Start bridge automatically on app launch    │
│  ☑ Start app on Windows startup                │
│  ☑ Minimize to system tray on close            │
│  ☐ Show notifications for messages             │
│                                                  │
│  Advanced                                       │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                  │
│  Backend URL: http://localhost:8000             │
│  [Test Connection]                              │
│                                                  │
│  Bridge Ports:                                  │
│  REST API: 3003    WebSocket: 3002             │
│                                                  │
│  ☐ Enable debug logging                        │
│                                                  │
│                    [Save]  [Cancel]             │
│                                                  │
└─────────────────────────────────────────────────┘
```

### **System Tray Menu:**

```
📱 Shepherd AI WhatsApp Bridge
   │
   ├─ ✅ Status: Connected
   ├─ 📊 Messages Today: 24
   ├─ ────────────
   ├─ 🔌 Disconnect
   ├─ 📱 Show QR Code
   ├─ 🪟 Show Window
   ├─ ────────────
   ├─ ⚙️ Settings
   ├─ 📋 View Logs
   ├─ ────────────
   └─ ❌ Exit
```

---

## 📁 **Project Structure:**

```
shepherd-ai-bridge/
├─ package.json
├─ electron.js                 # Main process
├─ preload.js                  # Preload script (security)
├─ bridge/
│  └─ bridge.js                # Existing bridge code (copy)
├─ src/
│  ├─ index.html               # Main window
│  ├─ qr-modal.html            # QR code modal
│  ├─ settings.html            # Settings window
│  ├─ css/
│  │  ├─ main.css
│  │  └─ components.css
│  ├─ js/
│  │  ├─ renderer.js           # Main window logic
│  │  ├─ qr-modal.js           # QR modal logic
│  │  ├─ settings.js           # Settings logic
│  │  └─ websocket-client.js   # Connect to bridge
│  └─ assets/
│     ├─ icon.png              # App icon
│     ├─ icon.ico              # Windows icon
│     └─ tray-icon.png         # System tray icon
├─ build/
│  ├─ icon.ico
│  └─ installer.nsh            # Installer script
└─ dist/                       # Build output (ignored)
```

---

## 🔧 **Technical Specifications:**

### **Main Process (electron.js):**

```javascript
const { app, BrowserWindow, Tray, Menu, ipcMain } = require('electron');
const { spawn } = require('child_process');
const path = require('path');

let mainWindow = null;
let tray = null;
let bridgeProcess = null;

// 1. Create main window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 600,
    height: 400,
    resizable: false,
    frame: true,
    icon: path.join(__dirname, 'src/assets/icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });
  
  mainWindow.loadFile('src/index.html');
  mainWindow.setMenuBarVisibility(false);
}

// 2. Create system tray
function createTray() {
  tray = new Tray(path.join(__dirname, 'src/assets/tray-icon.png'));
  
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show Window', click: () => mainWindow.show() },
    { label: 'Disconnect', click: () => stopBridge() },
    { type: 'separator' },
    { label: 'Exit', click: () => app.quit() }
  ]);
  
  tray.setContextMenu(contextMenu);
  tray.setToolTip('Shepherd AI Bridge');
}

// 3. Start bridge as child process
function startBridge() {
  bridgeProcess = spawn('node', [
    path.join(__dirname, 'bridge/bridge.js')
  ], {
    cwd: path.join(__dirname, 'bridge'),
    stdio: 'pipe' // Capture output (no console window!)
  });
  
  // Handle bridge output
  bridgeProcess.stdout.on('data', (data) => {
    console.log(`Bridge: ${data}`);
    // Send to renderer if needed
    mainWindow.webContents.send('bridge-log', data.toString());
  });
  
  // Handle bridge errors
  bridgeProcess.stderr.on('data', (data) => {
    console.error(`Bridge Error: ${data}`);
    mainWindow.webContents.send('bridge-error', data.toString());
  });
  
  // Handle bridge crash
  bridgeProcess.on('close', (code) => {
    console.log(`Bridge exited with code ${code}`);
    mainWindow.webContents.send('bridge-stopped');
    
    // Auto-restart if crashed (not manually stopped)
    if (code !== 0 && code !== null) {
      setTimeout(startBridge, 5000); // Restart after 5 seconds
    }
  });
}

// 4. Stop bridge
function stopBridge() {
  if (bridgeProcess) {
    bridgeProcess.kill();
    bridgeProcess = null;
  }
}

// 5. App lifecycle
app.whenReady().then(() => {
  createWindow();
  createTray();
});

app.on('window-all-closed', () => {
  // Don't quit on window close (minimize to tray)
  // Only quit when user clicks Exit in tray menu
});

app.on('before-quit', () => {
  stopBridge();
});

// 6. IPC handlers
ipcMain.on('start-bridge', () => startBridge());
ipcMain.on('stop-bridge', () => stopBridge());
```

### **Renderer Process (renderer.js):**

```javascript
// Connect to bridge WebSocket
let ws = null;
let reconnectInterval = null;

function connectToBridge() {
  ws = new WebSocket('ws://localhost:3002');
  
  ws.onopen = () => {
    console.log('Connected to bridge');
    updateStatus('connected');
  };
  
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    
    if (data.type === 'qr-code') {
      showQRCode(data.qr);
    }
    
    if (data.type === 'ready') {
      updateStatus('ready');
      hideQRCode();
    }
    
    if (data.type === 'message-sent') {
      incrementMessageCount();
    }
  };
  
  ws.onclose = () => {
    console.log('Disconnected from bridge');
    updateStatus('disconnected');
    
    // Try reconnecting
    reconnectInterval = setInterval(() => {
      connectToBridge();
    }, 5000);
  };
  
  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
  };
}

function updateStatus(status) {
  const statusElement = document.getElementById('status');
  const startButton = document.getElementById('start-button');
  
  if (status === 'connected') {
    statusElement.innerHTML = '✅ Connected';
    statusElement.className = 'status-connected';
    startButton.textContent = '⏸ Stop Bridge';
  } else {
    statusElement.innerHTML = '● Disconnected';
    statusElement.className = 'status-disconnected';
    startButton.textContent = '▶ Start Bridge';
  }
}
```

---

## 🛡️ **Error Handling Strategy:**

### **1. Bridge Crashes:**
```javascript
// Auto-restart with exponential backoff
let restartAttempts = 0;
const maxRestarts = 5;

function handleBridgeCrash() {
  if (restartAttempts < maxRestarts) {
    const delay = Math.pow(2, restartAttempts) * 1000; // 1s, 2s, 4s, 8s, 16s
    setTimeout(() => {
      startBridge();
      restartAttempts++;
    }, delay);
  } else {
    showError('Bridge failed to start after 5 attempts. Please restart the app.');
  }
}
```

### **2. Port Already in Use:**
```javascript
// Check if ports are available before starting
async function checkPorts() {
  const ports = [3002, 3003];
  
  for (const port of ports) {
    if (await isPortInUse(port)) {
      showError(`Port ${port} is already in use. Please close other applications.`);
      return false;
    }
  }
  
  return true;
}
```

### **3. WhatsApp Session Expired:**
```javascript
// Detect session expiry and show QR code again
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  if (data.type === 'session-expired') {
    showNotification('WhatsApp session expired. Please scan QR code again.');
    showQRCode();
  }
};
```

### **4. Network Errors:**
```javascript
// Retry connection with user feedback
function connectWithRetry(maxRetries = 3) {
  let attempts = 0;
  
  function tryConnect() {
    connectToBridge()
      .catch(error => {
        attempts++;
        
        if (attempts < maxRetries) {
          showStatus(`Connection failed. Retrying... (${attempts}/${maxRetries})`);
          setTimeout(tryConnect, 2000);
        } else {
          showError('Could not connect to bridge. Please check your internet connection.');
        }
      });
  }
  
  tryConnect();
}
```

---

## 📦 **Build Configuration:**

### **package.json:**

```json
{
  "name": "shepherd-ai-bridge",
  "version": "1.0.0",
  "description": "WhatsApp Bridge for Shepherd AI",
  "main": "electron.js",
  "scripts": {
    "start": "electron .",
    "build": "electron-builder build --win --publish never",
    "build:portable": "electron-builder build --win portable",
    "pack": "electron-builder --dir"
  },
  "build": {
    "appId": "com.teleiosite.shepherd-bridge",
    "productName": "Shepherd AI Bridge",
    "win": {
      "target": ["nsis", "portable"],
      "icon": "build/icon.ico"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true,
      "createStartMenuShortcut": true
    },
    "files": [
      "**/*",
      "!node_modules/*/{CHANGELOG.md,README.md,README,readme.md,readme}",
      "!node_modules/*/{test,__tests__,tests,powered-test,example,examples}",
      "!node_modules/*.d.ts",
      "!**/*.{iml,o,hprof,orig,pyc,pyo,rbc,swp,csproj,sln,xproj}",
      "!.editorconfig",
      "!**/._*"
    ],
    "directories": {
      "buildResources": "build",
      "output": "dist"
    }
  },
  "dependencies": {
    "@wppconnect-team/wppconnect": "^1.28.0",
    "express": "^4.18.2",
    "ws": "^8.14.2"
  },
  "devDependencies": {
    "electron": "^27.0.0",
    "electron-builder": "^24.6.4"
  }
}
```

---

## ✅ **Testing Plan:**

### **Phase 1: Development Testing**
- [ ] App launches without errors
- [ ] Main window displays correctly
- [ ] Bridge starts when button clicked
- [ ] Bridge stops cleanly
- [ ] QR code appears in modal
- [ ] Status updates correctly
- [ ] System tray icon works
- [ ] Tray menu functions work

### **Phase 2: Integration Testing**
- [ ] Bridge connects to WhatsApp
- [ ] QR code scan works
- [ ] Messages send through bridge
- [ ] WebSocket connection stable
- [ ] Bridge auto-restarts on crash
- [ ] Settings persist across restarts

### **Phase 3: User Testing**
- [ ] Non-technical user can install
- [ ] Non-technical user can scan QR
- [ ] Instructions are clear
- [ ] Error messages are helpful
- [ ] App doesn't freeze or crash

### **Phase 4: Packaging Testing**
- [ ] Installer works on clean Windows
- [ ] Desktop shortcut created
- [ ] Start menu entry works
- [ ] Uninstaller works cleanly
- [ ] No files left after uninstall

---

## 🚀 **Implementation Plan:**

### **Step 1: Setup (15 min)**
- [ ] Create new folder `shepherd-ai-bridge`
- [ ] Initialize npm project
- [ ] Install Electron + dependencies
- [ ] Copy bridge.js from existing code

### **Step 2: Main Process (30 min)**
- [ ] Create electron.js
- [ ] Implement window creation
- [ ] Implement system tray
- [ ] Implement bridge spawn/kill
- [ ] Add error handling

### **Step 3: UI (45 min)**
- [ ] Create index.html (main window)
- [ ] Create CSS styling
- [ ] Add status indicators
- [ ] Add buttons
- [ ] Make it look professional

### **Step 4: Communication (30 min)**
- [ ] Create preload.js (IPC security)
- [ ] Implement WebSocket client
- [ ] Connect UI to bridge
- [ ] Handle status updates
- [ ] Display QR code

### **Step 5: Features (30 min)**
- [ ] QR code modal
- [ ] Settings window
- [ ] System tray menu
- [ ] Auto-restart logic
- [ ] Notifications

### **Step 6: Testing (30 min)**
- [ ] Test all features
- [ ] Fix bugs
- [ ] Test error scenarios
- [ ] Verify UI responsiveness

### **Step 7: Packaging (30 min)**
- [ ] Configure electron-builder
- [ ] Create icons
- [ ] Build installer
- [ ] Test installer
- [ ] Create portable version

**Total Time: ~3 hours**

---

## 🎨 **Design Assets Needed:**

### **Icons:**
- [ ] App icon (256x256 PNG)
- [ ] App icon (.ico for Windows)
- [ ] System tray icon (16x16, 32x32)
- [ ] Electron logo for splash

**I can:**
1. Use Shepherd AI logo from existing app
2. Or generate simple icons
3. Or you can provide custom icons

---

## 📝 **Success Metrics:**

### **Must Have:**
- ✅ No terminal windows visible
- ✅ QR code shows in app
- ✅ One-click start/stop
- ✅ System tray minimization
- ✅ Works on fresh Windows install

### **Nice to Have:**
- ✅ Auto-start on Windows startup
- ✅ Update notifications
- ✅ Message statistics
- ✅ Connection history
- ✅ Debug logs viewer

---

**This design is ready to implement!** Should we start building? 🚀
