# ✅ Folder Naming - Quick Reference

## Current Structure (SAFE) ✅

```
c:\Users\USER\Downloads\
└── SHEPHERD Ai/              ✅ Root folder (can rename safely)
    ├── Agent File/           ✅ Main app folder (KEEP this name)
    ├── shepherd-bridge-app/  ✅ Desktop app (KEEP this name)
    └── wppconnect-bridge/    ✅ WhatsApp bridge (KEEP this name)
```

---

## ✅ What You CAN Rename Safely:

### **Root Folder:**
```
✅ "SHEPHERD Ai" → "shepherd-ai"
✅ "SHEPHERD Ai" → "ShepherdAI"
✅ "SHEPHERD Ai" → "church-platform"
✅ "SHEPHERD Ai" → Anything you want!
```

**Why it's safe:**
- No code references the root folder name
- All imports are relative
- Scripts use `cd` to navigate

---

## ⚠️ What You Should NOT Rename (Without Updates):

### **"Agent File" Folder:**
```
❌ DON'T rename without checking:
   - README.md references
   - Documentation paths
   - Your own mental model
```

**If you MUST rename it:**
1. Pick a new name (e.g., "frontend" or "app")
2. Update README.md installation commands
3. Update documentation files
4. No code changes needed (imports are relative)

### **"shepherd-bridge-app" Folder:**
```
⚠️ Could rename, but check:
   - Documentation references
   - Build scripts in package.json
```

### **"wppconnect-bridge" Folder:**
```
⚠️ Could rename, but check:
   - Documentation references
   - Backend service URLs (if hardcoded)
```

---

## 🎯 Recommended Structure for GitHub:

**Option 1: Keep Current Names (Easiest)**
```
SHEPHERD Ai/
├── Agent File/              # Frontend app
├── shepherd-bridge-app/     # Desktop app
└── wppconnect-bridge/       # WhatsApp bridge
```

**Option 2: Cleaner Names (More Professional)**
```
shepherd-ai/                 # Root
├── frontend/                # Rename "Agent File"
├── desktop/                 # Rename "shepherd-bridge-app"
└── bridge/                  # Rename "wppconnect-bridge"
```

**Option 3: Monorepo Style (Most Professional)**
```
shepherd-ai/
├── apps/
│   ├── web/                 # Frontend
│   └── desktop/             # Desktop app
└── packages/
    └── whatsapp-bridge/     # Bridge
```

---

## 📝 If You Rename "Agent File":

### **Files to Update:**

1. **README.md**
   ```markdown
   # Before
   cd "Agent File"
   
   # After (if renamed to "frontend")
   cd frontend
   ```

2. **GITHUB_UPLOAD_GUIDE.md**
   ```markdown
   # Update folder references
   ```

3. **Your own notes/docs**

### **Files That DON'T Need Updates:**
- ✅ All `.ts/.tsx` files (relative imports)
- ✅ All `.py` files (relative imports)
- ✅ `package.json` (no absolute paths)
- ✅ `vite.config.ts` (relative paths)

---

## 🚀 Recommendation:

### **For GitHub Upload (Now):**
**KEEP current names!** Don't rename right before uploading.

**Rename later if needed** after the project is safely on GitHub.

### **Best Practice:**
```
✅ GOOD: "SHEPHERD Ai" (current root name)
✅ GOOD: "shepherd-ai" (lowercase, no spaces)
❌ AVOID: "Shepherd Ai" with spaces in commands
```

---

## ⚡ Quick Test:

To verify nothing is broken after renaming:

```bash
# 1. Test frontend
cd "Agent File"
npm install
npm run dev
# Should work: http://localhost:5173

# 2. Test backend
cd "Agent File/backend"
python -m uvicorn app.main:app --reload
# Should work: http://localhost:8000

# 3. Test bridge
cd wppconnect-bridge
node bridge.js
# Should work: http://localhost:3001
```

If all three work, you're good! ✅

---

## 🎯 Summary:

**Your current setup is PERFECT for GitHub!**

- ✅ No code is broken
- ✅ Documentation is accurate
- ✅ Folder names are fine
- ✅ Ready to push

**Don't worry about the names!** They're just references in docs, not in actual code logic.

---

**When in doubt: Test it!** Run the commands above and if everything starts correctly, you're golden. 🚀
