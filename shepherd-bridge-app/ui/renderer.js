// Shepherd AI Bridge — Renderer Process

function showStep(id) {
    document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

function setStatus(status, label) {
    const dot = document.getElementById('statusDot');
    const lbl = document.getElementById('statusLabel');
    if (dot) { dot.className = 'status-dot ' + status; }
    if (lbl) lbl.textContent = label;
}

let qrPollInterval = null;

function startQRPolling() {
    if (qrPollInterval) clearInterval(qrPollInterval);
    qrPollInterval = setInterval(async () => {
        try {
            const r = await fetch('http://localhost:3001/api/qr');
            const data = await r.json();

            if (data.qr) {
                const img = document.getElementById('qrImage');
                const placeholder = document.getElementById('qrPlaceholder');
                if (img) {
                    img.src = data.qr.startsWith('data:') ? data.qr : ('data:image/png;base64,' + data.qr);
                    img.style.display = 'block';
                }
                if (placeholder) placeholder.style.display = 'none';
                setStatus('qr_ready', 'Waiting for scan');
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
    }, 2000);
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
            startQRPolling();

            // Also listen for IPC status updates
            window.electronAPI.onBridgeStatus((status) => {
                if (status.status === 'connected') {
                    if (qrPollInterval) { clearInterval(qrPollInterval); qrPollInterval = null; }
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
document.getElementById('connectionCode')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') connectBridge();
});

// Check if already connected on load
window.addEventListener('DOMContentLoaded', async () => {
    setStatus('ready', 'Ready');
    try {
        const status = await window.electronAPI.checkStatus();
        if (status && status.running) {
            showStep('step-connected');
            setStatus('connected', 'WhatsApp connected');
        }
    } catch (e) {
        // Not connected yet
    }
});
