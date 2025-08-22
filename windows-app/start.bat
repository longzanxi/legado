@echo off
REM Startup script for Legado Windows App (Development Mode)

echo Starting Legado Windows Application...
echo ========================================

REM Check if node_modules exists
if not exist "node_modules" (
    echo Dependencies not found. Installing...
    npm install
)

REM Set environment variables
set NODE_ENV=development
set DEBUG=legado:*

REM Start the application in development mode
echo Launching Electron application...
npm run dev

pause