#!/usr/bin/env bash
set -e

echo "=========================================================="
echo " Shepherd AI Faster-Whisper Microservice Deploy Script"
echo "=========================================================="

INSTALL_DIR="/opt/shepherd-transcribe"
SERVICE_NAME="shepherd-transcribe"

echo "[1/5] Creating directory $INSTALL_DIR..."
sudo mkdir -p $INSTALL_DIR
sudo chown -R $USER:$USER $INSTALL_DIR

echo "[2/5] Copying service files..."
cp transcribe_service.py $INSTALL_DIR/
cp requirements.txt $INSTALL_DIR/

echo "[3/5] Setting up Python virtual environment..."
cd $INSTALL_DIR
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi

source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

echo "[4/5] Installing and configuring systemd service..."
sudo cp /opt/shepherd-transcribe/shepherd-transcribe.service /etc/systemd/system/ || true
if [ -f "$(dirname "$0")/shepherd-transcribe.service" ]; then
    sudo cp "$(dirname "$0")/shepherd-transcribe.service" /etc/systemd/system/
fi

sudo systemctl daemon-reload
sudo systemctl enable $SERVICE_NAME
sudo systemctl restart $SERVICE_NAME

echo "[5/5] Checking service status..."
sleep 3
sudo systemctl status $SERVICE_NAME --no-pager

echo ""
echo "=========================================================="
echo " Test with: curl http://127.0.0.1:8001/health"
echo "=========================================================="
