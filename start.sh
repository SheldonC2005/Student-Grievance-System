#!/bin/bash

echo "================================================"
echo "🎓 Student Grievance System - Quick Start"
echo "================================================"
echo

echo "📋 Prerequisites Check..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found! Please install Node.js first."
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm not found! Please install npm first."
    exit 1
fi

echo "✅ Node.js and npm found!"
echo

echo "🔍 Checking if dependencies are installed..."
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    echo "This may take a few minutes..."
    npm run install-all
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies!"
        exit 1
    fi
    echo "✅ Dependencies installed successfully!"
else
    echo "✅ Dependencies already installed!"
fi
echo

echo "🔧 Setting up environment..."
if [ ! -f "backend/.env" ]; then
    echo "📝 Creating backend .env file..."
    cat > backend/.env << 'EOF'
# Server Configuration
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Database
DB_PATH=./database/grievance.db

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-for-development-only
JWT_EXPIRES_IN=7d

# Blockchain Configuration
GANACHE_URL=http://127.0.0.1:7545
GANACHE_NETWORK_ID=5777

# IPFS Configuration
IPFS_API_URL=http://127.0.0.1:5001

# Admin Configuration
ADMIN_DEFAULT_PASSWORD=admin123
SUPER_ADMIN_EMAIL=admin@university.edu
EOF
    echo "✅ Environment file created!"
else
    echo "✅ Environment file already exists!"
fi
echo

echo "🚀 Starting the application..."
echo
echo "📍 The application will start on:"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:5000"
echo
echo "👤 Access as Student: Click \"Student\" button and register"
echo "👨‍💼 Access as Admin: Click \"Admin\" button"
echo "   Admin ID: admin001"
echo "   Password: admin123"
echo
echo "🛑 To stop the application: Press Ctrl+C in this window"
echo
echo "================================================"
echo "Starting all services..."
echo "================================================"

npm run dev
