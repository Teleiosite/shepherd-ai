@echo off
echo ========================================
echo SHEPHERD AI - Vercel Deployment
echo ========================================
echo.
echo Step 1: Login to Vercel
echo.
vercel login
echo.
echo.
echo Step 2: Deploy to Production
echo.
echo This will:
echo   - Build your app with VITE_BACKEND_URL injected
echo   - Deploy to Vercel production
echo   - Give you a live URL
echo.
pause
echo.
vercel --prod
echo.
echo ========================================
echo Deployment Complete!
echo ========================================
echo.
echo Your app is now live. Check the URL above.
echo.
echo Verify:
echo   1. Open the URL in browser
echo   2. Open DevTools (F12) - Network tab
echo   3. Try to register/login
echo   4. Check requests go to: https://shepherd-ai-backend.onrender.com
echo.
pause
