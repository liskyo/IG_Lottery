@echo off
title IG Lottery System - Startup

echo ==========================================
echo Starting IG Lottery System...
echo ==========================================

:: Check if node_modules exists, if not install dependencies
if not exist "node_modules\" (
    echo [System] Dependencies missing. Starting npm install...
    echo [System] This might take a few minutes...
    call npm install
    echo [System] Install complete!
) else (
    echo [System] Environment is ready.
)

echo [System] Starting frontend development server...
echo ==========================================
call npm run dev

pause
