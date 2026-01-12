# ⚠️ FINAL MANUAL FIXES NEEDED (1 min)

Almost there! Just need to manually fix one small thing in `SendGroupMessageModal.tsx`:

## Fix SendGroupMessageModal.tsx

Open: `src/components/SendGroupMessageModal.tsx`

**Find lines 29-51 (the handleSend function):**

```typescript
        try {
            setSending(true);
            const config = storage.getAIConfig();  // ← REMOVE THIS

            let scheduledFor = null;
            if (scheduleType === 'scheduled' && scheduledDate && scheduledTime) {
                scheduledFor = new Date(`${scheduledDate}T${scheduledTime}`).toISOString();
            }

            const response = await fetch(
                `${config.apiUrl}/api/groups/${group.id}/messages`,  // ← FIX THIS
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${storage.getToken()}`,  // ← FIX THIS
```

**Replace with:**

```typescript
        try {
            setSending(true);
            const token = localStorage.getItem('authToken');  // ← ADD THIS

            let scheduledFor = null;
            if (scheduleType === 'scheduled' && scheduledDate && scheduledTime) {
                scheduledFor = new Date(`${scheduledDate}T${scheduledTime}`).toISOString();
            }

            const response = await fetch(
                `${BACKEND_URL}/api/groups/${group.id}/messages`,  // ← USE BACKEND_URL
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,  // ← USE token
```

---

## OR Use Find & Replace:

**Find:**
```
const config = storage.getAIConfig();

            let scheduledFor = null;
            if (scheduleType === 'scheduled' && scheduledDate && scheduledTime) {
                scheduledFor = new Date(`${scheduledDate}T${scheduledTime}`).toISOString();
            }

            const response = await fetch(
                `${config.apiUrl}/api/groups/${group.id}/messages`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${storage.getToken()}`,
```

**Replace with:**
```
const token = localStorage.getItem('authToken');

            let scheduledFor = null;
            if (scheduleType === 'scheduled' && scheduledDate && scheduledTime) {
                scheduledFor = new Date(`${scheduledDate}T${scheduledTime}`).toISOString();
            }

            const response = await fetch(
                `${BACKEND_URL}/api/groups/${group.id}/messages`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
```

---

**That's it! After this fix, all TypeScript errors will be gone!** ✅

Then proceed with deployment as described in `DEPLOYMENT_GUIDE.md`
