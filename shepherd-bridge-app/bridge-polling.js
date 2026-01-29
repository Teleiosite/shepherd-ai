// =================== MESSAGE POLLING ADDON ===================
// This file adds polling functionality to bridge-core.js
// Append this to the end of bridge-core.js OR require it separately

const axios = require('axios');
const groupManager = require('./group-manager');

const BACKEND_URL = 'https://shepherd-ai-backend.onrender.com';
let connectionCode = null;
let pollingInterval = null;
let clientSessionRef = null;
let bridgeStatusRef = null;
let groupManagerInitialized = false;

// Track recently sent messages to prevent duplicates
const sentMessageIds = new Set();
const SENT_MESSAGE_TTL = 60000; // Keep in cache for 1 minute

// Initialize with references from bridge-core
function initPolling(session, statusGetter) {
    clientSessionRef = session;
    bridgeStatusRef = statusGetter;
}

// Start polling for pending messages
function startMessagePolling(code) {
    connectionCode = code;
    console.log('🔄 Starting message polling with code:', code);

    // Initialize group manager if not already done
    if (clientSessionRef && !groupManagerInitialized) {
        console.log('👥 Initializing Group Manager...');
        groupManager.initialize(clientSessionRef, BACKEND_URL, connectionCode);
        groupManager.startPolling(10000); // Poll every 10 seconds
        groupManagerInitialized = true;
    }

    // Poll immediately
    setTimeout(() => pollPendingMessages(), 2000);

    // Then poll every 5 seconds
    if (pollingInterval) clearInterval(pollingInterval);
    pollingInterval = setInterval(pollPendingMessages, 5000);
}

async function pollPendingMessages() {
    if (!connectionCode || !clientSessionRef) {
        console.log('⏸️ Polling skipped - not ready');
        return;
    }

    try {
        console.log('🔍 Polling for pending messages...');
        // Fetch pending messages from backend
        const response = await axios.get(`${BACKEND_URL}/api/bridge/pending-messages`, {
            params: { code: connectionCode },
            timeout: 10000
        });

        console.log(`📊 Poll result: ${response.data.count} pending message(s)`);

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
        // Check if we already sent this message recently (prevents duplicates)
        if (sentMessageIds.has(msg.id)) {
            console.log(`⏭️ Skipping duplicate message ${msg.id}`);
            return;
        }

        // Add to sent cache
        sentMessageIds.add(msg.id);
        setTimeout(() => sentMessageIds.delete(msg.id), SENT_MESSAGE_TTL);

        // Determine chat ID
        let chatId;
        if (msg.whatsapp_id && msg.whatsapp_id.includes('@')) {
            chatId = msg.whatsapp_id;
        } else {
            let cleanPhone = msg.phone.replace(/\D/g, '');  // Remove non-digits
            if (cleanPhone.startsWith('0')) {
                cleanPhone = '234' + cleanPhone.substring(1);
            }
            chatId = `${cleanPhone}@c.us`;
        }

        console.log(`📤 Sending queued message to ${chatId}...`);

        let result;

        // Check if message has media attachment
        if (msg.attachment_url && msg.attachment_type) {
            console.log(`📸 Sending ${msg.attachment_type} with caption...`);

            // Send media file
            result = await clientSessionRef.sendFile(
                chatId,
                msg.attachment_url,
                {
                    caption: msg.content || '',
                    filename: `attachment.${msg.attachment_type.split('/')[1] || 'jpg'}`
                }
            );
        } else {
            // Send text only
            result = await clientSessionRef.sendText(chatId, msg.content);
        }

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
