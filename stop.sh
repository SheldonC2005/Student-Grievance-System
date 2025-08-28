#!/bin/bash

echo "================================================"
echo "🛑 Student Grievance System - Quick Stop"
echo "================================================"
echo

echo "🔍 Stopping all services..."
echo

echo "📡 Killing processes on common ports..."
echo "Stopping Frontend (port 3000)..."
npx kill-port 3000 2>/dev/null || true

echo "Stopping Backend (port 5000)..."
npx kill-port 5000 2>/dev/null || true

echo "Stopping Ganache (port 7545)..."
npx kill-port 7545 2>/dev/null || true

echo "Stopping IPFS (port 5001)..."
npx kill-port 5001 2>/dev/null || true

echo
echo "🧹 Cleaning up Node.js processes..."
pkill -f "node.*server.js" 2>/dev/null || true
pkill -f "react-scripts" 2>/dev/null || true
pkill -f "ganache" 2>/dev/null || true
pkill -f "npm.*dev" 2>/dev/null || true

echo
echo "✅ All services have been stopped!"
echo
echo "📝 Note: If any processes are still running, you may need to:"
echo "   1. Check running processes: ps aux | grep node"
echo "   2. Kill any remaining processes manually"
echo
echo "================================================"
echo "🎓 Student Grievance System - Clean Shutdown"
echo "================================================"
