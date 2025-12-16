@echo off
echo ================================================
echo   Shepherd AI + Venom WhatsApp Bot Launcher
echo ================================================
echo.
echo Starting 3 services...
echo.

REM Start Venom Bridge in new window
start "Venom Bridge" cmd /k "cd /d \"%~dp0server\" && echo Starting Venom Bridge... && node venom-bridge.cjs"

timeout /t 2 /nobreak >nul

REM Start Frontend in new window
start "Shepherd Frontend" cmd /k "cd /d \"%~dp0\" && echo Starting Frontend... && npm run dev"

echo.
echo ✅ All services launched!
echo.
echo Services:
echo - Venom Bridge: http://localhost:3001 (WebSocket: ws://localhost:3002)
echo - Frontend: http://localhost:5173
echo.
echo Each service is running in its own window.
echo To stop: Close each window or press Ctrl+C
echo.
pause
