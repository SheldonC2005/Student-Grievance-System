@echo off
echo ================================================
echo 🛑 Student Grievance System - Quick Stop
echo ================================================
echo.

echo 🔍 Stopping all services...
echo.

echo 📡 Killing processes on common ports...
echo Stopping Frontend (port 3000)...
npx kill-port 3000 2>nul

echo Stopping Backend (port 5000)...
npx kill-port 5000 2>nul

echo Stopping Ganache (port 7545)...
npx kill-port 7545 2>nul

echo Stopping IPFS (port 5001)...
npx kill-port 5001 2>nul

echo.
echo 🧹 Cleaning up Node.js processes...
taskkill /f /im node.exe 2>nul
taskkill /f /im npm.cmd 2>nul
taskkill /f /im npx.cmd 2>nul

echo.
echo ✅ All services have been stopped!
echo.
echo 📝 Note: If any processes are still running, you may need to:
echo    1. Check Task Manager (Ctrl+Shift+Esc)
echo    2. End any remaining Node.js or npm processes
echo.
echo ================================================
echo 🎓 Student Grievance System - Clean Shutdown
echo ================================================

pause
