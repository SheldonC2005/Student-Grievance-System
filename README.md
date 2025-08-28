# 🎓 Student Grievance System

A comprehensive blockchain-based student grievance system with **AI-powered complaint classification**, **manual block creation**, and **transparent ledger management**.

## ✨ Key Features

- **🏗️ Manual Block Creation**: Admin-controlled blockchain block generation with AI classification
- **🤖 AI-Powered Processing**: Sentiment analysis assigns Critical/High/Normal priority weights
- **🌳 Merkle Tree Verification**: Data integrity with hash(complaintId+ipfsHash+sqliteRowId)
- **👨‍💼 Admin Management**: Role-based authentication with block creation permissions
- **📊 Real-time Dashboard**: Statistics, category analysis, and priority breakdowns
- **🔍 Advanced Search**: Filter blocks by category, date, admin, complaint count
- **📤 Data Export**: JSON export for analysis and reporting
- **🔗 Blockchain Ledger**: Immutable complaint records using Ethereum
- **🦊 MetaMask Integration**: Secure wallet-based authentication for students
- **📁 IPFS Storage**: Decentralized file storage for complaint data
- **🔐 Dual Authentication**: Student registration + Admin role-based access

## 🚀 **Quick Start - Just 3 Steps!**

### ⚡ Easiest Method

1. **Open terminal** in project directory
2. **Run start script:**
   - **Windows**: Double-click `start.bat` OR run `start.bat`
   - **Mac/Linux**: Run `./start.sh`
3. **Access application**: Opens automatically at http://localhost:3000

### 🛑 Quick Stop

- **Windows**: Double-click `stop.bat` OR press `Ctrl+C`
- **Mac/Linux**: Run `./stop.sh` OR press `Ctrl+C`

---

## 📋 Manual Setup (Alternative)

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn package manager
- Ganache CLI (for blockchain simulation)
- MetaMask browser extension (optional, for students)

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd Student-Grievance-System
```

2. Install all dependencies:

```bash
npm run install-all
```

3. Set up environment variables:

   - Copy `.env.example` to `.env` in backend folder
   - Update JWT_SECRET and other configuration as needed
   - **Note**: SQLite database will be created automatically, no database setup required

4. Start Ganache blockchain (for full blockchain features):

```bash
npm run blockchain
```

5. Compile and deploy smart contracts (optional - system works without this):

```bash
npm run compile
npm run migrate
```

6. Start the application:

```bash
npm run dev
```

The application will run on:

- Frontend: http://localhost:3000
- Backend: http://localhost:5000
- Ganache: http://localhost:7545 (if running blockchain)

## Project Structure

```
Student-Grievance-System/
├── frontend/                 # React frontend
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── pages/           # Page components
│   │   ├── services/        # API and Web3 services
│   │   └── utils/           # Utility functions
├── backend/                 # Node.js backend
│   ├── routes/              # API routes
│   ├── models/              # Database models
│   ├── middleware/          # Express middleware
│   ├── services/            # Business logic
│   └── utils/               # Utility functions
└── blockchain/              # Smart contracts
    ├── contracts/           # Solidity contracts
    ├── migrations/          # Deployment scripts
    └── test/               # Contract tests
```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/metamask` - MetaMask authentication

### Complaints

- `GET /api/complaints` - Get all complaints
- `POST /api/complaints` - Submit new complaint
- `PUT /api/complaints/:id/escalate` - Escalate complaint priority
- `GET /api/complaints/similar` - Find similar complaints

### Blockchain

- `GET /api/blockchain/ledger` - Get blockchain ledger
- `POST /api/blockchain/verify` - Verify complaint on blockchain

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License.
