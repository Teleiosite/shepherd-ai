/**
 * Shepherd AI Oracle Cloud Bridge
 * 
 * Full-featured WhatsApp Bridge for Oracle Cloud deployment.
 * Combines all features from local bridge:
 * - Incoming message handling with media support
 * - Outgoing message polling from backend
 * - Group management
 * - WebSocket broadcasting
 * - Backend webhook integration
 * - QR code authentication via API endpoint
 */

require('dotenv').config();
const wppconnect = require('@wppconnect-team/wppconnect');
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const WebSocket = require('ws');
const fs = require('fs');
const os = require('os');
const path = require('path');

const app = express();

// Configuration
const PORT = process.env.PORT || 3001;
const WS_PORT = process.env.WS_PORT || 3002;
const BACKEND_URL = process.env.BACKEND_URL || 'https://shepherd-ai-backend.onrender.com';
const CONNECTION_CODE = process.env.CONNECTION_CODE || '1DCFEA1A';
const POLL_INTERVAL = 5000; // 5 seconds

// State
let clientSession = null;
let bridgeStatus = 'initializing';
let latestQRCode = null; // Store QR code for API access

// Track recently sent messages to prevent duplicates
const sentMessageIds = new Set();
const SENT_MESSAGE_TTL = 60000;

// =================== EXPRESS SETUP ===================

// CORS setup (includes Private Network header for local access)
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    res.header("Access-Control-Allow-Private-Network", "true");
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Request logging
app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.path}`);
    next();
});

// =================== WEBSOCKET SERVER ===================

const wss = new WebSocket.Server({ port: WS_PORT });
const wsClients = new Set();

wss.on('connection', (ws) => {
    console.log('🔌 WebSocket client connected');
    wsClients.add(ws);
    ws.send(JSON.stringify({ type: 'status', status: bridgeStatus }));
    ws.on('close', () => wsClients.delete(ws));
});

function broadcastToClients(data) {
    const message = JSON.stringify(data);
    wsClients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) client.send(message);
    });
}

// =================== API ENDPOINTS ===================

// Health check
app.get('/', (req, res) => {
    res.json({
        status: 'online',
        whatsappConnected: bridgeStatus === 'connected',
        service: 'Shepherd AI Oracle Cloud Bridge',
        version: '2.0.0',
        uptime: process.uptime()
    });
});

app.get('/health', (req, res) => {
    res.json({
        status: bridgeStatus,
        uptime: process.uptime(),
        wsClients: wsClients.size,
        wsPort: WS_PORT
    });
});

// Status endpoint
app.get('/api/status', (req, res) => {
    res.json({ status: bridgeStatus, wsPort: WS_PORT });
});

// QR Code endpoint - Returns current QR code for scanning
app.get('/api/qr', (req, res) => {
    if (bridgeStatus === 'connected') {
        return res.json({ status: 'connected', message: 'Already connected to WhatsApp' });
    }
    if (latestQRCode) {
        return res.json({
            status: 'waiting_scan',
            qr: latestQRCode,
            message: 'Scan this QR code with WhatsApp'
        });
    }
    return res.json({
        status: 'initializing',
        message: 'QR code not yet generated. Please wait...'
    });
});

// QR Code as image (for browser viewing)
app.get('/api/qr-image', (req, res) => {
    if (!latestQRCode) {
        return res.status(404).send('QR code not available yet');
    }
    // latestQRCode is base64 image
    const base64Data = latestQRCode.replace(/^data:image\/\w+;base64,/, '');
    const imgBuffer = Buffer.from(base64Data, 'base64');
    res.writeHead(200, {
        'Content-Type': 'image/png',
        'Content-Length': imgBuffer.length
    });
    res.end(imgBuffer);
});

// Send text message
app.post('/api/send', async (req, res) => {
    const { phone, message, whatsappId } = req.body;

    if (bridgeStatus !== 'connected' || !clientSession) {
        return res.status(503).json({ success: false, error: 'Bridge not connected. Please wait for reconnection.' });
    }

    try {
        let chatId;
        if (whatsappId && whatsappId.includes('@')) {
            chatId = whatsappId;
            console.log(`📤 Replying to WhatsApp ID: ${chatId}...`);
        } else {
            let cleanPhone = phone.replace(/\D/g, '');
            if (cleanPhone.startsWith('0')) cleanPhone = '234' + cleanPhone.substring(1);
            chatId = `${cleanPhone}@c.us`;
            console.log(`📤 Sending to phone: ${chatId}...`);
        }

        console.log(`📝 Message: ${message.substring(0, 50)}...`);
        const result = await clientSession.sendText(chatId, message);
        console.log('✅ Sent successfully!', result?.id || '');
        res.json({ success: true, messageId: result?.id });
    } catch (error) {
        console.error('❌ Send Error:', error.message || error);

        // Detect session errors
        let errorType = 'unknown';
        if (error.message && error.message.includes('detached')) {
            errorType = 'session_detached';
            bridgeStatus = 'disconnected';
            broadcastToClients({ type: 'status', status: 'disconnected' });
        }

        res.status(500).json({
            success: false,
            error: error.message || error.toString(),
            errorType: errorType
        });
    }
});

// Send media message
app.post('/api/sendMedia', async (req, res) => {
    const { phone, whatsappId, mediaType, mediaData, caption, filename } = req.body;

    if (bridgeStatus !== 'connected' || !clientSession) {
        return res.status(503).json({ success: false, error: 'Bridge not connected' });
    }
    if (!mediaData) {
        return res.status(400).json({ success: false, error: 'Media data required' });
    }

    let chatId;
    if (whatsappId && whatsappId.includes('@')) chatId = whatsappId;
    else {
        let cleanPhone = (phone || '').replace(/\D/g, '');
        if (cleanPhone.startsWith('0')) cleanPhone = '234' + cleanPhone.substring(1);
        chatId = `${cleanPhone}@c.us`;
    }

    try {
        // Sanitize base64
        let pureBase64 = String(mediaData || '');
        if (pureBase64.startsWith('data:')) pureBase64 = pureBase64.split(',')[1] || '';
        pureBase64 = pureBase64.replace(/\s+/g, '');

        let buffer;
        try {
            buffer = Buffer.from(pureBase64, 'base64');
        } catch (err) {
            return res.status(400).json({ success: false, error: 'Invalid base64' });
        }

        if (!buffer || !buffer.length) {
            return res.status(400).json({ success: false, error: 'Empty decoded buffer' });
        }

        // Detect file type
        const header = buffer.slice(0, 8).toString('hex');
        let inferredExt = '';
        if (header.startsWith('89504e47')) inferredExt = 'png';
        else if (header.startsWith('ffd8ff')) inferredExt = 'jpg';
        else if (header.startsWith('25504446')) inferredExt = 'pdf';
        else if (header.startsWith('00000018') || header.includes('66747970')) inferredExt = 'mp4';

        let outFilename = filename || `file.${inferredExt || 'bin'}`;
        if (!path.extname(outFilename) && inferredExt) outFilename = `${outFilename}.${inferredExt}`;

        // Try sendFileFromBase64 first
        try {
            const result = await clientSession.sendFileFromBase64(chatId, pureBase64, outFilename, caption || '');
            console.log('✅ Media sent:', result?.id);
            return res.json({ success: true, messageId: result?.id || null });
        } catch (errSend) {
            console.warn('⚠️ sendFileFromBase64 failed, trying fallback...');
        }

        // Fallback: write to temp file
        try {
            const tmpDir = fs.existsSync(os.tmpdir()) ? os.tmpdir() : '.';
            const tmpPath = path.join(tmpDir, `upload-${Date.now()}.${inferredExt || 'bin'}`);
            fs.writeFileSync(tmpPath, buffer);

            const result2 = await clientSession.sendFile(chatId, tmpPath, outFilename, caption || '');
            console.log('✅ Media sent via fallback:', result2?.id);

            try { fs.unlinkSync(tmpPath); } catch (e) { }
            return res.json({ success: true, messageId: result2?.id || null, fallback: true });
        } catch (errFallback) {
            return res.status(500).json({ success: false, error: errFallback.message });
        }
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

// =================== WHATSAPP INITIALIZATION ===================

async function initializeWhatsApp() {
    console.log('🚀 Starting Shepherd AI Oracle Cloud Bridge...');
    console.log(`📡 Backend: ${BACKEND_URL}`);
    console.log(`🔑 Connection Code: ${CONNECTION_CODE}`);

    try {
        clientSession = await wppconnect.create({
            session: 'shepherd-oracle',
            headless: 'new',
            devtools: false,
            useChrome: false,
            debug: false,
            logQR: true,
            autoClose: 0,
            browserArgs: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu',
                '--single-process'
            ],
            puppeteerOptions: {
                headless: 'new',
                executablePath: process.env.CHROME_PATH || '/usr/bin/chromium-browser',
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--single-process'
                ]
            },
            statusFind: (statusSession, session) => {
                console.log('📱 Status Session:', statusSession);
            },
            catchQR: (base64Qr, asciiQR) => {
                latestQRCode = base64Qr; // Store for API access
                console.log('\n📱 SCAN THIS QR CODE WITH YOUR PHONE:\n');
                console.log(asciiQR);
                console.log('\n✅ QR Code available at: http://YOUR_IP:' + PORT + '/api/qr-image\n');
            }
        });

        bridgeStatus = 'connected';
        latestQRCode = null; // Clear QR after connection
        console.log('✅ WhatsApp connected!');
        broadcastToClients({ type: 'status', status: 'connected' });

        // Register bridge with backend
        registerWithBackend();

        // Setup message handlers
        setupMessageHandlers();

        // Start polling for pending messages
        startPolling();

        // Initialize group manager
        initGroupManager();

        // Health monitoring
        startHealthMonitoring();

    } catch (error) {
        console.error('❌ Failed to initialize WhatsApp:', error.message);
        bridgeStatus = 'disconnected';

        // Retry after 30 seconds
        console.log('🔄 Retrying in 30 seconds...');
        setTimeout(initializeWhatsApp, 30000);
    }
}

// =================== REGISTER WITH BACKEND ===================

async function registerWithBackend() {
    try {
        await axios.post(`${BACKEND_URL}/api/bridge/register`, {
            connection_code: CONNECTION_CODE,
            bridge_url: `http://YOUR_IP:${PORT}`,
            status: 'connected'
        });
        console.log('✅ Registered with backend');
    } catch (error) {
        console.error('⚠️ Failed to register with backend:', error.message);
    }
}

// =================== INCOMING MESSAGE HANDLER ===================

function setupMessageHandlers() {
    clientSession.onMessage(async (message) => {
        console.log('🔔 onMessage! From:', message.from, 'isGroup:', message.isGroupMsg, 'Body:', message.body?.substring(0, 30));

        if (!message.isGroupMsg && !message.from.includes('status@broadcast')) {
            console.log('✅ Processing 1-on-1 message from:', message.from);

            // Handle media
            let body = message.body || '';
            let mediaType = null;
            let isMedia = false;
            let mediaData = null;
            let mediaUrl = null;

            if (message.type && ['image', 'video', 'audio', 'ptt', 'document', 'sticker'].includes(message.type)) {
                isMedia = true;
                mediaType = message.type;

                try {
                    console.log(`📥 Downloading ${mediaType}...`);
                    const mediaBuffer = await clientSession.decryptFile(message);
                    mediaData = mediaBuffer.toString('base64');
                    console.log(`✅ Media downloaded (${Math.round(mediaData.length / 1024)}KB)`);

                    if (message.type === 'image') {
                        body = message.caption || '📷 Image';
                        mediaUrl = `data:image/jpeg;base64,${mediaData}`;
                    } else if (message.type === 'video') {
                        body = message.caption || '🎥 Video';
                        mediaUrl = `data:video/mp4;base64,${mediaData}`;
                    } else if (message.type === 'audio' || message.type === 'ptt') {
                        body = '🎵 Audio';
                        mediaUrl = `data:audio/ogg;base64,${mediaData}`;
                    } else if (message.type === 'document') {
                        body = message.filename || '📄 Document';
                        mediaUrl = `data:application/octet-stream;base64,${mediaData}`;
                    } else if (message.type === 'sticker') {
                        body = '🎨 Sticker';
                        mediaUrl = `data:image/webp;base64,${mediaData}`;
                    }
                } catch (error) {
                    console.error(`❌ Media download error: ${error.message}`);
                    body = `📎 [${mediaType} - download failed]`;
                }
            } else if (message.hasMedia) {
                isMedia = true;
                mediaType = 'unknown';
                try {
                    const mediaBuffer = await clientSession.decryptFile(message);
                    mediaData = mediaBuffer.toString('base64');
                    mediaUrl = `data:application/octet-stream;base64,${mediaData}`;
                    body = '📎 Media';
                } catch (error) {
                    body = '📎 [Media - download failed]';
                }
            } else {
                body = message.body || '[No content]';
                console.log(`📩 INCOMING: ${body.substring(0, 50)}...`);
            }

            // Extract contact info
            let phoneNumber = message.from.replace('@c.us', '').replace('@lid', '');
            let contactName = null;
            let pushname = null;
            let realPhone = null;

            if (message.from.includes('@lid')) {
                try {
                    const contact = await clientSession.getContact(message.from);
                    if (contact) {
                        contactName = contact.name || contact.shortName || contact.formattedName;
                        pushname = contact.pushname;

                        if (contactName && /^\+?\d{10,15}$/.test(contactName.replace(/[\s\-]/g, ''))) {
                            realPhone = contactName.replace(/\D/g, '');
                        } else if (contact.formattedNumber && contact.formattedNumber.trim()) {
                            realPhone = contact.formattedNumber.replace(/\D/g, '');
                        } else if (contact.number && contact.number.trim()) {
                            realPhone = contact.number.replace(/\D/g, '');
                        } else if (contact.id && contact.id._serialized) {
                            const serialized = contact.id._serialized.replace(/@.*$/, '');
                            if (/^(1|2[0-9]{2}|3[0-9]{2}|4[0-9]{2}|5[0-9]{2}|6[0-9]{2}|7|8[0-9]{2}|9[0-9]{2})\d{8,13}$/.test(serialized)) {
                                realPhone = serialized;
                            }
                        } else if (contact.id && contact.id.user) {
                            realPhone = contact.id.user;
                        }
                    }
                } catch (e) {
                    console.log('Could not get contact info:', e.message);
                }
            } else {
                realPhone = phoneNumber;
            }

            // Broadcast to WebSocket clients
            broadcastToClients({
                type: 'incoming_message',
                from: message.from,
                phone: phoneNumber,
                realPhone: realPhone,
                contactName: contactName,
                pushname: pushname,
                body: body,
                hasMedia: isMedia,
                mediaType: mediaType,
                mediaUrl: mediaUrl,
                timestamp: message.timestamp || Date.now() / 1000
            });

            // Save to backend via webhook
            try {
                console.log('💾 Saving to backend...');
                await axios.post(`${BACKEND_URL}/api/whatsapp/webhook`, {
                    phone: realPhone || phoneNumber,
                    whatsapp_id: message.from,
                    content: body,
                    contact_name: contactName,
                    pushname: pushname,
                    has_media: isMedia,
                    media_type: mediaType,
                    media_url: mediaUrl
                });
                console.log('✅ Saved to backend!');
            } catch (error) {
                console.error('❌ Backend save error:', error.message);
            }

        } else {
            console.log('⏭️ Skipping (group/broadcast):', message.from);
        }
    });

    // Message acknowledgments
    clientSession.onAck((ack) => {
        broadcastToClients({
            type: 'message_ack',
            messageId: ack.id?._serialized,
            ack: ack.ack
        });
    });
}

// =================== OUTGOING MESSAGE POLLING ===================

function startPolling() {
    console.log('🔄 Starting message polling...');

    // Poll immediately
    setTimeout(pollPendingMessages, 2000);

    // Then poll every 5 seconds
    setInterval(pollPendingMessages, POLL_INTERVAL);
}

async function pollPendingMessages() {
    if (bridgeStatus !== 'connected' || !clientSession) return;

    try {
        const response = await axios.get(`${BACKEND_URL}/api/bridge/pending-messages`, {
            params: { code: CONNECTION_CODE },
            timeout: 10000
        });

        if (response.data.success && response.data.count > 0) {
            console.log(`📬 Found ${response.data.count} pending message(s)`);

            for (const msg of response.data.messages) {
                await sendPendingMessage(msg);
            }
        }
    } catch (error) {
        if (error.code !== 'ECONNABORTED') {
            // Silently ignore connection timeouts during polling
        }
    }
}

async function sendPendingMessage(msg) {
    try {
        if (sentMessageIds.has(msg.id)) return;

        sentMessageIds.add(msg.id);
        setTimeout(() => sentMessageIds.delete(msg.id), SENT_MESSAGE_TTL);

        let chatId;
        if (msg.whatsapp_id && msg.whatsapp_id.includes('@')) {
            chatId = msg.whatsapp_id;
        } else {
            let cleanPhone = msg.phone.replace(/\D/g, '');
            if (cleanPhone.startsWith('0')) cleanPhone = '234' + cleanPhone.substring(1);
            chatId = `${cleanPhone}@c.us`;
        }

        console.log(`📤 Sending queued message to ${chatId}...`);

        let result;
        if (msg.attachment_url && msg.attachment_type) {
            console.log(`📸 Sending ${msg.attachment_type}...`);
            result = await clientSession.sendFile(chatId, msg.attachment_url, {
                caption: msg.content || '',
                filename: `attachment.${msg.attachment_type.split('/')[1] || 'jpg'}`
            });
        } else {
            result = await clientSession.sendText(chatId, msg.content);
        }

        console.log('✅ Message sent!', result?.id);

        await axios.post(`${BACKEND_URL}/api/bridge/update-message-status`, {
            message_id: msg.id,
            status: 'sent',
            whatsapp_message_id: result?.id
        }, { params: { code: CONNECTION_CODE } });

    } catch (error) {
        console.error(`❌ Send failed:`, error.message);
        try {
            await axios.post(`${BACKEND_URL}/api/bridge/update-message-status`, {
                message_id: msg.id,
                status: 'failed',
                error: error.message
            }, { params: { code: CONNECTION_CODE } });
        } catch (e) { }
    }
}

// =================== HEALTH MONITORING ===================

function startHealthMonitoring() {
    setInterval(async () => {
        try {
            const state = await clientSession.getConnectionState();
            if (state !== 'CONNECTED') {
                console.log('⚠️ Health check: state =', state);
                bridgeStatus = 'disconnected';
                broadcastToClients({ type: 'status', status: 'disconnected' });
            } else if (bridgeStatus !== 'connected') {
                console.log('✅ Connection restored!');
                bridgeStatus = 'connected';
                broadcastToClients({ type: 'status', status: 'connected' });
            }
        } catch (error) {
            console.log('⚠️ Health check error:', error.message);
            bridgeStatus = 'disconnected';
            broadcastToClients({ type: 'status', status: 'disconnected' });
        }
    }, 300000); // Every 5 minutes
}

// =================== GROUP MANAGER ===================

let groupSyncRetryCount = 0;

/**
 * Initialize group management features
 */
function initGroupManager() {
    console.log('👥 Initializing Group Manager...');
    setupGroupEventListeners();

    // Wait for WhatsApp to fully load chats before syncing
    console.log('⏳ Waiting 30 seconds for WhatsApp to fully load all chats...');
    setTimeout(() => syncGroups(), 30000);

    // Start group polling (welcome queue + group messages)
    startGroupPolling(10000);
}

/**
 * Sync all WhatsApp groups with backend
 */
async function syncGroups() {
    try {
        console.log('🔄 Syncing WhatsApp groups...');

        const allChats = await clientSession.listChats();
        console.log(`📱 Total chats loaded: ${allChats.length}`);

        // Robust group filter
        const groups = allChats.filter(chat => {
            const isGroupByFlag = chat.isGroup === true;
            const isGroupByServer = chat.id && (chat.id.server === 'g.us' || chat.id._serialized?.includes('@g.us'));
            const isGroupByKind = chat.kind === 'group';
            return isGroupByFlag || isGroupByServer || isGroupByKind;
        });

        console.log(`📊 Found ${groups.length} groups in WhatsApp`);

        // Retry if no groups found
        if (groups.length === 0 && groupSyncRetryCount < 2) {
            groupSyncRetryCount++;
            console.log(`⚠️ No groups found. Retrying in 10s... (Attempt ${groupSyncRetryCount}/2)`);
            setTimeout(() => syncGroups(), 10000);
            return null;
        }

        if (groups.length > 0) groupSyncRetryCount = 0;

        const groupData = groups.map(g => ({
            whatsapp_group_id: g.id._serialized || g.id,
            name: g.name || g.contact?.name || 'Unnamed Group',
            description: g.description || null,
            avatar_url: g.profilePicUrl || null,
            member_count: g.participants ? g.participants.length : (g.groupMetadata?.participants?.length || 0)
        }));

        if (groupData.length === 0) {
            console.log('📭 No group data to sync');
            return null;
        }

        const response = await axios.post(
            `${BACKEND_URL}/api/groups/sync?code=${CONNECTION_CODE}`,
            { groups: groupData }
        );

        console.log(`✅ Synced ${response.data.synced} groups (${response.data.new} new, ${response.data.updated} updated)`);
        return response.data;
    } catch (error) {
        console.error('❌ Error syncing groups:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
        }
        return null;
    }
}

/**
 * Set up event listeners for group participant changes
 */
function setupGroupEventListeners() {
    if (!clientSession) return;

    clientSession.onParticipantsChanged(async (event) => {
        try {
            console.log('👥 Group participant event:', event.action, event.by);

            if (event.action === 'add') {
                for (const newMember of event.who) {
                    await handleMemberJoined(event.chatId, newMember);
                }
            } else if (event.action === 'remove') {
                console.log(`👋 Member left: ${event.who}`);
            }
        } catch (error) {
            console.error('❌ Error handling participant change:', error);
        }
    });

    console.log('👂 Group event listeners set up');
}

/**
 * Handle a new member joining a group
 */
async function handleMemberJoined(groupId, memberId) {
    try {
        console.log(`🆕 New member ${memberId} joined group ${groupId}`);

        const contact = await clientSession.getContact(memberId);
        const phone = contact.id.user || memberId.replace('@c.us', '');

        const response = await axios.post(
            `${BACKEND_URL}/api/groups/${groupId}/members/joined?code=${CONNECTION_CODE}`,
            {
                whatsapp_id: memberId,
                name: contact.pushname || contact.name || 'Unknown',
                phone: phone,
                joined_at: new Date().toISOString()
            }
        );

        console.log(`✅ Backend notified: ${response.data.contact_created ? 'Contact created' : 'Existing contact'}`);
    } catch (error) {
        console.error('❌ Error handling member joined:', error.message);
    }
}

/**
 * Process welcome queue (send welcome messages to new group members)
 */
async function processWelcomeQueue() {
    try {
        const { data: welcomes } = await axios.get(
            `${BACKEND_URL}/api/groups/welcome-queue?code=${CONNECTION_CODE}`
        );

        if (welcomes.length === 0) return;

        console.log(`📬 Processing ${welcomes.length} welcome messages`);

        for (const welcome of welcomes) {
            try {
                const chatId = welcome.phone.includes('@') ? welcome.phone : `${welcome.phone}@c.us`;
                await clientSession.sendText(chatId, welcome.message);
                console.log(`✅ Sent welcome to ${welcome.phone} (${welcome.group_name})`);

                await axios.post(
                    `${BACKEND_URL}/api/groups/welcome-queue/${welcome.id}/sent?code=${CONNECTION_CODE}`
                );

                // Rate limit delay
                await new Promise(resolve => setTimeout(resolve, 3000));
            } catch (error) {
                console.error(`❌ Error sending welcome to ${welcome.phone}:`, error.message);
            }
        }
    } catch (error) {
        if (error.response?.status !== 404) {
            console.error('❌ Error processing welcome queue:', error.message);
        }
    }
}

/**
 * Process pending group messages (broadcasts)
 */
async function processGroupMessages() {
    try {
        const { data: messages } = await axios.get(
            `${BACKEND_URL}/api/groups/messages/pending?code=${CONNECTION_CODE}`
        );

        if (messages.length === 0) return;

        console.log(`📤 Processing ${messages.length} group messages`);

        for (const msg of messages) {
            try {
                await clientSession.sendText(msg.group_id, msg.content);
                console.log(`✅ Sent message to group ${msg.group_id}`);

                await axios.post(
                    `${BACKEND_URL}/api/groups/messages/${msg.id}/status?code=${CONNECTION_CODE}`,
                    { status: 'sent', sent_at: new Date().toISOString() }
                );

                await new Promise(resolve => setTimeout(resolve, 3000));
            } catch (error) {
                console.error(`❌ Error sending group message:`, error.message);
                await axios.post(
                    `${BACKEND_URL}/api/groups/messages/${msg.id}/status?code=${CONNECTION_CODE}`,
                    { status: 'failed', error_message: error.message }
                );
            }
        }
    } catch (error) {
        if (error.response?.status !== 404) {
            console.error('❌ Error processing group messages:', error.message);
        }
    }
}

/**
 * Start polling for group tasks (welcome queue + group broadcasts)
 */
function startGroupPolling(intervalMs = 10000) {
    console.log(`🔄 Starting group polling (every ${intervalMs / 1000}s)`);
    setInterval(async () => {
        await processWelcomeQueue();
        await processGroupMessages();
    }, intervalMs);
}

// =================== START ===================

app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🌐 ===========================================`);
    console.log(`🐑 Shepherd AI Oracle Cloud Bridge v2.0.0`);
    console.log(`===========================================`);
    console.log(`📡 REST API: http://0.0.0.0:${PORT}`);
    console.log(`🔌 WebSocket: ws://0.0.0.0:${WS_PORT}`);
    console.log(`📡 Backend:  ${BACKEND_URL}`);
    console.log(`🔑 Code:     ${CONNECTION_CODE}`);
    console.log(`===========================================\n`);

    // Initialize WhatsApp
    setTimeout(initializeWhatsApp, 2000);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('👋 SIGTERM received...');
    if (clientSession) await clientSession.close();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('👋 SIGINT received...');
    if (clientSession) await clientSession.close();
    process.exit(0);
});
