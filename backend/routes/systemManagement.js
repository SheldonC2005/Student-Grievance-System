const express = require('express');
const { ipfsService } = require('../services/ipfsService');
const { blockchainService } = require('../services/blockchainService');
const { closeDatabase } = require('../config/sqlite');
const router = express.Router();

// System-wide health check
router.get('/health', async (req, res) => {
  try {
    const healthStatus = {
      system: {
        status: 'operational',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        platform: process.platform,
        nodeVersion: process.version,
        pid: process.pid,
        timestamp: new Date().toISOString()
      },
      services: {
        ipfs: ipfsService.isHealthy(),
        blockchain: blockchainService.isHealthy(),
        database: {
          status: 'connected', // Assuming SQLite is always available
          type: 'SQLite'
        }
      },
      environment: {
        nodeEnv: process.env.NODE_ENV || 'development',
        port: process.env.PORT || 5000,
        frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000'
      }
    };

    // Determine overall system health
    const servicesHealthy = Object.values(healthStatus.services).every(service => 
      service.connected !== false && service.status !== 'error'
    );
    
    healthStatus.system.status = servicesHealthy ? 'healthy' : 'degraded';

    res.json({
      success: true,
      health: healthStatus
    });
  } catch (error) {
    console.error('System health check error:', error);
    res.status(500).json({ 
      error: 'System health check failed',
      details: error.message
    });
  }
});

// Comprehensive system status
router.get('/status', async (req, res) => {
  try {
    const systemStatus = {
      application: {
        name: 'Student Grievance System',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        uptime: process.uptime(),
        startTime: new Date(Date.now() - process.uptime() * 1000).toISOString(),
        currentTime: new Date().toISOString()
      },
      blockchain: await blockchainService.getServiceStatus(),
      ipfs: {
        ...ipfsService.isHealthy(),
        status: await ipfsService.getStatus()
      },
      system: {
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        pid: process.pid
      }
    };

    res.json({
      success: true,
      status: systemStatus
    });
  } catch (error) {
    console.error('System status error:', error);
    res.status(500).json({ 
      error: 'System status check failed',
      details: error.message
    });
  }
});

// Graceful shutdown endpoint
router.post('/shutdown', async (req, res) => {
  try {
    const { force = false } = req.body;
    
    console.log(`🔄 System shutdown requested via API (force: ${force})`);
    
    // Send response immediately before shutting down
    res.json({
      success: true,
      message: 'System shutdown initiated',
      force: force,
      timestamp: new Date().toISOString()
    });

    // Perform shutdown after response is sent
    setImmediate(async () => {
      try {
        if (force) {
          console.log('🚨 Force shutdown requested');
          ipfsService.emergencyShutdown();
          blockchainService.emergencyShutdown();
          process.exit(0);
        } else {
          console.log('💾 Graceful shutdown initiated');
          
          // Shutdown services
          await ipfsService.shutdown();
          await blockchainService.shutdown();
          await closeDatabase();
          
          console.log('✅ Graceful shutdown completed');
          process.exit(0);
        }
      } catch (shutdownError) {
        console.error('❌ Shutdown error:', shutdownError);
        process.exit(1);
      }
    });
  } catch (error) {
    console.error('Shutdown endpoint error:', error);
    res.status(500).json({ 
      error: 'Shutdown request failed',
      details: error.message
    });
  }
});

// Restart services
router.post('/restart', async (req, res) => {
  try {
    console.log('🔄 Service restart requested');
    
    const results = {
      ipfs: { success: false, message: '' },
      blockchain: { success: false, message: '' }
    };

    // Restart IPFS service
    try {
      await ipfsService.shutdown();
      await new Promise(resolve => setTimeout(resolve, 1000));
      const ipfsSuccess = await ipfsService.initialize();
      results.ipfs = {
        success: ipfsSuccess,
        message: ipfsSuccess ? 'IPFS restarted successfully' : 'IPFS restart failed'
      };
    } catch (ipfsError) {
      results.ipfs = {
        success: false,
        message: `IPFS restart error: ${ipfsError.message}`
      };
    }

    // Restart blockchain service
    try {
      await blockchainService.shutdown();
      await new Promise(resolve => setTimeout(resolve, 1000));
      const blockchainSuccess = await blockchainService.initialize();
      results.blockchain = {
        success: blockchainSuccess,
        message: blockchainSuccess ? 'Blockchain restarted successfully' : 'Blockchain restart failed'
      };
    } catch (blockchainError) {
      results.blockchain = {
        success: false,
        message: `Blockchain restart error: ${blockchainError.message}`
      };
    }

    const overallSuccess = results.ipfs.success || results.blockchain.success;

    res.json({
      success: overallSuccess,
      message: 'Service restart completed',
      results: results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Restart error:', error);
    res.status(500).json({ 
      error: 'Service restart failed',
      details: error.message
    });
  }
});

// Emergency stop all services
router.post('/emergency-stop', async (req, res) => {
  try {
    console.log('🚨 Emergency stop requested for all services');
    
    // Immediate emergency shutdown
    ipfsService.emergencyShutdown();
    blockchainService.emergencyShutdown();
    
    res.json({
      success: true,
      message: 'Emergency stop completed - all services halted',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Emergency stop error:', error);
    res.status(500).json({ 
      error: 'Emergency stop failed',
      details: error.message
    });
  }
});

// System metrics and performance data
router.get('/metrics', async (req, res) => {
  try {
    const metrics = {
      process: {
        pid: process.pid,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
        version: process.version,
        platform: process.platform,
        arch: process.arch
      },
      system: {
        loadAverage: require('os').loadavg(),
        totalMemory: require('os').totalmem(),
        freeMemory: require('os').freemem(),
        cpus: require('os').cpus().length,
        hostname: require('os').hostname(),
        type: require('os').type(),
        release: require('os').release()
      },
      services: {
        ipfs: ipfsService.isHealthy(),
        blockchain: blockchainService.isHealthy()
      },
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      metrics: metrics
    });
  } catch (error) {
    console.error('Metrics error:', error);
    res.status(500).json({ 
      error: 'Failed to get system metrics',
      details: error.message
    });
  }
});

module.exports = router;
