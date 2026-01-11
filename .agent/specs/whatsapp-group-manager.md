# WhatsApp Group Manager - Technical Specification

**Version:** 1.0  
**Date:** January 11, 2026  
**Status:** Proposal / Pending Approval

---

## 📋 **Feature Overview**

Enable Shepherd AI to manage WhatsApp groups by:
1. Detecting and storing group information
2. Monitoring group membership changes (new joins, exits)
3. Auto-welcoming new members with personalized DMs
4. Broadcasting messages to specific groups
5. Auto-adding new group members as contacts

---

## 🎯 **Use Cases**

### **Use Case 1: Church Welcome Committee**
- Setup: Church WhatsApp group for new members
- Flow: New person joins → Bot sends personalized welcome DM → Adds to "New Member" contact category → Starts 30-day workflow

### **Use Case 2: Business Customer Support**
- Setup: Product support group
- Flow: Customer joins → Bot sends welcome + FAQ link → Adds to "Customer" category → Assigns support workflow

### **Use Case 3: Community Broadcasts**
- Admin wants to send announcement to all church groups
- Selects target groups → Schedules message → Bot broadcasts at scheduled time

---

## 🗄️ **Database Schema**

### **New Table: `groups`**

```sql
CREATE TABLE groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    whatsapp_group_id VARCHAR(255) NOT NULL, -- WhatsApp's internal group ID
    name VARCHAR(255) NOT NULL,
    description TEXT,
    avatar_url VARCHAR(500),
    member_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Settings
    auto_welcome_enabled BOOLEAN DEFAULT false,
    welcome_message_template TEXT,
    auto_add_as_contact BOOLEAN DEFAULT true,
    default_contact_category VARCHAR(100),
    
    -- Constraints
    CONSTRAINT uq_org_whatsapp_group UNIQUE(organization_id, whatsapp_group_id)
);

CREATE INDEX idx_groups_org ON groups(organization_id);
CREATE INDEX idx_groups_whatsapp_id ON groups(whatsapp_group_id);
```

### **New Table: `group_members`**

```sql
CREATE TABLE group_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    whatsapp_id VARCHAR(255) NOT NULL, -- Phone number
    name VARCHAR(255),
    is_admin BOOLEAN DEFAULT false,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    left_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT uq_group_member UNIQUE(group_id, whatsapp_id)
);

CREATE INDEX idx_group_members_group ON group_members(group_id);
CREATE INDEX idx_group_members_contact ON group_members(contact_id);
```

### **New Table: `group_messages`**

```sql
CREATE TABLE group_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- pending, sent, failed
    scheduled_for TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_group_messages_group ON group_messages(group_id);
CREATE INDEX idx_group_messages_status ON group_messages(status, scheduled_for);
```

---

## 🔌 **Backend API Endpoints**

### **Groups Management**

#### `GET /api/groups/`
List all groups for the organization.

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "New Members Group",
    "whatsapp_group_id": "1234567890@g.us",
    "member_count": 45,
    "auto_welcome_enabled": true,
    "default_contact_category": "New Member"
  }
]
```

#### `GET /api/groups/{group_id}`
Get detailed group information including recent members.

**Response:**
```json
{
  "id": "uuid",
  "name": "New Members Group",
  "description": "Welcome to our church family!",
  "member_count": 45,
  "settings": {
    "auto_welcome_enabled": true,
    "welcome_message_template": "Welcome {{name}}! We're glad you're here!",
    "auto_add_as_contact": true,
    "default_contact_category": "New Member"
  },
  "recent_members": [
    {
      "id": "uuid",
      "name": "John Doe",
      "phone": "+1234567890",
      "joined_at": "2026-01-11T10:30:00Z"
    }
  ]
}
```

#### `PUT /api/groups/{group_id}`
Update group settings (welcome message, auto-add settings, etc.)

**Request:**
```json
{
  "auto_welcome_enabled": true,
  "welcome_message_template": "Hi {{name}}! Welcome to {{group_name}}!",
  "default_contact_category": "Group Member"
}
```

#### `POST /api/groups/sync`
Trigger a manual sync of groups from WhatsApp bridge.

**Response:**
```json
{
  "synced": 3,
  "new": 1,
  "updated": 2
}
```

---

### **Group Members**

#### `GET /api/groups/{group_id}/members`
List all members in a group.

**Query Params:**
- `recent=true` - Only show members who joined in last 7 days

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "John Doe",
    "phone": "+1234567890",
    "whatsapp_id": "1234567890@c.us",
    "is_admin": false,
    "joined_at": "2026-01-11T10:30:00Z",
    "contact_id": "uuid",
    "contact_category": "New Member"
  }
]
```

#### `POST /api/groups/{group_id}/members/{member_id}/convert`
Manually convert a group member to a contact.

**Request:**
```json
{
  "category": "New Member",
  "notes": "Joined via church group"
}
```

---

### **Group Messages (Broadcasting)**

#### `POST /api/groups/{group_id}/messages`
Send or schedule a message to a group.

**Request:**
```json
{
  "content": "Sunday service starts at 10am!",
  "scheduled_for": "2026-01-12T08:00:00Z" // Optional
}
```

#### `GET /api/groups/messages/pending`
Get pending group messages (for bridge to send).

**Response:**
```json
[
  {
    "id": "uuid",
    "group_id": "uuid",
    "whatsapp_group_id": "1234567890@g.us",
    "content": "Sunday service starts at 10am!",
    "scheduled_for": "2026-01-12T08:00:00Z"
  }
]
```

#### `POST /api/groups/messages/{message_id}/status`
Update message status after sending.

**Request:**
```json
{
  "status": "sent",
  "sent_at": "2026-01-12T08:00:05Z"
}
```

---

## 🌉 **WhatsApp Bridge Integration**

### **Desktop Bridge Updates**

#### **1. Group Discovery**
On initialization, fetch all groups the account is in:

```javascript
client.getAllGroups().then(groups => {
  const groupData = groups.map(g => ({
    whatsapp_group_id: g.id,
    name: g.name,
    description: g.description,
    avatar_url: g.profilePicUrl,
    member_count: g.participants.length
  }));
  
  // POST to /api/groups/sync
  axios.post(`${BACKEND_URL}/api/groups/sync`, {
    groups: groupData
  });
});
```

#### **2. Member Join Detection**
Listen for group participant events:

```javascript
client.onParticipantsChanged(async (event) => {
  if (event.action === 'add') {
    for (const newMember of event.who) {
      // Get member info
      const contact = await client.getContact(newMember);
      
      // Notify backend
      await axios.post(`${BACKEND_URL}/api/groups/${event.chatId}/members/joined`, {
        whatsapp_id: newMember,
        name: contact.pushname || contact.name,
        phone: contact.id.user,
        joined_at: new Date()
      });
    }
  }
});
```

#### **3. Auto-Welcome DM**
Backend triggers this via webhook or bridge polls for it:

```javascript
// Bridge checks: GET /api/groups/welcome-queue
const welcomes = await axios.get(`${BACKEND_URL}/api/groups/welcome-queue`);

for (const welcome of welcomes) {
  await client.sendText(welcome.phone, welcome.message);
  
  // Mark as sent
  await axios.post(`${BACKEND_URL}/api/groups/welcome-queue/${welcome.id}/sent`);
}
```

#### **4. Group Message Broadcasting**
Poll for pending group messages:

```javascript
// Already have pending messages endpoint
// Add group messages to the same polling logic
const groupMessages = await axios.get(`${BACKEND_URL}/api/groups/messages/pending`);

for (const msg of groupMessages) {
  await client.sendText(msg.whatsapp_group_id, msg.content);
  
  await axios.post(`${BACKEND_URL}/api/groups/messages/${msg.id}/status`, {
    status: 'sent',
    sent_at: new Date()
  });
}
```

---

## 🎨 **Frontend UI Components**

### **1. New Page: `/groups`**

**Header:**
```
┌─────────────────────────────────────────────┐
│  Groups (3)          [ Sync Groups ] [Help] │
└─────────────────────────────────────────────┘
```

**Group Cards:**
```
┌────────────────────────────────────┐
│ 👥 New Members Group               │
│ 👤 45 members                      │
│                                    │
│ Auto-welcome: ✅ ON                │
│ Auto-add contacts: ✅ ON           │
│ Category: New Member               │
│                                    │
│ [View Members] [Send Message] [⚙️] │
└────────────────────────────────────┘
```

### **2. Group Details Modal**

**Tabs:**
- **Overview** - Group info, settings
- **Members** - List of all members
- **Recent Joins** - New members in last 7 days
- **Messages** - Broadcast history

**Settings Section:**
```
┌─────────────────────────────────────┐
│ Group Settings                      │
├─────────────────────────────────────┤
│                                     │
│ ☑️ Auto-welcome new members        │
│                                     │
│ Welcome Message Template:           │
│ ┌─────────────────────────────────┐ │
│ │ Hi {{name}}! Welcome to         │ │
│ │ {{group_name}}! We're glad      │ │
│ │ you're here. 🙏                 │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ☑️ Auto-add as contact             │
│                                     │
│ Default Category:                   │
│ [ New Member ▼ ]                   │
│                                     │
│ [Save Settings]                     │
└─────────────────────────────────────┘
```

### **3. Send Group Message Modal**

```
┌─────────────────────────────────────┐
│ Send Message to: New Members Group  │
├─────────────────────────────────────┤
│                                     │
│ Message:                            │
│ ┌─────────────────────────────────┐ │
│ │ Sunday service is at 10am!      │ │
│ │ See you there! 🙏               │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ◯ Send now                         │
│ ◯ Schedule for:                    │
│    [📅 Date] [🕐 Time]             │
│                                     │
│ [Cancel] [Send Message]             │
└─────────────────────────────────────┘
```

### **4. Navigation Update**

Add to sidebar:
```
📋 Dashboard
👥 Contacts
💬 Live Chats
📚 Knowledge Base
⚙️ Workflows
🎯 Generate & Send
👥 Groups          ← NEW!
⚙️ Settings
```

---

## 👤 **User Workflows**

### **Workflow 1: Initial Setup**

1. User connects WhatsApp bridge
2. Bridge auto-syncs all groups to backend
3. User goes to **Groups** page
4. Sees list of all WhatsApp groups
5. Clicks on a group → Configure settings
6. Enables auto-welcome, sets message template
7. Sets default contact category
8. Saves

**Result:** Group is now managed by Shepherd AI

---

### **Workflow 2: New Member Joins**

**System Flow:**
1. Person joins WhatsApp group
2. Bridge detects participant added event
3. Bridge sends member info to backend
4. Backend checks if auto-welcome is enabled
5. If enabled:
   - Creates contact (if auto-add enabled)
   - Generates personalized welcome message
   - Queues welcome DM
6. Bridge polls welcome queue
7. Bridge sends DM to new member
8. Backend marks welcome as sent
9. If contact created → workflow starts

**User sees:**
- New member appears in "Groups → Recent Joins"
- New contact appears in Contacts (if auto-add enabled)
- First workflow message scheduled

---

### **Workflow 3: Broadcasting Announcement**

1. User goes to Groups page
2. Clicks "Send Message" on a group
3. Types message
4. Chooses "Send now" or "Schedule for later"
5. Clicks Send
6. Message queued
7. Bridge polls and sends
8. User sees message in "Sent" history

---

## ⚙️ **Configuration Options**

### **Per-Group Settings**

```typescript
interface GroupSettings {
  // Auto-welcome
  autoWelcomeEnabled: boolean;
  welcomeMessageTemplate: string;
  
  // Contact creation
  autoAddAsContact: boolean;
  defaultContactCategory: string;
  
  // Workflows
  autoStartWorkflow: boolean;
  
  // Notifications
  notifyOnNewMember: boolean;
  notifyAdmins: string[]; // User IDs to notify
}
```

### **Global Settings (in Settings page)**

```
┌─────────────────────────────────────┐
│ WhatsApp Groups                     │
├─────────────────────────────────────┤
│                                     │
│ ☑️ Enable group management         │
│                                     │
│ Default welcome template:           │
│ ┌─────────────────────────────────┐ │
│ │ Hi {{name}}! Welcome! 🙏       │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [Configure Groups →]                │
└─────────────────────────────────────┘
```

---

## 🔧 **Technical Considerations**

### **1. Message Variables**

Support dynamic variables in templates:
- `{{name}}` - New member's name
- `{{group_name}}` - Group name
- `{{date}}` - Current date
- `{{time}}` - Current time
- `{{admin_name}}` - Admin who invited them (if available)

### **2. Rate Limiting**

WhatsApp has limits:
- **Group messages:** ~20 per minute
- **DMs:** ~ 60 per minute

**Solution:** Queue with delay
```javascript
const DELAY_BETWEEN_MESSAGES = 3000; // 3 seconds
```

### **3. Duplicate Prevention**

Don't welcome same person twice:
```sql
-- Check before creating welcome
SELECT * FROM group_members 
WHERE group_id = $1 
  AND whatsapp_id = $2 
  AND joined_at > NOW() - INTERVAL '1 day';
```

### **4. Privacy & Permissions**

- Only show groups bridge is admin in (or has permission to manage)
- Don't auto-add members if they're already contacts
- Respect WhatsApp's privacy policies

---

## 📊 **Data Flow Diagram**

```
┌─────────────┐
│  WhatsApp   │
│   Groups    │
└──────┬──────┘
       │
       │ New member joins
       ▼
┌─────────────┐
│   Bridge    │
│ (Listener)  │
└──────┬──────┘
       │
       │ POST /api/groups/{id}/members/joined
       ▼
┌─────────────┐
│  Backend    │
│  (API)      │
└──────┬──────┘
       │
       ├──► Create contact (if enabled)
       │
       ├──► Queue welcome message
       │
       └──► Start workflow (if enabled)
       
┌─────────────┐
│   Bridge    │
│  (Poller)   │  ◄─── GET /api/groups/welcome-queue
└──────┬──────┘
       │
       │ Send welcome DM
       ▼
┌─────────────┐
│  WhatsApp   │
│  (New DM)   │
└─────────────┘
```

---

## 🚀 **Implementation Phases**

### **Phase 1: Core Infrastructure** (2-3 hours)
- [x] Database schema
- [x] Backend models
- [x] Basic API endpoints
- [x] Group sync endpoint

### **Phase 2: Bridge Integration** (1-2 hours)
- [x] Group discovery on init
- [x] Participant change listener
- [x] Welcome queue polling
- [x] Group message sending

### **Phase 3: Frontend UI** (2-3 hours)
- [x] Groups page
- [x] Group list cards
- [x] Group details modal
- [x] Settings configuration
- [x] Send message modal
- [x] Member list view

### **Phase 4: Auto-Welcome Logic** (1 hour)
- [x] Template variable replacement
- [x] Auto-contact creation
- [x] Workflow triggering
- [x] Duplicate prevention

### **Phase 5: Testing & Polish** (1 hour)
- [x] Test with real groups
- [x] Test welcome messages
- [x] Test broadcasting
- [x] Error handling
- [x] Documentation

---

## ✅ **Acceptance Criteria**

**Must Have:**
1. ✅ Admin can see all WhatsApp groups
2. ✅ Admin can configure auto-welcome per group
3. ✅ New member joins → Receives welcome DM
4. ✅ New member auto-added as contact
5. ✅ Admin can broadcast to groups
6. ✅ Member list visible per group

**Nice to Have:**
1. Schedule group broadcasts
2. Multiple welcome templates
3. A/B test welcome messages
4. Group analytics (join/leave rates)
5. Bulk group operations

---

## 📝 **Next Steps**

**For Approval:**
1. Review this spec
2. Suggest any changes/additions
3. Approve to proceed

**After Approval:**
1. I'll create database migrations
2. Build backend APIs
3. Update bridge code
4. Create frontend components
5. Test end-to-end
6. Deploy!

---

**Estimated Total Time:** 6-8 hours (can be done over 2 sessions)

**Questions? Feedback? Ready to proceed?** 🚀
