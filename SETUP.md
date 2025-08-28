# Student Grievance System - Quick Start Guide

## Prerequisites

Before starting, ensure you have the following installed:

1. **Node.js** (v16 or higher) - [Download](https://nodejs.org/)
2. **PostgreSQL** - [Download](https://www.postgresql.org/download/)
3. **Git** - [Download](https://git-scm.com/)
4. **MetaMask Browser Extension** - [Install](https://metamask.io/)

## Setup Instructions

### 1. Database Setup (PostgreSQL)

1. Start PostgreSQL service
2. Create database:

```sql
CREATE DATABASE grievance_system;
CREATE USER postgres WITH PASSWORD 'password';
GRANT ALL PRIVILEGES ON DATABASE grievance_system TO postgres;
```

### 2. Install Dependencies

All dependencies are already installed. If needed, run:

```bash
npm run install-all
```

### 3. Environment Configuration

Update the `.env` files:

**Backend** (`backend/.env`):

- Configure your PostgreSQL credentials
- Update JWT_SECRET for production

**Frontend** (`frontend/.env`):

- API URLs are pre-configured for local development

### 4. Start the System

#### Option A: Start Everything at Once

```bash
npm run dev
```

#### Option B: Start Individual Components

1. **Start Backend Server:**

```bash
npm run server
```

2. **Start Frontend (in new terminal):**

```bash
npm run client
```

3. **Start Ganache Blockchain (in new terminal):**

```bash
npm run blockchain
```

4. **Compile & Deploy Smart Contracts (in new terminal):**

```bash
npm run compile
npm run migrate
```

### 5. MetaMask Setup

1. Install MetaMask browser extension
2. Create/Import wallet
3. Add Ganache network:
   - Network Name: Ganache Local
   - RPC URL: http://127.0.0.1:7545
   - Chain ID: 1337 (or 5777)
   - Currency Symbol: ETH

### 6. Access the Application

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5000/api
- **Ganache Blockchain:** http://localhost:7545

## Features Implemented

✅ **Student Authentication**

- Traditional email/password login
- MetaMask wallet authentication
- JWT-based session management

✅ **Complaint Management**

- Category-based complaint submission
- AI-powered sentiment analysis
- Duplicate complaint detection
- Priority escalation system

✅ **Blockchain Integration**

- Ethereum smart contracts
- Immutable complaint records
- Transparent ledger view
- Hash verification

✅ **AI Features**

- Sentiment analysis using Natural Language Processing
- Similar complaint detection
- Automatic priority suggestions

✅ **IPFS Storage**

- Decentralized complaint storage
- File hash verification
- Data persistence

✅ **Security Features**

- Input validation
- Rate limiting
- Password hashing
- Secure JWT tokens

## Available NPM Scripts

- `npm run dev` - Start full development environment
- `npm run server` - Start backend server only
- `npm run client` - Start frontend only
- `npm run blockchain` - Start Ganache blockchain
- `npm run compile` - Compile smart contracts
- `npm run migrate` - Deploy smart contracts
- `npm run test` - Run blockchain tests
- `npm run install-all` - Install all dependencies

## Troubleshooting

### Common Issues

1. **Database Connection Error:**

   - Ensure PostgreSQL is running
   - Check credentials in `backend/.env`

2. **MetaMask Connection Issues:**

   - Make sure MetaMask is unlocked
   - Check network configuration
   - Ensure Ganache is running

3. **Port Already in Use:**

   - Frontend: Change port in package.json
   - Backend: Update PORT in .env file
   - Ganache: Modify blockchain script

4. **Smart Contract Deployment Failed:**
   - Ensure Ganache is running
   - Check network configuration in truffle-config.js
   - Verify account has sufficient ETH

### Development Tips

1. **Database Reset:**

   ```sql
   DROP DATABASE grievance_system;
   CREATE DATABASE grievance_system;
   ```

2. **Clear Browser Data:**

   - Clear localStorage for fresh start
   - Reset MetaMask account if needed

3. **Restart Services:**
   - Stop all running processes
   - Start Ganache first
   - Then backend, then frontend

## Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React.js      │    │   Node.js       │    │   PostgreSQL    │
│   Frontend      │◄──►│   Backend       │◄──►│   Database      │
│   (Port 3000)   │    │   (Port 5000)   │    │   (Port 5432)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │
         │                       ▼
         │              ┌─────────────────┐
         │              │   IPFS Node     │
         │              │   (Port 5001)   │
         │              └─────────────────┘
         │
         ▼
┌─────────────────┐    ┌─────────────────┐
│   MetaMask      │◄──►│   Ganache       │
│   Wallet        │    │   Blockchain    │
│                 │    │   (Port 7545)   │
└─────────────────┘    └─────────────────┘
```

## Next Steps

1. **Test the System:**

   - Register a new student account
   - Submit complaints in different categories
   - Test MetaMask authentication
   - Verify blockchain records

2. **Customize:**

   - Add more complaint categories
   - Modify AI analysis parameters
   - Update UI themes and branding

3. **Deploy to Production:**
   - Set up production database
   - Configure environment variables
   - Deploy to cloud platforms
   - Set up monitoring and logging

For any issues or questions, refer to the main README.md file or check the individual component documentation.
