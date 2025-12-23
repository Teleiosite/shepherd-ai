@echo off
echo.
echo ========================================
echo   Shepherd AI Bridge Builder
echo ========================================
echo.
echo This will build the Windows installer...
echo.
pause

cd shepherd-bridge-app\shepherd-ai-bridge
npm run build

echo.
echo ========================================
echo Build complete! Check dist\ folder
echo ========================================
pause
