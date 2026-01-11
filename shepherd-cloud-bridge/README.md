# Shepherd AI Cloud Bridge - 24/7 WhatsApp Integration

Deploy your WhatsApp bridge to the cloud for always-on, mobile-friendly access.

---

## ⚠️ **Important: Free Tier Limitations**

**Render's FREE tier does NOT have enough resources to run this bridge** due to Chrome/Chromium requirements.

**You need a PAID hosting plan ($5-7/month) for the cloud bridge to work.**

---

## 💰 **Recommended Hosting Options**

### 🥇 **Option 1: Railway** (Easiest - $5/month)

**Why Railway:**
- ✅ Easiest deployment
- ✅ $5 credit to start
- ✅ Docker support built-in
- ✅ Great for beginners

**Deploy to Railway:**

1. **Go to [railway.app](https://railway.app)**
2. Click **"Start a New Project"**
3. Select **"Deploy from GitHub repo"**
4. Connect `Teleiosite/shepherd-ai`
5. Railway auto-detects `Dockerfile.bridge`
6. **Add Environment Variables:**
   ```
   BACKEND_URL=https://shepherd-ai-backend.onrender.com
   CONNECTION_CODE=[your-code-from-settings]
   PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
   ```
7. Click **"Deploy"**
8. Wait 5-10 minutes for deployment
9. Check logs for QR code!

**Cost:** $5/month (first $5 free with new account)

---

### 🥈 **Option 2: Render Starter** ($7/month)

**Why Render:**
- ✅ Same platform as your backend
- ✅ Easy to manage everything in one place
- ✅ Good documentation

**Deploy to Render:**

1. **Go to [render.com](https://render.com)**
2. Click **"New +"** → **"Web Service"**
3. Connect GitHub: `Teleiosite/shepherd-ai`
4. **Configure:**
   - **Environment:** `Docker`
   - **Dockerfile Path:** `Dockerfile.bridge`
   - **Plan:** `Starter` ($7/month)
5. **Add Environment Variables:**
   ```
   BACKEND_URL=https://shepherd-ai-backend.onrender.com
   CONNECTION_CODE=[your-code-from-settings]
   PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
   ```
6. Click **"Create Web Service"**
7. Wait for deployment
8. Check logs for QR code!

**Cost:** $7/month

---

### 🥉 **Option 3: DigitalOcean App Platform** ($5/month)

**Why DigitalOcean:**
- ✅ Reliable infrastructure
- ✅ Predictable pricing
- ✅ Good for scaling later

**Deploy to DigitalOcean:**

1. **Go to [cloud.digitalocean.com](https://cloud.digitalocean.com)**
2. Click **"Create"** → **"Apps"**
3. Select GitHub source: `Teleiosite/shepherd-ai`
4. **Configure:**
   - **Resource Type:** `Web Service`
   - **Dockerfile:** `Dockerfile.bridge`
   - **Plan:** `Basic ($5/month)`
5. **Add Environment Variables:**
   ```
   BACKEND_URL=https://shepherd-ai-backend.onrender.com
   CONNECTION_CODE=[your-code-from-settings]
   PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
   ```
6. Click **"Next"** → **"Launch App"**
7. Wait for deployment
8. Check logs for QR code!

**Cost:** $5/month

---

## 📋 **Environment Variables Reference**

You'll need these for ANY platform:

| Variable | Value | Where to Get It |
|----------|-------|-----------------|
| `BACKEND_URL` | `https://shepherd-ai-backend.onrender.com` | Your backend URL |
| `CONNECTION_CODE` | `1DCFEA1A` (example) | Shepherd AI → Settings → WhatsApp Bridge section |
| `PUPPETEER_EXECUTABLE_PATH` | `/usr/bin/chromium` | (Always this value for Docker) |

---

## 🚀 **After Deployment**

### **1. Find the QR Code**
Check your service logs - you'll see something like:
```
📱 SCAN THIS QR CODE WITH YOUR PHONE:

████ ▄▄▄▄▄ █▀█ █▄▀▄▀▄█ ▄▄▄▄▄ ████
████ █   █ █▀▀▀█ ▀ ▀▄█ █   █ ████
...
```

### **2. Scan with WhatsApp**
1. Open WhatsApp on your phone
2. Go to **"Settings"** → **"Linked Devices"**
3. Tap **"Link a Device"**
4. Scan the QR code from logs

### **3. Verify Connection**
- Bridge should show **"Connected"** in logs
- Test by sending a message from Shepherd AI

---

## 🆚 **Cloud vs Desktop Bridge**

| Feature | Desktop Bridge | Cloud Bridge |
|---------|----------------|--------------|
| **Cost** | ✅ Free | 💰 $5-7/month |
| **Setup Time** | 2 minutes | 10 minutes |
| **Uptime** | Only when PC is on | ✅ 24/7 |
| **Mobile Access** | ❌ No | ✅ Yes |
| **Reliability** | Depends on PC | ✅ High |
| **Best For** | Personal use | Business/Team |

---

## 🔧 **How It Works**

```
┌─────────────────┐
│  Cloud Server   │
│  (Railway/etc)  │
└────────┬────────┘
         │
         │ Polls every 5s
         ▼
┌─────────────────┐      ┌──────────────┐
│ Shepherd AI     │◄────►│  WhatsApp    │
│ Backend         │      │  Servers     │
└─────────────────┘      └──────────────┘
```

1. Bridge connects to WhatsApp Web
2. Polls backend for pending messages
3. Sends messages via WhatsApp
4. Forwards incoming messages to backend

---

## 🐛 **Troubleshooting**

### **Build Failed**
- ✅ Check you're using **Docker** environment (not Node)
- ✅ Verify `Dockerfile.bridge` path is correct
- ✅ Make sure you're on a **PAID** plan

### **QR Code Not Appearing**
- Wait 2-3 minutes after deployment
- Check logs in your hosting dashboard
- Restart the service if needed

### **Messages Not Sending**
- Verify `CONNECTION_CODE` is correct
- Check WhatsApp is still connected (scan QR again if needed)
- Verify `BACKEND_URL` is correct

### **Service Keeps Crashing**
- Check you have enough RAM (512MB minimum)
- Verify all environment variables are set
- Check logs for specific error messages

---

## 📊 **Performance & Limits**

| Metric | Value |
|--------|-------|
| **Messages/min** | ~60 (WhatsApp limit) |
| **Simultaneous Chats** | Unlimited |
| **Uptime** | 99.9% (on paid plans) |
| **RAM Usage** | ~400-500MB |
| **Storage** | ~200MB (for session) |

---

## 🔒 **Security**

- ✅ WhatsApp session encrypted
- ✅ HTTPS only communication
- ✅ Connection code authentication
- ✅ No message storage on server
- ✅ GDPR compliant hosting

---

## 🔄 **Updates**

When we release updates:

1. **Automatic:** Enable auto-deploy in your hosting platform
2. **Manual:** Click "Redeploy" in dashboard

Your WhatsApp session persists across deployments!

---

## 💡 **Pro Tips**

1. **Set up monitoring:** Use your platform's health checks
2. **Enable auto-deploy:** Get updates automatically
3. **Keep logs:** Download monthly for debugging
4. **Use env secrets:** Never commit API keys

---

## 🆘 **Need Help?**

- 📖 [Full Documentation](https://github.com/Teleiosite/shepherd-ai)
- 🐛 [Report Issues](https://github.com/Tele iosite/shepherd-ai/issues)
- 💬 [Community Discord](#) (coming soon)

---

## 💰 **Cost Summary**

| Platform | Monthly Cost | Free Trial | Best For |
|----------|--------------|------------|----------|
| **Railway** | $5 | $5 credit | 🥇 Beginners |
| **Render** | $7 | 90 days free | Same backend |
| **DigitalOcean** | $5 | $200 credit* | Scaling |

*$200 credit for new users with promo

---

**Ready to deploy? Choose your platform above and follow the steps!** 🚀

**Or stick with the Desktop Bridge - it works great too!** 💻
