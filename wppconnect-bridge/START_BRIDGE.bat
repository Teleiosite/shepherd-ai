@echo off
title WhatsApp Bridge - Shepherd AI
color 0A

echo ============================================
echo    SHEPHERD AI - WhatsApp Bridge
echo ============================================
echo.
echo Starting WhatsApp Bridge Server...
echo.
echo Once started, a browser window will open
echo with a QR code. Scan it with WhatsApp!
echo.
echo ============================================
echo.

cd /d "%~dp0"

REM Check if node_modules exists
if not exist "node_modules\" (
    echo First time setup - Installing dependencies...
    echo This may take a few minutes...
    echo.
    npm install
    echo.
    echo Installation complete!
    echo.
)

echo Starting bridge...
echo.
echo DO NOT CLOSE THIS WINDOW!
echo Keep it running to maintain WhatsApp connection.
echo.
echo Press Ctrl+C to stop the bridge.
echo.

npm start

pause
