# 🎯 Implementation Priority Roadmap

Based on the backend update plan, here's the **recommended implementation order** with clear priorities and dependencies.

---

## 🚨 **PHASE 1: Critical Foundation** (MUST DO FIRST)
*Estimated Time: 2-3 hours*

### **Priority 1.1: Database Schema Updates** ⭐⭐⭐⭐⭐
**Why First:** Everything depends on having correct database structure.

**Action Items:**
```sql
-- 1. Add whatsapp_id to contacts (CRITICAL for @lid support)
ALTER TABLE contacts 
ADD COLUMN whatsapp_id VARCHAR(255);

CREATE INDEX idx_contacts_whatsapp_id ON contacts(whatsapp_id);

-- 2. Add attachment_name to messages (for image sending)
ALTER TABLE messages 
ADD COLUMN attachment_name VARCHAR(255);

-- 3. Create ai_configs table (for multi-user AI settings)
CREATE TABLE ai_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL DEFAULT 'gemini',
    api_key TEXT NOT NULL,
    model VARCHAR(100) DEFAULT 'gemini-pro',
    base_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_org_ai_config UNIQUE (organization_id)
);

CREATE INDEX idx_ai_configs_org ON ai_configs(organization_id);
```

**How to do it:**
1. Go to your Supabase project
2. SQL Editor
3. Copy-paste the SQL above
4. Run it
5. ✅ Done!

**Validation:**
```sql
-- Check if columns were added
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'contacts' AND column_name = 'whatsapp_id';

SELECT column_name FROM information_schema.columns 
WHERE table_name = 'messages' AND column_name = 'attachment_name';

-- Check if table was created
SELECT table_name FROM information_schema.tables 
WHERE table_name = 'ai_configs';
```

---

## ✅ **PHASE 2: Core Backend API** (DO SECOND)
*Estimated Time: 3-4 hours*

### **Priority 2.1: Update Contact Schema** ⭐⭐⭐⭐⭐
**Why:** Contacts API must support `whatsapp_id` for existing LiveChats to work.

**Files to Update:**
1. `backend/app/schemas/contact.py`
2. `backend/app/api/contacts.py`

**Changes:**
```python
# backend/app/schemas/contact.py

class ContactCreate(BaseModel):
    name: str
    phone: str
    email: Optional[str] = None
    category: str
    join_date: datetime
    notes: str = ""
    whatsapp_id: Optional[str] = None  # ADD THIS

class ContactUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    category: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None
    whatsapp_id: Optional[str] = None  # ADD THIS

class ContactResponse(BaseModel):
    id: UUID
    name: str
    phone: str
    email: Optional[str]
    category: str
    join_date: datetime
    notes: str
    status: str
    last_contacted: Optional[datetime]
    whatsapp_id: Optional[str]  # ADD THIS
    
    class Config:
        from_attributes = True
```

**Test:**
```bash
# After updating
curl -X POST http://localhost:8000/api/contacts \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test", "phone": "+234", "category": "New Convert", "join_date": "2025-01-01", "whatsapp_id": "12345@lid"}'
```

---

### **Priority 2.2: WhatsApp Bridge Proxy Service** ⭐⭐⭐⭐⭐
**Why:** Backend needs to communicate with WPPConnect bridge.

**Create New File:** `backend/app/services/whatsapp_service.py`

```python
import httpx
from typing import Optional

class WhatsAppService:
    BRIDGE_URL = "http://localhost:3001"
    
    async def send_message(self, phone: str, message: str, whatsapp_id: Optional[str] = None):
        """Send text message via bridge"""
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{self.BRIDGE_URL}/api/send",
                json={
                    "phone": phone,
                    "message": message,
                    "whatsappId": whatsapp_id
                }
            )
            return response.json()
    
    async def send_media(self, phone: str, media_type: str, media_data: str, 
                        caption: str = "", filename: str = "", whatsapp_id: Optional[str] = None):
        """Send media via bridge"""
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{self.BRIDGE_URL}/api/sendMedia",
                json={
                    "phone": phone,
                    "whatsappId": whatsapp_id,
                    "mediaType": media_type,
                    "mediaData": media_data,
                    "caption": caption,
                    "filename": filename
                }
            )
            return response.json()
    
    async def get_status(self):
        """Check bridge connection status"""
        async with httpx.AsyncClient(timeout=5.0) as client:
            try:
                response = await client.get(f"{self.BRIDGE_URL}/api/status")
                return response.json()
            except Exception as e:
                return {"status": "error", "message": str(e)}

whatsapp_service = WhatsAppService()
```

**Add to requirements.txt:**
```
httpx>=0.24.0
```

**Install:**
```bash
pip install httpx
```

---

### **Priority 2.3: WhatsApp API Endpoints** ⭐⭐⭐⭐⭐
**Why:** Frontend needs API endpoints to send messages.

**Create New File:** `backend/app/api/whatsapp.py`

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
from pydantic import BaseModel

from app.dependencies import get_current_user, get_db
from app.models import User, Message, Contact
from app.services.whatsapp_service import whatsapp_service

router = APIRouter(prefix="/api/whatsapp", tags=["whatsapp"])

class WhatsAppMessageSend(BaseModel):
    phone: str
    message: str
    contact_id: Optional[str] = None
    whatsapp_id: Optional[str] = None

class WhatsAppMediaSend(BaseModel):
    phone: str
    media_type: str
    media_data: str
    caption: str = ""
    filename: str = ""
    contact_id: Optional[str] = None
    whatsapp_id: Optional[str] = None

@router.get("/status")
async def get_whatsapp_status(current_user: User = Depends(get_current_user)):
    """Get WhatsApp bridge connection status"""
    status = await whatsapp_service.get_status()
    return status

@router.post("/send")
async def send_whatsapp_message(
    message: WhatsAppMessageSend,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Send WhatsApp text message"""
    # Send via bridge
    result = await whatsapp_service.send_message(
        phone=message.phone,
        message=message.message,
        whatsapp_id=message.whatsapp_id
    )
    
    # Log to database if contact_id provided
    if message.contact_id:
        msg_log = Message(
            organization_id=current_user.organization_id,
            contact_id=message.contact_id,
            content=message.message,
            type="Outbound",
            status="Sent" if result.get("success") else "Failed",
            sent_at=datetime.now() if result.get("success") else None
        )
        db.add(msg_log)
        db.commit()
    
    return result

@router.post("/send-media")
async def send_whatsapp_media(
    media: WhatsAppMediaSend,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Send WhatsApp media (image/video/document)"""
    # Send via bridge
    result = await whatsapp_service.send_media(
        phone=media.phone,
        media_type=media.media_type,
        media_data=media.media_data,
        caption=media.caption,
        filename=media.filename,
        whatsapp_id=media.whatsapp_id
    )
    
    # Log to database if contact_id provided
    if media.contact_id:
        msg_log = Message(
            organization_id=current_user.organization_id,
            contact_id=media.contact_id,
            content=media.caption or f"[{media.media_type}]",
            type="Outbound",
            status="Sent" if result.get("success") else "Failed",
            attachment_type=media.media_type,
            attachment_url=media.media_data[:100],  # Store truncated for reference
            attachment_name=media.filename,
            sent_at=datetime.now() if result.get("success") else None
        )
        db.add(msg_log)
        db.commit()
    
    return result
```

**Register in `backend/app/main.py`:**
```python
from app.api import whatsapp

app.include_router(whatsapp.router)
```

---

## 🔄 **PHASE 3: Frontend Integration** (DO THIRD)
*Estimated Time: 2 hours*

### **Priority 3.1: Update whatsappService.ts** ⭐⭐⭐⭐
**Why:** Frontend must call backend API instead of bridge directly.

**File:** `shepherd-ai (3)/services/whatsappService.ts`

**Key Changes:**
```typescript
// OLD
const BRIDGE_URL = 'http://localhost:3001';

// NEW
const BACKEND_URL = 'http://localhost:8000';

// Update sendMessage
async sendMessage(phone: string, text: string, whatsappId?: string) {
  const token = localStorage.getItem('authToken');
  const contactId = this.getContactIdForPhone(phone); // Get from contacts
  
  const response = await fetch(`${BACKEND_URL}/api/whatsapp/send`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      phone,
      message: text,
      whatsapp_id: whatsappId,
      contact_id: contactId
    })
  });
  
  return response.json();
}

// Update sendMedia similarly
```

---

## 📦 **PHASE 4: Optional Enhancements** (DO LATER)
*Can be done anytime after Phase 1-3*

### **Priority 4.1: Campaign Templates** ⭐⭐⭐
**Why:** Nice to have, but not critical for basic functionality.

**Database:**
```sql
CREATE TABLE campaign_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    days_offset INTEGER NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**API:** Create `backend/app/api/campaigns.py`

---

### **Priority 4.2: AI Config API** ⭐⭐⭐
**Why:** Users can manage AI settings, but frontend works with hardcoded keys for now.

**API:** Create `backend/app/api/ai_config.py`

---

### **Priority 4.3: Incoming Message Webhook** ⭐⭐
**Why:** Stores incoming messages to database. Not critical if frontend handles it.

**Bridge Update:** Add HTTP callback
**Backend:** Add `/api/whatsapp/webhook` endpoint

---

## 📅 **Recommended Implementation Schedule**

### **Day 1 (2-3 hours)**
- ✅ Phase 1.1: Database Schema Updates
- ✅ Phase 2.1: Update Contact Schema
- ✅ Test: Create contact with whatsapp_id

### **Day 2 (3-4 hours)**
- ✅ Phase 2.2: WhatsApp Bridge Service
- ✅ Phase 2.3: WhatsApp API Endpoints
- ✅ Test: Send message via backend API

### **Day 3 (2 hours)**
- ✅ Phase 3.1: Update Frontend Services
- ✅ Test: Full flow - Frontend → Backend → Bridge → WhatsApp
- ✅ Test: Incoming messages still work

### **Later (Optional)**
- Phase 4: Campaigns, AI Config, Webhooks

---

## 🧪 **Testing Checklist**

After each phase:

### **Phase 1 Complete:**
```bash
# Verify database
psql -d your_db -c "\d contacts"
psql -d your_db -c "\d messages"
psql -d your_db -c "\d ai_configs"
```

### **Phase 2 Complete:**
```bash
# Test WhatsApp proxy
curl http://localhost:8000/api/whatsapp/status

# Test send message
curl -X POST http://localhost:8000/api/whatsapp/send \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"phone": "+234...", "message": "test"}'
```

### **Phase 3 Complete:**
```bash
# In browser
1. Login to frontend
2. Send a message in LiveChats
3. Check it appears in Supabase messages table
4. Send an image
5. Check it logged with attachment
```

---

## ⚠️ **Common Pitfalls to Avoid**

1. **Don't skip Phase 1** - Database changes are foundation
2. **Test after each phase** - Don't wait until end
3. **Keep bridge running** - Backend proxies to it
4. **Use proper auth** - All API calls need JWT token
5. **CORS settings** - Backend must allow frontend origin

---

## 🎯 **Success Criteria**

You're done when:
- ✅ Users can login and see only their data
- ✅ Contacts saved to database (not localStorage)
- ✅ Messages sent via backend (logged to DB)
- ✅ Images sent and logged with attachments
- ✅ Each user has isolated WhatsApp session
- ✅ Multi-user app is ready for deployment

---

## 🚀 **Ready to Start?**

**RECOMMENDED:** Start with **Phase 1.1** (Database updates) right now!

It's the quickest win and everything else depends on it.

**Command to run:**
1. Open Supabase SQL Editor
2. Paste the Phase 1.1 SQL
3. Execute
4. ✅ Done in 5 minutes!

Then we can tackle Phase 2 together.
