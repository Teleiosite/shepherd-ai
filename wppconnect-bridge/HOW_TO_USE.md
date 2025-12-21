# 🌉 WhatsApp Bridge - Simple Setup

**For Non-Technical Users** 👥

---

## 🎯 What This Does

The WhatsApp Bridge connects Shepherd AI to your WhatsApp account so you can:
- ✅ Send messages via WhatsApp
- ✅ Receive messages automatically
- ✅ Auto-create contacts from incoming messages

---

## 🚀 Quick Start (3 Simple Steps!)

### **Step 1: Start the Bridge**

1. **Double-click** `START_BRIDGE.bat`
2. A black window will open (keep it open!)
3. A browser window will automatically open with a QR code

### **Step 2: Connect WhatsApp**

1. Open **WhatsApp** on your phone
2. Tap the **menu (⋮)** at the top
3. Tap **"Linked Devices"**
4. Tap **"Link a Device"**
5. **Scan the QR code** from your browser

### **Step 3: Wait for "Ready!"**

- Watch the black window
- When you see **"Client is ready!"** → You're connected! ✅
- Keep the window open while using Shepherd AI

---

## 🛑 To Stop the Bridge

**Option 1:** Double-click `STOP_BRIDGE.bat`

**Option 2:** Press `Ctrl+C` in the black window

---

## ✅ How to Know It's Working

### **Green Dot in Shepherd AI:**
Open Shepherd AI → Go to **Live Chats** → Look for a **green dot** in the top right

### **Test Message:**
1. Go to **Generate & Send** in Shepherd AI
2. Select a contact
3. Generate and send a message
4. Check your phone → Message should arrive!

---

## 📱 Requirements

Before starting, make sure:
- ✅ WhatsApp is installed on your phone
- ✅ Your phone has internet
- ✅ You haven't reached WhatsApp's link limit (max 5 devices)

---

## 🐛 Troubleshooting

### **"QR Code doesn't appear"**

1. Stop the bridge (STOP_BRIDGE.bat)
2. Delete the `tokens` folder (if it exists)
3. Start again (START_BRIDGE.bat)

---

### **"Authentication failed"**

1. Open WhatsApp on your phone
2. Go to **Linked Devices**
3. **Unlink** the Shepherd AI device
4. Stop the bridge
5. Delete the `tokens` folder
6. Start the bridge again and scan new QR code

---

### **"Port already in use"**

1. Stop the bridge (STOP_BRIDGE.bat)
2. Wait 10 seconds
3. Start again (START_BRIDGE.bat)

If still not working:
1. Open Task Manager (Ctrl+Shift+Esc)
2. Find "Node.js" processes
3. End them all
4. Start the bridge again

---

### **"Browser doesn't open automatically"**

**Manually open:** http://localhost:3003

The QR code will be there!

---

## ⚠️ Important Notes

### **Keep the Window Open:**
- Don't close the black window while using Shepherd AI
- Closing it = WhatsApp disconnects

### **First Time Setup:**
- First run takes 2-5 minutes (installing dependencies)
- After that, it starts in seconds

### **Security:**
- Never share your QR code with anyone
- Only scan from your own phone
- Check linked devices regularly in WhatsApp settings

---

## 🎉 Success Checklist

After setup, you should see:

- [ ] Black window is open and running
- [ ] Text says "Client is ready!"
- [ ] Green dot in Shepherd AI (Live Chats)
- [ ] Test message sent successfully

---

## 💡 Tips

### **Run on Startup (Optional):**
1. Right-click `START_BRIDGE.bat`
2. Create Shortcut
3. Copy shortcut to:
   ```
   C:\Users\[YourName]\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup
   ```
4. Bridge will start automatically when Windows starts!

### **Minimize to Tray:**
- You can minimize the black window
- Just don't close it!

---

## 📞 Need Help?

If QR code appears but won't scan:
- Make sure phone and computer are on the same WiFi
- Try moving phone closer to screen
- Increase screen brightness

If messages aren't sending:
- Check the black window for errors
- Make sure it says "Client is ready!"
- Try stopping and starting the bridge

---

## 🎯 That's It!

Now you can use Shepherd AI with WhatsApp without touching any code! 🚀

**Just remember:** Keep the black window running while you use the app!
