/**
 * Shepherd AI Oracle Cloud Bridge v3.0.0 (Baileys Edition)
 * 
 * Full-featured WhatsApp Bridge using @whiskeysockets/baileys
 * NO CHROMIUM REQUIRED - Pure WebSocket connection to WhatsApp
 * 
 * Features:
 * - Incoming message handling with media support
 * - Outgoing message polling from backend
 * - Group management
 * - WebSocket broadcasting to frontend
 * - Backend webhook integration
 * - QR code authentication via API endpoint
 */

require('dotenv').config();
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, downloadMediaMessage, makeInMemoryStore, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const WebSocket = require('ws');
const fs = require('fs');
const os = require('os');
const path = require('path');
const QRCode = require('qrcode');
const pino = require('pino');

const app = express();

// Configuration
const PORT = process.env.PORT || 10000;
const BACKEND_URL = process.env.BACKEND_URL || 'https://shepherd-ai-backend.onrender.com';
const CONNECTION_CODE = process.env.CONNECTION_CODE || '1DCFEA1A';
const POLL_INTERVAL = 5000; // 5 seconds
const AUTH_DIR = path.join(__dirname, 'auth_info');

// Logger (minimal to save memory)
const logger = pino({ level: 'warn' });

// State
let sock = null;
let bridgeStatus = 'initializing';
let latestQRCode = null; // Base64 QR image for API access
let latestQRString = null; // Raw QR string

// Track recently sent messages to prevent duplicates
const sentMessageIds = new Set();
const SENT_MESSAGE_TTL = 60000;

// In-memory store for message retry
const store = makeInMemoryStore({ logger });

// =================== EXPRESS SETUP ===================

// CORS setup
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

// =================== SERVER & WEBSOCKET SETUP ===================

// Create HTTP server
const server = app.listen(PORT, () => {
    console.log(`🌐 Server running on port ${PORT}`);
    console.log(`📡 Backend: ${BACKEND_URL}`);
    console.log('🧠 No Chromium required - Pure WebSocket connection!');

    // Initialize WhatsApp after server starts
    setTimeout(initializeWhatsApp, 1000);
});

// Attach WebSocket to the same HTTP server
const wss = new WebSocket.Server({ server });
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
        service: 'Shepherd AI Oracle Cloud Bridge (Baileys)',
        version: '3.0.0',
        uptime: process.uptime()
    });
});

app.get('/health', (req, res) => {
    res.json({
        status: bridgeStatus,
        uptime: process.uptime(),
        wsClients: wsClients.size
    });
});

// Status endpoint
app.get('/api/status', (req, res) => {
    res.json({ status: bridgeStatus });
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
app.get('/api/qr-image', async (req, res) => {
    if (bridgeStatus === 'connected') {
        return res.status(200).send(`
            <html><body style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:Arial;background:#1a1a2e;color:#16c784;">
                <div style="text-align:center;">
                    <h1>✅ WhatsApp Connected!</h1>
                    <p>The bridge is running and connected.</p>
                </div>
            </body></html>
        `);
    }

    if (!latestQRCode && !latestQRString) {
        return res.status(200).send(`
            <html><head><meta http-equiv="refresh" content="5"></head>
            <body style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:Arial;background:#1a1a2e;color:white;">
                <div style="text-align:center;">
                    <h1>⏳ Generating QR Code...</h1>
                    <p>This page will auto-refresh in 5 seconds.</p>
                </div>
            </body></html>
        `);
    }

    try {
        // Generate QR code image from the raw QR string
        if (latestQRString) {
            const qrImageBuffer = await QRCode.toBuffer(latestQRString, {
                width: 400,
                margin: 2,
                color: { dark: '#000000', light: '#ffffff' }
            });
            res.writeHead(200, {
                'Content-Type': 'image/png',
                'Content-Length': qrImageBuffer.length,
                'Cache-Control': 'no-cache'
            });
            return res.end(qrImageBuffer);
        }

        // Fallback: use base64 QR
        if (latestQRCode) {
            const base64Data = latestQRCode.replace(/^data:image\/\w+;base64,/, '');
            const imgBuffer = Buffer.from(base64Data, 'base64');
            res.writeHead(200, {
                'Content-Type': 'image/png',
                'Content-Length': imgBuffer.length
            });
            return res.end(imgBuffer);
        }

        return res.status(404).send('QR code not available');
    } catch (error) {
        console.error('❌ QR image error:', error.message);
        return res.status(500).send('Error generating QR image');
    }
});

// Send text message
app.post('/api/send', async (req, res) => {
    const { phone, message, whatsappId } = req.body;

    if (bridgeStatus !== 'connected' || !sock) {
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
            chatId = `${cleanPhone}@s.whatsapp.net`;
            console.log(`📤 Sending to phone: ${chatId}...`);
        }

        // Convert @c.us to @s.whatsapp.net for Baileys
        chatId = chatId.replace('@c.us', '@s.whatsapp.net');

        console.log(`📝 Message: ${message.substring(0, 50)}...`);
        const result = await sock.sendMessage(chatId, { text: message });
        console.log('✅ Sent successfully!', result?.key?.id || '');
        res.json({ success: true, messageId: result?.key?.id });
    } catch (error) {
        console.error('❌ Send Error:', error.message || error);

        let errorType = 'unknown';
        if (error.message && (error.message.includes('disconnected') || error.message.includes('Connection Closed'))) {
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

    if (bridgeStatus !== 'connected' || !sock) {
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
        chatId = `${cleanPhone}@s.whatsapp.net`;
    }

    // Convert @c.us to @s.whatsapp.net for Baileys
    chatId = chatId.replace('@c.us', '@s.whatsapp.net');

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
        let inferredType = 'document';
        let mimeType = 'application/octet-stream';

        if (header.startsWith('89504e47')) { inferredType = 'image'; mimeType = 'image/png'; }
        else if (header.startsWith('ffd8ff')) { inferredType = 'image'; mimeType = 'image/jpeg'; }
        else if (header.startsWith('25504446')) { inferredType = 'document'; mimeType = 'application/pdf'; }
        else if (header.startsWith('00000018') || header.includes('66747970')) { inferredType = 'video'; mimeType = 'video/mp4'; }
        else if (header.startsWith('52494646')) { inferredType = 'audio'; mimeType = 'audio/wav'; }
        else if (header.startsWith('4f676753')) { inferredType = 'audio'; mimeType = 'audio/ogg'; }

        // Use explicit mediaType if provided
        if (mediaType === 'image' || mediaType === 'sticker') inferredType = 'image';
        else if (mediaType === 'video') inferredType = 'video';
        else if (mediaType === 'audio' || mediaType === 'ptt') inferredType = 'audio';
        else if (mediaType === 'document') inferredType = 'document';

        let messageContent;
        const outFilename = filename || `file.${mimeType.split('/')[1] || 'bin'}`;

        if (inferredType === 'image') {
            messageContent = { image: buffer, caption: caption || '', mimetype: mimeType };
        } else if (inferredType === 'video') {
            messageContent = { video: buffer, caption: caption || '', mimetype: mimeType };
        } else if (inferredType === 'audio') {
            messageContent = { audio: buffer, mimetype: mimeType, ptt: mediaType === 'ptt' };
        } else {
            messageContent = { document: buffer, mimetype: mimeType, fileName: outFilename, caption: caption || '' };
        }

        const result = await sock.sendMessage(chatId, messageContent);
        console.log('✅ Media sent:', result?.key?.id);
        return res.json({ success: true, messageId: result?.key?.id || null });

    } catch (err) {
        console.error('❌ Media send error:', err.message);
        return res.status(500).json({ success: false, error: err.message });
    }
});

// Trigger group sync on demand
app.post('/api/groups/sync-now', async (req, res) => {
    if (bridgeStatus !== 'connected' || !sock) {
        return res.status(503).json({ success: false, error: 'Bridge not connected' });
    }
    try {
        await syncGroups();
        res.json({ success: true, message: 'Group sync triggered' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// =================== WHATSAPP INITIALIZATION (BAILEYS) ===================

async function initializeWhatsApp() {
    console.log('🚀 Starting Shepherd AI Oracle Cloud Bridge (Baileys)...');
    console.log(`📡 Backend: ${BACKEND_URL}`);
    console.log(`🔑 Connection Code: ${CONNECTION_CODE}`);
    console.log('🧠 No Chromium required - Pure WebSocket connection!');

    try {
        // Ensure auth directory exists
        if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true });

        const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
        const { version } = await fetchLatestBaileysVersion();

        console.log(`📱 Using WA version: ${version.join('.')}`);

        sock = makeWASocket({
            version,
            auth: state,
            logger,
            printQRInTerminal: true,
            browser: ['Shepherd AI Bridge', 'Chrome', '120.0.0'],
            connectTimeoutMs: 60000,
            defaultQueryTimeoutMs: 60000,
            keepAliveIntervalMs: 30000,
            markOnlineOnConnect: true,
            generateHighQualityLinkPreview: false,
        });

        // Bind store to socket
        store.bind(sock.ev);

        // Handle connection updates
        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                // New QR code generated
                latestQRString = qr;
                try {
                    latestQRCode = await QRCode.toDataURL(qr, { width: 400, margin: 2 });
                } catch (e) {
                    console.error('QR generation error:', e.message);
                }
                console.log('\n📱 SCAN THIS QR CODE WITH YOUR PHONE!');
                console.log(`✅ QR Code available at: /api/qr-image\n`);
                bridgeStatus = 'waiting_scan';
                broadcastToClients({ type: 'qr', qr: latestQRCode });
                broadcastToClients({ type: 'status', status: 'waiting_scan' });
            }

            if (connection === 'close') {
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                const reason = DisconnectReason;

                console.log(`⚠️ Connection closed. Status: ${statusCode}`);
                bridgeStatus = 'disconnected';
                latestQRCode = null;
                latestQRString = null;
                broadcastToClients({ type: 'status', status: 'disconnected' });

                if (statusCode === reason.loggedOut) {
                    console.log('🚪 Logged out. Clearing auth and restarting...');
                    // Clear auth data
                    try {
                        fs.rmSync(AUTH_DIR, { recursive: true, force: true });
                    } catch (e) { }
                    setTimeout(initializeWhatsApp, 5000);
                } else {
                    // Reconnect for other reasons
                    const delay = statusCode === reason.restartRequired ? 3000 : 10000;
                    console.log(`🔄 Reconnecting in ${delay / 1000}s...`);
                    setTimeout(initializeWhatsApp, delay);
                }
            }

            if (connection === 'open') {
                bridgeStatus = 'connected';
                latestQRCode = null;
                latestQRString = null;
                console.log('✅ WhatsApp connected!');
                broadcastToClients({ type: 'status', status: 'connected' });

                // Register bridge with backend
                registerWithBackend();

                // Start polling for pending messages
                startPolling();

                // Initialize group manager (module loading needs update if file structure changed but keeping simple for now)
                // setTimeout(() => initGroupManager(), 5000);

                // Health monitoring
                startHealthMonitoring();
            }
        });

        // Save credentials whenever updated
        sock.ev.on('creds.update', saveCreds);

        // Setup message handlers
        setupMessageHandlers();

    } catch (error) {
        console.error('❌ Failed to initialize WhatsApp:', error.message);
        bridgeStatus = 'disconnected';
        console.log('🔄 Retrying in 30 seconds...');
        setTimeout(initializeWhatsApp, 30000);
    }
}

// =================== REGISTER WITH BACKEND ===================

async function registerWithBackend() {
    try {
        // Auto-detect public URL for registration if RENDER_EXTERNAL_URL is set
        let bridgeUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;

        // If not on Render, try to detect IP
        if (!process.env.RENDER_EXTERNAL_URL) {
            try {
                const ipResp = await axios.get('https://api.ipify.org?format=json', { timeout: 5000 });
                if (ipResp.data?.ip) {
                    bridgeUrl = `http://${ipResp.data.ip}:${PORT}`;
                }
            } catch (e) { }
        }

        await axios.post(`${BACKEND_URL}/api/bridge/register`, {
            connection_code: CONNECTION_CODE,
            bridge_url: bridgeUrl,
            status: 'connected'
        });
        console.log(`✅ Registered with backend (bridge URL: ${bridgeUrl})`);
    } catch (error) {
        console.error('⚠️ Failed to register with backend:', error.message);
    }
}

// =================== INCOMING MESSAGE HANDLER ===================

function setupMessageHandlers() {
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;

        for (const message of messages) {
            try {
                await handleIncomingMessage(message);
            } catch (error) {
                console.error('❌ Error handling message:', error.message);
            }
        }
    });

    // Message status updates (ack)
    sock.ev.on('messages.update', (updates) => {
        for (const update of updates) {
            if (update.update?.status) {
                broadcastToClients({
                    type: 'message_ack',
                    messageId: update.key?.id,
                    ack: update.update.status
                });
            }
        }
    });
}

async function handleIncomingMessage(message) {
    // Skip if from self
    if (message.key.fromMe) return;

    const remoteJid = message.key.remoteJid;
    if (!remoteJid) return;

    // Skip status broadcasts
    if (remoteJid === 'status@broadcast') return;

    // Check if it's a group message
    const isGroup = remoteJid.endsWith('@g.us');
    if (isGroup) {
        console.log('⏭️ Skipping (group):', remoteJid);
        return;
    }

    const msg = message.message;
    if (!msg) return;

    console.log('🔔 Incoming message from:', remoteJid);

    // Extract message content
    let body = '';
    let isMedia = false;
    let mediaType = null;
    let mediaUrl = null;

    // Text messages
    if (msg.conversation) {
        body = msg.conversation;
    } else if (msg.extendedTextMessage?.text) {
        body = msg.extendedTextMessage.text;
    }
    // Image
    else if (msg.imageMessage) {
        isMedia = true;
        mediaType = 'image';
        body = msg.imageMessage.caption || '📷 Image';
        try {
            const buffer = await downloadMediaMessage(message, 'buffer', {}, { logger, reuploadRequest: sock.updateMediaMessage });
            const base64 = buffer.toString('base64');
            mediaUrl = `data:image/jpeg;base64,${base64}`;
            console.log(`✅ Image downloaded (${Math.round(base64.length / 1024)}KB)`);
        } catch (e) {
            console.error('❌ Image download error:', e.message);
            body = '📷 [Image - download failed]';
        }
    }
    // Video
    else if (msg.videoMessage) {
        isMedia = true;
        mediaType = 'video';
        body = msg.videoMessage.caption || '🎥 Video';
        try {
            const buffer = await downloadMediaMessage(message, 'buffer', {}, { logger, reuploadRequest: sock.updateMediaMessage });
            const base64 = buffer.toString('base64');
            mediaUrl = `data:video/mp4;base64,${base64}`;
            console.log(`✅ Video downloaded (${Math.round(base64.length / 1024)}KB)`);
        } catch (e) {
            console.error('❌ Video download error:', e.message);
            body = '🎥 [Video - download failed]';
        }
    }
    // Audio / Voice note
    else if (msg.audioMessage) {
        isMedia = true;
        mediaType = msg.audioMessage.ptt ? 'ptt' : 'audio';
        body = '🎵 Audio';
        try {
            const buffer = await downloadMediaMessage(message, 'buffer', {}, { logger, reuploadRequest: sock.updateMediaMessage });
            const base64 = buffer.toString('base64');
            mediaUrl = `data:audio/ogg;base64,${base64}`;
            console.log(`✅ Audio downloaded (${Math.round(base64.length / 1024)}KB)`);
        } catch (e) {
            console.error('❌ Audio download error:', e.message);
            body = '🎵 [Audio - download failed]';
        }
    }
    // Document
    else if (msg.documentMessage) {
        isMedia = true;
        mediaType = 'document';
        body = msg.documentMessage.fileName || '📄 Document';
        try {
            const buffer = await downloadMediaMessage(message, 'buffer', {}, { logger, reuploadRequest: sock.updateMediaMessage });
            const base64 = buffer.toString('base64');
            mediaUrl = `data:application/octet-stream;base64,${base64}`;
            console.log(`✅ Document downloaded (${Math.round(base64.length / 1024)}KB)`);
        } catch (e) {
            console.error('❌ Document download error:', e.message);
            body = '📄 [Document - download failed]';
        }
    }
    // Sticker
    else if (msg.stickerMessage) {
        isMedia = true;
        mediaType = 'sticker';
        body = '🎨 Sticker';
        try {
            const buffer = await downloadMediaMessage(message, 'buffer', {}, { logger, reuploadRequest: sock.updateMediaMessage });
            const base64 = buffer.toString('base64');
            mediaUrl = `data:image/webp;base64,${base64}`;
        } catch (e) {
            body = '🎨 [Sticker - download failed]';
        }
    }
    // Location
    else if (msg.locationMessage) {
        const lat = msg.locationMessage.degreesLatitude;
        const lng = msg.locationMessage.degreesLongitude;
        const locName = msg.locationMessage.name || '';
        body = `📍 Location: ${locName ? locName + ' - ' : ''}${lat}, ${lng}`;
        console.log(`📍 Location received: ${lat}, ${lng}`);
    }
    // Live Location
    else if (msg.liveLocationMessage) {
        const lat = msg.liveLocationMessage.degreesLatitude;
        const lng = msg.liveLocationMessage.degreesLongitude;
        body = `📍 Live Location: ${lat}, ${lng}`;
        console.log(`📍 Live location received: ${lat}, ${lng}`);
    }
    // Contact / vCard
    else if (msg.contactMessage) {
        const contactName = msg.contactMessage.displayName || 'Unknown';
        body = `👤 Contact: ${contactName}`;
        console.log(`👤 Contact card received: ${contactName}`);
    }
    // Contact Array (multiple contacts)
    else if (msg.contactsArrayMessage) {
        const names = (msg.contactsArrayMessage.contacts || []).map(c => c.displayName || 'Unknown').join(', ');
        body = `👥 Contacts: ${names}`;
        console.log(`👥 Multiple contacts received: ${names}`);
    }
    // Fallback
    else {
        body = '[Unsupported message type]';
    }

    if (!body && !isMedia) return;

    // Extract phone number
    const phoneNumber = remoteJid.replace('@s.whatsapp.net', '').replace('@c.us', '');
    const realPhone = phoneNumber;

    // Get contact name (push name)
    const pushname = message.pushName || null;

    console.log(`📩 INCOMING: ${body.substring(0, 50)}... from ${phoneNumber}`);

    // Broadcast to WebSocket clients
    // Convert to @c.us format for frontend compatibility
    const frontendJid = remoteJid.replace('@s.whatsapp.net', '@c.us');

    broadcastToClients({
        type: 'incoming_message',
        from: frontendJid,
        phone: phoneNumber,
        realPhone: realPhone,
        contactName: pushname,
        pushname: pushname,
        body: body,
        hasMedia: isMedia,
        mediaType: mediaType,
        mediaUrl: mediaUrl,
        timestamp: message.messageTimestamp || Date.now() / 1000
    });

    // Save to backend via webhook
    try {
        console.log('💾 Saving to backend...');
        await axios.post(`${BACKEND_URL}/api/whatsapp/webhook`, {
            phone: realPhone || phoneNumber,
            whatsapp_id: frontendJid,
            content: body,
            contact_name: pushname,
            pushname: pushname,
            has_media: isMedia,
            media_type: mediaType,
            media_url: mediaUrl
        });
        console.log('✅ Saved to backend!');
    } catch (error) {
        console.error('❌ Backend save error:', error.message);
    }
}

// =================== OUTGOING MESSAGE POLLING ===================

let pollingInterval = null;

function startPolling() {
    if (pollingInterval) clearInterval(pollingInterval);

    console.log('🔄 Starting message polling...');
    setTimeout(pollPendingMessages, 2000);
    pollingInterval = setInterval(pollPendingMessages, POLL_INTERVAL);
}

async function pollPendingMessages() {
    if (bridgeStatus !== 'connected' || !sock) return;

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
            chatId = `${cleanPhone}@s.whatsapp.net`;
        }

        // Convert @c.us to @s.whatsapp.net for Baileys
        chatId = chatId.replace('@c.us', '@s.whatsapp.net');

        console.log(`📤 Sending queued message to ${chatId}...`);

        let result;
        if (msg.attachment_url && msg.attachment_type) {
            console.log(`📸 Sending ${msg.attachment_type}...`);
            // Download attachment from URL
            try {
                const mediaResp = await axios.get(msg.attachment_url, { responseType: 'arraybuffer', timeout: 30000 });
                const buffer = Buffer.from(mediaResp.data);
                const type = msg.attachment_type.split('/')[0]; // image, video, audio, etc.

                let messageContent;
                if (type === 'image') {
                    messageContent = { image: buffer, caption: msg.content || '', mimetype: msg.attachment_type };
                } else if (type === 'video') {
                    messageContent = { video: buffer, caption: msg.content || '', mimetype: msg.attachment_type };
                } else if (type === 'audio') {
                    messageContent = { audio: buffer, mimetype: msg.attachment_type };
                } else {
                    messageContent = { document: buffer, mimetype: msg.attachment_type, fileName: `attachment.${msg.attachment_type.split('/')[1] || 'bin'}` };
                }

                result = await sock.sendMessage(chatId, messageContent);
            } catch (dlErr) {
                console.error('❌ Failed to download/send attachment:', dlErr.message);
                // Fallback: send text only
                result = await sock.sendMessage(chatId, { text: msg.content || '[Attachment unavailable]' });
            }
        } else {
            result = await sock.sendMessage(chatId, { text: msg.content });
        }

        console.log('✅ Message sent!', result?.key?.id);

        await axios.post(`${BACKEND_URL}/api/bridge/update-message-status`, {
            message_id: msg.id,
            status: 'sent',
            whatsapp_message_id: result?.key?.id
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

let healthInterval = null;

function startHealthMonitoring() {
    if (healthInterval) clearInterval(healthInterval);

    healthInterval = setInterval(async () => {
        try {
            if (sock && bridgeStatus === 'connected') {
                // Baileys handles connection state internally
                // If we can access sock.user, we're connected
                if (!sock.user) {
                    console.log('⚠️ Health check: not connected');
                    bridgeStatus = 'disconnected';
                    broadcastToClients({ type: 'status', status: 'disconnected' });
                }
            }
        } catch (error) {
            console.log('⚠️ Health check error:', error.message);
        }
    }, 300000); // Every 5 minutes
}

// =================== GROUP MANAGER ===================

let groupSyncRetryCount = 0;
let groupPollingInterval = null;

function initGroupManager() {
    console.log('👥 Initializing Group Manager...');
    setupGroupEventListeners();

    console.log('⏳ Waiting 30 seconds for WhatsApp to fully load all chats...');
    setTimeout(() => syncGroups(), 30000);

    startGroupPolling(10000);
}

async function syncGroups() {
    try {
        console.log('🔄 Syncing WhatsApp groups...');

        const groups = await sock.groupFetchAllParticipating();
        const groupList = Object.values(groups);

        console.log(`📊 Found ${groupList.length} groups in WhatsApp`);

        if (groupList.length === 0 && groupSyncRetryCount < 2) {
            groupSyncRetryCount++;
            console.log(`⚠️ No groups found. Retrying in 10s... (Attempt ${groupSyncRetryCount}/2)`);
            setTimeout(() => syncGroups(), 10000);
            return null;
        }

        if (groupList.length > 0) groupSyncRetryCount = 0;

        const groupData = groupList.map(g => ({
            whatsapp_group_id: g.id,
            name: g.subject || 'Unnamed Group',
            description: g.desc || null,
            avatar_url: null,
            member_count: g.participants ? g.participants.length : 0
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

function setupGroupEventListeners() {
    if (!sock) return;

    sock.ev.on('group-participants.update', async (event) => {
        try {
            console.log('👥 Group participant event:', event.action, event.id);

            if (event.action === 'add') {
                for (const newMember of event.participants) {
                    await handleMemberJoined(event.id, newMember);
                }
            } else if (event.action === 'remove') {
                console.log(`👋 Member(s) left: ${event.participants.join(', ')}`);
            }
        } catch (error) {
            console.error('❌ Error handling participant change:', error);
        }
    });

    console.log('👂 Group event listeners set up');
}

async function handleMemberJoined(groupId, memberId) {
    try {
        console.log(`🆕 New member ${memberId} joined group ${groupId}`);

        const phone = memberId.replace('@s.whatsapp.net', '').replace('@c.us', '');

        const response = await axios.post(
            `${BACKEND_URL}/api/groups/${groupId}/members/joined?code=${CONNECTION_CODE}`,
            {
                whatsapp_id: memberId.replace('@s.whatsapp.net', '@c.us'),
                name: 'Unknown',
                phone: phone,
                joined_at: new Date().toISOString()
            }
        );

        console.log(`✅ Backend notified: ${response.data.contact_created ? 'Contact created' : 'Existing contact'}`);
    } catch (error) {
        console.error('❌ Error handling member joined:', error.message);
    }
}

async function processWelcomeQueue() {
    try {
        const { data: welcomes } = await axios.get(
            `${BACKEND_URL}/api/groups/welcome-queue?code=${CONNECTION_CODE}`
        );

        if (welcomes.length === 0) return;

        console.log(`📬 Processing ${welcomes.length} welcome messages`);

        for (const welcome of welcomes) {
            try {
                let chatId = welcome.phone.includes('@') ? welcome.phone : `${welcome.phone}@s.whatsapp.net`;
                chatId = chatId.replace('@c.us', '@s.whatsapp.net');

                await sock.sendMessage(chatId, { text: welcome.message });
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

async function processGroupMessages() {
    try {
        const { data: messages } = await axios.get(
            `${BACKEND_URL}/api/groups/messages/pending?code=${CONNECTION_CODE}`
        );

        if (messages.length === 0) return;

        console.log(`📤 Processing ${messages.length} group messages`);

        for (const msg of messages) {
            try {
                await sock.sendMessage(msg.group_id, { text: msg.content });
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

function startGroupPolling(intervalMs = 10000) {
    if (groupPollingInterval) clearInterval(groupPollingInterval);

    console.log(`🔄 Starting group polling (every ${intervalMs / 1000}s)`);
    groupPollingInterval = setInterval(async () => {
        await processWelcomeQueue();
        await processGroupMessages();
    }, intervalMs);
}

// =================== START ===================

app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🌐 ===========================================`);
    console.log(`🐑 Shepherd AI Oracle Cloud Bridge v3.0.0`);
    console.log(`🧠 Powered by Baileys (No Chromium Required!)`);
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
    if (sock) sock.end();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('👋 SIGINT received...');
    if (sock) sock.end();
    process.exit(0);
});

// Handle uncaught errors gracefully
process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err.message);
});

process.on('unhandledRejection', (err) => {
    console.error('❌ Unhandled Rejection:', err.message || err);
});
