# 🚀 shepherd AI - Render Deployment Guide

## Step 1: Create Render Account

1. Go to [render.com](https://render.com)
2. Click **"Get Started"**
3. Sign up with GitHub (easiest option)
4. Authorize Render to access your repositories

---

## Step 2: Create PostgreSQL Database

1. From Render Dashboard, click **"New +"** → **"PostgreSQL"**
2. Configure database:
   - **Name:** `shepherd-ai-db`
   - **Database:** `shepherd_ai`
   - **User:** `shepherd_ai_user`
   - **Region:** Oregon (or closest to you)
   - **Plan:** Free
3. Click **"Create Database"**
4. Wait 2-3 minutes for database to provision
5. **Save the Internal Database URL** - you'll need it!

---

## Step 3: Deploy Backend Service

### Option A: Using Blueprint (Recommended)

1. Click **"New +"** → **"Blueprint"**
2. Select your **shepherd-ai** repository
3. Click **"Connect"**
4. Render will detect `render.yaml` and auto-configure
5. Review the configuration
6. Click **"Apply"**
7. Wait 5-10 minutes for initial deployment

### Option B: Manual Setup

1. Click **"New +"** → **"Web Service"**
2. Select your **shepherd-ai** repository
3. Configure:
   - **Name:** `shepherd-ai-backend`
   - **Region:** Oregon
   - **Branch:** `main`
   - **Root Directory:** (leave empty)
   - **Runtime:** Python 3
   - **Build Command:** `chmod +x build.sh && ./build.sh`
   - **Start Command:** `cd Agent\ File/backend && gunicorn app.main:app --workers 2 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT`
   - **Plan:** Free
4. Click **"Create Web Service"**

---

## Step 4: Configure Environment Variables

1. Go to your backend service dashboard
2. Click **"Environment"** tab
3. Add these variables:

```
DATABASE_URL = [paste your database Internal URL from Step 2]
SECRET_KEY = [generate a random 32+ character string]
GOOGLE_API_KEY = [your Gemini API key]
ENVIRONMENT = production
ALGORITHM = HS256
ACCESS_TOKEN_EXPIRE_MINUTES = 43200
```

4. Click **"Save Changes"**
5. Service will automatically redeploy

---

## Step 5: Initialize Database

Your database is created but empty. You need to run the schema:

1. Go to your **Database** dashboard
2. Click **"Connect"** → **"External Connection"**
3. Copy the **External Database URL**
4. On your local machine, run:

```bash
# Install PostgreSQL client (if not installed)
# Windows: Download from postgresql.org
# Mac: brew install postgresql

# Connect to Render database
psql [paste External Database URL]

# Paste the contents of Agent File/backend/schema.sql
# Then run it
```

Or use a GUI tool like:
- **pgAdmin** (Windows/Mac/Linux)
- **TablePlus** (Mac)
- **DBeaver** (All platforms)

---

## Step 6: Get Your Backend URL

1. Go to your backend service dashboard
2. At the top, you'll see: `https://shepherd-ai-backend-xxxx.onrender.com`
3. **Copy this URL** - you'll need it for Vercel!
4. Test it: `https://your-url.onrender.com/health`
   - Should return: `{"status": "healthy"}`

---

## Step 7: Update Vercel Frontend

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your **shepherd-ai** project
3. Go to **Settings** → **Environment Variables**
4. Update or add:

```
VITE_API_URL = https://your-render-url.onrender.com
```

5. Click **"Save"**
6. Go to **Deployments** → **Redeploy** latest deployment

---

## Step 8: Test Everything!

1. Visit your Vercel app: `https://your-app.vercel.app`
2. Try to **Sign Up** with a new account
3. Try to **Log In**
4. Create a new contact
5. Generate an AI message

If everything works: **🎉 You're LIVE!**

---

## Troubleshooting

### Backend won't start

**Check logs:**
1. Go to backend service dashboard
2. Click **"Logs"** tab  
3. Look for error messages

**Common issues:**
- Missing environment variables
- Database not connected
- Build script failed

### Database connection errors

**Verify DATABASE_URL:**
1. Ensure it's the **Internal Database URL** (not External)
2. Format: `postgres://user:pass@host/dbname`
3. Check database is running in Render dashboard

### Frontend can't reach backend

**Check CORS:**
1. Backend `main.py` should allow Vercel domain
2. Ensure VITE_API_URL is correct in Vercel
3. Try visiting backend `/health` endpoint directly

### Cold starts (app sleeping)

**This is normal on free tier:**
- First request after 15 min: 30-60 seconds
- Subsequent requests: instant
- Upgrade to paid plan ($7/month) for always-on

---

## Next Steps

### Monitor Your App

- **Render Dashboard** → View logs, metrics
- Set up **email alerts** for downtime
- Check **database usage** (free tier has limits)

### Prepare for Oracle Migration

When Oracle approves your account, see: `ORACLE_MIGRATION.md`

---

## Cost Summary

✅ **Free Tier Includes:**
- 750 hours/month web service
- PostgreSQL database (free for 90 days)
- Automatic SSL/HTTPS
- GitHub auto-deploy

⚠️ **After 90 Days:**  
- Database becomes $7/month
- OR migrate to Oracle Cloud (free tier)
- OR export data and use another free PostgreSQL

---

**🎊 Congratulations! You're now deployed on Render!**
