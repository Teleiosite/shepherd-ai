// State
let bridgeStatus = 'disconnected'; // disconnected, connecting, connected
let ws = null;
let reconnectInterval = null;
let startTime = null;
let uptimeInterval = null;
let messageCount = 0;
let logs = [];

// DOM Elements
const elements = {
    statusDot: document.getElementById('status-dot'),
    statusText: document.getElementById('status-text'),
    toggleBtn: document.getElementById('toggle-bridge-btn'),
    btnIcon: document.getElementById('btn-icon'),
    btnText: document.getElementById('btn-text'),
    lastConnected: document.getElementById('last-connected'),
    uptime: document.getElementById('uptime'),
    messagesCount: document.getElementById('messages-count'),
    qrBtn: document.getElementById('qr-btn'),
    settingsBtn: document.getElementById('settings-btn'),
    logsBtn: document.getElementById('logs-btn'),
    logsSection: document.getElementById('logs-section'),
    logsContent: document.getElementById('logs-content'),
    closeLogsBtn: document.getElementById('close-logs'),
    clearLogsBtn: document.getElementById('clear-logs'),
    qrModal: document.getElementById('qr-modal'),
    closeQrBtn: document.getElementById('close-qr'),
    qrContainer: document.getElementById('qr-container'),
    qrStatus: document.getElementById('qr-status')
};

// Initialize
function init() {
    // Button event listeners
    elements.toggleBtn.addEventListener('click', toggleBridge);
    elements.qrBtn.addEventListener('click', showQRModal);
    elements.settingsBtn.addEventListener('click', openSettings);
    elements.logsBtn.addEventListener('click', toggleLogs);
    elements.closeLogsBtn.addEventListener('click', toggleLogs);
    elements.clearLogsBtn.addEventListener('click', clearLogs);
    elements.closeQrBtn.addEventListener('click', hideQRModal);

    // IPC listeners from main process
    window.electronAPI.onBridgeStarting(() => {
        updateStatus('connecting');
        addLog('Starting WhatsApp bridge...', 'info');
    });

    window.electronAPI.onBridgeConnected(() => {
        updateStatus('connected');
        startTime = Date.now();
        startUptimeCounter();
        connectWebSocket();
        addLog('✅ Bridge connected successfully!', 'success');
        hideQRModal();
    });

    window.electronAPI.onBridgeStopped(() => {
        updateStatus('disconnected');
        stopUptimeCounter();
        disconnectWebSocket();
        addLog('Bridge stopped', 'info');
    });

    window.electronAPI.onBridgeError((error) => {
        addLog(`❌ Error: ${error}`, 'error');
    });

    window.electronAPI.onBridgeLog((log) => {
        addLog(log, 'info');
    });

    window.electronAPI.onToggleBridge(() => {
        toggleBridge();
    });

    window.electronAPI.onOpenSettings(() => {
        openSettings();
    });

    // Load saved data
    loadSavedData();
}

// Toggle bridge
function toggleBridge() {
    if (bridgeStatus === 'disconnected') {
        window.electronAPI.startBridge();
    } else {
        window.electronAPI.stopBridge();
    }
}

// Update UI status
function updateStatus(status) {
    bridgeStatus = status;

    // Update status indicator
    elements.statusDot.className = 'status-dot ' + status;

    switch (status) {
        case 'connected':
            elements.statusText.textContent = 'Connected';
            elements.btnIcon.textContent = '⏸';
            elements.btnText.textContent = 'Stop Bridge';
            elements.toggleBtn.classList.remove('btn-primary');
            elements.toggleBtn.classList.add('btn-secondary');
            elements.qrBtn.disabled = true;
            elements.lastConnected.textContent = new Date().toLocaleString();
            saveData('lastConnected', elements.lastConnected.textContent);
            window.electronAPI.updateTrayStatus('connected');
            break;

        case 'connecting':
            elements.statusText.textContent = 'Connecting...';
            elements.btnIcon.textContent = '⏳';
            elements.btnText.textContent = 'Connecting...';
            elements.toggleBtn.disabled = true;
            elements.qrBtn.disabled = false;
            break;

        case 'disconnected':
            elements.statusText.textContent = 'Disconnected';
            elements.btnIcon.textContent = '▶';
            elements.btnText.textContent = 'Start Bridge';
            elements.toggleBtn.classList.remove('btn-secondary');
            elements.toggleBtn.classList.add('btn-primary');
            elements.toggleBtn.disabled = false;
            elements.qrBtn.disabled = true;
            elements.uptime.textContent = '--';
            window.electronAPI.updateTrayStatus('disconnected');
            break;
    }
}

// WebSocket connection to bridge
function connectWebSocket() {
    if (ws && ws.readyState === WebSocket.OPEN) {
        return; // Already connected
    }

    addLog('Connecting to bridge WebSocket...', 'info');

    ws = new WebSocket('ws://localhost:3002');

    ws.onopen = () => {
        addLog('✅ WebSocket connected', 'success');
        clearInterval(reconnectInterval);
        reconnectInterval = null;
    };

    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            handleWebSocketMessage(data);
        } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
        }
    };

    ws.onclose = () => {
        addLog('WebSocket disconnected', 'info');

        // Try reconnecting if bridge is still supposed to be connected
        if (bridgeStatus === 'connected' && !reconnectInterval) {
            reconnectInterval = setInterval(() => {
                addLog('Attempting to reconnect WebSocket...', 'info');
                connectWebSocket();
            }, 5000);
        }
    };

    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        addLog('WebSocket connection error', 'error');
    };
}

// Disconnect WebSocket
function disconnectWebSocket() {
    if (reconnectInterval) {
        clearInterval(reconnectInterval);
        reconnectInterval = null;
    }

    if (ws) {
        ws.close();
        ws = null;
    }
}

// Handle WebSocket messages from bridge
function handleWebSocketMessage(data) {
    switch (data.type) {
        case 'qr-code':
            showQRCode(data.qr);
            break;

        case 'ready':
        case 'status':
            if (data.status === 'connected') {
                updateStatus('connected');
                hideQRModal();
            }
            break;

        case 'incoming_message':
            messageCount++;
            elements.messagesCount.textContent = messageCount;
            saveData('messageCount', messageCount);
            break;

        case 'message_sent':
            messageCount++;
            elements.messagesCount.textContent = messageCount;
            saveData('messageCount', messageCount);
            break;
    }
}

// QR Code handling
function showQRModal() {
    elements.qrModal.style.display = 'flex';
    elements.qrContainer.innerHTML = `
        <p class="qr-message">Waiting for QR code...</p>
        <p class="qr-spinner">⏳</p>
    `;
    elements.qrStatus.textContent = 'Waiting for scan... ⏳';
}

function hideQRModal() {
    elements.qrModal.style.display = 'none';
}

function showQRCode(qrData) {
    elements.qrContainer.innerHTML = `<img src="${qrData}" alt="QR Code" style="max-width: 300px; border-radius: 8px;">`;
    elements.qrStatus.textContent = 'Scan this QR code with WhatsApp';

    // Auto-show modal if not visible
    if (elements.qrModal.style.display === 'none') {
        showQRModal();
    }
}

// Logs
function toggleLogs() {
    const isVisible = elements.logsSection.style.display !== 'none';
    elements.logsSection.style.display = isVisible ? 'none' : 'block';

    if (!isVisible) {
        // Scroll to bottom when showing logs
        setTimeout(() => {
            elements.logsContent.scrollTop = elements.logsContent.scrollHeight;
        }, 100);
    }
}

function addLog(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = { timestamp, message, type };
    logs.push(logEntry);

    // Keep only last 100 logs
    if (logs.length > 100) {
        logs.shift();
    }

    const logElement = document.createElement('div');
    logElement.className = `log-entry ${type}`;
    logElement.textContent = `[${timestamp}] ${message}`;
    elements.logsContent.appendChild(logElement);

    // Auto-scroll to bottom
    elements.logsContent.scrollTop = elements.logsContent.scrollHeight;

    // Save logs
    saveData('logs', logs);
}

function clearLogs() {
    logs = [];
    elements.logsContent.innerHTML = '';
    saveData('logs', []);
    addLog('Logs cleared', 'info');
}

// Uptime counter
function startUptimeCounter() {
    uptimeInterval = setInterval(updateUptime, 1000);
    updateUptime();
}

function stopUptimeCounter() {
    if (uptimeInterval) {
        clearInterval(uptimeInterval);
        uptimeInterval = null;
    }
}

function updateUptime() {
    if (!startTime) return;

    const elapsed = Date.now() - startTime;
    const hours = Math.floor(elapsed / 3600000);
    const minutes = Math.floor((elapsed % 3600000) / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);

    elements.uptime.textContent = `${hours}h ${minutes}m ${seconds}s`;
}

// Settings
function openSettings() {
    alert('Settings panel coming soon!\n\nFeatures:\n- Auto-start on launch\n- Backend URL configuration\n- Notification preferences');
}

// Data persistence
function saveData(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.error('Failed to save data:', error);
    }
}

function loadSavedData() {
    try {
        // Load last connected time
        const lastConnected = localStorage.getItem('lastConnected');
        if (lastConnected) {
            elements.lastConnected.textContent = JSON.parse(lastConnected);
        }

        // Load message count
        const savedCount = localStorage.getItem('messageCount');
        if (savedCount) {
            messageCount = JSON.parse(savedCount);
            elements.messagesCount.textContent = messageCount;
        }

        // Load logs
        const savedLogs = localStorage.getItem('logs');
        if (savedLogs) {
            logs = JSON.parse(savedLogs);
            logs.forEach(log => {
                const logElement = document.createElement('div');
                logElement.className = `log-entry ${log.type}`;
                logElement.textContent = `[${log.timestamp}] ${log.message}`;
                elements.logsContent.appendChild(logElement);
            });
        }
    } catch (error) {
        console.error('Failed to load saved data:', error);
    }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', init);
