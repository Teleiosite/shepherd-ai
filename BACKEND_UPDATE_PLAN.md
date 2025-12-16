# 🔄 Backend Update Plan - Frontend Alignment

## 📊 Current Frontend Data Structures vs Backend Schema

### ✅ What MATCHES (No changes needed)

1. **Users Table**
   - ✅ Frontend: `{ id, name, email, passwordHash, churchName }`
   - ✅ Backend: `users` table with organization reference
   - **Status:** GOOD

2. **Contacts Table**
   - ✅ Frontend: `{ id, name, phone, email, category, joinDate, notes, status, whatsappId }`
   - ✅ Backend: `contacts` table
   - **Action:** ADD `whatsapp_id` column

3. **Knowledge Base**
   - ✅ Frontend: `{ id, title, type, content, uploadDate, fileName }`
   - ✅ Backend: `knowledge_resources` table
   - **Status:** GOOD

4. **Messages**
   - ✅ Frontend: `{ id, contactId, content, timestamp, status, type, attachment }`
   - ✅ Backend: `messages` table
   - **Action:** Update attachment handling

---

## 🚨 REQUIRED BACKEND UPDATES

### **1. Database Schema Updates**

#### **Add to `contacts` table:**
```sql
ALTER TABLE contacts 
ADD COLUMN whatsapp_id VARCHAR(255);

CREATE INDEX idx_contacts_whatsapp_id ON contacts(whatsapp_id);

COMMENT ON COLUMN contacts.whatsapp_id IS 'WhatsApp internal ID (@lid format) for message replies';
```

#### **Update `messages` table:**
```sql
-- Add attachment fields to match frontend MessageAttachment type
ALTER TABLE messages 
ADD COLUMN attachment_name VARCHAR(255);

COMMENT ON COLUMN messages.attachment_url IS 'Base64 data or file URL for image/file attachments';
COMMENT ON COLUMN messages.attachment_type IS 'Either "image" or "file"';
COMMENT ON COLUMN messages.attachment_name IS 'Original filename of attachment';
```

#### **Add AI Configuration table:**
```sql
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

COMMENT ON TABLE ai_configs IS 'AI provider configuration per organization';
```

#### **Add Campaign Templates table:**
```sql
CREATE TABLE campaign_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    days_offset INTEGER NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_org_template UNIQUE (organization_id, category, days_offset)
);

CREATE INDEX idx_campaign_templates_org ON campaign_templates(organization_id, category);

COMMENT ON TABLE campaign_templates IS 'Campaign message templates for automated follow-up';
```

---

### **2. Backend API Endpoints to Add/Update**

#### **NEW: AI Configuration Endpoints**
```python
# app/api/ai_config.py

@router.get("/api/ai-config")
async def get_ai_config(current_user: User = Depends(get_current_user)):
    """Get AI configuration for user's organization"""
    # Return: { provider, apiKey, model, baseUrl }

@router.put("/api/ai-config")
async def update_ai_config(config: AIConfigUpdate, current_user: User = Depends(get_current_user)):
    """Update AI configuration"""
    # Request: { provider, apiKey, model, baseUrl }

@router.post("/api/ai-config/test")
async def test_ai_config(config: AIConfigUpdate):
    """Test AI configuration before saving"""
    # Validate API key works
```

#### **UPDATE: Contacts Endpoints**

Add `whatsapp_id` field support:

```python
# app/schemas/contact.py

class ContactCreate(BaseModel):
    name: str
    phone: str
    email: Optional[str]
    category: str
    join_date: datetime
    notes: str = ""
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
```

#### **NEW: Campaigns Endpoints**
```python
# app/api/campaigns.py

@router.get("/api/campaigns")
async def list_campaigns(current_user: User = Depends(get_current_user)):
    """List all campaign templates"""

@router.post("/api/campaigns")
async def create_campaign(campaign: CampaignCreate, current_user: User = Depends(get_current_user)):
    """Create campaign template"""

@router.delete("/api/campaigns/{campaign_id}")
async def delete_campaign(campaign_id: UUID, current_user: User = Depends(get_current_user)):
    """Delete campaign template"""

@router.post("/api/campaigns/{campaign_id}/schedule")
async def schedule_campaign(campaign_id: UUID, contacts: List[UUID], current_user: User = Depends(get_current_user)):
    """Schedule campaign for specific contacts"""
```

#### **UPDATE: Messages Endpoints**

Update to handle attachments:

```python
# app/schemas/message.py

class MessageAttachment(BaseModel):
    type: str  # 'image' or 'file'
    url: str   # Base64 data or file URL
    name: str  # Filename

class MessageCreate(BaseModel):
    contact_id: UUID
    content: str
    type: str  # 'Outbound' or 'Inbound'
    scheduled_for: Optional[datetime]
    attachment: Optional[MessageAttachment]  # ADD THIS

class MessageResponse(BaseModel):
    id: UUID
    contact_id: UUID
    content: str
    timestamp: datetime
    scheduled_for: Optional[datetime]
    status: str
    type: str
    attachment: Optional[MessageAttachment]  # ADD THIS
```

#### **NEW: WhatsApp Integration Endpoints**

```python
# app/api/whatsapp.py

@router.get("/api/whatsapp/status")
async def get_whatsapp_status(current_user: User = Depends(get_current_user)):
    """Proxy to bridge: GET http://localhost:3001/api/status"""
    # Return bridge connection status

@router.post("/api/whatsapp/send")
async def send_whatsapp_message(message: WhatsAppMessageSend, current_user: User = Depends(get_current_user)):
    """Proxy to bridge: POST http://localhost:3001/api/send"""
    # Log to messages table, then send via bridge

@router.post("/api/whatsapp/send-media")
async def send_whatsapp_media(media: WhatsAppMediaSend, current_user: User = Depends(get_current_user)):
    """Proxy to bridge: POST http://localhost:3001/api/sendMedia"""
    # Log to messages table with attachment, then send via bridge

@router.post("/api/whatsapp/webhook")
async def whatsapp_webhook(message: IncomingMessage):
    """Receive incoming messages from bridge WebSocket → save to DB"""
    # Bridge sends messages here via HTTP callback
```

---

### **3. Frontend Service Updates Needed**

#### **Update `whatsappService.ts`**

Change from direct bridge calls to backend API:

```typescript
// OLD (Direct to bridge)
const response = await fetch('http://localhost:3001/api/send', {...});

// NEW (Via backend API)
const response = await fetch('http://localhost:8000/api/whatsapp/send', {
  headers: {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  },
  ...
});
```

#### **Update `storage.ts`**

Replace localStorage with backend API calls:

```typescript
// OLD
localStorage.setItem('contacts', JSON.stringify(contacts));

// NEW
await fetch('http://localhost:8000/api/contacts', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: JSON.stringify(contact)
});
```

---

### **4. New Backend Services to Create**

#### **WhatsApp Bridge Proxy Service**
```python
# app/services/whatsapp_service.py

class WhatsAppService:
    BRIDGE_URL = "http://localhost:3001"
    
    async def send_message(self, phone: str, message: str, whatsapp_id: Optional[str] = None):
        """Send message via bridge"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.BRIDGE_URL}/api/send",
                json={"phone": phone, "message": message, "whatsappId": whatsapp_id}
            )
            return response.json()
    
    async def send_media(self, phone: str, media_type: str, media_data: str, 
                        caption: str = "", filename: str = "", whatsapp_id: Optional[str] = None):
        """Send media via bridge"""
        async with httpx.AsyncClient() as client:
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
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{self.BRIDGE_URL}/api/status")
            return response.json()
```

#### **Message Logging Service**
```python
# app/services/message_service.py

class MessageService:
    async def log_outgoing_message(self, db: Session, org_id: UUID, contact_id: UUID, 
                                   content: str, attachment: Optional[dict] = None):
        """Log outgoing message to database"""
        message = Message(
            organization_id=org_id,
            contact_id=contact_id,
            content=content,
            type="Outbound",
            status="Sent",
            attachment_url=attachment['url'] if attachment else None,
            attachment_type=attachment['type'] if attachment else None,
            attachment_name=attachment['name'] if attachment else None,
            sent_at=datetime.now()
        )
        db.add(message)
        db.commit()
        return message
    
    async def log_incoming_message(self, db: Session, org_id: UUID, phone: str, 
                                   content: str, whatsapp_id: str):
        """Log incoming message and create contact if needed"""
        # Find or create contact
        contact = db.query(Contact).filter_by(organization_id=org_id, phone=phone).first()
        if not contact:
            contact = Contact(
                organization_id=org_id,
                name=phone,  # Placeholder
                phone=phone,
                whatsapp_id=whatsapp_id,
                category="New Convert",
                join_date=datetime.now(),
                notes="Auto-created from incoming message"
            )
            db.add(contact)
            db.commit()
        
        # Log message
        message = Message(
            organization_id=org_id,
            contact_id=contact.id,
            content=content,
            type="Inbound",
            status="Responded",
            created_at=datetime.now()
        )
        db.add(message)
        db.commit()
        return message
```

---

### **5. WebSocket Bridge → Backend Integration**

The bridge currently sends messages via WebSocket. We need to forward them to the backend:

#### **Option A: Bridge HTTP Callback**
Add to `bridge.js`:
```javascript
// After receiving message, send to backend
async function notifyBackend(messageData) {
  try {
    await fetch('http://localhost:8000/api/whatsapp/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: messageData.realPhone || messageData.phone,
        whatsappId: messageData.from,
        content: messageData.body,
        contactName: messageData.contactName,
        pushname: messageData.pushname
      })
    });
  } catch (err) {
    console.error('Failed to notify backend:', err);
  }
}

client.onMessage(async (message) => {
  // ... existing code ...
  
  // Notify backend
  await notifyBackend(messageData);
  
  // Broadcast to frontend
  broadcastToClients(messageData);
});
```

#### **Option B: Frontend Intercept**
Frontend listens to WebSocket, then posts to backend API.

---

## 📦 **Required npm Packages for Backend**

Add to `requirements.txt`:
```
httpx>=0.24.0  # For async HTTP calls to bridge
```

---

## 🎯 **Migration Steps**

1. **Database Migration**
   ```bash
   # Run SQL updates in Supabase SQL editor
   - Add whatsapp_id to contacts
   - Add attachment_name to messages
   - Create ai_configs table
   - Create campaign_templates table
   ```

2. **Update Backend Code**
   ```bash
   cd backend
   # Update schemas
   #Update API routes
   # Add new services
   # Test endpoints
   ```

3. **Update Frontend Services**
   ```bash
   # Replace localStorage with API calls
   # Add auth headers
   # Update URLs to point to backend
   ```

4. **Configure Bridge Callback**
   ```bash
   # Add HTTP callback to bridge.js
   # Test message flow: WhatsApp → Bridge → Backend → Frontend
   ```

---

## ✅ **Checklist**

### Database
- [ ] Add `whatsapp_id` to contacts
- [ ] Add `attachment_name` to messages
- [ ] Create `ai_configs` table
- [ ] Create `campaign_templates` table

### Backend API
- [ ] Add `/api/ai-config` endpoints
- [ ] Update contacts schema with `whatsapp_id`
- [ ] Add `/api/campaigns` endpoints
- [ ] Update messages schema with attachment support
- [ ] Add `/api/whatsapp/*` proxy endpoints
- [ ] Create WhatsAppService
- [ ] Create MessageService
- [ ] Add webhook endpoint for incoming messages

### Frontend
- [ ] Update `whatsappService.ts` to use backend API
- [ ] Update `storage.ts` to use backend API
- [ ] Add authentication token handling
- [ ] Update all localStorage calls to API calls

### Bridge
- [ ] Add HTTP callback to backend
- [ ] Test message forwarding

---

**Estimated Time:** 6-8 hours total
**Priority:** High (Required for multi-user support)
