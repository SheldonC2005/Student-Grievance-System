# 🚀 Student Grievance System - Complete Startup & Shutdown Guide

## 📋 Prerequisites

Before starting the application, ensure you have:

- Node.js (v16 or higher)
- npm or yarn
- Ganache CLI for blockchain simulation
- Git (for repository management)

## 🛠️ Initial Setup (One-time)

### 1. Clone and Install Dependencies

```bash
# If not already done, clone the repository
git clone https://github.com/SheldonC2005/Student-Grievance-System.git
cd Student-Grievance-System

# Install all dependencies across all modules
npm run install-all
```

### 2. Environment Configuration

Create `.env` files in the backend directory:

**Backend `.env` file:**

```env
# Server Configuration
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Database
DB_PATH=./database/grievance.db

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=7d

# Blockchain Configuration
GANACHE_URL=http://127.0.0.1:7545
GANACHE_NETWORK_ID=5777

# IPFS Configuration
IPFS_API_URL=http://127.0.0.1:5001

# Admin Configuration
ADMIN_DEFAULT_PASSWORD=admin123
SUPER_ADMIN_EMAIL=admin@university.edu
```

### 3. Database Initialization

The database will be automatically created when you first start the backend.

## 🚀 Starting the Application

### Option 1: Start All Services at Once (Recommended)

```bash
# From the root directory
npm run dev
```

This command starts:

- Backend server (http://localhost:5000)
- Frontend React app (http://localhost:3000)
- All services run concurrently

### Option 2: Start Services Individually

#### Step 1: Start Ganache Blockchain

```bash
# Terminal 1 - Start Ganache CLI
npx ganache-cli --host 127.0.0.1 --port 7545 --networkId 5777 --deterministic
```

#### Step 2: Start Backend Server

```bash
# Terminal 2 - Start backend
cd backend
npm run dev
# Or for production: npm start
```

#### Step 3: Start Frontend Application

```bash
# Terminal 3 - Start frontend
cd frontend
npm start
```

#### Step 4: Deploy Smart Contract (if needed)

```bash
# Terminal 4 - Deploy blockchain contracts
cd blockchain
truffle migrate --reset
```

## 🎯 Application Access

### Student Access

1. **URL**: http://localhost:3000
2. **Login**:
   - Click "Student" button
   - Register new account or use existing credentials
   - Or use MetaMask wallet connection

### Admin Access

1. **URL**: http://localhost:3000
2. **Login**:
   - Click "Admin" button
   - Use admin credentials:
     - **Admin ID**: `admin001`
     - **Password**: `admin123`
   - Access Block Management at: http://localhost:3000/admin/blocks

### API Access

- **Backend API**: http://localhost:5000/api
- **Health Check**: http://localhost:5000/api/health
- **API Documentation**: Check backend/routes/ for available endpoints

## 🧪 Creating Test Admin Account

If you need to create an admin account, use this API call:

```bash
# Create admin account via API
curl -X POST http://localhost:5000/api/admin/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "admin_id": "admin001",
    "full_name": "System Administrator",
    "email": "admin@university.edu",
    "password": "admin123",
    "permissions": ["block_create", "block_view", "complaint_manage", "user_manage"]
  }'
```

## 📦 Block Creation Workflow

### For Admins:

1. Login as admin
2. Navigate to "Block Management"
3. View unprocessed complaints in the dashboard
4. Click "Create Block" to process complaints into blockchain blocks
5. Monitor block statistics and export data as needed

## 🔍 System Status Verification

### Check Backend Status:

```bash
curl http://localhost:5000/api/health
```

### Check Blockchain Connection:

```bash
curl http://localhost:5000/api/blockchain/status
```

### Check Frontend:

Open http://localhost:3000 in your browser

## 🛑 Stopping the Application

### Option 1: Stop All Services (if using npm run dev)

```bash
# In the terminal running npm run dev
Ctrl + C (Windows/Linux) or Cmd + C (Mac)
```

### Option 2: Stop Services Individually

#### Stop Frontend:

```bash
# In frontend terminal
Ctrl + C
```

#### Stop Backend:

```bash
# In backend terminal
Ctrl + C
```

#### Stop Ganache:

```bash
# In Ganache terminal
Ctrl + C
```

## 🔄 Restart Process

### Quick Restart:

```bash
# From root directory
npm run dev
```

### Full Reset (if needed):

```bash
# Stop all services first, then:
cd blockchain
truffle migrate --reset
cd ..
npm run dev
```

## 🐛 Troubleshooting

### Common Issues:

#### 1. Port Already in Use

```bash
# Kill processes on ports
npx kill-port 3000
npx kill-port 5000
npx kill-port 7545
```

#### 2. Database Issues

```bash
# Delete and recreate database
rm backend/database/grievance.db
# Restart backend - database will be recreated
```

#### 3. Blockchain Connection Issues

```bash
# Restart Ganache with reset
npx ganache-cli --host 127.0.0.1 --port 7545 --networkId 5777 --deterministic
```

#### 4. Node Modules Issues

```bash
# Clean install
rm -rf node_modules frontend/node_modules backend/node_modules
npm run install-all
```

## 📊 Monitoring & Logs

### View Backend Logs:

Backend logs will show in the terminal, including:

- API requests
- Database operations
- Blockchain connections
- Block creation activities

### View Frontend Logs:

Check browser console (F12) for frontend logs and errors.

### View Ganache Logs:

Ganache terminal shows blockchain transactions and operations.

## 🎉 Success Indicators

### Application Started Successfully When:

- ✅ Backend shows: "Server running on port 5000"
- ✅ Frontend shows: "webpack compiled successfully"
- ✅ Ganache shows: "Listening on 127.0.0.1:7545"
- ✅ Browser opens http://localhost:3000
- ✅ Health check returns {"status": "OK"}

### Block Management Working When:

- ✅ Admin can login successfully
- ✅ Block Management page loads
- ✅ Complaint preview shows data
- ✅ Block creation completes successfully
- ✅ Blockchain statistics update

## 📋 Development Commands

```bash
# Install dependencies
npm run install-all

# Start development mode
npm run dev

# Start individual services
npm run server    # Backend only
npm run client    # Frontend only
npm run blockchain # Ganache only

# Blockchain operations
npm run compile   # Compile smart contracts
npm run migrate   # Deploy contracts
npm run test      # Run blockchain tests
```

## 🔒 Security Notes

- Default admin password should be changed in production
- JWT secrets should be randomized
- Database should be secured with proper permissions
- HTTPS should be used in production
- Environment variables should be properly secured

---

**Ready to start? Run `npm run dev` from the root directory!** 🚀
