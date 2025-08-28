@echo off
echo ================================================
echo 🎓 Student Grievance System - Quick Start
echo ================================================
echo.

echo 📋 Prerequisites Check...
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js not found! Please install Node.js first.
    pause
    exit /b 1
)

where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ npm not found! Please install npm first.
    pause
    exit /b 1
)

echo ✅ Node.js and npm found!
echo.

echo 🔍 Checking if dependencies are installed...
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    echo This may take a few minutes...
    call npm run install-all
    if %ERRORLEVEL% NEQ 0 (
        echo ❌ Failed to install dependencies!
        pause
        exit /b 1
    )
    echo ✅ Dependencies installed successfully!
) else (
    echo ✅ Dependencies already installed!
)
echo.

echo 🔧 Setting up environment...
if not exist "backend\.env" (
    echo 📝 Creating backend .env file...
    (
        echo # Server Configuration
        echo PORT=5000
        echo NODE_ENV=development
        echo FRONTEND_URL=http://localhost:3000
        echo.
        echo # Database
        echo DB_PATH=./database/grievance.db
        echo.
        echo # JWT Configuration
        echo JWT_SECRET=your-super-secret-jwt-key-for-development-only
        echo JWT_EXPIRES_IN=7d
        echo.
        echo # Blockchain Configuration
        echo GANACHE_URL=http://127.0.0.1:7545
        echo GANACHE_NETWORK_ID=5777
        echo.
        echo # IPFS Configuration
        echo IPFS_API_URL=http://127.0.0.1:5001
        echo.
        echo # Admin Configuration
        echo ADMIN_DEFAULT_PASSWORD=admin123
        echo SUPER_ADMIN_EMAIL=admin@university.edu
    ) > backend\.env
    echo ✅ Environment file created!
) else (
    echo ✅ Environment file already exists!
)
echo.

echo 🚀 Starting the application...
echo.
echo 📍 The application will start on:
echo    Frontend: http://localhost:3000
echo    Backend:  http://localhost:5000
echo.
echo 👤 Access as Student: Click "Student" button and register
echo 👨‍💼 Access as Admin: Click "Admin" button
echo    Admin ID: admin001
echo    Password: admin123
echo.
echo 🛑 To stop the application: Press Ctrl+C in this window
echo.
echo ================================================
echo Starting all services...
echo ================================================

npm run dev
