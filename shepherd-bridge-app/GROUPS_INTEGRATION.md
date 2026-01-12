# Bridge Integration Instructions for Groups

## Quick Integration (2 Steps)

### Step 1: Update `electron-main.js`

Add this at the top with other requires:
```javascript
const groupManager = require('./group-manager');
```

### Step 2: Initialize Group Manager

Find where you initialize the WhatsApp client (where you call `wppconnect.create()`), and after the client is ready, add:

```javascript
client.then(async (client) => {
    console.log('✅ WhatsApp client ready!');
    
    // Existing code...
    
    // NEW: Initialize group manager
    groupManager.initialize(client, BACKEND_URL, connectionCode);
    groupManager.startPolling(10000); // Poll every 10 seconds
    
    // Existing startPolling() call...
});
```

That's it! The group manager will now:
- ✅ Sync groups on startup
- ✅ Listen for new members joining
- ✅ Send welcome messages automatically
- ✅ Send group broadcasts
- ✅ Create contacts for new members

---

## Full Example Integration

If you need more details, here's a complete example:

```javascript
// electron-main.js

const { app, BrowserWindow, ipcMain } = require('electron');
const wppconnect = require('@wpconnect-team/wppconnect');
const groupManager =require('./group-manager'); // ADD THIS

let client;
let connectionCode;
const BACKEND_URL = 'https://shepherd-ai-backend.onrender.com';

// ... existing code ...

ipcMain.handle('connect-bridge', async (event, code) => {
    connectionCode = code;
    
    // Initialize WPPConnect
    client = await wppconnect.create({
        session: 'shepherd-bridge',
        // ... your config ...
    });
    
    // AFTER client is ready:
    client.onReady(async () => {
        console.log('✅ Client ready!');
        
        // Initialize group manager
        groupManager.initialize(client, BACKEND_URL, connectionCode);
        groupManager.startPolling(10000);
        
        // Your existing polling...
        const polling = require('./bridge-polling');
        polling.startPolling(connectionCode);
    });
    
    return { success: true };
});
```

---

## Testing

After integration, test by:

1. **Connect bridge** - Groups auto-sync
2. **Check backend** - Go to /api/groups to see synced groups
3. **Enable auto-welcome** - In group settings (when frontend is ready)
4. **Add someone to group** - They should get a welcome DM
5. **Send group message** - Use API or frontend (when ready)

---

## Troubleshooting

**Groups not syncing?**
- Check console for "🔄 Syncing WhatsApp groups..."
- Verify CONNECTION_CODE is set
- Check BACKEND_URL is correct

**Welcome messages not sending?**
- Enable auto-welcome in group settings (via API for now)
- Check: `GET /api/groups/{id}` - look at `auto_welcome_enabled`
- Update: `PUT /api/groups/{id}` with `{"auto_welcome_enabled": true}`

**Group messages not sending?**
- Check: `GET /api/groups/messages/pending`
- Verify group_id matches whatsapp_group_id

---

## Manual Testing (Without Frontend)

Use these curl commands to test:

```bash
# List groups
curl http://localhost:8000/api/groups/

# Enable auto-welcome
curl -X PUT http://localhost:8000/api/groups/{GROUP_ID} \
  -H "Content-Type: application/json" \
  -d '{"auto_welcome_enabled": true, "welcome_message_template": "Welcome {{name}}!"}'

# Send group message
curl -X POST http://localhost:8000/api/groups/{GROUP_ID}/messages \
  -H "Content-Type: application/json" \
  -d '{"content": "Hello everyone!"}'
```

---

**Integration time: 5 minutes** ⏱️  
**Then groups will work!** ✅
