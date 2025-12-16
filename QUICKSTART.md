# 🚀 Quick Start Guide - Shepherd AI

**Complete setup in 15 minutes!**

---

## 📋 What You Need

Before starting, get these ready:

- ✅ **Supabase Account** - [Sign up free](https://supabase.com/)
- ✅ **Google Gemini API Key** - [Get free key](https://aistudio.google.com/app/apikey)
- ✅ **WhatsApp Number** - For testing (can be your personal number)
- ✅ **Node.js & Python** installed

---

## 🗄️ Step 1: Setup Database (5 minutes)

### **Create Supabase Project:**

1. Go to https://supabase.com/ → Sign in with GitHub
2. **New Project**
3. Fill in:
   - **Name:** shepherd-ai
   - **Database Password:** Choose strong password (SAVE THIS!)
   - **Region:** Choose closest to you
4. Click **Create new project**
5. ⏱️ Wait ~2 minutes for provisioning

### **Run Database Schema:**

1. Click **SQL Editor** in left sidebar
2. Click **New query**
3. Open this file on your computer: `Agent File/backend/schema.sql`
4. Copy ALL the content (Ctrl+A, Ctrl+C)
5. Paste into Supabase SQL editor
6. Click **Run** (or Ctrl+Enter)
7. ✅ Should see: "Success. No rows returned"

### **Get Your Connection String:**

1. Click **Project Settings** (gear icon) → **Database**
2. Scroll to **Connection string** → Choose **URI**
3. Copy the connection string
4. Replace `[YOUR-PASSWORD]` with your database password from step 3
5. ✅ SAVE THIS - you'll need it in Step 2

**Example:**
```
postgresql://postgres.abc123:YOUR_PASSWORD@aws-0-us-west-1.pooler.supabase.com:5432/postgres
```

---

## 🐍 Step 2: Setup Backend (5 minutes)

### **Install Dependencies:**

```bash
# Navigate to backend
cd "Agent File/backend"

# Create virtual environment
python -m venv venv

# Activate it
venv\Scripts\activate    # Windows
source venv/bin/activate # Mac/Linux

# Install packages
pip install -r requirements.txt
```

### **Create .env File:**

In `Agent File/backend/` folder, create a file named `.env` (no extension!)

**Windows:** Right-click → New → Text Document → Name it `.env` (delete .txt extension)

Paste this and **fill in your values**:

```env
# DATABASE (from Step 1)
DATABASE_URL=postgresql://postgres.abc123:YOUR_PASSWORD@aws-0-us-west-1.pooler.supabase.com:5432/postgres
SUPABASE_URL=https://abc123.supabase.co
SUPABASE_KEY=your_anon_public_key_here

# SECRET KEY (generate random 32 characters)
SECRET_KEY=put_any_random_32_character_string_here

# GEMINI API KEY (get from https://aistudio.google.com/app/apikey)
GEMINI_API_KEY=AIzaSy...your_key_here

# FIXED VALUES (don't change)
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
ENVIRONMENT=development
FRONTEND_URL=http://localhost:5173
WHATSAPP_API_URL=https://graph.facebook.com/v18.0
```

**Where to get values:**

- **DATABASE_URL**: From Step 1
- **SUPABASE_URL**: Your project URL (Project Settings → API → Project URL)
- **SUPABASE_KEY**: Project Settings → API → anon/public key
- **SECRET_KEY**: Any random 32 characters (smash keyboard!)
- **GEMINI_API_KEY**: https://aistudio.google.com/app/apikey → Create API Key

### **Start Backend:**

```bash
# Still in Agent File/backend with venv activated
uvicorn app.main:app --reload --port 8000
```

✅ **Success looks like:**
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete.
```

**Test it:** Open http://localhost:8000/health
- Should see: `{"status":"healthy"}`

**Leave this terminal running!** Open a new one for next steps.

---

## 📱 Step 3: Setup WhatsApp Bridge (3 minutes)

**New terminal:**

```bash
cd wppconnect-bridge
npm install
node bridge.js
```

**What happens:**
1. Chrome opens automatically
2. WhatsApp Web loads → Shows QR code
3. **Scan QR with your phone:**
   - Open WhatsApp on phone
   - Tap **⋮** (menu) → **Linked Devices**
   - **Link a Device**
   - Scan the QR code

✅ **Success looks like:**
```
✅ WPPConnect Bot connected!
🔓 Bridge Status: CONNECTED
```

**Leave this running!** Open another terminal for frontend.

---

## ⚛️ Step 4: Setup Frontend (2 minutes)

**New terminal:**

```bash
cd "Agent File"
npm install
npm run dev
```

✅ **Success looks like:**
```
VITE ready in 500 ms
➜  Local:   http://localhost:5173/
```

---

## 🎉 Step 5: First Login & Test

### **Create Your Account:**

1. Open http://localhost:5173 in browser
2. Click **"Create Account"**
3. Fill in:
   ```
   Name: Your Name
   Email: test@example.com
   Password: password123
   Church: My Church
   ```
4. Click **Register**
5. ✅ You're logged in!

### **Test the Platform:**

1. **Add a Contact:**
   - Click **Contacts** tab
   - Click **+ Add Contact**
   - Fill in details
   - Save

2. **Send WhatsApp Message:**
   - Click **Live Chats**
   - Select your contact
   - Type a message
   - Send

3. **Verify in Database:**
   - Go to Supabase → **Table Editor** → **messages**
   - ✅ Should see your message logged!

---

## ✅ Success Checklist

All three should be running simultaneously:

```
Terminal 1:  Backend  → http://localhost:8000
Terminal 2:  Bridge   → http://localhost:3001
Terminal 3:  Frontend → http://localhost:5173
```

---

## ❌ Troubleshooting

### **Backend won't start:**

**Error:** "No module named 'fastapi'"
```bash
# Make sure venv is activated (you should see (venv) in prompt)
venv\Scripts\activate
pip install -r requirements.txt
```

**Error:** "Connection to database failed"
```
# Check .env file:
1. DATABASE_URL has correct password
2. No spaces around = signs
3. File is named .env (not .env.txt)
```

### **Bridge won't connect:**

**Error:** "Failed to launch browser"
```bash
# Install Chrome if not installed
# Or set PUPPETEER_EXECUTABLE_PATH
```

**WhatsApp Web shows error:**
```bash
# Delete tokens and try again:
rm -rf tokens/  # Mac/Linux
rmdir /s tokens # Windows
node bridge.js
```

### **Frontend shows "Network Error":**

```bash
# Make sure backend is running:
curl http://localhost:8000/health

# Check browser console for errors
# Verify VITE_BACKEND_URL in .env.local
```

---

## 🎯 What's Running?

| Service | URL | Purpose |
|---------|-----|---------|
| **Frontend** | http://localhost:5173 | React UI |
| **Backend** | http://localhost:8000 | FastAPI server |
| **Backend Docs** | http://localhost:8000/api/docs | API documentation |
| **Bridge** | http://localhost:3001 | WhatsApp connector |

---

## 📚 Next Steps

Now that it's running:

1. **Explore the platform** - Try all features
2. **Add real contacts** - Import from Excel
3. **Upload knowledge base** - Add your church's materials
4. **Test automation** - Create a workflow
5. **Read docs** - See [CODEBASE_ANALYSIS.md](CODEBASE_ANALYSIS.md)

---

## 💡 Pro Tips

**Always start in this order:**
1. Backend (needs to be ready first)
2. Bridge (can take time to connect)
3. Frontend (last)

**To stop:**
- Press `Ctrl+C` in each terminal

**To restart:**
- Just run the start commands again
- No need to reinstall

**To reset everything:**
- Delete database tables in Supabase
- Re-run schema.sql
- Clear browser localStorage

---

## 📞 Need Help?

**Common Issues:**
- ✅ Port already in use → Close other apps using that port
- ✅ Module not found → Reinstall dependencies
- ✅ Database error → Check connection string
- ✅ WhatsApp won't connect → Try different browser

**Still stuck?**
- Check [GITHUB_UPLOAD_GUIDE.md](GITHUB_UPLOAD_GUIDE.md) troubleshooting section
- Review error messages carefully
- Google the specific error

---

**You did it! 🎉 You're running a full-stack SaaS platform!**

Time to add it to your LinkedIn: "Built and deployed production-grade multi-tenant SaaS platform" 💪
