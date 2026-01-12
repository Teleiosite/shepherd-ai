# Add Groups to App.tsx

## Manual Steps (Very Quick!):

### 1. Import Added ✅
Already done automatically

### 2. Add Navigation Item

Find this line in App.tsx (around line 787):
```typescript
<NavItem to="/workflows" icon={Zap} label="Workflows" />
```

Add this line right after it:
```typescript
<NavItem to="/groups" icon={Users} label="Groups" />
```

### 3. Add Route

Find this line (around line 831):
```typescript
<Route path="/workflows" element={<WorkflowsManager />} />
```

Add this line right after it:
```typescript
<Route path="/groups" element={<Groups />} />
```

---

## OR Use This Find & Replace:

**Find:**
```
<NavItem to="/workflows" icon={Zap} label="Workflows" />
            <NavItem to="/campaigns" icon={Send} label="Generate & Send" />
```

**Replace with:**
```
<NavItem to="/workflows" icon={Zap} label="Workflows" />
            <NavItem to="/groups" icon={Users} label="Groups" />
            <NavItem to="/campaigns" icon={Send} label="Generate & Send" />
```

AND

**Find:**
```
<Route path="/workflows" element={<WorkflowsManager />} />
              <Route path="/campaigns"
```

**Replace with:**
```
<Route path="/workflows" element={<WorkflowsManager />} />
              <Route path="/groups" element={<Groups />} />
              <Route path="/campaigns"
```

---

**That's it! Groups will show in navigation** 🎉
