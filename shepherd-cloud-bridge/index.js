/**
 * Shepherd AI Cloud Bridge
 * WhatsApp Bridge that runs on Render (cloud server)
 */

require('dotenv').config();
const wppconnect = require('@wppconnect-team/wppconnect');
const express = require('express');
const axios = require('axios');
const WebSocket = require('ws');

const app = express();
const PORT = process.env.PORT || 10000;

// Configuration
const BACKEND_URL = process.env.BACKEND_URL || 'https://shepherd-ai-backend.onrender.com';
const CONNECTION_CODE = process.env.CONNECTION_CODE;
const POLL_INTERVAL = 5000; // 5 seconds

// State
let client = null;
let isConnected = false;
let wsServer = null;

// Health check endpoint
app.get('/', (req, res) => {
    res.json({
        status: 'online',
        whatsappConnected: isConnected,
        service: 'Shepherd AI Cloud Bridge',
        version: '1.0.0'
    });
});

app.get('/health', (req, res) => {
    res.json({
        status: isConnected ? 'connected' : 'disconnected',
        uptime: process.uptime()
    });
});

// Initialize WhatsApp client
async function initializeWhatsApp() {
    console.log('🚀 Starting Shepherd AI Cloud Bridge...');

    try {
        client = await wppconnect.create({
            session: 'shepherd-cloud',
            headless: 'new', // Headless mode for cloud
            devtools: false,
            useChrome: false,
            debug: false,
            logQR: true, // Print QR to console
            browserArgs: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu'
            ],
            puppeteerOptions: {
                headless: 'new',
                executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROME_PATH || '/usr/bin/chromium' || '/usr/bin/chromium-browser',
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            },
            statusFind: (statusSession, session) => {
                console.log('📱 Status Session:', statusSession);
                console.log('🔐 Session name:', session);
            },
            catchQR: (base64Qr, asciiQR) => {
                console.log('\n📱 SCAN THIS QR CODE WITH YOUR PHONE:\n');
                console.log(asciiQR);
                console.log('\n✅ QR Code generated! Scan with WhatsApp on your phone.\n');
            }
        });

        console.log('✅ WhatsApp client initialized!');
        isConnected = true;

        // Listen for incoming messages
        client.onMessage(async (message) => {
            try {
                console.log('📩 Incoming message:', message.from);
                await handleIncomingMessage(message);
            } catch (error) {
                console.error('❌ Error handling incoming message:', error);
            }
        });

        // Start polling for pending messages
        startPolling();

    } catch (error) {
        console.error('❌ Failed to initialize WhatsApp:', error);
        isConnected = false;

        // Retry after 30 seconds
        setTimeout(() => {
            console.log('🔄 Retrying WhatsApp initialization...');
            initializeWhatsApp();
        }, 30000);
    }
}

// Poll backend for pending messages
async function startPolling() {
    console.log('🔄 Starting message polling...');

    setInterval(async () => {
        if (!isConnected || !client) {
            console.log('⏸️  WhatsApp not connected, skipping poll');
            return;
        }

        try {
            const response = await axios.get(`${BACKEND_URL}/api/messages/pending`, {
                headers: {
                    'X-Connection-Code': CONNECTION_CODE
                }
            });

            const pendingMessages = response.data;

            if (pendingMessages.length > 0) {
                console.log(`📬 Found ${pendingMessages.length} pending messages`);

                for (const msg of pendingMessages) {
                    await sendMessage(msg);
                }
            }
        } catch (error) {
            if (error.response?.status !== 404) {
                console.error('❌ Polling error:', error.message);
            }
        }
    }, POLL_INTERVAL);
}

// Send WhatsApp message
async function sendMessage(messageData) {
    try {
        const phone = messageData.phone.replace(/\D/g, '');
        const formattedPhone = phone.includes('@') ? phone : `${phone}@c.us`;

        console.log(`📤 Sending to ${formattedPhone}:`, messageData.content.substring(0, 50) + '...');

        let result;

        // Check if it's a media message
        if (messageData.attachment_url && messageData.attachment_type) {
            console.log(`📎 Sending ${messageData.attachment_type}...`);
            result = await client.sendFile(
                formattedPhone,
                messageData.attachment_url,
                {
                    caption: messageData.content,
                    type: messageData.attachment_type
                }
            );
        } else {
            // Text message
            result = await client.sendText(formattedPhone, messageData.content);
        }

        console.log('✅ Message sent successfully!');

        // Update backend
        await axios.post(`${BACKEND_URL}/api/messages/${messageData.id}/status`, {
            status: 'Sent',
            whatsapp_message_id: result.id
        }, {
            headers: {
                'X-Connection-Code': CONNECTION_CODE
            }
        });

    } catch (error) {
        console.error('❌ Send error:', error.message);

        // Mark as failed
        try {
            await axios.post(`${BACKEND_URL}/api/messages/${messageData.id}/status`, {
                status: 'Failed',
                error: error.message
            }, {
                headers: {
                    'X-Connection-Code': CONNECTION_CODE
                }
            });
        } catch (updateError) {
            console.error('❌ Failed to update message status:', updateError.message);
        }
    }
}

// Handle incoming WhatsApp message
async function handleIncomingMessage(message) {
    try {
        const messageData = {
            from: message.from,
            phone: message.from.replace('@c.us', ''),
            body: message.body || message.caption || '',
            timestamp: message.timestamp,
            contactName: message.sender?.pushname || '',
            pushname: message.sender?.pushname || '',
            type: message.type
        };

        console.log('📨 Forwarding incoming message to backend...');

        await axios.post(`${BACKEND_URL}/api/whatsapp/incoming`, messageData, {
            headers: {
                'X-Connection-Code': CONNECTION_CODE,
                'Content-Type': 'application/json'
            }
        });

        console.log('✅ Incoming message forwarded');
    } catch (error) {
        console.error('❌ Error forwarding incoming message:', error.message);
    }
}

// Start server
app.listen(PORT, () => {
    console.log(`🌐 Server running on port ${PORT}`);
    console.log(`📡 Backend: ${BACKEND_URL}`);
    console.log(`🔑 Connection Code: ${CONNECTION_CODE ? '✅ Set' : '❌ Missing'}`);

    if (!CONNECTION_CODE) {
        console.error('\n⚠️  WARNING: CONNECTION_CODE not set! Bridge will not work.\n');
        console.error('Set it in Render environment variables.\n');
    } else {
        // Initialize WhatsApp after server starts
        setTimeout(() => {
            initializeWhatsApp();
        }, 2000);
    }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('👋 SIGTERM received, closing gracefully...');
    if (client) {
        await client.close();
    }
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('👋 SIGINT received, closing gracefully...');
    if (client) {
        await client.close();
    }
    process.exit(0);
});
