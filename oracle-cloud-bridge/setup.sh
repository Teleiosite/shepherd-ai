#!/bin/bash
# ===========================================
# Shepherd AI Oracle Cloud Bridge Setup Script
# Run this on your Oracle Cloud VM (Ubuntu)
# ===========================================

set -e

echo "🐑 Shepherd AI Oracle Cloud Bridge Setup"
echo "========================================="
echo ""

# 1. Update system
echo "📦 Step 1: Updating system packages..."
sudo apt update && sudo apt upgrade -y

# 2. Install Node.js 20 LTS
echo "📦 Step 2: Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
echo "✅ Node.js $(node --version) installed"

# 3. Install Chromium and dependencies (required for WPPConnect/Puppeteer)
echo "📦 Step 3: Installing Chromium and dependencies..."
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
  ca-certificates

# Find chromium path
CHROMIUM_PATH=$(which chromium-browser || which chromium || echo "/usr/bin/chromium-browser")
echo "✅ Chromium found at: $CHROMIUM_PATH"

# 4. Install PM2 (process manager to keep bridge running)
echo "📦 Step 4: Installing PM2..."
sudo npm install -g pm2
echo "✅ PM2 installed"

# 5. Create bridge directory
echo "📁 Step 5: Setting up bridge directory..."
BRIDGE_DIR="$HOME/shepherd-bridge"
mkdir -p "$BRIDGE_DIR"

# 6. Copy files (if running from repo)
if [ -f "package.json" ]; then
  echo "📋 Copying bridge files..."
  cp package.json index.js .env.example "$BRIDGE_DIR/"
fi

cd "$BRIDGE_DIR"

# 7. Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
  echo "📝 Creating .env file..."
  cp .env.example .env
  
  # Auto-set Chrome path
  sed -i "s|# CHROME_PATH=.*|CHROME_PATH=$CHROMIUM_PATH|" .env
  
  echo "⚠️  IMPORTANT: Edit .env to set your CONNECTION_CODE and BACKEND_URL"
  echo "    nano $BRIDGE_DIR/.env"
fi

# 8. Install dependencies
echo "📦 Step 6: Installing Node.js dependencies..."
npm install --production
echo "✅ Dependencies installed"

# 9. Set environment variable for Puppeteer
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
export PUPPETEER_EXECUTABLE_PATH=$CHROMIUM_PATH

# 10. Setup PM2 to auto-start on boot
echo "🔧 Step 7: Configuring PM2 auto-start..."
pm2 start index.js --name "shepherd-bridge" --env production
pm2 save
pm2 startup | tail -1 | bash 2>/dev/null || true

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
echo ""
echo "2. Open Oracle Cloud firewall ports:"
echo "   - Port 3001 (REST API)"
echo "   - Port 3002 (WebSocket)"
echo ""
echo "3. Scan QR code:"
echo "   Open in browser: http://YOUR_VM_IP:3001/api/qr-image"
echo "   Or check logs: pm2 logs shepherd-bridge"
echo ""
echo "4. After scanning, update your frontend's bridge URL"
echo "   to point to this Oracle Cloud VM IP"
echo ""
echo "📋 Useful commands:"
echo "   pm2 status          - Check bridge status"
echo "   pm2 logs            - View live logs"
echo "   pm2 restart all     - Restart bridge"
echo "   pm2 stop all        - Stop bridge"
echo ""
