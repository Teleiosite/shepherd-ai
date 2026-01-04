# Option 2: Polling Architecture Implementation Guide

## Summary
This document contains all the code changes needed to implement message sending via polling.

## Phase 1: Backend Changes (Already DONE ✅)

### 1. Created new file: `backend/app/api/bridge_polling.py` ✅
- Contains `/pending-messages` endpoint
- Contains `/update-message-status` endpoint

### 2. Register the router in `backend/app/main.py`

**ADD THIS LINE** after line 54:
```python
from app.api import auth, contacts, messages, knowledge, workflows, whatsapp, settings, bridge, bridge_polling
```

**ADD THIS LINE** after line 62:
```python
app.include_router(bridge_polling.router, prefix="/api/bridge", tags=["Bridge Polling"])
```

### 3. Update `backend/app/api/whatsapp.py` - Change send endpoint

**FIND** the `/send` endpoint (around line 119) and **CHANGE** it to queue messages instead:

```python
@router.post("/send")
async def send_whatsapp_message(
    message: WhatsAppMessageSend,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Queue WhatsApp message for bridge to send"""
    logger.info(f"Queuing message for {message.phone}")
    
    # Create pending message in database
    msg_log = Message(
        organization_id=current_user.organization_id,
        contact_id=message.contact_id,
        content=message.message,
        type="Outbound",
        status="Pending",  # ← KEY CHANGE
        created_by=current_user.id
    )
    db.add(msg_log)
    db.commit()
    
    return {
        "success": True,
        "message_id": str(msg_log.id),
        "status": "queued",
        "provider": "bridge"
    }
```

---

## Phase 2: Bridge App Changes

### 1. Add polling logic to `shepherd-bridge-app/bridge-core.js`

**ADD THIS CODE** after line 212 (after the wppconnect.create promise):

```javascript
// =================== POLLING FOR PENDING MESSAGES ===================

const BACKEND_URL = 'https://shepherd-ai-backend.onrender.com';
let connectionCode = null;
let pollingInterval = null;

// Start polling for pending messages
function startMessagePolling(code) {
    connectionCode = code;
    
    console.log('🔄 Starting message polling...');
    
    // Poll immediately
    pollPendingMessages();
    
    // Then poll every 5 seconds
    pollingInterval = setInterval(pollPendingMessages, 5000);
}

async function pollPendingMessages() {
    if (!connectionCode || bridgeStatus !== 'connected') return;
    
    try {
        const axios = require('axios');
        
        // Fetch pending messages
        const response = await axios.get(`${BACKEND_URL}/api/bridge/pending-messages`, {
            params: { code: connectionCode }
        });
        
        if (response.data.success && response.data.messages.length > 0) {
            console.log(`📬 Found ${response.data.messages.length} pending messages`);
            
            // Send each message
            for (const msg of response.data.messages) {
                await sendPendingMessage(msg);
            }
        }
    } catch (error) {
        console.error('❌ Polling error:', error.message);
    }
}

async function sendPendingMessage(msg) {
    try {
        const axios = require('axios');
        
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
        
        console.log(`📤 Sending message ${msg.id} to ${chatId}...`);
        
        // Send via WPPConnect
        const result = await clientSession.sendText(chatId, msg.content);
        
        console.log('✅ Message sent!', result?.id);
        
        // Update status in backend
        await axios.post(`${BACKEND_URL}/api/bridge/update-message-status`, {
            message_id: msg.id,
            status: 'sent',
            whatsapp_message_id: result?.id
        }, {
            params: { code: connectionCode }
        });
        
    } catch (error) {
        console.error(`❌ Failed to send message ${msg.id}:`, error.message);
        
        // Update status as failed
        try {
            const axios = require('axios');
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

// Export for electron-main to call
module.exports = {
    startPolling: startMessagePolling
};
```

### 2. Update `shepherd-bridge-app/electron-main.js`

**REPLACE** the `startBridgeServer()` function (around line 142):

```javascript
function startBridgeServer() {
    // Import and start the bridge server
    const bridgeCore = require('./bridge-core');
    
    // Start polling with the connection code
    // Extract code from mainWindow or store it when user connects
    const code = '1DCFEA1A'; // TODO: Get from IPC or storage
    if (code) {
        bridgeCore.startPolling(code);
    }
    
    // Send status updates to UI
    mainWindow.webContents.send('bridge-status', { status: 'starting' });
    
    setTimeout(() => {
        mainWindow.webContents.send('bridge-status', { status: 'running' });
    }, 5000);
}
```

**OR BETTER** - Store the connection code when user connects:

**FIND** the `connect-bridge` handler (around line 79) and **ADD** at the end after success:

```javascript
if (response.data.success) {
    // Start the bridge server
    startBridgeServer();
    
    // Store connection code
    global.connectionCode = connectionCode; // ← ADD THIS
    
    // Start polling
    const bridgeCore = require('./bridge-core');
    bridgeCore.startPolling(connectionCode); // ← ADD THIS
    
    return {
        success: true,
        message: 'Connected successfully! Scan QR code with WhatsApp.'
    };
}
```

---

## Testing Steps

1. **Deploy backend** (push to GitHub → Render auto-deploys)
2. **Rebuild bridge app**
3. **Test flow:**
   - Run bridge app
   - Connect with code
   - Send message from web app
   - Bridge polls backend → finds message → sends → updates status
   - Message delivered! ✅

---

## Quick Commands

### Deploy Backend:
```bash
cd "c:\Users\USER\Downloads\SHEPHERD Ai\Agent File\backend"
git add .
git commit -m "feat: add message polling for bridge"
git push origin main
```

### Rebuild Bridge:
```bash
cd "c:\Users\USER\Downloads\SHEPHERD Ai\shepherd-bridge-app"
# Update code as per instructions above
# Test with npm start first
npm start
```

---

**This is a LOT of changes. Do you want me to make them step-by-step, or would you prefer to take a break and continue tomorrow?** 🚀
