# 🐑 Shepherd AI - Oracle Cloud Bridge Deployment Guide

## 📋 Overview

This guide helps you deploy the WhatsApp Bridge to **Oracle Cloud Always Free** tier, so it runs **24/7** without needing your local PC.

### Architecture After Deployment

```
WhatsApp ←→ Bridge (Oracle Cloud VM) ←→ Backend (Render) ←→ Frontend (Vercel)
                                      ←→ Database (Supabase)
```

### What You Get
- ✅ Bridge runs 24/7 (no need to keep your PC on)
- ✅ Auto-restarts on crash via PM2
- ✅ QR code scanning via web browser
- ✅ All features: text, media, groups, polling

---

## 🚀 Step 1: Create Oracle Cloud VM

### 1.1 Log into Oracle Cloud
- Go to [cloud.oracle.com](https://cloud.oracle.com)
- Sign in with your account

### 1.2 Create a Compute Instance
1. Go to **Compute → Instances → Create Instance**
2. Configure:
   - **Name**: `shepherd-bridge`
   - **Image**: **Oracle Linux 9** (or Ubuntu 22.04/24.04)
   - **Shape**: Choose **Always Free** eligible:
     - **VM.Standard.A1.Flex** (ARM) - Recommended! Up to 4 OCPU / 24GB RAM
     - Or **VM.Standard.E2.1.Micro** (AMD) - 1 OCPU / 1GB RAM
   - **For ARM (A1.Flex)**: Set to **2 OCPUs / 4GB RAM** (plenty for bridge)
3. **SSH Key**: 
   - Download the private key OR paste your existing public key
   - **Save this key file!** You need it to connect
4. **Boot Volume**: Default 47GB is fine
5. Click **Create**

### 1.3 Note Your Public IP
Once the instance is running, note the **Public IP Address** (e.g., `129.154.xxx.xxx`)

---

## 🔐 Step 2: Open Firewall Ports

### 2.1 Oracle Cloud Security List
1. Go to **Networking → Virtual Cloud Networks**
2. Click your VCN → Click **Security Lists** → Default Security List
3. **Add Ingress Rules**:

| Source CIDR   | Protocol | Dest Port | Description          |
|---------------|----------|-----------|----------------------|
| `0.0.0.0/0`  | TCP      | `3001`    | Bridge REST API      |
| `0.0.0.0/0`  | TCP      | `3002`    | Bridge WebSocket     |

4. Click **Add Ingress Rules**

### 2.2 VM Firewall
After SSH-ing into the VM (Step 3), also run:

**Oracle Linux 9 (firewalld):**
```bash
sudo firewall-cmd --permanent --add-port=3001/tcp
sudo firewall-cmd --permanent --add-port=3002/tcp
sudo firewall-cmd --reload
```

**Ubuntu (iptables):**
```bash
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 3001 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 3002 -j ACCEPT
sudo netfilter-persistent save
```

> **Note:** The setup script handles this automatically!

---

## 💻 Step 3: Connect to Your VM

### From Windows (PowerShell):
```powershell
# Oracle Linux 9 uses 'opc' as the default user
ssh -i "C:\path\to\your-key.key" opc@YOUR_VM_IP

# Ubuntu uses 'ubuntu' as the default user
# ssh -i "C:\path\to\your-key.key" ubuntu@YOUR_VM_IP
```

### From Windows (PuTTY):
1. Convert `.key` to `.ppk` using PuTTYgen
2. Connect with PuTTY using your VM IP and the `.ppk` key

---

## 📦 Step 4: Deploy the Bridge

### Option A: Automated Setup (Recommended)

Upload the bridge files to your VM, then run:

```bash
# Upload files (from your local PC, in PowerShell)
scp -i "C:\path\to\key.key" -r "C:\Users\USER\Downloads\SHEPHERD Ai\oracle-cloud-bridge\*" opc@YOUR_VM_IP:~/shepherd-bridge/

# SSH into VM (Oracle Linux uses 'opc' user)
ssh -i "C:\path\to\key.key" opc@YOUR_VM_IP

# Run setup script
cd ~/shepherd-bridge
chmod +x setup.sh
./setup.sh
```

### Option B: Manual Setup

```bash
# SSH into VM (Oracle Linux uses 'opc' user)
ssh -i "C:\path\to\key.key" opc@YOUR_VM_IP

# 1. Update system
sudo dnf update -y

# 2. Install Node.js 20
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs

# 3. Install Chromium (required for WhatsApp Web)
sudo dnf install -y oracle-epel-release-el9
sudo dnf install -y chromium liberation-fonts libdrm mesa-libgbm \
  alsa-lib atk at-spi2-atk cups-libs gtk3 nspr nss \
  libXcomposite libXdamage libXrandr xdg-utils wget ca-certificates git

# 4. Install PM2 (keeps bridge running 24/7)
sudo npm install -g pm2

# 5. Create bridge directory
mkdir -p ~/shepherd-bridge
cd ~/shepherd-bridge

# 6. Upload your bridge files here (index.js, package.json, .env)
# Use SCP or copy-paste

# 7. Create .env
cat > .env << 'EOF'
BACKEND_URL=https://shepherd-ai-backend.onrender.com
CONNECTION_CODE=1DCFEA1A
PORT=3001
WS_PORT=3002
CHROME_PATH=/usr/bin/chromium-browser
NODE_ENV=production
# Note: On Oracle Linux, Chrome path is usually /usr/bin/chromium
EOF

# 8. Install dependencies
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
npm install --production

# 9. Start with PM2
pm2 start index.js --name "shepherd-bridge"
pm2 save
pm2 startup
```

---

## 📱 Step 5: Scan QR Code

### Method 1: Browser (Easiest)
Open in your browser:
```
http://YOUR_VM_IP:3001/api/qr-image
```
Scan this QR code with your WhatsApp phone.

### Method 2: Terminal Logs
```bash
pm2 logs shepherd-bridge
```
The ASCII QR code will appear in the terminal logs.

### Method 3: API
```bash
curl http://YOUR_VM_IP:3001/api/qr
```

---

## 🔧 Step 6: Update Frontend Configuration

Now update your frontend to connect to the Oracle Cloud bridge instead of localhost.

### In Vercel (Environment Variables):
Or in your frontend settings, update the bridge URL to:
```
http://YOUR_VM_IP:3001
```

### In Browser (localStorage):
Open browser console on your Vercel app and run:
```javascript
localStorage.setItem('shepherd_bridge_url', 'http://YOUR_VM_IP:3001');
location.reload();
```

---

## 📋 Useful PM2 Commands

```bash
# Check status
pm2 status

# View live logs
pm2 logs

# Restart bridge
pm2 restart shepherd-bridge

# Stop bridge
pm2 stop shepherd-bridge

# Delete and recreate
pm2 delete shepherd-bridge
pm2 start index.js --name "shepherd-bridge"
pm2 save
```

---

## 🔍 Troubleshooting

### QR Code Not Showing
```bash
# Check Chrome/Chromium is installed
which chromium-browser || which chromium
# Oracle Linux: usually /usr/bin/chromium

# Check logs for errors
pm2 logs shepherd-bridge --lines 50
```

### Port Not Accessible
```bash
# Check if bridge is running
pm2 status

# Check if port is listening
sudo netstat -tlnp | grep 3001

# Check iptables
sudo iptables -L -n | grep 3001

# Test locally on VM
curl http://localhost:3001/health
```

### WhatsApp Disconnects
The bridge auto-reconnects. Check:
```bash
pm2 logs shepherd-bridge
```

Session data is saved in `./tokens/` directory. If you need to re-authenticate:
```bash
rm -rf ./tokens/
pm2 restart shepherd-bridge
# Then scan the new QR code
```

### Out of Memory (E2.1.Micro)
If using the small 1GB instance:
```bash
# Add swap space
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## ✅ Verification Checklist

After deployment, verify everything works:

- [ ] VM is running (Oracle Cloud dashboard shows "Running")
- [ ] Can SSH into VM
- [ ] Ports 3001 and 3002 are open
- [ ] PM2 shows bridge as "online": `pm2 status`
- [ ] Health check works: `curl http://YOUR_VM_IP:3001/health`
- [ ] QR code displays: open `http://YOUR_VM_IP:3001/api/qr-image`
- [ ] WhatsApp connected after scanning QR
- [ ] Frontend can connect to bridge
- [ ] Test message sends successfully
- [ ] Incoming messages appear in LiveChats

---

## 🎉 Done!

Your Shepherd AI bridge is now running 24/7 on Oracle Cloud!

No more keeping your laptop on. The bridge will:
- ✅ Stay connected to WhatsApp
- ✅ Auto-restart if it crashes
- ✅ Auto-start on VM reboot
- ✅ Poll and deliver messages 24/7
- ✅ Handle media files
- ✅ Manage groups

**Cost: FREE** (Oracle Cloud Always Free Tier)
