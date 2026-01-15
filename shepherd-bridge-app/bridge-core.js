// WPPConnect Bridge for Shepherd AI - With Simple Auto-Reconnect
const wppconnect = require('@wppconnect-team/wppconnect');
const express = require('express');
const cors = require('cors');
const WebSocket = require('ws');
const fs = require('fs');
const os = require('os');
const path = require('path');
const polling = require('./bridge-polling');

const app = express();

// CORS setup
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Access-Control-Allow-Private-Network", "true");
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});
app.use(express.json({ limit: '50mb' })); // Increase limit for Base64 images
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const PORT = 3001;
const WS_PORT = 3002;
let clientSession = null;
let bridgeStatus = 'initializing';

// WebSocket Server
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

console.log('🚀 Shepherd AI WPPConnect Bridge Starting...');

// Initialize WPPConnect
wppconnect.create({
  session: 'shepherd-session',
  headless: false,
  logQR: true,
  autoClose: 0,
  puppeteerOptions: {
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
})
  .then((client) => {
    clientSession = client;
    bridgeStatus = 'connected';
    console.log('✅ WPPConnect Bot connected!');
    console.log('🔓 Bridge Status: CONNECTED');
    broadcastToClients({ type: 'status', status: 'connected' });

    // Initialize polling with client session
    polling.initPolling(client, () => bridgeStatus);
    console.log('✅ Polling initialized with client session');

    // Incoming messages
    client.onMessage(async (message) => {
      if (!message.isGroupMsg && !message.from.includes('status@broadcast')) {
        // Handle media messages properly
        let body = message.body || '';
        let mediaType = null;
        let isMedia = false;

        // Check if it's a media message (image, video, audio, etc.)
        if (message.type && ['image', 'video', 'audio', 'ptt', 'document', 'sticker'].includes(message.type)) {
          isMedia = true;
          mediaType = message.type;

          // Clear Base64 data and show media indicator
          if (message.type === 'image') {
            body = body && !body.startsWith('/9j/') && !body.startsWith('data:') ? body + ' 📷 [Image]' : '📷 [Image]';
          } else if (message.type === 'video') {
            body = body && !body.startsWith('data:') ? body + ' 🎥 [Video]' : '🎥 [Video]';
          } else if (message.type === 'audio' || message.type === 'ptt') {
            body = body && !body.startsWith('data:') ? body + ' 🎵 [Audio]' : '🎵 [Audio]';
          } else if (message.type === 'document') {
            body = body && !body.startsWith('data:') ? body + ' 📄 [Document]' : '📄 [Document]';
          } else if (message.type === 'sticker') {
            body = '🎨 [Sticker]';
          } else {
            body = '[Media]';
          }
          console.log(`📩 INCOMING ${mediaType} from ${message.from}: ${body}`);
        } else if (message.hasMedia) {
          // Fallback for hasMedia flag
          isMedia = true;
          mediaType = 'unknown';
          body = '📎 [Media]';
          console.log(`📩 INCOMING media from ${message.from}: ${body}`);
        } else {
          body = message.body || '[No content]';
          console.log(`📩 INCOMING from ${message.from}: ${body.substring(0, 50)}...`);
        }

        let phoneNumber = message.from.replace('@c.us', '').replace('@lid', '');
        let contactName = null;
        let pushname = null;
        let realPhone = null;

        if (message.from.includes('@lid')) {
          try {
            const contact = await client.getContact(message.from);
            if (contact) {
              contactName = contact.name || contact.shortName || contact.formattedName;
              pushname = contact.pushname;

              // PRIORITY 1: Check if contactName contains a phone number (most reliable for @lid)
              if (contactName && /^\+?\d{10,15}$/.test(contactName.replace(/[\s\-]/g, ''))) {
                realPhone = contactName.replace(/\D/g, '');
                console.log('✅ Extracted phone from contactName (Priority 1):', realPhone);
              }
              // PRIORITY 2: Try formattedNumber
              else if (contact.formattedNumber && contact.formattedNumber.trim()) {
                realPhone = contact.formattedNumber.replace(/\D/g, '');
                console.log('📱 Extracted from formattedNumber:', realPhone);
              }
              // PRIORITY 3: Try contact.number
              else if (contact.number && contact.number.trim()) {
                realPhone = contact.number.replace(/\D/g, '');
                console.log('📱 Extracted from contact.number:', realPhone);
              }
              // PRIORITY 4: Try id._serialized (might have phone)
              else if (contact.id && contact.id._serialized) {
                const serialized = contact.id._serialized.replace(/@.*$/, ''); // Remove @lid/@c.us
                // Check if it looks like a phone (starts with country code pattern)
                if (/^(1|2[0-9]{2}|3[0-9]{2}|4[0-9]{2}|5[0-9]{2}|6[0-9]{2}|7|8[0-9]{2}|9[0-9]{2})\d{8,13}$/.test(serialized)) {
                  realPhone = serialized;
                  console.log('📱 Extracted from id._serialized:', realPhone);
                } else {
                  console.log(`⚠️ id._serialized "${serialized}" doesn't look like a valid phone`);
                }
              }
              // PRIORITY 5: Last resort - contact.id.user (might be WhatsApp ID)
              else if (contact.id && contact.id.user) {
                realPhone = contact.id.user;
                console.log('⚠️ Using contact.id.user as last resort:', realPhone);
              }

              // Final validation: If we got something that looks like a WhatsApp ID (weird pattern), mark it
              if (realPhone && realPhone.length > 12 && !realPhone.match(/^(1|2[0-9]{2}|3[0-9]{2}|4[0-9]{2}|5[0-9]{2}|6[0-9]{2}|7|8[0-9]{2}|9[0-9]{2})\d{8,12}$/)) {
                console.log(`⚠️ WARNING: "${realPhone}" might be a WhatsApp ID, not a real phone!`);
              }

              console.log(`📛 Contact name: "${contactName}", Pushname: "${pushname}", Real Phone: "${realPhone}"`);
            }
          } catch (e) {
            console.log('Could not get contact info:', e.message);
          }
        } else {
          realPhone = phoneNumber;
        }

        broadcastToClients({
          type: 'incoming_message',
          from: message.from,
          phone: phoneNumber,
          realPhone: realPhone,
          contactName: contactName,
          pushname: pushname,
          body: body,
          hasMedia: message.hasMedia || false,
          mediaType: mediaType,
          timestamp: message.timestamp || Date.now() / 1000
        });
      }
    });

    // Message acknowledgments
    client.onAck((ack) => {
      broadcastToClients({
        type: 'message_ack',
        messageId: ack.id?._serialized,
        ack: ack.ack
      });
    });

    // PHASE 2: Connection health monitoring (every 60 seconds)
    setInterval(async () => {
      try {
        const state = await client.getConnectionState();
        if (state !== 'CONNECTED') {
          console.log('⚠️ Connection health check failed, state:', state);
          bridgeStatus = 'disconnected';
          broadcastToClients({ type: 'status', status: 'disconnected' });
        } else if (bridgeStatus !== 'connected') {
          // Reconnected!
          console.log('✅ Connection restored!');
          bridgeStatus = 'connected';
          broadcastToClients({ type: 'status', status: 'connected' });
        }
      } catch (error) {
        console.log('⚠️ Health check error:', error.message);
        bridgeStatus = 'disconnected';
        broadcastToClients({ type: 'status', status: 'disconnected' });
      }
    }, 300000); // Check every 60 seconds
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    bridgeStatus = 'disconnected';
    broadcastToClients({ type: 'status', status: 'disconnected' });
  });

// Logging
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.path}`);
  next();
});

// Status endpoint
app.get('/api/status', (req, res) => {
  res.json({ status: bridgeStatus, wsPort: WS_PORT });
});

// Send message
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

      // Add country code if missing (Nigerian numbers)
      if (cleanPhone.startsWith('0')) {
        cleanPhone = '234' + cleanPhone.substring(1);
      }

      chatId = `${cleanPhone}@c.us`;
      console.log(`📤 Sending to phone: ${chatId}...`);
    }

    console.log(`📝 Message: ${message.substring(0, 50)}...`);

    const result = await clientSession.sendText(chatId, message);
    console.log('✅ Sent successfully!', result?.id || '');
    res.json({ success: true, messageId: result?.id });
  } catch (error) {
    console.error('❌ Send Error:', error.message || error);

    // PHASE 2: Better error handling
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

// Send media (image, video, document)
// Robust /api/sendMedia endpoint - PASTE THIS TO REPLACE OLD ONE
app.post('/api/sendMedia', async (req, res) => {
  // DEBUG: show incoming keys
  try {
    const incomingKeys = Object.keys(req.body || {});
    console.log('📥 /api/sendMedia received keys:', incomingKeys);
    if (req.body && req.body.mediaData) {
      console.log('📊 mediaData length:', typeof req.body.mediaData === 'string' ? req.body.mediaData.length : 'not-string');
      console.log('📊 mediaData starts:', (req.body.mediaData || '').toString().substring(0, 40));
    } else {
      console.log('📊 mediaData: MISSING or EMPTY');
    }
  } catch (e) {
    console.warn('Error logging incoming body:', e);
  }

  const { phone, whatsappId, mediaType, mediaData, caption, filename } = req.body;

  if (bridgeStatus !== 'connected' || !clientSession) {
    return res.status(503).json({ success: false, error: 'Bridge not connected' });
  }
  if (!mediaData) {
    return res.status(400).json({ success: false, error: 'Media data required' });
  }

  // Normalize chat id
  let chatId;
  if (whatsappId && whatsappId.includes('@')) chatId = whatsappId;
  else {
    let cleanPhone = (phone || '').replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) cleanPhone = '234' + cleanPhone.substring(1);
    chatId = `${cleanPhone}@c.us`;
  }

  try {
    // 1) sanitize base64 (strip data url prefix + whitespace/newlines)
    let pureBase64 = String(mediaData || '');
    if (pureBase64.startsWith('data:')) pureBase64 = pureBase64.split(',')[1] || '';
    // Remove whitespace/newlines that may break decoding
    pureBase64 = pureBase64.replace(/\s+/g, '');

    // 2) decode to Buffer and validate
    let buffer;
    try {
      buffer = Buffer.from(pureBase64, 'base64');
    } catch (err) {
      console.error('❌ base64 -> buffer decode failed:', err.message);
      return res.status(400).json({ success: false, error: 'Invalid base64' });
    }

    console.log('📊 Decoded buffer length:', buffer.length);
    if (!buffer || !buffer.length) {
      return res.status(400).json({ success: false, error: 'Empty decoded buffer' });
    }

    // 3) check magic bytes to infer file type (helpful for mismatched filenames)
    const header = buffer.slice(0, 8).toString('hex');
    console.log('📊 Buffer header (hex):', header);
    let inferredExt = '';
    if (header.startsWith('89504e47')) inferredExt = 'png';
    else if (header.startsWith('ffd8ff')) inferredExt = 'jpg';
    else if (header.startsWith('25504446')) inferredExt = 'pdf';
    else if (header.startsWith('00000018') || header.includes('66747970')) inferredExt = 'mp4'; // rough mp4
    else inferredExt = '';

    // Compose a safe filename
    let outFilename = filename || `file.${inferredExt || 'bin'}`;
    // Ensure extension exists
    if (!path.extname(outFilename) && inferredExt) outFilename = `${outFilename}.${inferredExt}`;

    // 4) Try sendFileFromBase64 (preferred)
    try {
      console.log(`📤 Attempting sendFileFromBase64 to ${chatId} as ${outFilename} (${mediaType})`);
      const result = await clientSession.sendFileFromBase64(chatId, pureBase64, outFilename, caption || '');
      console.log('✅ Media sent with sendFileFromBase64:', result?.id || result);
      return res.json({ success: true, messageId: result?.id || null });
    } catch (errSend) {
      console.warn('⚠️ sendFileFromBase64 failed:', errSend && (errSend.message || errSend.toString()));
      // Fall through to fallback
    }

    // 5) FALLBACK: write buffer to tmp file and send file by path / buffer
    try {
      const tmpDir = fs.existsSync(os.tmpdir()) ? os.tmpdir() : '.';
      const tmpPath = path.join(tmpDir, `upload-${Date.now()}.${inferredExt || 'bin'}`);
      fs.writeFileSync(tmpPath, buffer);
      console.log('📂 Wrote temp file to', tmpPath, 'size:', fs.statSync(tmpPath).size);

      // Use clientSession.sendFile (WPPConnect supports sending from file path or buffer)
      const result2 = await clientSession.sendFile(chatId, tmpPath, outFilename, caption || '');
      console.log('✅ Media sent via file fallback:', result2?.id || result2);

      // cleanup temp
      try { fs.unlinkSync(tmpPath); } catch (e) { /* ignore */ }

      return res.json({ success: true, messageId: result2?.id || null, fallback: true });
    } catch (errFallback) {
      console.error('❌ Fallback file send failed:', errFallback && (errFallback.stack || errFallback.message || errFallback.toString()));
      return res.status(500).json({ success: false, error: 'sendFile failed', detail: errFallback.message || String(errFallback) });
    }
  } catch (err) {
    console.error('❌ Unexpected /api/sendMedia error:', err && (err.stack || err.message || err.toString()));
    return res.status(500).json({ success: false, error: err.message || 'Internal Server Error' });
  }
});


app.listen(PORT, '0.0.0.0', () => {
  console.log(`📡 REST: http://localhost:${PORT}`);
  console.log(`🔌 WebSocket: ws://localhost:${WS_PORT}`);
});

