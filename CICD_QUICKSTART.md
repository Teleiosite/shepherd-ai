# Vercel CI/CD Setup - Quick Reference

## 🔑 Required GitHub Secrets

Add these to: `GitHub Repo → Settings → Secrets and variables → Actions`

```
VERCEL_TOKEN          = (from vercel.com/account/tokens)
VERCEL_ORG_ID         = team_xxxxx (from .vercel/project.json)
VERCEL_PROJECT_ID     = prj_xxxxx (from .vercel/project.json)
VITE_BACKEND_URL      = https://your-backend.onrender.com
```

## 📝 Setup Steps

1. **Get Vercel token**: vercel.com/account/tokens → Create Token
2. **Get IDs**: Run `vercel link` → Check `.vercel/project.json`
3. **Add secrets**: GitHub repo → Settings → Secrets → Add all 4 secrets
4. **Commit workflows**: `git add .github/workflows/ && git commit && git push`
5. **Verify**: GitHub → Actions tab → Check workflow status

## ✅ What Gets Automated

- ✅ Auto-deploy on push to `main`
- ✅ Environment variables injected at build time
- ✅ Cache automatically invalidated
- ✅ PR preview deployments
- ✅ Health checks after deployment

## 🚀 Usage

```bash
# Deploy to production
git push origin main

# Deploy preview
git push origin feature-branch
```

That's it! No more manual Vercel deployments. 🎉
