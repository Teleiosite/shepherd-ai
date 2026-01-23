# Render Deployment Guide - Groups Feature

## What This Adds:
- WhatsApp Groups Management
- Group member tracking
- Auto-welcome messages for new members  
- Group message broadcasting

## Database Setup Required:

The Groups feature requires 3 new database tables. These are created via Alembic migrations.

### On Render:

1. **Update Start Command** to run migrations before starting:
   ```bash
   cd backend && alembic upgrade head && cd .. && uvicorn app.main:app --host 0.0.0.0 --port $PORT
   ```

2. **OR Manually Run Migration** via Render Shell:
   - Go to Render Dashboard
   - Click "shepherd-ai-backend"
   - Click "Shell" tab
   - Run:
     ```bash
     cd backend
     alembic upgrade head
     ```

### Tables Created:
- `groups` - WhatsApp group information
- `group_members` - Members in each group
- `group_messages` - Broadcast messages to groups

### Migration File:
`backend/alembic/versions/add_groups_tables.py`

## Testing:

After migration runs, you should see in bridge logs:
```
✅ Synced 5 groups (5 new, 0 updated)
```

Instead of:
```
❌ Error processing welcome queue: 500
❌ Error processing group messages: 500
```

## Commit:
Latest deployment with Groups feature: `6c34143`
