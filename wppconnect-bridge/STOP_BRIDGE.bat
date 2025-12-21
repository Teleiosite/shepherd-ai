@echo off
title Stop WhatsApp Bridge
color 0C

echo ============================================
echo    STOPPING WhatsApp Bridge
echo ============================================
echo.

REM Kill all node processes related to bridge
taskkill /F /IM node.exe /FI "WINDOWTITLE eq WhatsApp Bridge*" 2>nul

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✓ WhatsApp Bridge stopped successfully!
) else (
    echo.
    echo ℹ No running bridge found.
)

echo.
echo ============================================
echo.

timeout /t 3
