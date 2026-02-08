# 🔍 INCOMING MESSAGE DEBUGGING - TEST INSTRUCTIONS

## Changes Made

✅ **Enhanced WebSocket logging** in `whatsappService.ts`
✅ **Enhanced message reception logging** in `App.tsx`

## How to Test

### Step 1: Refresh the Frontend

1. **Open the app** in your browser
2. **Press F12** to open Developer Tools
3. **Go to the Console tab**
4. **Refresh the page** (Ctrl+R or Cmd+R)

### Step 2: Check WebSocket Connection

You should see these logs in the console:

```
🔌 Attempting WebSocket connection...
📍 Bridge URL from storage: http://localhost:3001
🔗 Connecting to WebSocket: ws://localhost:3002
✅ WebSocket connected to bridge successfully!
🎧 Listening for incoming WhatsApp messages...
```

**If you DON'T see these:**
- The bridge might not be running
- The bridge URL might be wrong

**Quick Fix:**
```javascript
// In browser console, run:
localStorage.setItem('shepherd_bridge_url', 'http://localhost:3001')
location.reload()
```

### Step 3: Send a Test Message

1. **Send a message TO the WhatsApp number** connected to the bridge
2. **Watch the console** - you should see:

```
📨 WebSocket message received: {"type":"incoming_message","from":"...","body":"..."}
📦 Parsed message data: {type: "incoming_message", ...}
📩 INCOMING MESSAGE detected! {from: "...", phone: "...", body: "..."}
📤 Passing to message callback...
📩 Received WhatsApp message: {from: "...", phone: "...", body: "..."}
📞 Looking for contact with: {whatsappId: "...", phone: "..."}
✅ Matched contact: John Doe
💾 Adding message to logs state: {logId: "...", contactName: "John Doe", ...}
📝 Previous logs count: 5
✅ Updated logs count: 6
📊 This message should now appear in LiveChats for contact: John Doe
```

### Step 4: Check LiveChats

1. **Open LiveChats** in the app
2. **Select the contact** who sent the message
3. **The message should appear** in the chat history

---

## 🐛 Troubleshooting

### Issue 1: No WebSocket logs at all

**Problem**: WebSocket isn't connecting

**Causes:**
- Bridge not running
- Bridge running on wrong port
- Bridge URL not set

**Fix:**
1. Check bridge is running: `npm start` in `shepherd-bridge-app`
2. Bridge should show: `📡 REST: http://localhost:3001` and `🔌 WebSocket: ws://localhost:3002`
3. Set bridge URL in browser console:
   ```javascript
   localStorage.setItem('shepherd_bridge_url', 'http://localhost:3001')
   location.reload()
   ```

### Issue 2: WebSocket connects but no messages received

**Problem**: Bridge receives message but doesn't broadcast

**Check bridge terminal** for:
```
📩 INCOMING from +234...: [message text]
```

If you see this in bridge but NOT in frontend console → Bridge broadcasting issue

### Issue 3: Message received but not matched to contact

**Check console for:**
```
❌ No name match foundamong: ["John Doe", "Jane Smith", ...]
📱 Creating new contact for: +234...
```

**This means:**
- The message was received ✅
- But the contact wasn't found ❌
- A new contact was created

**Causes:**
- Phone number doesn't match
- WhatsApp ID changed
- Contact name doesn't match

**Fix:**
- Manually update the contact's phone number
- Or delete the auto-created contact and merge with existing one

### Issue 4: Message added to logs but not showing in LiveChats

**Check console for:**
```
✅ Updated logs count: 6
📊 This message should now appear in LiveChats for contact: John Doe
```

If you see this but message still doesn't appear in UI:
- Check if you're viewing the correct contact in LiveChats
- Check if `logs` prop is being passed to LiveChats correctly
- Try refreshing the page

**Debug:**
```javascript
// In console, check current logs:
console.log(JSON.parse(localStorage.getItem('shepherd_logs')))
```

---

## ✅ Success Criteria

**Everything is working if you see:**

1. ✅ WebSocket connection successful
2. ✅ `📩 INCOMING MESSAGE detected!` in console
3. ✅ `✅ Matched contact: [Name]` in console
4. ✅ `✅ Updated logs count: [N+1]` in console
5. ✅ **Message appears in LiveChats UI**

---

## 📊 What Each Log Means

| Log | Meaning | Location |
|-----|---------|----------|
| `🔌 Attempting WebSocket connection...` | Starting connection | whatsappService.ts |
| `✅ WebSocket connected to bridge successfully!` | Connected! | whatsappService.ts |
| `📨 WebSocket message received` | Got raw message | whatsappService.ts |
| `📩 INCOMING MESSAGE detected!` | Identified as incoming message | whatsappService.ts |
| `📤 Passing to message callback...` | Sending to App.tsx | whatsappService.ts |
| `📩 Received WhatsApp message` | App.tsx received it | App.tsx |
| `📞 Looking for contact with` | Trying to match contact | App.tsx |
| `✅ Matched contact` | Found the contact! | App.tsx |
| `💾 Adding message to logs state` | Adding to state | App.tsx |
| `✅ Updated logs count` | Successfully added | App.tsx |

---

## 🚑 Quick Test Script

Copy this into browser console to test WebSocket directly:

```javascript
// Test WebSocket connection
const ws = new WebSocket('ws://localhost:3002');

ws.onopen = () => {
  console.log('✅ WebSocket TEST: Connected!');
};

ws.onerror = (e) => {
  console.error('❌ WebSocket TEST: Connection failed', e);
  console.log('Make sure bridge is running on port 3002');
};

ws.onmessage = (e) => {
  console.log('📨 WebSocket TEST: Message received', e.data);
  try {
    const data = JSON.parse(e.data);
    console.log('Parsed:', data);
  } catch (err) {
    console.log('Not JSON:', e.data);
  }
};

// Clean up after 30 seconds
setTimeout(() => {
  ws.close();
  console.log('Test complete');
}, 30000);
```

**Expected behavior:**
1. Should see `✅ WebSocket TEST: Connected!`
2. When you send a message to WhatsApp, should see `📨 WebSocket TEST: Message received`

If this works but the app doesn't → Issue is in app's WebSocket handling (unlikely now with all the logging)
If this doesn't work → Issue is with the bridge itself
