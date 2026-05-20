const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const complaintRoutes = require('./routes/complaints');
const blockchainRoutes = require('./routes/blockchain');
const systemRoutes = require('./routes/system');
const systemManagementRoutes = require('./routes/systemManagement');
const adminAuthRoutes = require('./routes/adminAuth');
const blockManagementRoutes = require('./routes/blockManagement');
const { router: devRoutes } = require('./routes/dev');
const { initializeDatabase } = require('./config/sqlite');
const { ipfsService } = require('./services/ipfsService');
const { blockchainService } = require('./services/blockchainService');
const { createDefaultUsers } = require('./seeds/defaultUsers');

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy for development (needed for rate limiting)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/blockchain', blockchainRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/admin', systemManagementRoutes);
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/admin/blocks', blockManagementRoutes);
app.use('/api/dev', devRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'Student Grievance System API is running',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Graceful shutdown handlers
const { closeDatabase } = require('./config/sqlite');

// Initialize all services
const initializeServices = async () => {
  try {
    console.log('🚀 Initializing Student Grievance System...');
    
    // Initialize database
    console.log('📊 Initializing database...');
    await initializeDatabase();
    
    // Create default users for testing
    await createDefaultUsers();
    
    // Initialize IPFS service
    console.log('📡 Initializing IPFS service...');
    await ipfsService.initialize();
    
    // Initialize blockchain service
    console.log('🔗 Initializing blockchain service...');
    await blockchainService.initialize();
    
    console.log('✅ All services initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ Service initialization failed:', error);
    return false;
  }
};

// Start server
const startServer = async () => {
  const servicesReady = await initializeServices();
  
  if (!servicesReady) {
    console.log('⚠️ Some services failed to initialize, continuing with limited functionality...');
  }
  
  app.listen(PORT, () => {
    console.log(`✅ Student Grievance System API running on port ${PORT}`);
    console.log(`🌐 CORS enabled for: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
    console.log(`📊 Database: SQLite`);
    console.log(`📡 IPFS: ${ipfsService.isConnected ? 'Connected' : 'Mock mode'}`);
    console.log(`🔗 Blockchain: ${blockchainService.isConnected ? 'Connected to Ganache' : 'Mock mode'}`);
  });
};

// Signal handlers for graceful shutdown
process.on('SIGTERM', () => {
  console.log('📡 Received SIGTERM, starting graceful shutdown...');
  gracefulShutdown().then(() => process.exit(0));
});

process.on('SIGINT', () => {
  console.log('📡 Received SIGINT, starting graceful shutdown...');
  gracefulShutdown().then(() => process.exit(0));
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  console.log('🚨 Initiating emergency shutdown due to uncaught exception...');
  
  // Emergency shutdown for all services
  try {
    ipfsService.emergencyShutdown();
    blockchainService.emergencyShutdown();
  } catch (emergencyError) {
    console.error('❌ Emergency shutdown failed:', emergencyError);
  }
  
  gracefulShutdown().then(() => process.exit(1));
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  console.log('🚨 Initiating emergency shutdown due to unhandled rejection...');
  
  // Emergency shutdown for all services
  try {
    ipfsService.emergencyShutdown();
    blockchainService.emergencyShutdown();
  } catch (emergencyError) {
    console.error('❌ Emergency shutdown failed:', emergencyError);
  }
  
  gracefulShutdown().then(() => process.exit(1));
});

// Handle additional shutdown signals
process.on('SIGHUP', () => {
  console.log('📡 Received SIGHUP, starting graceful shutdown...');
  gracefulShutdown().then(() => process.exit(0));
});

process.on('SIGBREAK', () => {
  console.log('📡 Received SIGBREAK, starting graceful shutdown...');
  gracefulShutdown().then(() => process.exit(0));
});

let isShuttingDown = false;

const gracefulShutdown = async () => {
  if (isShuttingDown) {
    console.log('⚠️ Shutdown already in progress, skipping...');
    return;
  }
  isShuttingDown = true;
  
  try {
    console.log('💾 Shutting down services...');
    
    // Start shutdown procedures in parallel for faster shutdown
    const shutdownPromises = [];
    
    // Shutdown IPFS service
    console.log('📡 Shutting down IPFS service...');
    shutdownPromises.push(
      ipfsService.shutdown().catch(error => 
        console.error('❌ IPFS shutdown error:', error)
      )
    );
    
    // Shutdown blockchain service
    console.log('🔗 Shutting down blockchain service...');
    shutdownPromises.push(
      blockchainService.shutdown().catch(error => 
        console.error('❌ Blockchain shutdown error:', error)
      )
    );
    
    // Wait for all service shutdowns to complete (with timeout)
    try {
      await Promise.race([
        Promise.all(shutdownPromises),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Shutdown timeout')), 10000)
        )
      ]);
      console.log('✅ All services shutdown completed');
    } catch (timeoutError) {
      console.warn('⚠️ Shutdown timeout reached, forcing emergency shutdown...');
      // Emergency shutdown for unresponsive services
      try {
        ipfsService.emergencyShutdown();
        blockchainService.emergencyShutdown();
      } catch (emergencyError) {
        console.error('❌ Emergency shutdown error:', emergencyError);
      }
    }
    
    // Close database connections
    console.log('💾 Closing database connections...');
    await closeDatabase();
    
    console.log('✅ Graceful shutdown completed');
  } catch (error) {
    console.error('❌ Error during graceful shutdown:', error);
    
    // Emergency cleanup as last resort
    try {
      console.log('🚨 Performing emergency cleanup...');
      ipfsService.emergencyShutdown();
      blockchainService.emergencyShutdown();
      console.log('🚨 Emergency cleanup completed');
    } catch (emergencyError) {
      console.error('❌ Emergency cleanup failed:', emergencyError);
    }
  }
};

// Start the server
startServer();
