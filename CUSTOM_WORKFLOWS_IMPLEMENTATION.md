# Custom Workflows Implementation Plan

## Goal
Allow users to create and manage custom workflows for different contact categories, making Shepherd AI suitable for churches AND businesses.

---

## Phase 1: Core Custom Workflows Feature

### 1. Backend Changes

#### 1.1 Database Model (New Table: `workflows`)
```python
class Workflow(Base):
    id: UUID
    organization_id: UUID
    name: str  # e.g., "30-Day Discipleship", "E-commerce Journey"
    description: str (optional)
    category: str (optional)  # Assign to specific category
    is_default: bool  # One default workflow per org
    steps: JSON  # Array of {day, title, goal}
    created_at: datetime
    updated_at: datetime
    created_by: UUID
```

#### 1.2 API Endpoints (`/api/workflows`)
- `POST /api/workflows` - Create workflow (Excel upload or JSON)
- `GET /api/workflows` - List all workflows for organization
- `GET /api/workflows/{id}` - Get specific workflow
- `PUT /api/workflows/{id}` - Update workflow
- `DELETE /api/workflows/{id}` - Delete workflow
- `POST /api/workflows/upload-excel` - Upload Excel file
- `POST /api/workflows/{id}/set-default` - Set as default

#### 1.3 Excel Parser
- Read columns: Day, Title, Goal
- Validate data (day must be number, title/goal required)
- Convert to JSON structure

---

### 2. Frontend Changes

#### 2.1 New Page: `WorkflowsManager.tsx`

**Location:** `src/components/WorkflowsManager.tsx`

**Features:**
- Upload Excel button
- Display workflows as cards
- Edit workflow (inline JSON or re-upload)
- Delete workflow
- Set default workflow
- Assign to category

**UI Layout:**
```
┌─────────────────────────────────────────┐
│  Workflows                   [+ Create] │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ 30-Day Discipleship Track       │   │
│  │ 12 steps • New Convert          │   │
│  │ [View] [Edit] [Delete] [Default]│   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ E-commerce Customer Journey     │   │
│  │ 8 steps • Customer              │   │
│  │ [View] [Edit] [Delete]          │   │
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

#### 2.2 Navigation Update
Add "Workflows" to sidebar (between Knowledge Base and Generate & Send)

#### 2.3 Excel Upload Modal
- Drag & drop or click to upload
- Show preview of parsed steps
- Name workflow
- Assign to category (optional)

---

### 3. Integration with Existing System

#### 3.1 Update `utils/workflows.ts`
**Current:**
```typescript
// Hardcoded 30-day workflow
export const getNextWorkflowStep = (joinDate, category) => {
  // Uses hardcoded workflow
}
```

**New:**
```typescript
// Check custom workflows first, fallback to default
export const getNextWorkflowStep = (joinDate, category, customWorkflow?) => {
  const workflow = customWorkflow || DEFAULT_WORKFLOW;
  // Use workflow steps
}
```

#### 3.2 Update Contact Display
- Show which workflow is assigned
- Allow changing workflow per contact

---

## Implementation Steps

### Step 1: Backend Database Model
1. Create `app/models/workflow.py`
2. Add to `app/models/__init__.py`
3. Create migration (add workflow table)

### Step 2: Backend API
1. Create `app/api/workflows.py`
2. Implement CRUD endpoints
3. Add Excel parsing function
4. Register router in `app/main.py`

### Step 3: Backend Service
1. Create `app/services/workflow_service.py`
2. Implement workflow logic (get steps, calculate next step, etc.)

### Step 4: Frontend Component
1. Create `src/components/WorkflowsManager.tsx`
2. Implement upload interface
3. Implement workflow list/card display
4. Add edit/delete functionality

### Step 5: Frontend Integration
1. Update `src/utils/workflows.ts`
2. Update sidebar navigation
3. Update contact display to show assigned workflow

### Step 6: Testing
1. Test Excel upload
2. Test workflow assignment
3. Test with contacts (verify correct steps shown)

---

## Excel Template Format

**File: `Workflow_Template.xlsx`**

| Day | Title | Goal |
|-----|-------|------|
| 0 | Welcome Message | Send warm welcome and introduction |
| 1 | First Check-in | Ask how they're doing |
| 3 | Share Resource | Send helpful resource or link |
| 7 | Weekly Recap | Share what's happening this week |
| 14 | Two-Week Check | See how they're settling in |
| 30 | Monthly Milestone | Celebrate 30 days together |

**Download link for users:** Available in Workflows page

---

## Migration Path

### For Existing Users:
1. On first login after update, auto-create default "30-Day Discipleship" workflow from current hardcoded one
2. Assign to all existing contacts
3. User can then create custom workflows

### For New Users:
1. Provide workflow templates library
2. User selects template or creates from scratch

---

## Future Enhancements (Phase 2)

- Visual workflow builder (drag & drop)
- Conditional logic (if/then branching)
- Workflow analytics (completion rates)
- Workflow sharing/marketplace
- Multi-language workflows
- Workflow versioning

---

## File Structure

```
backend/
├── app/
│   ├── models/
│   │   └── workflow.py          # NEW
│   ├── api/
│   │   └── workflows.py         # NEW
│   ├── services/
│   │   └── workflow_service.py  # NEW
│   └── main.py                  # UPDATE

frontend/
├── src/
│   ├── components/
│   │   └── WorkflowsManager.tsx # NEW
│   ├── utils/
│   │   └── workflows.ts         # UPDATE
│   ├── types.ts                 # UPDATE (add Workflow type)
│   └── App.tsx                  # UPDATE (add route)
```

---

## Database Schema

```sql
CREATE TABLE workflows (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    is_default BOOLEAN DEFAULT FALSE,
    steps JSONB NOT NULL,  -- [{day: 1, title: "...", goal: "..."}]
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_workflows_org ON workflows(organization_id);
CREATE INDEX idx_workflows_category ON workflows(category);
```

---

## Time Estimate

- Backend Model & API: 2 hours
- Frontend Component: 2.5 hours
- Integration & Testing: 1.5 hours
- **Total: ~6 hours**

---

## Success Criteria

✅ Users can upload Excel workflows
✅ Users can create multiple workflows
✅ Users can assign workflows to categories
✅ Contacts show correct workflow steps based on assignment
✅ Default workflow exists for all orgs
✅ Edit/delete workflows works
✅ System remains stable for existing users

---

Ready to implement! 🚀
