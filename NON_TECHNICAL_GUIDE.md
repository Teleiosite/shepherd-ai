# 🎯 QUICK START - For Non-Technical Users

**NEW! One-Click Startup** 🚀

---

## 🚀 Easiest Way to Start (Recommended)

### **Just Double-Click This File:**

```
START_ALL.bat
```

**That's it!** Everything starts automatically:
- ✅ Backend Server
- ✅ Frontend App  
- ✅ WhatsApp Bridge

Three windows will open. **Keep them all running!**

---

## 📱 Connect WhatsApp (First Time Only)

After starting, a browser will open with a QR code:

1. Open **WhatsApp** on your phone
2. Tap **menu (⋮)** → **Linked Devices**
3. Tap **"Link a Device"**
4. **Scan the QR code**
5. Wait for "Client is ready!" ✅

---

## 🌐 Open the App

After everything starts (wait ~30 seconds):

**Click this or open in browser:**
```
http://localhost:3001
```

**Login with your account** (the one you created before)

---

## 🛑 To Stop Everything

### **Double-Click:**
```
STOP_ALL.bat
```

Or just close all the black windows.

---

## 📂 Individual Components

If you want to start services separately:

### **Backend Only:**
```
Agent File/backend/start-backend.bat
```

### **Frontend Only:**
```
Agent File/start-frontend.bat  
```
(Create this if needed, or run: `cd "Agent File" && npm run dev`)

### **WhatsApp Bridge Only:**
```
wppconnect-bridge/START_BRIDGE.bat
```

---

## ✅ How to Know It's Working

### **1. All Windows Running:**
- 3 black windows should be open
- Don't close them!

### **2. No Red Errors:**
- Check each window for errors
- Green/white text = good ✅
- Red text = problem ❌

### **3. App Opens:**
- Browser shows Shepherd AI login
- No "cannot connect" errors

### **4. WhatsApp Connected:**
- Go to **Live Chats** in the app
- Look for **green dot** (top right)
- Green = connected ✅

---

## 🐛 Common Issues

### **"Port already in use"**

**Fix:**
1. Run `STOP_ALL.bat`
2. Wait 10 seconds  
3. Run `START_ALL.bat` again

---

### **"Module not found" or npm errors**

**Fix:** Install dependencies (first time only)

```
cd "Agent File"
npm install

cd backend
pip install -r requirements.txt
```

Then run `START_ALL.bat` again.

---

### **WhatsApp won't connect**

**Fix:**
1. Stop bridge: `wppconnect-bridge/STOP_BRIDGE.bat`
2. Delete folder: `wppconnect-bridge/tokens` (if exists)
3. Start bridge again
4. Scan new QR code

---

## 📚 For More Help

- **WhatsApp Setup:** See `wppconnect-bridge/HOW_TO_USE.md`
- **Full Documentation:** See `QUICKSTART.md`
- **Technical Setup:** See `DEPLOYMENT_GUIDE.md`

---

## 🎯 Daily Use Workflow

### **Morning (Start the Day):**
```
1. Double-click: START_ALL.bat
2. Wait for services to start
3. Open: http://localhost:3001
4. Start working!
```

### **Evening (End of Day):**
```
1. Double-click: STOP_ALL.bat
2. Done!
```

---

## 💡 Pro Tips

### **Run on Windows Startup (Optional):**

1. Right-click `START_ALL.bat`
2. Create Shortcut
3. Press `Win+R`, type: `shell:startup`, press Enter
4. Move the shortcut there
5. App starts automatically when Windows boots!

### **Keep Running 24/7 (Optional):**

Just leave the windows minimized! Your computer can:
- Sleep (services pause but resume when awake)
- Restart (you'll need to run START_ALL.bat again)

---

## ⚠️ Important

- **DO NOT** close the black windows while using the app
- **DO keep** your computer connected to internet
- **DO scan** WhatsApp QR code the first time
- **DON'T share** your QR code with anyone

---

## 🎉 You're All Set!

Now you can:
- ✅ Add contacts
- ✅ Send messages via WhatsApp
- ✅ Schedule automated follow-ups
- ✅ Track your discipleship workflow

**All without touching any code!** 🚀

---

**Need more help?** Check the other guides in this folder or ask your tech person!
