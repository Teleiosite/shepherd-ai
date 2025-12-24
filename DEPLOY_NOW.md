# 🚀 DEPLOY NOW - Simple Instructions

## Quick Deploy (2 commands)

### 1. Login to Vercel
```bash
vercel login
```
This opens a browser - click "Confirm" to login.

### 2. Deploy
```bash
vercel --prod
```

That's it! ✅

---

## Or Use Automated Script

Just run:
```bash
.\deploy-to-vercel.bat
```

This handles everything automatically!

---

## What Happens During Deployment

1. **Login**: Vercel opens browser to authenticate
2. **Project Setup**: 
   - First time: Answer these prompts:
     - "Set up and deploy?" → **Y**
     - "Which scope?" → Select your account
     - "Link to existing project?" → **N** (since you deleted old one)
     - "What's your project's name?" → `shepherd-ai` (or your choice)
     - "In which directory?" → **./** (just press Enter)
     - "Want to modify settings?" → **N**
3. **Building**: Vite builds with `VITE_BACKEND_URL` injected
4. **Deploying**: Uploads to Vercel
5. **Done**: You get a live URL! 🎉

---

## After Deployment

1. Open the URL Vercel gives you (e.g., `https://shepherd-ai.vercel.app`)
2. Press F12 → Network tab
3. Try to register/login
4. **Verify**: Requests should go to `https://shepherd-ai-backend.onrender.com` ✅

---

## Troubleshooting

**"Vercel token not found"**
- Run: `vercel login` first

**"Build failed"**
- Check you ran `setup-env.bat` first
- `.env.production` should exist with backend URL

**Still seeing localhost:8000**
- Hard refresh: Ctrl+Shift+R
- Open in incognito mode
- Clear browser cache

---

**Ready?** Just run: `vercel --prod`
