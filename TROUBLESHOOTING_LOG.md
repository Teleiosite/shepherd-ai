# 🛠️ Shepherd AI Troubleshooting Log

This file documents the key problems faced during development/deployment of the **Shepherd AI** platform, the investigations conducted, and the final resolutions applied.

---

## 📌 Issue 1: Incoming WhatsApp Messages Do Not Display in App
* **Status**: ✅ SOLVED

### 🔍 Problem Statement
Outgoing messages sent from the Shepherd AI live chats dashboard reached recipients instantly. However, when users replied or initiated messages to the registered WhatsApp number, nothing was logged in the database or displayed on the dashboard.

### 🕵️ Investigation & Diagnostics
1. **Frontend Polling & Database Flow**: We checked the `App.tsx` polling interval (5 seconds) and the `/api/messages/` endpoint. The pipeline functioned correctly, indicating that no messages were entering the database from the webhooks.
2. **Backend Server Status**: Visited `https://shepherd-ai-backend.onrender.com/health` to confirm the backend was awake. It responded successfully, ruling out cold-start/sleep timeouts.
3. **Webhook Verification**: Looked at the Meta Webhooks Configuration. The URL was verified and set correctly to `/api/whatsapp/webhook`.
4. **The Breakthrough Test**: We triggered Meta's **"Test"** feature on the `messages` webhook subscription. The server logs instantly recorded a `POST` request and a successful `200` response. This proved that Meta could talk to Render, but real incoming messages were being discarded by Meta.

### 💡 Root Cause
Although the webhook callback endpoint was verified, the **WhatsApp Business Account (WABA) itself was not subscribed to your Developer App**. Meta was discarding the events before forwarding them to the webhook.

### 🛠️ Resolution
We used the **Meta Graph API Explorer** to register the subscription:
1. Retrieved your WABA ID: `916894334754800` (named "Operation Win Bu").
2. Selected your Meta App: **"Shepard Ai"**.
3. Changed the HTTP method from `GET` to **`POST`**.
4. Entered the endpoint:
   ```text
   /916894334754800/subscribed_apps
   ```
5. Clicked **Submit** (returned `"success": true`).
6. **Result**: Real incoming messages are now forwarded to Render, written to Supabase, and displayed instantly in Vercel.

---

## 📌 Issue 2: Render Backend Inbound Latency (Cold Start Timeouts)
* **Status**: ℹ️ MONITORING

### 🔍 Problem Statement
On the Render free tier, web services spin down after 15 minutes of inactivity. When a new webhook request comes from Meta, Render can take 30-50 seconds to boot the backend, causing Meta to timeout (5-second limit) and drop the message.

### 🕵️ Investigation
The logs revealed:
> *"Your free instance will spin down with inactivity, which can delay requests by 50 seconds or more."*

### 🛠️ Resolution
1. **Interim Fix**: Use a free uptime monitoring service (like [UptimeRobot](https://uptimerobot.com/)) to query `https://shepherd-ai-backend.onrender.com/health` every 5 to 10 minutes to keep the container awake.
2. **Permanent Solution**: Upgrade the Render backend web service to a **Starter plan ($7/month)** to ensure 100% uptime with zero sleep cycles.

---

## 📌 Issue 3: Local WPPConnect Bridge Offline
* **Status**: ℹ️ ARCHIVED (Replaced by Meta Cloud API)

### 🔍 Problem Statement
The Node.js local bridge service (`shepherd-ai` on Render) had a status of `Failed Deploy` since February 2026.

### 🕵️ Investigation
The service log displayed:
```text
Exited with status 1 while running your code.
```
This was caused by missing Chromium dependencies in the base Node environment needed to spin up local WhatsApp Web browser instances (via WPPConnect/Puppeteer).

### 🛠️ Resolution
Rather than maintaining complex headless browser instances on Render, the system architecture was successfully migrated to use the official **Meta Cloud API**. The local bridge is no longer needed for primary operations.
