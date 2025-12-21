@echo off
title Stop All Shepherd AI Services
color 0C

echo ============================================
echo    STOPPING ALL SHEPHERD AI SERVICES
echo ============================================
echo.

echo Stopping Frontend (Vite)...
taskkill /F /FI "WINDOWTITLE eq *Vite*" /IM node.exe 2>nul

echo Stopping WhatsApp Bridge...
taskkill /F /FI "WINDOWTITLE eq *WhatsApp Bridge*" /IM node.exe 2>nul

echo Stopping Backend (Python)...
taskkill /F /FI "WINDOWTITLE eq *Backend*" /IM python.exe 2>nul
taskkill /F /IM uvicorn.exe 2>nul

echo.
echo ============================================
echo    ALL SERVICES STOPPED!
echo ============================================
echo.
echo You can now:
echo   - Close this window
echo   - Restart with START_ALL.bat when ready
echo.
echo ============================================
echo.

timeout /t 5
