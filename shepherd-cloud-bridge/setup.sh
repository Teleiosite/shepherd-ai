#!/bin/bash
# ===========================================
# Shepherd AI Oracle Cloud Bridge Setup Script
# Baileys Edition - NO CHROMIUM REQUIRED!
# Works on Oracle Linux 9 / Ubuntu / RHEL
# ===========================================

set -e

echo "🐑 Shepherd AI Oracle Cloud Bridge Setup (Baileys)"
echo "==================================================="
echo "🧠 No Chromium required - Pure WebSocket connection!"
echo ""

# Detect OS
if [ -f /etc/oracle-release ] || [ -f /etc/redhat-release ]; then
  PKG_MANAGER="dnf"
  echo "🐧 Detected: Oracle Linux / RHEL"
elif [ -f /etc/lsb-release ]; then
  PKG_MANAGER="apt"
  echo "🐧 Detected: Ubuntu/Debian"
else
  PKG_MANAGER="dnf"
  echo "🐧 Unknown OS, defaulting to dnf"
fi

# 1. Add swap if RAM < 1GB (important for E2.1.Micro)
echo "📦 Step 1: Checking memory..."
TOTAL_MEM_MB=$(free -m | awk '/^Mem:/{print $2}')
echo "   Total RAM: ${TOTAL_MEM_MB}MB"

if [ "$TOTAL_MEM_MB" -lt 1024 ] && [ ! -f /swapfile ]; then
  echo "   Adding 2GB swap space (free, uses disk)..."
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
  echo "   ✅ Swap added!"
else
  echo "   ✅ Memory OK (or swap already exists)"
fi

# 2. Install Node.js 20 LTS via nvm (lighter than rpm/deb repos)
echo "📦 Step 2: Installing Node.js 20 via nvm..."
if command -v node &> /dev/null; then
  echo "   ✅ Node.js $(node --version) already installed"
else
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
  nvm install 20
  echo "   ✅ Node.js $(node --version) installed"
fi

# Source nvm for the rest of the script
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# 3. Setup bridge directory
echo "📦 Step 3: Setting up bridge..."
BRIDGE_DIR="$HOME/shepherd-bridge"
mkdir -p "$BRIDGE_DIR"
cd "$BRIDGE_DIR"

# Copy files if not already there
if [ ! -f package.json ]; then
  echo "   ⚠️  Bridge files not found. Please copy index.js, package.json, and .env.example here."
  echo "   Use: scp -r your-files opc@YOUR_IP:~/shepherd-bridge/"
  exit 1
fi

# 4. Install npm dependencies
echo "📦 Step 4: Installing npm dependencies..."
NODE_OPTIONS='--max-old-space-size=256' npm install --production 2>&1 | tail -5
echo "   ✅ Dependencies installed"

# 5. Create .env if not exists
echo "📦 Step 5: Setting up environment..."
if [ ! -f .env ]; then
  cp .env.example .env 2>/dev/null || cat > .env << 'EOF'
BACKEND_URL=https://shepherd-ai-backend.onrender.com
CONNECTION_CODE=1DCFEA1A
PORT=3001
WS_PORT=3002
NODE_ENV=production
EOF
  echo "   ✅ .env created (edit with: nano ~/shepherd-bridge/.env)"
else
  echo "   ✅ .env already exists"
fi

# 6. Open firewall ports (Oracle Linux)
echo "📦 Step 6: Configuring firewall..."
if [ "$PKG_MANAGER" = "dnf" ]; then
  if command -v firewall-cmd &> /dev/null; then
    sudo firewall-cmd --permanent --add-port=3001/tcp 2>/dev/null || true
    sudo firewall-cmd --permanent --add-port=3002/tcp 2>/dev/null || true
    sudo firewall-cmd --reload 2>/dev/null || true
    echo "   ✅ Firewall ports 3001, 3002 opened (firewalld)"
  fi
else
  sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 3001 -j ACCEPT 2>/dev/null || true
  sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 3002 -j ACCEPT 2>/dev/null || true
  sudo netfilter-persistent save 2>/dev/null || true
  echo "   ✅ Firewall ports 3001, 3002 opened (iptables)"
fi

# 7. Create systemd service (auto-restart, auto-start on boot)
echo "📦 Step 7: Setting up auto-start service..."
NODE_PATH=$(which node)

sudo tee /etc/systemd/system/shepherd-bridge.service > /dev/null << EOF
[Unit]
Description=Shepherd AI WhatsApp Bridge (Baileys)
After=network.target

[Service]
Type=simple
User=$(whoami)
WorkingDirectory=$BRIDGE_DIR
ExecStart=$NODE_PATH $BRIDGE_DIR/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PATH=$NVM_DIR/versions/node/$(node --version)/bin:/usr/local/bin:/usr/bin

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable shepherd-bridge
echo "   ✅ Systemd service created and enabled"

# Done!
echo ""
echo "==================================================="
echo "🎉 Setup Complete!"
echo "==================================================="
echo ""
echo "📝 Next steps:"
echo "   1. Edit .env:  nano ~/shepherd-bridge/.env"
echo "      - Set CONNECTION_CODE and BACKEND_URL"
echo "   2. Start bridge: sudo systemctl start shepherd-bridge"
echo "   3. Check logs:   journalctl -u shepherd-bridge -f"
echo "   4. Scan QR:      http://YOUR_VM_IP:3001/api/qr-image"
echo ""
echo "📋 Useful commands:"
echo "   sudo systemctl status shepherd-bridge  (check status)"
echo "   sudo systemctl restart shepherd-bridge  (restart)"
echo "   sudo systemctl stop shepherd-bridge     (stop)"
echo "   journalctl -u shepherd-bridge -f        (live logs)"
echo ""
echo "🧠 Memory: No Chromium = ~200MB RAM usage (vs 500MB+ before)"
echo "==================================================="
