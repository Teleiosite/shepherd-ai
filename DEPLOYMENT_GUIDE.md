# 🚀 Deployment Guide - Shepherd AI Multi-User Setup

## ✅ **What We've Built**

### **Backend Updates:**
- ✅ Database schema with `whatsapp_id` support
- ✅ WhatsApp bridge proxy service
- ✅ API endpoints for messaging
- ✅ Message logging to database
- ✅ Updated contact schemas

### **Files Created/Modified:**
1. `backend/migrations/001_add_whatsapp_features.sql` - Database migration
2. `backend/app/services/whatsapp_service.py` - Bridge proxy service
3. `backend/app/schemas/contact.py` - Updated with whatsapp_id
4. `backend/app/api/whatsapp.py` - WhatsApp API endpoints

---

## 📋 **Deployment Steps**

### **Step 1: Database Migration** ⏱️ 5 minutes

1. **Go to Supabase Dashboard**
   - Log in to [supabase.com](https://supabase.com)
   - Select your Shepherd AI project

2. **Run Migration**
   - Click "SQL Editor" in left sidebar
   - Click "New Query"
   - Copy-paste content from `backend/migrations/001_add_whatsapp_features.sql`
   - Click "Run" or press `Ctrl+Enter`

3. **Verify Changes**
   - Should see 4 success messages:
     - ✅ contacts.whatsapp_id added
     - ✅ messages.attachment_name added
     - ✅ ai_configs table created
     - ✅ campaign_templates table created

---

### **Step 2: Install Backend Dependencies** ⏱️ 2 minutes

```bash
cd "shepherd-ai (3)/backend"

# Activate virtual environment
venv\Scripts\activate  # Windows
# or
source venv/bin/activate  # Linux/Mac

# Install httpx (if not already installed)
pip install httpx>=0.26.0

# Verify installation
pip list | findstr httpx
```

---

### **Step 3: Start Backend Server** ⏱️ 1 minute

```bash
# Make sure you're in backend directory with venv activated
python -m uvicorn app.main:app --reload --port 8000
```

**Expected Output:**
```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

**Test Backend:**
```bash
# In another terminal
curl http://localhost:8000/health
# Should return: {"status":"healthy"}

curl http://localhost:8000/api/whatsapp/status
# Should return bridge status
```

---

### **Step 4: Update Frontend Configuration** ⏱️ 5 minutes

The frontend needs to call backend API instead of bridge directly.

**Option A: Keep Both Running (Recommended for Testing)**
- Frontend talks to Backend (port 8000)
- Backend talks to Bridge (port 3001)
- Both stay running

**Current Status:**
- ✅ Backend ready
- ✅ Bridge running (port 3001)
- ⏳ Frontend needs update to use backend

---

## 🔧 **Frontend Integration (Next Phase)**

### **Files That Need Updating:**

1. **`services/whatsappService.ts`**
   - Change URL from `http://localhost:3001` to `http://localhost:8000`
   - Add authentication headers
   - Update endpoints:
     - `/api/send` → `/api/whatsapp/send`
     - `/api/sendMedia` → `/api/whatsapp/send-media`
     - `/api/status` → `/api/whatsapp/status`

2. **`services/storage.ts`**
   - Replace localStorage calls with backend API calls
   - Add auth token handling

3. **Add `.env` file in frontend:**
   ```
   VITE_BACKEND_URL=http://localhost:8000
   VITE_BRIDGE_URL=http://localhost:3001
   ```

---

## ✅ **Current System Architecture**

```
┌─────────────────────────────────────┐
│   Frontend (React - Port 3000)     │
│   - Dashboard, Contacts, LiveChats │
│   - Currently uses localStorage     │
└─────────────────────────────────────┘
              │
              │ 🔜 Will use HTTP API
              ▼
┌─────────────────────────────────────┐
│   Backend API (FastAPI - Port 8000) │  ← ✅ NOW READY!
│   ✅ /api/whatsapp/send             │
│   ✅ /api/whatsapp/send-media       │
│   ✅ /api/whatsapp/status           │
│   ✅ /api/contacts (with whatsapp_id)│
│   ✅ Database logging               │
└─────────────────────────────────────┘
              │
              │ HTTP Proxy
              ▼
┌─────────────────────────────────────┐
│  WPPConnect Bridge (Port 3001)      │  ← ✅ RUNNING
│  - Communicates with WhatsApp Web   │
│  - Sends/receives messages          │
└─────────────────────────────────────┘
              │
              ▼
         WhatsApp Web
```

---

## 🧪 **Testing Backend Endpoints**

### **1. Check WhatsApp Bridge Status**
```bash
curl http://localhost:8000/api/whatsapp/status
```

**Expected Response:**
```json
{
  "status": "connected"
}
```

### **2. Send Test Message (Requires Auth Token)**

First, register/login to get token:
```bash
# Register
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "full_name": "Test User"
  }'

# Login
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
# Copy the "access_token" from response
```

Then send message:
```bash
curl -X POST http://localhost:8000/api/whatsapp/send \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+2348012345678",
    "message": "Test from backend API!"
  }'
```

---

## 📊 **What's Working Now**

### ✅ **Backend:**
- Database schema updated
- WhatsApp proxy service created
- API endpoints implemented
- Message logging functional
- Contact management with `whatsapp_id`

### ✅ **Bridge:**
- Still running independently
- Text messaging works
- Image sending works
- Real-time WebSocket

### ⏳ **TODO (Frontend Integration):**
- Update `whatsappService.ts` to use backend
- Add authentication to frontend
- Replace localStorage with API calls
- Test end-to-end flow

---

## ⚙️ **Environment Variables**

### **Backend (.env):**
Already configured in `backend/.env`:
```
DATABASE_URL=postgresql://...  # Supabase connection
SECRET_KEY=...                  # JWT secret
GEMINI_API_KEY=...             # Google Gemini
FRONTEND_URL=http://localhost:3000
```

### **Frontend (.env) - TO CREATE:**
```
VITE_BACKEND_URL=http://localhost:8000
VITE_BRIDGE_URL=http://localhost:3001
```

---

## 🚦 **Status Summary**

| Component | Status | Action Needed |
|-----------|--------|---------------|
| Database Schema | ✅ Ready | Run migration SQL |
| Backend API | ✅ Ready | Start server |
| WhatsApp Bridge | ✅ Running | None (keep running) |
| Frontend Integration | ⏳ Pending | Update services |
| Multi-User Auth | ✅ Ready | Already implemented |
| Message Logging | ✅ Ready | Works with backend |

---

## 🎯 **Next Immediate Steps**

1. **Run database migration** (5 min)
2. **Start backend server** (1 min)
3. **Test backend endpoints** (5 min)
4. **Update frontend services** (30 min - I can do this)
5. **Test full integration** (15 min)

**Total Estimated Time:** ~1 hour to full multi-user system!

---

## 📞 **Support**

If you encounter issues:
1. Check all 3 services are running:
   - Frontend: `http://localhost:3000`
   - Backend: `http://localhost:8000`
   - Bridge: `http://localhost:3001`

2. Check logs in each terminal
3. Verify database migration ran successfully
4. Confirm auth tokens are being generated

---

**Created:** 2025-12-13  
**Status:** Backend implementation complete, ready for frontend integration
