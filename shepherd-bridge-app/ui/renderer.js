// Renderer process script for UI interactions

function showStep(stepId) {
    // Hide all steps
    document.querySelectorAll('.step').forEach(step => {
        step.classList.remove('active');
    });

    // Show requested step
    document.getElementById(stepId).classList.add('active');
}

async function connectBridge() {
    const codeInput = document.getElementById('connectionCode');
    const code = codeInput.value.trim().toUpperCase();
    const errorDiv = document.getElementById('codeError');
    const connectBtn = document.getElementById('connectBtn');

    // Validate input
    if (!code) {
        errorDiv.textContent = 'Please enter your connection code';
        errorDiv.style.display = 'block';
        return;
    }

    if (code.length < 8) {
        errorDiv.textContent = 'Connection code must be at least 8 characters';
        errorDiv.style.display = 'block';
        return;
    }

    errorDiv.style.display = 'none';
    connectBtn.disabled = true;
    connectBtn.textContent = 'Connecting...';

    // Show connecting step
    showStep('step-connecting');

    try {
        // Call Electron IPC to connect
        const result = await window.electronAPI.connectBridge(code);

        if (result.success) {
            // Success! Show QR code step
            showStep('step-qr');

            // Listen for bridge status updates
            window.electronAPI.onBridgeStatus((status) => {
                if (status.status === 'connected') {
                    // WhatsApp connected!
                    showStep('step-connected');
                }
            });
        } else {
            // Failed
            showStep('step-code');
            errorDiv.textContent = result.message || 'Failed to connect';
            errorDiv.style.display = 'block';
            connectBtn.disabled = false;
            connectBtn.textContent = 'Connect to Shepherd AI';
        }
    } catch (error) {
        console.error('Connection error:', error);
        showStep('step-code');
        errorDiv.textContent = 'Connection failed. Please check your internet connection.';
        errorDiv.style.display = 'block';
        connectBtn.disabled = false;
        connectBtn.textContent = 'Connect to Shepherd AI';
    }
}

function openWhatsAppSetup() {
    window.electronAPI.openExternal('https://faq.whatsapp.com/1317564962315842/');
}

function minimizeToTray() {
    window.electronAPI.minimize();
}

// Listen for keyboard shortcuts
document.getElementById('connectionCode')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        connectBridge();
    }
});

// Check if already connected on load
window.addEventListener('DOMContentLoaded', async () => {
    try {
        const status = await window.electronAPI.checkStatus();
        if (status.running) {
            showStep('step-connected');
        }
    } catch (error) {
        console.log('Not connected yet');
    }
});
