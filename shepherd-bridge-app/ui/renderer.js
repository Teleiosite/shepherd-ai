// Shepherd AI Bridge — Renderer Process

function showStep(id) {
    document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
    const el = document.getElementById(id);
    if (el) el.classList.add('active');
}

function setStatus(status, label) {
    const dot = document.getElementById('statusDot');
    const lbl = document.getElementById('statusLabel');
    if (dot) { dot.className = 'status-dot ' + status; }
    if (lbl) lbl.textContent = label;
}

function displayQR(qrDataUrl) {
    const img = document.getElementById('qrImage');
    const placeholder = document.getElementById('qrPlaceholder');
    if (img) {
        img.src = qrDataUrl.startsWith('data:') ? qrDataUrl : ('data:image/png;base64,' + qrDataUrl);
        img.style.display = 'block';
        img.style.width = '220px';
        img.style.height = '220px';
    }
    if (placeholder) placeholder.style.display = 'none';
    setStatus('qr_ready', 'Scan with WhatsApp');
}

// Also keep a fallback fetch poll in case IPC is slow
let qrPollInterval = null;

function startQRFallbackPoll() {
    if (qrPollInterval) clearInterval(qrPollInterval);
    qrPollInterval = setInterval(async () => {
        try {
            const r = await fetch('http://localhost:3001/api/qr');
            const data = await r.json();
            if (data.qr) {
                displayQR(data.qr);
            }
            if (data.status === 'connected') {
                clearInterval(qrPollInterval);
                qrPollInterval = null;
                showStep('step-connected');
                setStatus('connected', 'WhatsApp connected');
            }
        } catch (e) {
            // Bridge not yet ready — keep polling
        }
    }, 3000);
}

function stopQRFallbackPoll() {
    if (qrPollInterval) {
        clearInterval(qrPollInterval);
        qrPollInterval = null;
    }
}

async function connectBridge() {
    const codeInput = document.getElementById('connectionCode');
    const errorDiv = document.getElementById('codeError');
    const connectBtn = document.getElementById('connectBtn');

    const code = codeInput.value.trim().toUpperCase();
    errorDiv.style.display = 'none';

    if (!code) {
        errorDiv.textContent = 'Please enter your connection code.';
        errorDiv.style.display = 'block';
        return;
    }
    if (code.length < 6) {
        errorDiv.textContent = 'Connection code must be at least 6 characters.';
        errorDiv.style.display = 'block';
        return;
    }

    connectBtn.disabled = true;
    connectBtn.textContent = 'Connecting...';
    showStep('step-connecting');
    setStatus('connecting', 'Connecting...');

    try {
        const result = await window.electronAPI.connectBridge(code);

        if (result.success) {
            showStep('step-qr');
            setStatus('ready', 'Waiting for QR');

            // Listen for QR pushed from main process via IPC
            window.electronAPI.onQRReceived((data) => {
                if (data && data.qr) {
                    displayQR(data.qr);
                }
            });

            // Also run a fallback poll in case IPC misses
            startQRFallbackPoll();

            // Listen for status updates (connected/disconnected)
            window.electronAPI.onBridgeStatus((status) => {
                if (status.status === 'connected') {
                    stopQRFallbackPoll();
                    showStep('step-connected');
                    setStatus('connected', 'WhatsApp connected');
                } else if (status.status === 'disconnected' || status.status === 'logged_out') {
                    setStatus('disconnected', 'Disconnected');
                }
            });
        } else {
            showStep('step-code');
            errorDiv.textContent = result.message || 'Connection failed. Check your code and try again.';
            errorDiv.style.display = 'block';
            connectBtn.disabled = false;
            connectBtn.textContent = 'Connect to Shepherd AI';
            setStatus('', 'Not connected');
        }
    } catch (err) {
        showStep('step-code');
        errorDiv.textContent = 'Network error. Please check your internet connection.';
        errorDiv.style.display = 'block';
        connectBtn.disabled = false;
        connectBtn.textContent = 'Connect to Shepherd AI';
        setStatus('', 'Not connected');
    }
}

function minimizeToTray() {
    window.electronAPI.minimize();
}

// Enter key support
document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('connectionCode');
    if (input) input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') connectBridge();
    });

    setStatus('ready', 'Ready');

    // Check if already connected on load
    window.electronAPI.checkStatus().then(status => {
        if (status && status.running && status.status === 'connected') {
            showStep('step-connected');
            setStatus('connected', 'WhatsApp connected');
        }
    }).catch(() => {});
});
