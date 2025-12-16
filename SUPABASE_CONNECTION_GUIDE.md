# 🔗 Connecting Backend to Supabase - Step by Step

## 📋 **Prerequisites**

You need:
1. A Supabase account (free tier is fine)
2. The backend `.env` file configured
3. Database schema migrated

---

## 🚀 **Step 1: Create Supabase Project** (If you don't have one)

### 1.1 Go to Supabase
- Visit [supabase.com](https://supabase.com)
- Click "Start your project"
- Sign in with GitHub/Google

### 1.2 Create New Project
- Click "New Project"
- **Organization:** Select or create one
- **Project Name:** `shepherd-ai` (or any name)
- **Database Password:** **SAVE THIS!** You'll need it
- **Region:** Choose closest to you
- Click "Create new project"

⏱️ **Wait 2-3 minutes** for project to be ready

---

## 🔑 **Step 2: Get Connection Details**

### 2.1 Find Your Connection String

1. Click **"Settings"** (gear icon) in left sidebar
2. Click **"Database"**
3. Scroll to **"Connection string"**
4. Select **"URI"** tab
5. Copy the connection string (looks like):
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxx.supabase.co:5432/postgres
   ```

6. **IMPORTANT:** Replace `[YOUR-PASSWORD]` with the password you created in Step 1.2

### 2.2 Get API Keys

1. Click **"Settings"** → **"API"**
2. Copy these values:
   - **Project URL:** `https://xxxxx.supabase.co`
   - **anon public key:** Long key starting with `eyJ...`

---

## ⚙️ **Step 3: Configure Backend `.env` File**

### 3.1 Navigate to Backend Directory
```bash
cd "shepherd-ai (3)/backend"
```

### 3.2 Edit `.env` File

If `.env` doesn't exist, copy from `.env.example`:
```bash
copy .env.example .env  # Windows
# or
cp .env.example .env    # Linux/Mac
```

### 3.3 Update `.env` with Your Supabase Details

Open `.env` and update these lines:

```env
# Database - UPDATE THESE!
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.xxxxx.supabase.co:5432/postgres

# Authentication - GENERATE A SECRET KEY
SECRET_KEY=run_this_command_to_generate_one_openssl_rand_hex_32
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# AI - ADD YOUR GEMINI KEY
GEMINI_API_KEY=your-gemini-api-key-here
GOOGLE_EMBEDDING_API_KEY=same-as-above

# App
ENVIRONMENT=development
FRONTEND_URL=http://localhost:3000
```

### 3.4 Generate SECRET_KEY

Run this command to generate a secure secret key:

**Windows (PowerShell):**
```powershell
python -c "import secrets; print(secrets.token_hex(32))"
```

**Linux/Mac:**
```bash
openssl rand -hex 32
```

Copy the output and paste it as your `SECRET_KEY`

---

## 🗄️ **Step 4: Run Database Migration**

### 4.1 Go to Supabase SQL Editor

1. In your Supabase project dashboard
2. Click **"SQL Editor"** in left sidebar
3. Click **"New query"**

### 4.2 Copy Migration SQL

1. Open `backend/migrations/001_add_whatsapp_features.sql`
2. **Copy ALL the content**
3. **Paste into Supabase SQL Editor**
4. Click **"Run"** or press `Ctrl+Enter`

### 4.3 Verify Success

You should see output like:
```
Success. No rows returned (expected)
Success. No rows returned (expected)
Success. No rows returned (expected)
Success. No rows returned (expected)
```

Then scroll down to see verification:
```
✅ contacts.whatsapp_id added
✅ messages.attachment_name added
✅ ai_configs table created
✅ campaign_templates table created
```

---

## ✅ **Step 5: Test Database Connection**

### 5.1 Navigate to Backend
```bash
cd "shepherd-ai (3)/backend"
```

### 5.2 Activate Virtual Environment
```bash
# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

### 5.3 Test Connection

Create a test script `test_db.py`:

```python
from app.database import engine
from sqlalchemy import text

try:
    with engine.connect() as conn:
        result = conn.execute(text("SELECT 1"))
        print("✅ Database connection successful!")
        print("Testing tables...")
        
        # Test if our new columns exist
        result = conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'contacts' 
            AND column_name = 'whatsapp_id'
        """))
        
        if result.fetchone():
            print("✅ whatsapp_id column exists!")
        else:
            print("❌ whatsapp_id column missing - run migration!")
            
except Exception as e:
    print(f"❌ Connection failed: {str(e)}")
    print("\nCheck your .env file DATABASE_URL")
```

Run it:
```bash
python test_db.py
```

**Expected Output:**
```
✅ Database connection successful!
Testing tables...
✅ whatsapp_id column exists!
```

---

## 🚀 **Step 6: Start Backend Server**

### 6.1 Start Server
```bash
python -m uvicorn app.main:app --reload --port 8000
```

### 6.2 Expected Output
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Started reloader process
INFO:     Application startup complete.
```

### 6.3 Test Endpoints

**In a new terminal:**
```bash
# Test health
curl http://localhost:8000/health
# Expected: {"status":"healthy"}

# Test API docs
# Open in browser: http://localhost:8000/api/docs
```

---

## 🔍 **Troubleshooting**

### ❌ **Error: "could not connect to server"**
**Solution:**
- Check your `DATABASE_URL` in `.env`
- Make sure password is correct (no special characters causing issues)
- Verify Supabase project is active

### ❌ **Error: "password authentication failed"**
**Solution:**
- Double-check the password in `DATABASE_URL`
- In Supabase Settings → Database → Reset Database Password
- Update `.env` with new password

### ❌ **Error: "SSL connection required"**
**Solution:**
Add `?sslmode=require` to your DATABASE_URL:
```
DATABASE_URL=postgresql://postgres:password@db.xxx.supabase.co:5432/postgres?sslmode=require
```

### ❌ **Error: "relation does not exist"**
**Solution:**
- You didn't run the migration SQL
- Go back to Step 4 and run `001_add_whatsapp_features.sql` in Supabase

---

## 📊 **Verify Everything Works**

### Test 1: Check Tables Exist
In Supabase:
1. Click **"Table Editor"**
2. You should see:
   - contacts (with `whatsapp_id` column)
   - messages (with `attachment_name` column)
   - users
   - organizations
   - ai_configs ← NEW
   - campaign_templates ← NEW
   - knowledge_resources
   - categories
   - workflow_steps

### Test 2: Check API Works
```bash
# Register a user
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "full_name": "Test User"
  }'

# Should return: {"access_token": "...", "token_type": "bearer"}
```

### Test 3: Check WhatsApp Proxy
```bash
curl http://localhost:8000/api/whatsapp/status

# Should return: {"status": "connected"} (if bridge is running)
```

---

## ✅ **Success Checklist**

- [ ] Supabase project created
- [ ] `.env` file configured with:
  - [ ] `DATABASE_URL`
  - [ ] `SUPABASE_URL`
  - [ ] `SUPABASE_KEY`
  - [ ] `SECRET_KEY` (generated)
  - [ ] `GEMINI_API_KEY`
- [ ] Migration SQL run in Supabase
- [ ] Database connection test passes
- [ ] Backend server starts without errors
- [ ] Health endpoint returns success
- [ ] API docs accessible at `/api/docs`

---

## 📝 **Quick Reference**

### Your Connection String Format:
```
postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

**Example:**
```
postgresql://postgres:MySecretPass123@db.abcdefghijklmno.supabase.co:5432/postgres
```

### Common Commands:
```bash
# Start backend
cd "shepherd-ai (3)/backend"
venv\Scripts\activate
python -m uvicorn app.main:app --reload --port 8000

# Test connection
curl http://localhost:8000/health

# View API docs
# Open browser: http://localhost:8000/api/docs
```

---

## 🎯 **Next Steps**

Once connected:
1. ✅ Backend running on port 8000
2. ✅ Data saving to Supabase
3. ⏭️ Update frontend to use backend API
4. ⏭️ Test full flow: Frontend → Backend → Database → WhatsApp

---

**Need help with any step? Let me know which part you're stuck on!**
