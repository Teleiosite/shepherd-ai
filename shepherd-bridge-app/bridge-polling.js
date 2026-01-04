// =================== MESSAGE POLLING ADDON ===================
// This file adds polling functionality to bridge-core.js
// Append this to the end of bridge-core.js OR require it separately

const axios = require('axios');
const BACKEND_URL = 'https://shepherd-ai-backend.onrender.com';
let connectionCode = null;
let pollingInterval = null;
let clientSessionRef = null;
let bridgeStatusRef = null;

// Initialize with references from bridge-core
function initPolling(session, statusGetter) {
    clientSessionRef = session;
    bridgeStatusRef = statusGetter;
}

// Start polling for pending messages
function startMessagePolling(code) {
    connectionCode = code;
    console.log('🔄 Starting message polling with code:', code);

    // Poll immediately
    setTimeout(() => pollPendingMessages(), 2000);

    // Then poll every 5 seconds
    if (pollingInterval) clearInterval(pollingInterval);
    pollingInterval = setInterval(pollPendingMessages, 5000);
}

async function pollPendingMessages() {
    if (!connectionCode || !clientSessionRef) {
        return;
    }

    try {
        // Fetch pending messages from backend
        const response = await axios.get(`${BACKEND_URL}/api/bridge/pending-messages`, {
            params: { code: connectionCode },
            timeout: 10000
        });

        if (response.data.success && response.data.count > 0) {
            console.log(`📬 Found ${response.data.count} pending message(s)`);

            // Send each message
            for (const msg of response.data.messages) {
                await sendPendingMessage(msg);
            }
        }
    } catch (error) {
        if (error.code !== 'ECONNABORTED') {
            console.error('⚠️ Polling error:', error.message);
        }
    }
}

async function sendPendingMessage(msg) {
    try {
        // Determine chat ID
        let chatId;
        if (msg.whatsapp_id && msg.whatsapp_id.includes('@')) {
            chatId = msg.whatsapp_id;
        } else {
            let cleanPhone = msg.phone.replace(/\\D/g, '');
            if (cleanPhone.startsWith('0')) {
                cleanPhone = '234' + cleanPhone.substring(1);
            }
            chatId = `${cleanPhone}@c.us`;
        }

        console.log(`📤 Sending queued message to ${chatId}...`);

        // Send via WPPConnect
        const result = await clientSessionRef.sendText(chatId, msg.content);

        console.log('✅ Message sent successfully!', result?.id);

        // Update status in backend
        await axios.post(`${BACKEND_URL}/api/bridge/update-message-status`, {
            message_id: msg.id,
            status: 'sent',
            whatsapp_message_id: result?.id
        }, {
            params: { code: connectionCode }
        });

    } catch (error) {
        console.error(`❌ Failed to send message:`, error.message);

        // Update status as failed
        try {
            await axios.post(`${BACKEND_URL}/api/bridge/update-message-status`, {
                message_id: msg.id,
                status: 'failed',
                error: error.message
            }, {
                params: { code: connectionCode }
            });
        } catch (e) {
            console.error('Failed to update error status:', e.message);
        }
    }
}

module.exports = {
    startPolling: startMessagePolling,
    initPolling: initPolling
};
