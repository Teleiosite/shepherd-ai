@echo off
title Shepherd AI - Complete Launcher
color 0B

echo ============================================
echo    SHEPHERD AI - COMPLETE LAUNCHER
echo ============================================
echo.
echo This will start ALL components:
echo   1. Backend Server (port 8000)
echo   2. Frontend App (port 3001)
echo   3. WhatsApp Bridge (port 3002/3003)
echo.
echo ============================================
echo.

cd /d "%~dp0"

echo Starting Backend Server...
start "Shepherd AI - Backend" cmd /k "cd Agent File\backend && start-backend.bat"
timeout /t 3 >nul

echo Starting Frontend...
start "Shepherd AI - Frontend" cmd /k "cd Agent File && npm run dev"
timeout /t 3 >nul

echo Starting WhatsApp Bridge...
start "Shepherd AI - WhatsApp Bridge" cmd /k "cd wppconnect-bridge && START_BRIDGE.bat"
timeout /t 2 >nul

echo.
echo ============================================
echo    ALL COMPONENTS STARTED!
echo ============================================
echo.
echo Three windows should now be open:
echo   - Backend Server (Python)
echo   - Frontend App (Vite)
echo   - WhatsApp Bridge (Node.js)
echo.
echo Your browser will open automatically.
echo.
echo TO USE THE APP:
echo   1. Wait for all services to start (~30 seconds)
echo   2. Scan the WhatsApp QR code when it appears
echo   3. Open: http://localhost:3001
echo.
echo TO STOP EVERYTHING:
echo   - Run STOP_ALL.bat
echo   - Or close all black windows
echo.
echo ============================================
echo.
echo Press any key to open the app in browser...
pause >nul

start http://localhost:3001

echo.
echo App is running!
echo Keep this window open or close it - your choice.
echo.

timeout /t 5
