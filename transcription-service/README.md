# Shepherd AI Faster-Whisper Microservice

Dedicated, self-hosted transcription microservice for Shepherd AI WhatsApp voice notes.

## Features
- **Direct OGG/Opus decoding**: Handles WhatsApp voice notes directly without any ffmpeg complexity.
- **Fast CPU execution**: Uses `faster-whisper` with `int8` quantization (takes ~1.5s to transcribe a 10s voice note on 2 OCPUs).
- **Secure**: API Key authentication via `X-Api-Key` header.
- **Isolated**: Runs on port `8001` with its own `systemd` unit so it doesn't conflict with existing services on the Oracle Cloud VM.

---

## 1. Quick Setup on Oracle Cloud VM

Log in to your Oracle Cloud VM via SSH:

```bash
# 1. Clone or copy this directory to the VM
git clone https://github.com/Teleiosite/shepherd-ai.git
cd shepherd-ai/transcription-service

# 2. Make the deploy script executable and run it
chmod +x deploy.sh
./deploy.sh
```

---

## 2. Testing the Service Locally on the VM

```bash
# Check health
curl http://127.0.0.1:8001/health

# Test transcription with an audio file
curl -X POST http://127.0.0.1:8001/transcribe \
  -H "X-Api-Key: 17f187c37b8164bc2f038779fa9ebe886ef771e3f721793e584bd816bf1a8ac5" \
  -F "file=@voice.ogg"
```

---

## 3. Nginx + SSL Setup (Let's Encrypt)

```bash
# 1. Copy nginx configuration
sudo cp nginx.conf /etc/nginx/sites-available/transcribe

# 2. Edit domain name in /etc/nginx/sites-available/transcribe
sudo nano /etc/nginx/sites-available/transcribe

# 3. Enable site and test
sudo ln -s /etc/nginx/sites-available/transcribe /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# 4. Generate SSL certificate with certbot
sudo certbot --nginx -d transcribe.yourdomain.com
```

---

## 4. Vercel Environment Variables

Set these environment variables in your Vercel Project Settings:

| Key | Value |
|---|---|
| `TRANSCRIBE_SERVICE_URL` | `https://transcribe.yourdomain.com/transcribe` (or `http://YOUR_VM_IP:8001/transcribe`) |
| `TRANSCRIBE_SERVICE_KEY` | `17f187c37b8164bc2f038779fa9ebe886ef771e3f721793e584bd816bf1a8ac5` |

---

## 5. Systemd Commands

```bash
# Check logs
sudo journalctl -u shepherd-transcribe -f

# Restart service
sudo systemctl restart shepherd-transcribe

# Stop service
sudo systemctl stop shepherd-transcribe
```
