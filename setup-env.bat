@echo off
REM Quick setup script to configure environment variables for deployment

echo ========================================
echo SHEPHERD AI - Environment Setup
echo ========================================
echo.

REM Update .env.production
echo Creating .env.production with backend URL...
(
echo # Production Environment Variables
echo # This file is used by Vite during production builds
echo # DO NOT commit this file to git - add to .gitignore
echo.
echo # Backend API URL - Your Render backend
echo VITE_BACKEND_URL=https://shepherd-ai-backend.onrender.com
echo.
echo # Bridge URL ^(optional - for self-hosted WPPConnect bridge^)
echo # VITE_BACKEND_URL=https://your-bridge-server.com
) > .env.production

echo ✅ Created .env.production

echo.
echo ========================================
echo Configuration Complete!
echo ========================================
echo.
echo Files updated:
echo   ✅ .env.production
echo   ✅ vercel.json (already updated manually)
echo.
echo Next steps:
echo   1. Review .env.production to confirm backend URL
echo   2. Deploy to Vercel with: vercel --prod
echo   3. Or push to GitHub if using CI/CD
echo.
echo Backend URL set to:
echo   https://shepherd-ai-backend.onrender.com
echo.
pause
