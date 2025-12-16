
// Use venom-bot from parent venom-whatsapp-bot-master directory (already working)
const venom = require('../../../dist');
const express = require('express');
const cors = require('cors');
const WebSocket = require('ws');

const app = express();

// MANUAL CORS SETUP - Stronger than the 'cors' package for localhost debugging
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*"); // Allow any origin
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");

  // CRITICAL: Allows browser to talk to localhost from a different "network" (like a served web app)
  res.header("Access-Control-Allow-Private-Network", "true");

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());

const PORT = 3001;
const WS_PORT = 3002;
let clientSession = null;
let bridgeStatus = 'initializing'; // initializing | connected | disconnected

// ===== WEBSOCKET SERVER for Real-Time Communication =====
const wss = new WebSocket.Server({ port: WS_PORT });
const wsClients = new Set();

wss.on('connection', (ws) => {
  console.log('🔌 New WebSocket client connected');
  wsClients.add(ws);

  // Send current status immediately
  ws.send(JSON.stringify({
    type: 'status',
    status: bridgeStatus
  }));

  ws.on('close', () => {
    console.log('🔌 WebSocket client disconnected');
    wsClients.delete(ws);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    wsClients.delete(ws);
  });
});

// Helper to broadcast to all WebSocket clients
function broadcastToClients(data) {
  const message = JSON.stringify(data);
  wsClients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

console.log('------------------------------------------------');
console.log('🚀 Shepherd AI Venom Bridge Starting...');
console.log('------------------------------------------------');

// ===== SCHEDULED MESSAGES QUEUE =====
let messageQueue = [];

// Process queue every minute
setInterval(() => {
  if (bridgeStatus !== 'connected' || !clientSession) return;

  const now = new Date();
  messageQueue.forEach(async (job, index) => {
    if (job.status === 'pending' && new Date(job.scheduledFor) <= now) {
      try {
        const cleanPhone = job.phone.replace(/\D/g, '');
        const chatId = `${cleanPhone}@c.us`;
        await clientSession.sendText(chatId, job.message);
        job.status = 'sent';
        job.sentAt = new Date().toISOString();
        console.log(`⏰ Scheduled message sent to ${chatId}`);

        // Notify frontend
        broadcastToClients({
          type: 'scheduled_sent',
          jobId: job.id,
          phone: job.phone
        });
      } catch (e) {
        job.status = 'failed';
        job.error = e.toString();
        console.error(`❌ Scheduled send failed:`, e);
      }
    }
  });

  // Clean up old completed jobs (older than 1 hour)
  const oneHourAgo = new Date(Date.now() - 3600000);
  messageQueue = messageQueue.filter(job =>
    job.status === 'pending' || new Date(job.sentAt || job.scheduledFor) > oneHourAgo
  );
}, 60000); // Check every minute

// Initialize Venom with extended timeouts
venom
  .create({
    session: 'shepherd-session',
    multidevice: true,
    headless: false, // Keep browser visible for debugging
    logQR: true,
    autoClose: 0, // Never auto-close
    disableWelcome: true,
    waitForLogin: true,
    browserArgs: ['--no-sandbox', '--disable-setuid-sandbox'],
    // Extended timeouts for slower connections
    puppeteerOptions: {
      timeout: 120000, // 2 minutes for Puppeteer operations
    }
  })

  .then((client) => {
    clientSession = client;
    bridgeStatus = 'connected';
    console.log('✅ Venom Bot is connected and ready!');
    console.log('🔓 Bridge Status set to: CONNECTED');

    // Notify all connected WebSocket clients
    broadcastToClients({
      type: 'status',
      status: 'connected'
    });

    setupListeners(client);
  })
  .catch((error) => {
    console.error('❌ Error starting Venom:', error);
    bridgeStatus = 'disconnected';
    broadcastToClients({
      type: 'status',
      status: 'disconnected'
    });
  });

// ===== INCOMING MESSAGE & ACK LISTENERS =====
function setupListeners(client) {
  // Incoming Messages
  client.onMessage((message) => {
    if (message.isGroupMsg === false) {
      console.log(`📩 Incoming from ${message.from}: ${message.body.substring(0, 50)}...`);

      // Forward to all WebSocket clients
      broadcastToClients({
        type: 'incoming_message',
        from: message.from,
        body: message.body,
        timestamp: message.timestamp,
        hasMedia: message.hasMedia || false,
        messageId: message.id
      });
    }
  });

  // Message Acknowledgments (Sent/Delivered/Read)
  client.onAck((ack) => {
    const ackStatus = {
      1: 'sent',
      2: 'delivered',
      3: 'read',
      4: 'played'
    };

    if (ack.ack >= 1 && ack.ack <= 4) {
      console.log(`📬 Message ${ack.id._serialized} status: ${ackStatus[ack.ack]}`);

      broadcastToClients({
        type: 'message_ack',
        messageId: ack.id._serialized,
        ack: ack.ack,
        ackStatus: ackStatus[ack.ack]
      });
    }
  });

  // State Changes
  client.onStateChange((state) => {
    console.log(`🔄 State changed: ${state}`);
    broadcastToClients({
      type: 'state_change',
      state: state
    });
  });
}

// Logging Middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.path} - Origin: ${req.get('origin')}`);
  next();
});

// ===== REST API ENDPOINTS =====

// Status Endpoint
app.get('/api/status', (req, res) => {
  res.json({
    status: bridgeStatus,
    message: bridgeStatus === 'connected' ? 'WhatsApp Ready' : 'Initializing or Disconnected',
    wsPort: WS_PORT,
    queueSize: messageQueue.filter(j => j.status === 'pending').length
  });
});

// Send Message Endpoint
app.post('/api/send', async (req, res) => {
  const { phone, message } = req.body;

  if (bridgeStatus !== 'connected' || !clientSession) {
    console.warn('⚠️ Attempted to send while bridge is not ready.');
    return res.status(503).json({ success: false, error: 'WhatsApp client is initializing or disconnected.' });
  }

  try {
    const cleanPhone = phone.replace(/\D/g, '');
    const chatId = `${cleanPhone}@c.us`;

    console.log(`📤 Sending to ${chatId}...`);
    const result = await clientSession.sendText(chatId, message);
    console.log(`✅ Sent successfully!`);

    res.json({ success: true, messageId: result.id });
  } catch (error) {
    console.error('❌ Send Error:', error);
    res.status(500).json({ success: false, error: error.toString() });
  }
});

// Schedule Message Endpoint
app.post('/api/schedule', async (req, res) => {
  const { phone, message, scheduledFor } = req.body;

  if (!phone || !message || !scheduledFor) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  const job = {
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    phone,
    message,
    scheduledFor,
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  messageQueue.push(job);
  console.log(`⏰ Scheduled message for ${phone} at ${scheduledFor}`);

  res.json({ success: true, jobId: job.id });
});

// Get Scheduled Messages
app.get('/api/scheduled', (req, res) => {
  res.json({
    success: true,
    messages: messageQueue.filter(j => j.status === 'pending')
  });
});

// Cancel Scheduled Message
app.delete('/api/scheduled/:jobId', (req, res) => {
  const { jobId } = req.params;
  const index = messageQueue.findIndex(j => j.id === jobId);

  if (index !== -1) {
    messageQueue.splice(index, 1);
    res.json({ success: true });
  } else {
    res.status(404).json({ success: false, error: 'Job not found' });
  }
});

// Get chat history (if needed)
app.get('/api/chat/:phone', async (req, res) => {
  if (bridgeStatus !== 'connected' || !clientSession) {
    return res.status(503).json({ success: false, error: 'Not connected' });
  }

  try {
    const cleanPhone = req.params.phone.replace(/\D/g, '');
    const chatId = `${cleanPhone}@c.us`;
    const messages = await clientSession.getAllMessagesInChat(chatId);
    res.json({ success: true, messages });
  } catch (error) {
    res.status(500).json({ success: false, error: error.toString() });
  }
});

// Listen on 0.0.0.0
app.listen(PORT, '0.0.0.0', () => {
  console.log('================================================');
  console.log(`📡 REST API Server: http://localhost:${PORT}`);
  console.log(`🔌 WebSocket Server: ws://localhost:${WS_PORT}`);
  console.log('================================================');
  console.log(`📝 NOTE: A Chrome window will open. Minimize it, DO NOT CLOSE IT.`);
  console.log('================================================');
});
