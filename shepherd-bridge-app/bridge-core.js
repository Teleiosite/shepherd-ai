// Shepherd AI WhatsApp Bridge - Baileys Edition (No Chrome Required)
const { default: makeWASocket, DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const QRCode = require('qrcode');
const express = require('express');
const cors = require('cors');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');
const os = require('os');
const axios = require('axios');
const pino = require('pino');
const polling = require('./bridge-polling');

// ─── Global error guards ────────────────────────────────────────
process.on('uncaughtException', (err) => {
  console.error('[Bridge] Uncaught Exception:', err.message || err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[Bridge] Unhandled Rejection:', reason?.message || reason);
});

const BACKEND_URL = 'https://shepherd-ai-backend.onrender.com';
const PORT = 3001;
const WS_PORT = 3002;
const AUTH_STATE_DIR = path.join(__dirname, 'tokens', 'auth_state');

let latestQR = null;
let bridgeStatus = 'initializing';
let waSocket = null;
let connectionCode = null;
let reconnectAttempts = 0;

// ─── Express ───────────────────────────────────────────────────
const app = express();
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Private-Network', 'true');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ─── WebSocket Server ──────────────────────────────────────────
const wss = new WebSocket.Server({ port: WS_PORT });
const wsClients = new Set();
wss.on('connection', (ws) => {
  wsClients.add(ws);
  ws.send(JSON.stringify({ type: 'status', status: bridgeStatus, qr: latestQR }));
  ws.on('close', () => wsClients.delete(ws));
  ws.on('error', () => wsClients.delete(ws));
});
wss.on('error', (err) => console.warn('[WS] Server error:', err.message));

function broadcastToClients(data) {
  const message = JSON.stringify(data);
  wsClients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) client.send(message);
  });
}

// ─── Baileys Connection ────────────────────────────────────────
async function connectToWhatsApp(code) {
  connectionCode = code;
  reconnectAttempts++;
  console.log(`[Bridge] Connecting to WhatsApp... (attempt ${reconnectAttempts})`);
  bridgeStatus = 'connecting';
  broadcastToClients({ type: 'status', status: 'connecting' });

  if (waSocket) {
    try {
      waSocket.ev.removeAllListeners();
      waSocket.end(undefined);
    } catch (e) {}
    waSocket = null;
  }

  // Ensure auth state directory exists
  if (!fs.existsSync(AUTH_STATE_DIR)) {
    fs.mkdirSync(AUTH_STATE_DIR, { recursive: true });
  }

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_STATE_DIR);

  let baileysVersion;
  try {
    const fetched = await fetchLatestBaileysVersion();
    baileysVersion = fetched.version;
    console.log('[Bridge] Using Baileys version:', baileysVersion.join('.'));
  } catch (e) {
    baileysVersion = [2, 3000, 1023630996];
    console.log('[Bridge] Using fallback Baileys version');
  }

  // Silent logger
  const logger = pino({ level: 'silent' });

  waSocket = makeWASocket({
    version: baileysVersion,
    auth: state,
    logger,
    printQRInTerminal: false,
    browser: ['Shepherd AI', 'Chrome', '120.0.0'],
    connectTimeoutMs: 60000,
    defaultQueryTimeoutMs: 60000,
    keepAliveIntervalMs: 30000,
    retryRequestDelayMs: 2000,
    maxMsgRetryCount: 3,
    markOnlineOnConnect: false,
    syncFullHistory: false,
  });

  // Save credentials on update
  waSocket.ev.on('creds.update', saveCreds);

  // Connection state changes
  waSocket.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('[Bridge] QR code received! Generating image...');
      try {
        const qrPng = await QRCode.toDataURL(qr, {
          width: 300,
          margin: 2,
          color: { dark: '#128C7E', light: '#FFFFFF' }
        });
        latestQR = qrPng;
        bridgeStatus = 'qr_ready';
        broadcastToClients({ type: 'qr', qr: qrPng, status: 'qr_ready' });

        // Also write QR dataURL to tokens/last_qr.txt for reliable disk reading
        try {
          const qrFile = path.join(__dirname, 'tokens', 'last_qr.txt');
          fs.writeFileSync(qrFile, qrPng, 'utf8');
        } catch (err) {}

        console.log('[Bridge] QR image ready for display');
      } catch (err) {
        console.error('[Bridge] QR generation error:', err.message);
      }
    }

    if (connection === 'open') {
      console.log('[Bridge] WhatsApp connected!');
      latestQR = null;
      bridgeStatus = 'connected';
      reconnectAttempts = 0;
      broadcastToClients({ type: 'status', status: 'connected' });

      // Clean up last_qr.txt
      try {
        const qrFile = path.join(__dirname, 'tokens', 'last_qr.txt');
        if (fs.existsSync(qrFile)) fs.unlinkSync(qrFile);
      } catch (e) {}

      // Start message polling
      polling.initPolling(waSocket, () => bridgeStatus);
      polling.startPolling(connectionCode);
      console.log('[Bridge] Message polling started');
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const isRegistered = state?.creds?.registered;

      console.log(`[Bridge] Connection closed. Status: ${statusCode}, registered: ${isRegistered}`);
      bridgeStatus = 'disconnected';
      broadcastToClients({ type: 'status', status: 'disconnected', code: statusCode });

      if (!isRegistered) {
        // While pairing, QR code expires or disconnects every 20-30s. Reconnect immediately to generate fresh QR!
        console.log('[Bridge] Pairing in progress - reconnecting for fresh QR in 1.5s...');
        bridgeStatus = 'connecting';
        setTimeout(() => connectToWhatsApp(connectionCode), 1500);
      } else if (statusCode !== DisconnectReason.loggedOut) {
        const delay = Math.min(reconnectAttempts * 3000, 15000);
        console.log(`[Bridge] Reconnecting in ${delay}ms...`);
        setTimeout(() => connectToWhatsApp(connectionCode), delay);
      } else {
        console.log('[Bridge] Device was logged out. Clearing auth state...');
        clearAuthState();
        bridgeStatus = 'logged_out';
        broadcastToClients({ type: 'status', status: 'logged_out' });
      }
    }
  });

  // Incoming messages
  waSocket.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      if (msg.key.fromMe) continue;
      const remoteJid = msg.key.remoteJid;
      if (!remoteJid || remoteJid === 'status@broadcast') continue;
      if (remoteJid.endsWith('@g.us')) continue; // skip groups

      const phone = remoteJid.replace('@s.whatsapp.net', '').replace('@c.us', '');
      let body = '';
      let mediaUrl = null;
      let mediaType = null;
      let isMedia = false;

      const msgContent = msg.message;
      if (!msgContent) continue;

      if (msgContent.conversation) {
        body = msgContent.conversation;
      } else if (msgContent.extendedTextMessage) {
        body = msgContent.extendedTextMessage.text;
      } else if (msgContent.imageMessage) {
        body = msgContent.imageMessage.caption || '📷 Image';
        isMedia = true; mediaType = 'image';
      } else if (msgContent.videoMessage) {
        body = msgContent.videoMessage.caption || '🎥 Video';
        isMedia = true; mediaType = 'video';
      } else if (msgContent.audioMessage) {
        body = '🎵 Audio';
        isMedia = true; mediaType = 'audio';
      } else if (msgContent.documentMessage) {
        body = msgContent.documentMessage.fileName || '📄 Document';
        isMedia = true; mediaType = 'document';
      } else {
        body = '[Message]';
      }

      console.log(`[Bridge] Incoming from ${phone}: ${body.substring(0, 50)}`);

      broadcastToClients({
        type: 'incoming_message',
        from: remoteJid,
        phone,
        realPhone: phone,
        contactName: msg.pushName || null,
        pushname: msg.pushName || null,
        body,
        hasMedia: isMedia,
        mediaType,
        mediaUrl,
        timestamp: msg.messageTimestamp || Date.now() / 1000
      });

      // Save to backend
      try {
        await axios.post(`${BACKEND_URL}/api/whatsapp/webhook`, {
          phone,
          whatsapp_id: remoteJid,
          content: body,
          contact_name: msg.pushName || null,
          pushname: msg.pushName || null,
          has_media: isMedia,
          media_type: mediaType,
          media_url: mediaUrl
        });
      } catch (err) {
        console.error('[Bridge] Webhook error:', err.message);
      }
    }
  });
}

function clearAuthState() {
  try {
    if (fs.existsSync(AUTH_STATE_DIR)) {
      fs.rmSync(AUTH_STATE_DIR, { recursive: true, force: true });
    }
  } catch (e) {
    console.error('[Bridge] Error clearing auth state:', e.message);
  }
}

// ─── REST Endpoints ────────────────────────────────────────────
app.get('/api/status', (req, res) => {
  res.json({ status: bridgeStatus, wsPort: WS_PORT });
});

app.get('/api/qr', (req, res) => {
  res.json({ qr: latestQR, status: bridgeStatus });
});

app.post('/api/connect', async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ success: false, error: 'code required' });
  connectionCode = code;
  reconnectAttempts = 0;
  connectToWhatsApp(code).catch(err => console.error('[Bridge] Connect error:', err.message));
  res.json({ success: true });
});

app.post('/api/disconnect', async (req, res) => {
  try {
    if (waSocket) await waSocket.logout();
    clearAuthState();
    bridgeStatus = 'disconnected';
    latestQR = null;
    res.json({ success: true });
  } catch (err) {
    res.json({ success: true });
  }
});

// Send text message
app.post('/api/send', async (req, res) => {
  const { phone, message, whatsappId } = req.body;

  if (bridgeStatus !== 'connected' || !waSocket) {
    return res.status(503).json({ success: false, error: 'Bridge not connected' });
  }

  try {
    let jid = whatsappId && whatsappId.includes('@')
      ? whatsappId
      : (() => {
          let p = phone.replace(/\D/g, '');
          if (p.startsWith('0')) p = '234' + p.substring(1);
          return p + '@s.whatsapp.net';
        })();

    console.log(`[Bridge] Sending to ${jid}: ${String(message).substring(0, 50)}`);
    const result = await waSocket.sendMessage(jid, { text: message });
    console.log('[Bridge] Sent! ID:', result?.key?.id);
    res.json({ success: true, messageId: result?.key?.id });
  } catch (err) {
    console.error('[Bridge] Send error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Send media
app.post('/api/sendMedia', async (req, res) => {
  const { phone, whatsappId, mediaType, mediaData, caption, filename } = req.body;

  if (bridgeStatus !== 'connected' || !waSocket) {
    return res.status(503).json({ success: false, error: 'Bridge not connected' });
  }
  if (!mediaData) return res.status(400).json({ success: false, error: 'mediaData required' });

  try {
    let jid = whatsappId && whatsappId.includes('@')
      ? whatsappId
      : (() => {
          let p = phone.replace(/\D/g, '');
          if (p.startsWith('0')) p = '234' + p.substring(1);
          return p + '@s.whatsapp.net';
        })();

    let pureBase64 = String(mediaData);
    if (pureBase64.startsWith('data:')) pureBase64 = pureBase64.split(',')[1] || '';
    pureBase64 = pureBase64.replace(/\s+/g, '');
    const buffer = Buffer.from(pureBase64, 'base64');

    let msgContent = {};
    const type = (mediaType || '').toLowerCase();
    if (type.includes('image')) {
      msgContent = { image: buffer, caption: caption || '' };
    } else if (type.includes('video')) {
      msgContent = { video: buffer, caption: caption || '' };
    } else if (type.includes('audio')) {
      msgContent = { audio: buffer, mimetype: 'audio/ogg; codecs=opus' };
    } else {
      msgContent = { document: buffer, fileName: filename || 'file', caption: caption || '' };
    }

    const result = await waSocket.sendMessage(jid, msgContent);
    console.log('[Bridge] Media sent! ID:', result?.key?.id);
    res.json({ success: true, messageId: result?.key?.id });
  } catch (err) {
    console.error('[Bridge] Media send error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Start Server ──────────────────────────────────────────────
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Bridge] REST API: http://localhost:${PORT}`);
  console.log(`[Bridge] WebSocket: ws://localhost:${WS_PORT}`);
  console.log('[Bridge] Ready! Waiting for connection code...');
  bridgeStatus = 'ready';
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.warn(`[Bridge] Port ${PORT} in use by another instance`);
  } else {
    console.error('[Bridge] Server error:', err);
  }
});

// Auto-connect if CONNECTION_CODE passed in env
if (process.env.CONNECTION_CODE) {
  console.log('[Bridge] Auto-connecting with CONNECTION_CODE from env:', process.env.CONNECTION_CODE);
  setTimeout(() => {
    connectToWhatsApp(process.env.CONNECTION_CODE).catch(err => {
      console.error('[Bridge] Auto-connect error:', err.message);
    });
  }, 500);
}
