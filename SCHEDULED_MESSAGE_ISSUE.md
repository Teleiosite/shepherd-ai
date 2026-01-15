# ⏰ **Scheduled Message Issue - NEEDS FIXING**

## **Problem:**
```
❌ Failed after 3 attempts: contact_id is required for queuing messages
```

## **What's Happening:**

The frontend's **Campaign Scheduler** is trying to send scheduled messages, but the backend API requires a `contact_id` field that isn't being provided.

---

## **Root Cause:**

The scheduling code in the frontend is likely calling:
```javascript
POST /api/messages/queue
{
  "phone": "+234...",
  "content": "Schedule message",
  "scheduled_for": "2026-01-15 10:00:00"
  // ❌ MISSING: contact_id
}
```

But the backend API expects:
```javascript
{
  "contact_id": 123,  // ✅ REQUIRED
  "content": "...",
  "scheduled_for": "..."
}
```

---

## **Solution:**

###  **Option 1: Modify Frontend to Include contact_id**

Find where scheduled messages are being sent (likely in `CampaignScheduler.tsx`) and add `contact_id`:

```typescript
await fetch(`${BACKEND_URL}/api/messages/queue`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    contact_id: contact.id,  // ✅ ADD THIS
    content: message,
    scheduled_for: scheduleTime
  })
});
```

### **Option 2: Modify Backend to Accept Phone Number**

Update the backend `/api/messages/queue` endpoint to:
1. Accept `phone` OR `contact_id`
2. If `phone` provided, lookup/create contact first
3. Then queue message with `contact_id`

---

## **Quick Fix (Frontend):**

The scheduler should already have access to the contact object. Check `src/pages/CampaignScheduler.tsx` line ~150-250 where messages are being queued.

---

## **Status:**
- ✅ CORS fix deployed (commit `6dd058f`)
- ⏳ Waiting for Render deployment
- ❌ Scheduled messages need contact_id fix

---

**Once CORS is fixed, Groups will work. But scheduled messages need code update.**
