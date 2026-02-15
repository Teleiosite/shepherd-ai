#!/bin/bash
# ===========================================
# Shepherd AI Oracle Cloud Bridge Setup Script
# Run this on your Oracle Cloud VM (Oracle Linux 9)
# ===========================================

set -e

echo "🐑 Shepherd AI Oracle Cloud Bridge Setup"
echo "========================================="
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

# 1. Update system
echo "📦 Step 1: Updating system packages..."
if [ "$PKG_MANAGER" = "dnf" ]; then
  sudo dnf update -y
else
  sudo apt update && sudo apt upgrade -y
fi

# 2. Install Node.js 20 LTS
echo "📦 Step 2: Installing Node.js 20..."
if [ "$PKG_MANAGER" = "dnf" ]; then
  # Install Node.js via NodeSource for Oracle Linux
  curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
  sudo dnf install -y nodejs
else
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt install -y nodejs
fi
echo "✅ Node.js $(node --version) installed"

# 3. Install Chromium and dependencies (required for WPPConnect/Puppeteer)
echo "📦 Step 3: Installing Chromium and dependencies..."
if [ "$PKG_MANAGER" = "dnf" ]; then
  # Enable EPEL for Chromium on Oracle Linux
  sudo dnf install -y oracle-epel-release-el9 || sudo dnf install -y epel-release || true
  sudo dnf install -y \
    chromium \
    liberation-fonts \
    libdrm \
    mesa-libgbm \
    alsa-lib \
    atk \
    at-spi2-atk \
    cups-libs \
    gtk3 \
    nspr \
    nss \
    libXcomposite \
    libXdamage \
    libXrandr \
    xdg-utils \
    wget \
    ca-certificates \
    git
else
  sudo apt install -y \
    chromium-browser \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    wget \
    ca-certificates \
    git
fi

# Find chromium path
CHROMIUM_PATH=$(which chromium-browser 2>/dev/null || which chromium 2>/dev/null || echo "/usr/bin/chromium-browser")
echo "✅ Chromium found at: $CHROMIUM_PATH"

# 4. Install PM2 (process manager to keep bridge running)
echo "📦 Step 4: Installing PM2..."
sudo npm install -g pm2
echo "✅ PM2 installed"

# 5. Open firewall ports (Oracle Linux uses firewalld)
echo "🔧 Step 5: Opening firewall ports..."
if command -v firewall-cmd &> /dev/null; then
  sudo firewall-cmd --permanent --add-port=3001/tcp
  sudo firewall-cmd --permanent --add-port=3002/tcp
  sudo firewall-cmd --reload
  echo "✅ Firewall ports 3001 & 3002 opened"
else
  echo "⚠️  No firewalld found, skipping OS firewall config"
fi

# 6. Create bridge directory
echo "📁 Step 6: Setting up bridge directory..."
BRIDGE_DIR="$HOME/shepherd-bridge"
mkdir -p "$BRIDGE_DIR"

# 7. Copy files (if running from repo)
if [ -f "package.json" ]; then
  echo "📋 Copying bridge files..."
  cp package.json index.js .env.example "$BRIDGE_DIR/"
fi

cd "$BRIDGE_DIR"

# 8. Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
  echo "📝 Creating .env file..."
  cp .env.example .env
  
  # Auto-set Chrome path
  sed -i "s|# CHROME_PATH=.*|CHROME_PATH=$CHROMIUM_PATH|" .env
  
  echo "⚠️  IMPORTANT: Edit .env to set your CONNECTION_CODE and BACKEND_URL"
  echo "    nano $BRIDGE_DIR/.env"
fi

# 9. Install dependencies
echo "📦 Step 7: Installing Node.js dependencies..."
npm install --production
echo "✅ Dependencies installed"

# 10. Set environment variable for Puppeteer
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
export PUPPETEER_EXECUTABLE_PATH=$CHROMIUM_PATH

# 11. Setup PM2 to auto-start on boot
echo "🔧 Step 8: Configuring PM2 auto-start..."
pm2 start index.js --name "shepherd-bridge" --env production
pm2 save
sudo env PATH=$PATH:$(which node | xargs dirname) $(which pm2) startup systemd -u $USER --hp $HOME 2>/dev/null || pm2 startup | tail -1 | bash 2>/dev/null || true

echo ""
echo "========================================="
echo "✅ Setup Complete!"
echo "========================================="
echo ""
echo "📡 Bridge running on port 3001"
echo "🔌 WebSocket on port 3002"  
echo ""
echo "📌 IMPORTANT NEXT STEPS:"
echo ""
echo "1. Edit your .env file:"
echo "   nano $BRIDGE_DIR/.env"
echo "   Set: CONNECTION_CODE=your-code-here"
echo ""
echo "2. Open Oracle Cloud Security List ports:"
echo "   Go to: Networking → Virtual Cloud Networks → your VCN"
echo "   → Security Lists → Default → Add Ingress Rules"
echo "   - Port 3001 (REST API)  - Source: 0.0.0.0/0, TCP"
echo "   - Port 3002 (WebSocket) - Source: 0.0.0.0/0, TCP"
echo ""
echo "3. Restart bridge after editing .env:"
echo "   pm2 restart shepherd-bridge"
echo ""
echo "4. Scan QR code:"
echo "   Open in browser: http://YOUR_VM_IP:3001/api/qr-image"
echo "   Or check logs: pm2 logs shepherd-bridge"
echo ""
echo "5. After scanning, update your frontend's bridge URL"
echo "   to point to this Oracle Cloud VM IP"
echo ""
echo "📋 Useful commands:"
echo "   pm2 status          - Check bridge status"
echo "   pm2 logs            - View live logs"
echo "   pm2 restart all     - Restart bridge"
echo "   pm2 stop all        - Stop bridge"
echo ""
echo "🔑 SSH user for Oracle Linux: opc"
echo "   ssh -i your-key.key opc@YOUR_VM_IP"
echo ""
