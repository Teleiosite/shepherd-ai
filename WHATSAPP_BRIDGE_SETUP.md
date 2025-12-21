# 🌉 WhatsApp Bridge Setup Guide

**Date:** December 17, 2025  
**Service:** WPPConnect Bridge  
**Purpose:** Connect WhatsApp to Shepherd AI

---

## 🎯 What This Does

The WhatsApp bridge allows Shepherd AI to:
- ✅ Send messages via WhatsApp
- ✅ Receive incoming messages  
- ✅ Auto-create contacts from incoming chats
- ✅ Log all conversations

---

## 📋 Prerequisites

✅ Node.js installed  
✅ WhatsApp on your phone  
✅ Internet connection  

---

## 🚀 Step-by-Step Setup

### **Step 1: Install Dependencies**

```powershell
cd "wppconnect-bridge"
npm install
```

**Wait for:** `added XXX packages` message

---

### **Step 2: Start the Bridge**

```powershell
npm start
```

**What happens:**
1. Bridge starts on port **3002**
2. Opens browser window with QR code
3. Shows: `"Server started on port 3002"`

---

### **Step 3: Scan QR Code**

1. **Open WhatsApp** on your phone
2. Tap **⋮ (menu)** → **Linked Devices**
3. Tap **"Link a Device"**
4. **Scan the QR code** from the browser
5. Wait for: `"Client is ready!"`

---

### **Step 4: Verify Connection**

**In Shepherd AI:**
1. Go to **Live Chats** tab
2. **Send a test message** to your own number
3. Check your phone → Message should arrive! ✅

---

## 📊 Expected Terminal Output

```
🚀 WPPConnect Bridge Server
📱 Initializing WhatsApp session...
📟 Server started on port 3002
🔌 WebSocket server ready
📱 QR Code generated!
⏳ Waiting for QR scan...
✅ Client is ready!
📱 WhatsApp connected successfully!
```

---

## ⚙️ Configuration

The bridge runs on **port 3002** by default.

**To change port:** Edit `wppconnect-bridge/bridge.js` line 8:
```javascript
const PORT = 3002; // Change this
```

---

## 🐛 Troubleshooting

### **Issue 1: "Port 3002 already in use"**

**Fix:**
```powershell
# Find process using port 3002
netstat -ano | findstr :3002

# Kill it (replace PID)
taskkill /PID <PID> /F
```

---

### **Issue 2: QR Code doesn't appear**

**Fix:**
1. Close browser window
2. Stop bridge (Ctrl+C)
3. Delete `tokens` folder:
   ```powershell
   Remove-Item -Recurse -Force tokens
   ```
4. Restart bridge

---

### **Issue 3: "Authentication failure"**

**Fix:**
1. Unlink device from phone:
   - WhatsApp → Linked Devices → Tap on device → Unlink
2. Delete session:
   ```powershell
   Remove-Item -Recurse -Force tokens
   ```
3. Restart bridge and scan again

---

### **Issue 4: Messages not sending**

**Check:**
- ✅ Bridge is running (`npm start`)
- ✅ QR code is scanned
- ✅ Console shows "Client is ready!"
- ✅ Frontend shows green dot (connected)

---

## 🔒 Security Notes

### **⚠️ Important:**

1. **Never share your QR code** - It gives full access to your WhatsApp
2. **Don't commit `tokens/` folder** to GitHub (already in .gitignore)
3. **Only link trusted devices**
4. **Regularly check linked devices** in WhatsApp settings

---

## 📱 Phone Requirements

- ✅ WhatsApp must be installed
- ✅ Phone must have internet
- ✅ WhatsApp should be open (not required 24/7)
- ✅ Must have active WhatsApp account

---

## 🎯 After Setup

Once connected, you can:

1. **Send messages** from Shepherd AI → Generate & Send
2. **Receive messages** → Appear in Live Chats
3. **Auto-create contacts** → Unknown senders become contacts
4. **Schedule messages** → Sent via WhatsApp at scheduled time

---

## 🔄 Keeping It Running

### **Development:**
```powershell
npm start
```
(Runs in terminal - stops when you close it)

### **Production (24/7):**

**Option 1: PM2** (Recommended)
```powershell
npm install -g pm2
pm2 start bridge.js --name whatsapp-bridge
pm2 save
pm2 startup
```

**Option 2: Windows Service**
```powershell
npm install -g node-windows
# Follow node-windows setup
```

---

## ✅ Success Checklist

After setup, verify:

- [ ] Bridge running on port 3002
- [ ] QR code scanned successfully
- [ ] Terminal shows "Client is ready!"
- [ ] Frontend shows green connection dot
- [ ] Test message sent successfully
- [ ] Test message received successfully
- [ ] Incoming messages create contacts

---

## 🎉 You're Done!

Your Shepherd AI is now **fully connected** to WhatsApp!

**Next steps:**
1. Test sending messages
2. Add real contacts
3. Set up workflows
4. Start discipleship outreach! 🚀

---

**Need help?** Check the main README or ask for assistance!
