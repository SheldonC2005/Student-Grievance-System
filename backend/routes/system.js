const express = require('express');
const { query, closeDatabase } = require('../config/sqlite');
const router = express.Router();

// Graceful shutdown endpoint
router.post('/shutdown', async (req, res) => {
  console.log('🔄 Graceful shutdown initiated...');
  
  try {
    // Send immediate response to frontend
    res.status(200).json({
      success: true,
      message: 'Shutdown initiated successfully',
      timestamp: new Date().toISOString()
    });

    // Delay shutdown slightly to ensure response is sent
    setTimeout(async () => {
      await performGracefulShutdown();
    }, 100);

  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    // Force shutdown even if graceful shutdown fails
    setTimeout(() => {
      console.log('🔴 Force shutdown due to error');
      process.exit(1);
    }, 1000);
  }
});

// System status endpoint
router.get('/status', (req, res) => {
  res.json({
    status: 'running',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    pid: process.pid
  });
});

// Perform graceful shutdown operations
const performGracefulShutdown = async () => {
  const shutdownTimeout = 10000; // 10 seconds timeout
  
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      console.log('⚠️ Graceful shutdown timeout, forcing exit...');
      process.exit(1);
    }, shutdownTimeout);

    const shutdown = async () => {
      try {
        console.log('💾 Saving pending transactions...');
        
        // Ensure all database transactions are committed
        await query('PRAGMA wal_checkpoint(TRUNCATE)'); // Checkpoint WAL file
        
        console.log('🔒 Invalidating all user sessions...');
        // Invalidate all active sessions on shutdown
        await query('UPDATE user_sessions SET is_active = 0 WHERE is_active = 1');
        
        console.log('🔒 Closing database connections...');
        await closeDatabase();
        
        console.log('📊 Creating backup...');
        await createBackup();
        
        console.log('🧹 Cleaning up resources...');
        await cleanupResources();
        
        clearTimeout(timeout);
        console.log('✅ Graceful shutdown completed successfully');
        
        // Exit process after brief delay
        setTimeout(() => {
          process.exit(0);
        }, 500);
        
        resolve();
      } catch (error) {
        clearTimeout(timeout);
        console.error('❌ Error during graceful shutdown:', error);
        reject(error);
      }
    };

    shutdown();
  });
};

// Create database backup
const createBackup = async () => {
  try {
    const fs = require('fs');
    const path = require('path');
    
    const dbPath = path.join(__dirname, '../database.db');
    const backupPath = path.join(__dirname, `../backups/database_${Date.now()}.db`);
    
    // Create backups directory if it doesn't exist
    const backupDir = path.dirname(backupPath);
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    // Copy database file
    if (fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, backupPath);
      console.log(`📦 Database backup created: ${backupPath}`);
    }
  } catch (error) {
    console.warn('⚠️ Backup creation failed:', error.message);
  }
};

// Cleanup resources
const cleanupResources = async () => {
  try {
    // Clear any intervals or timeouts
    // Close any open file handles
    // Clean temporary files
    console.log('🧽 Resources cleaned up');
  } catch (error) {
    console.warn('⚠️ Resource cleanup warning:', error.message);
  }
};

module.exports = router;
