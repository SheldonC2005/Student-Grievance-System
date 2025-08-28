const express = require('express');
const { blockchainService } = require('../services/blockchainService');
const router = express.Router();

// Get blockchain status
router.get('/status', async (req, res) => {
  try {
    console.log('🔍 Blockchain status requested');
    
    const status = {
      isConnected: blockchainService.isConnected,
      network: blockchainService.networkId || 'unknown',
      contractAddress: blockchainService.contractAddress || 'not deployed',
    };
    
    // Only get test accounts if connected
    if (blockchainService.isConnected) {
      status.testAccounts = await blockchainService.getTestAccounts();
    } else {
      status.testAccounts = [];
    }
    
    res.json({
      success: true,
      blockchain: status
    });
  } catch (error) {
    console.error('Blockchain status error:', error);
    res.status(500).json({ 
      error: 'Failed to get blockchain status',
      details: error.message
    });
  }
});

// Get test accounts
router.get('/accounts', async (req, res) => {
  try {
    const accounts = await blockchainService.getTestAccounts();
    
    res.json({
      success: true,
      accounts: accounts
    });
  } catch (error) {
    console.error('Get accounts error:', error);
    res.status(500).json({ 
      error: 'Failed to get test accounts' 
    });
  }
});

// Test complaint submission to blockchain
router.post('/test-complaint', async (req, res) => {
  try {
    const testComplaint = {
      title: 'Test Academic Issue',
      description: 'This is a test complaint to verify blockchain integration',
      category: 'academic',
      priority: 'medium',
      studentId: 'TEST123',
      evidence: [],
      timestamp: new Date().toISOString()
    };
    
    const result = await blockchainService.submitComplaint(testComplaint, 1);
    
    res.json({
      success: true,
      message: 'Test complaint submitted to blockchain',
      transaction: result
    });
  } catch (error) {
    console.error('Test complaint error:', error);
    res.status(500).json({ 
      error: 'Failed to submit test complaint',
      details: error.message
    });
  }
});

// Get complaint from blockchain
router.get('/complaint/:id', async (req, res) => {
  try {
    const complaintId = parseInt(req.params.id);
    
    if (isNaN(complaintId)) {
      return res.status(400).json({ error: 'Invalid complaint ID' });
    }
    
    const complaint = await blockchainService.getComplaint(complaintId);
    
    res.json({
      success: true,
      complaint: complaint
    });
  } catch (error) {
    console.error('Get complaint error:', error);
    res.status(500).json({ 
      error: 'Failed to get complaint from blockchain',
      details: error.message
    });
  }
});

// Graceful shutdown endpoint for blockchain services
router.post('/shutdown', async (req, res) => {
  try {
    console.log('🔄 Blockchain service shutdown requested via API');
    
    // Perform blockchain service shutdown
    await blockchainService.shutdown();
    
    res.json({
      success: true,
      message: 'Blockchain service shutdown completed',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Blockchain shutdown error:', error);
    res.status(500).json({ 
      error: 'Failed to shutdown blockchain service',
      details: error.message
    });
  }
});

// Health check with detailed service status
router.get('/health', async (req, res) => {
  try {
    const healthStatus = {
      blockchain: {
        isConnected: blockchainService.isConnected,
        network: blockchainService.networkId || 'unknown',
        contractAddress: blockchainService.contractAddress || 'not deployed',
        status: blockchainService.isConnected ? 'healthy' : 'mock'
      },
      services: {
        provider: blockchainService.provider ? 'active' : 'inactive',
        contract: blockchainService.contract ? 'loaded' : 'not loaded',
        signer: blockchainService.signer ? 'available' : 'not available'
      },
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    };

    // Additional network info if connected
    if (blockchainService.isConnected && blockchainService.provider) {
      try {
        const blockNumber = await blockchainService.provider.getBlockNumber();
        const network = await blockchainService.provider.getNetwork();
        
        healthStatus.blockchain.blockNumber = blockNumber;
        healthStatus.blockchain.chainId = network.chainId.toString();
      } catch (networkError) {
        healthStatus.blockchain.networkError = networkError.message;
      }
    }

    res.json({
      success: true,
      health: healthStatus
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({ 
      error: 'Health check failed',
      details: error.message
    });
  }
});

// Force reconnection to blockchain
router.post('/reconnect', async (req, res) => {
  try {
    console.log('🔄 Blockchain reconnection requested');
    
    // Shutdown current connection
    await blockchainService.shutdown();
    
    // Wait a moment for cleanup
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Reinitialize connection
    const success = await blockchainService.initialize();
    
    res.json({
      success: success,
      message: success ? 'Blockchain reconnection successful' : 'Blockchain reconnection failed',
      isConnected: blockchainService.isConnected,
      network: blockchainService.networkId,
      contractAddress: blockchainService.contractAddress,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Reconnection error:', error);
    res.status(500).json({ 
      error: 'Failed to reconnect to blockchain',
      details: error.message
    });
  }
});

// Emergency stop for all blockchain operations
router.post('/emergency-stop', async (req, res) => {
  try {
    console.log('🚨 Emergency stop requested for blockchain services');
    
    // Immediate shutdown without waiting
    blockchainService.isConnected = false;
    blockchainService.contract = null;
    blockchainService.provider = null;
    blockchainService.signer = null;
    
    res.json({
      success: true,
      message: 'Emergency stop completed - all blockchain operations halted',
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

// Get detailed service metrics
router.get('/metrics', async (req, res) => {
  try {
    const metrics = {
      blockchain: {
        isConnected: blockchainService.isConnected,
        networkId: blockchainService.networkId,
        contractAddress: blockchainService.contractAddress,
        testAccountsCount: blockchainService.predefinedAccounts ? blockchainService.predefinedAccounts.length : 0
      },
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage()
      },
      application: {
        environment: process.env.NODE_ENV || 'development',
        pid: process.pid,
        timestamp: new Date().toISOString()
      }
    };

    // Add blockchain-specific metrics if connected
    if (blockchainService.isConnected) {
      try {
        const status = await blockchainService.getStatus();
        metrics.blockchain.detailedStatus = status;
      } catch (statusError) {
        metrics.blockchain.statusError = statusError.message;
      }
    }

    res.json({
      success: true,
      metrics: metrics
    });
  } catch (error) {
    console.error('Metrics error:', error);
    res.status(500).json({ 
      error: 'Failed to get metrics',
      details: error.message
    });
  }
});

// Test connection to specific blockchain network
router.post('/test-connection', async (req, res) => {
  try {
    const { rpcUrl = 'http://127.0.0.1:7545' } = req.body;
    
    console.log(`🔍 Testing connection to: ${rpcUrl}`);
    
    // Test connection without affecting current service
    const { ethers } = require('ethers');
    const testProvider = new ethers.JsonRpcProvider(rpcUrl);
    
    try {
      const network = await testProvider.getNetwork();
      const blockNumber = await testProvider.getBlockNumber();
      
      res.json({
        success: true,
        connection: {
          rpcUrl: rpcUrl,
          chainId: network.chainId.toString(),
          blockNumber: blockNumber,
          status: 'connected'
        },
        timestamp: new Date().toISOString()
      });
    } catch (connectionError) {
      res.json({
        success: false,
        connection: {
          rpcUrl: rpcUrl,
          status: 'failed',
          error: connectionError.message
        },
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Connection test error:', error);
    res.status(500).json({ 
      error: 'Connection test failed',
      details: error.message
    });
  }
});

// Get blockchain ledger - all complaints recorded on blockchain
router.get('/ledger', async (req, res) => {
  try {
    console.log('📖 Blockchain ledger requested');
    
    const ledger = await blockchainService.getAllBlockchainComplaints();
    
    res.json({
      success: true,
      ledger: ledger || [],
      count: ledger ? ledger.length : 0
    });
  } catch (error) {
    console.error('Get blockchain ledger error:', error);
    res.status(500).json({ 
      error: 'Failed to get blockchain ledger',
      details: error.message
    });
  }
});

// Get contract information
router.get('/contract-info', async (req, res) => {
  try {
    console.log('📋 Contract info requested');
    
    const contractInfo = await blockchainService.getContractInfo();
    
    res.json({
      success: true,
      contract: contractInfo
    });
  } catch (error) {
    console.error('Get contract info error:', error);
    res.status(500).json({ 
      error: 'Failed to get contract information',
      details: error.message
    });
  }
});

// Verify complaint on blockchain
router.get('/verify/:complaintId', async (req, res) => {
  try {
    const { complaintId } = req.params;
    console.log(`🔍 Verifying complaint ${complaintId} on blockchain`);
    
    const verification = await blockchainService.verifyComplaint(complaintId);
    
    res.json({
      success: true,
      verification: verification
    });
  } catch (error) {
    console.error('Verify complaint error:', error);
    res.status(500).json({ 
      error: 'Failed to verify complaint on blockchain',
      details: error.message
    });
  }
});

// Get blockchain statistics
router.get('/stats', async (req, res) => {
  try {
    console.log('📊 Blockchain stats requested');
    
    const stats = await blockchainService.getBlockchainStats();
    
    res.json({
      success: true,
      stats: stats
    });
  } catch (error) {
    console.error('Get blockchain stats error:', error);
    res.status(500).json({ 
      error: 'Failed to get blockchain statistics',
      details: error.message
    });
  }
});

// Test endpoint to submit a complaint to blockchain (for testing purposes)
router.post('/test-submit', async (req, res) => {
  try {
    console.log('🧪 Test blockchain submission requested');
    
    const testComplaint = {
      id: `TEST_${Date.now()}`,
      title: 'Test Blockchain Complaint',
      description: 'This is a test complaint submitted directly to blockchain for testing the ledger functionality.',
      category: 'academic',
      priority: 'medium',
      status: 'SUBMITTED',
      submittedAt: new Date()
    };
    
    const result = await blockchainService.submitComplaint(testComplaint);
    
    res.json({
      success: true,
      message: 'Test complaint submitted to blockchain',
      complaint: testComplaint,
      blockchain: result
    });
  } catch (error) {
    console.error('Test submission error:', error);
    res.status(500).json({ 
      error: 'Failed to submit test complaint to blockchain',
      details: error.message
    });
  }
});

module.exports = router;
