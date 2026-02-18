# Deploying Shepherd Bridge to Render (Free & Stable)

This guide shows you how to deploy the **Baileys WhatsApp Bridge** to Render. This is much more stable than the Oracle VM because Render manages the memory and restarting automatically.

## ✅ Prerequisites

1.  **GitHub Account:** You need to be logged in to GitHub.
2.  **Render Account:** Log in to [dashboard.render.com](https://dashboard.render.com).
3.  **Code Pushed:** Ensure you have pushed the latest code (including the `shepherd-cloud-bridge` folder) to your GitHub repository.

## 🚀 Deployment Steps

### 1. Create a New Web Service
1.  Go to the [Render Dashboard](https://dashboard.render.com).
2.  Click the **"New +"** button (top right) and select **"Web Service"**.
3.  Select **"Build and deploy from a Git repository"**.
4.  Connect your **Shepherd AI** repository.

### 2. Configure the Service
Use these exact settings:

| Setting | Value |
| :--- | :--- |
| **Name** | `shepherd-whatsapp-bridge` |
| **Region** | `Frankfurt` (or closest to you) |
| **Branch** | `main` (or `master`) |
| **Root Directory** | `shepherd-cloud-bridge` (⚠️ Important!) |
| **Runtime** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `node index.js` |
| **Instance Type** | **Free** (512MB RAM - Sufficient for Baileys) |

### 3. Environment Variables
Scroll down to **"Environment Variables"** and add these:

| Key | Value |
| :--- | :--- |
| `BACKEND_URL` | `https://shepherd-ai-backend.onrender.com` |
| `CONNECTION_CODE` | `1DCFEA1A` |
| `NODE_ENV` | `production` |

### 4. Deploy!
Click **"Create Web Service"**. Render will start building your app.

It will take about **2-3 minutes**.
Watch the logs. You should see:
```
✅ WhatsApp connected!
```
(or "initializing" if first run)

## 📱 Connecting WhatsApp

Once deployed, Render will give you a URL like: `https://shepherd-whatsapp-bridge.onrender.com`.

1.  Open that URL in your browser and append `/api/qr-image`.
    -   Example: `https://shepherd-whatsapp-bridge.onrender.com/api/qr-image`
2.  **Scan the QR code** with your phone (WhatsApp > Linked Devices).
3.  Done! The bridge is now connected to your backend.

## ❓ Troubleshooting

-   **"Out of Memory":** If this happens (rare with Baileys), you might need to upgrade to the Starter Plan ($7/mo), but try Free first.
-   **"Deploy Failed":** Check the "Root Directory" setting. It MUST be `shepherd-cloud-bridge`.
