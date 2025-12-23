# 🔄 Migrating from Render to Oracle Cloud

## When to Migrate

Migrate to Oracle Cloud when:
- ✅ Oracle account is approved
- ✅ You hit Render's 90-day free database limit
- ✅ You want always-on (no cold starts)
- ✅ You need more resources

---

## Pre-Migration Checklist

- [ ] Oracle Cloud account approved
- [ ] Oracle Compute instance created
- [ ] Oracle Database provisioned
- [ ] Database export from Render completed
- [ ] DNS/domain ready (if using custom domain)

---

## Step 1: Export Database from Render

### Using the Export Script

```bash
# On your local machine
cd "Agent File/backend"
python database_export.py
```

This creates: `shepherd_ai_backup_YYYYMMDD.sql`

### Manual Export (Alternative)

```bash
# Get External Database URL from Render dashboard
pg_dump [External Database URL] > backup.sql
```

---

## Step 2: Set Up Oracle Cloud

### 2.1 Create Compute Instance

1. Log in to Oracle Cloud Console
2. **Compute** → **Instances** → **Create Instance**
3. Configure:
   - **Name:** shepherd-ai-server
   - **Image:** Ubuntu 22.04
   - **Shape:** VM.Standard.E2.1.Micro (Always Free)
   - **Add SSH Key:** Upload your public key
4. Click **Create**
5. Note the **Public IP Address**

### 2.2 Create Database

**Option A: Autonomous Database (Recommended)**
1. **Oracle Database** → **Autonomous Database** → **Create**
2. Configure:
   - **Name:** ShepherdAI
   - **Workload:** Transaction Processing
   - **Deployment:** Serverless
   - **Version:** 19c
   - **OCPU:** 1 (Always Free)
   - **Storage:** 20GB (Always Free)
3. Set **Admin password**
4. Click **Create**

**Option B: Install PostgreSQL on Compute**
```bash
ssh ubuntu@[your-oracle-ip]
sudo apt update
sudo apt install postgresql postgresql-contrib -y
```

---

## Step 3: Deploy Backend to Oracle

### 3.1 SSH into Instance

```bash
ssh ubuntu@[your-oracle-ip]
```

### 3.2 Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Python 3.11
sudo apt install python3.11 python3.11-venv python3-pip git -y

# Install PostgreSQL client
sudo apt install postgresql-client -y

# Install Nginx (reverse proxy)
sudo apt install nginx -y
```

### 3.3 Clone Repository

```bash
cd /home/ubuntu
git clone https://github.com/Teleiosite/shepherd-ai.git
cd shepherd-ai/Agent\ File/backend
```

### 3.4 Set Up Python Environment

```bash
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 3.5 Configure Environment

```bash
nano .env
```

Paste:
```
DATABASE_URL=postgresql://user:pass@localhost/shepherd_ai
SECRET_KEY=[generate new one]
GOOGLE_API_KEY=[your key]
ENVIRONMENT=production
```

Save and exit (`Ctrl+X`, `Y`, `Enter`)

---

## Step 4: Import Database

### If using Autonomous Database

1. Download Oracle Cloud Connection Wallet
2. Use SQL Developer or SQL*Plus
3. Run: `@shepherd_ai_backup_YYYYMMDD.sql`

### If using PostgreSQL on Compute

```bash
# Create database
sudo -u postgres createdb shepherd_ai
sudo -u postgres createuser shepherd_ai_user

# Import backup
psql -U postgres shepherd_ai < /path/to/backup.sql
```

---

## Step 5: Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/shepherd-ai
```

Paste:
```nginx
server {
    listen 80;
    server_name [your-oracle-ip or domain];

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/shepherd-ai /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## Step 6: Set Up SystemD Service

Create service file:
```bash
sudo nano /etc/systemd/system/shepherd-ai.service
```

Paste:
```ini
[Unit]
Description=Shepherd AI Backend
After=network.target

[Service]
Type=notify
User=ubuntu
WorkingDirectory=/home/ubuntu/shepherd-ai/Agent File/backend
Environment="PATH=/home/ubuntu/shepherd-ai/Agent File/backend/venv/bin"
ExecStart=/home/ubuntu/shepherd-ai/Agent File/backend/venv/bin/gunicorn app.main:app --workers 2 --worker-class uvicorn.workers.UvicornWorker --bind 127.0.0.1:8000

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable shepherd-ai
sudo systemctl start shepherd-ai
sudo systemctl status shepherd-ai
```

---

## Step 7: Update Frontend (Vercel)

1. Go to Vercel Dashboard
2. **Settings** → **Environment Variables**
3. Update:
   ```
   VITE_API_URL = http://[oracle-ip]
   # or https://yourdomain.com if using domain
   ```
4. **Redeploy** latest deployment

---

## Step 8: SSL Certificate (Optional but Recommended)

If using a domain:

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get certificate
sudo certbot --nginx -d yourdomain.com

# Auto-renew
sudo certbot renew --dry-run
```

---

## Step 9: Verify Migration

1. Visit your Oracle backend: `http://[oracle-ip]/health`
2. Test Vercel frontend: Create account, log in
3. Verify all features work
4. Check database has all data

---

## Step 10: Decommission Render

Once everything works on Oracle:

1. **Export one final backup** from Render
2. **Download logs** if needed
3. **Delete services** on Render:
   - Database
   - Web service
4. **Keep free Render account** for future projects

---

## Rollback Plan

If something goes wrong:

1. **Keep Render running** during migration
2. In Vercel, switch VITE_API_URL back to Render
3. Debug Oracle setup
4. Try migration again when ready

---

## Cost Comparison

| Service | Render Free | Oracle Free |
|---------|-------------|-------------|
| **Compute** | 750 hrs/month | Always free |
| **Database** | 90 days free | Always free |
| **Cold Starts** | Yes (15 min) | No |
| **Storage** | Limited | 20GB |
| **Bandwidth** | 100GB/month | 10TB/month |

---

**🎉 Congratulations on migrating to Oracle Cloud!**
