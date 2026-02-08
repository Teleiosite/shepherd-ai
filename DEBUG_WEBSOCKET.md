# WebSocket Debugging Guide

## Step 1: Check if Bridge is Running

Open browser console (F12) and check for:
- ✅ `🔌 Connecting to WhatsApp bridge WebSocket...`
- ✅ `✅ WebSocket connected to bridge`
- ❌ `WebSocket error:` or `Failed to create WebSocket`

## Step 2: Check Bridge URL

In browser console, run:
```javascript
localStorage.getItem('shepherd_bridge_url')
```

**Expected**: `http://localhost:3001` (if running locally)

**If null/wrong**: Set it:
```javascript
localStorage.setItem('shepherd_bridge_url', 'http://localhost:3001')
```
Then refresh the page.

## Step 3: Verify WebSocket Port

The bridge WebSocket runs on port **3002** (NOT 3001).

In browser console, check:
```javascript
// This should show the WebSocket connection
console.log('Checking WebSocket...')
```

## Step 4: Test Incoming Messages

1. Send a message TO your WhatsApp number (the one connected to the bridge)
2. Watch the browser console for:
   - `📩 Received WhatsApp message:` ← Frontend received it ✅
   - If you don't see this, the WebSocket isn't working ❌

## Step 5: Check Bridge Logs

Bridge should log (in terminal):
```
📩 INCOMING from +234....: [message content]
```

If you see this in bridge but NOT in frontend → WebSocket issue

## Common Fixes

### Fix 1: Bridge URL Not Set
```javascript
// In browser console:
localStorage.setItem('shepherd_bridge_url', 'http://localhost:3001')
location.reload()
```

### Fix 2: WebSocket Connection Failed
Check that:
- Bridge is running on port 3001 (REST) and 3002 (WebSocket)
- No firewall blocking WebSocket connections
- Bridge logs show: `🔌 WebSocket: ws://localhost:3002`

### Fix 3: Contact Not Matching
If message received but not showing, the contact might not be matching.

Check console for:
- `✅ Matched contact: [Name]` ← Working
- `📱 Creating new contact for: [phone]` ← No match, creating new

## Quick Test Script

Copy this into browser console to test:
```javascript
// Test WebSocket connection
const ws = new WebSocket('ws://localhost:3002');
ws.onopen = () => console.log('✅ WebSocket TEST: Connected!');
ws.onerror = (e) => console.error('❌ WebSocket TEST: Failed', e);
ws.onmessage = (e) => console.log('📨 WebSocket TEST: Message received', e.data);
```

If this works, the issue is in the app's WebSocket connection logic.
