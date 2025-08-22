#!/bin/bash

# Startup script for Legado Windows App (Development Mode)

echo "Starting Legado Windows Application..."
echo "========================================"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Dependencies not found. Installing..."
    npm install
fi

# Set environment variables
export NODE_ENV=development
export DEBUG=legado:*

# Start the application in development mode
echo "Launching Electron application..."
npm run dev