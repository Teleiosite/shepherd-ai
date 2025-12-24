@echo off
echo ========================================
echo SHEPHERD AI - GitHub Deployment
echo ========================================
echo.
echo This will:
echo   1. Add all files to git
echo   2. Commit changes
echo   3. Push to GitHub
echo   4. Vercel will auto-deploy from GitHub
echo.
pause
echo.

echo Step 1: Adding files to git...
git add .

echo.
echo Step 2: Committing...
git commit -m "fix: configure environment variables for Vercel deployment"

echo.
echo Step 3: Pushing to GitHub...
git push origin main

echo.
echo ========================================
echo Done!
echo ========================================
echo.
echo Vercel will now automatically deploy from GitHub.
echo.
echo Check deployment status:
echo   https://vercel.com/teleiosites-projects/shepherd-ai
echo.
echo This takes 2-3 minutes.
echo.
pause
