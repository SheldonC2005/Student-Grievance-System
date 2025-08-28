const express = require('express');
const WebSocket = require('ws');

const router = express.Router();

/**
 * Development heartbeat service for auto-shutdown functionality
 * This service is only active in development mode
 */

let heartbeatWs = null;
let isDevMode = process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production';

/**
 * Initialize heartbeat service
 */
const initHeartbeatService = () => {
  if (!isDevMode) return;
  
  console.log('💓 Initializing development heartbeat service...');
  
  // Connect to the dev manager WebSocket server
  try {
    heartbeatWs = new WebSocket('ws://localhost:8080');
    
    heartbeatWs.on('open', () => {
      console.log('🔗 Connected to development manager');
    });
    
    heartbeatWs.on('error', (error) => {
      // Silently handle connection errors in case dev manager isn't running
      if (error.code !== 'ECONNREFUSED') {
        console.warn('⚠️ Heartbeat service connection error:', error.message);
      }
    });
    
    heartbeatWs.on('close', () => {
      console.log('💔 Disconnected from development manager');
    });
    
  } catch (error) {
    // Silently handle initialization errors
  }
};

/**
 * Send shutdown signal to development manager
 */
const signalShutdown = () => {
  if (heartbeatWs && heartbeatWs.readyState === WebSocket.OPEN) {
    heartbeatWs.send(JSON.stringify({ type: 'shutdown', timestamp: Date.now() }));
  }
};

/**
 * API endpoint to trigger development shutdown
 * POST /api/dev/shutdown
 */
router.post('/shutdown', (req, res) => {
  if (!isDevMode) {
    return res.status(403).json({
      error: 'Shutdown endpoint only available in development mode'
    });
  }
  
  console.log('🛑 Development shutdown requested via API');
  
  res.json({
    success: true,
    message: 'Shutdown signal sent'
  });
  
  // Send shutdown signal
  signalShutdown();
  
  // Give time for response to be sent before shutting down
  setTimeout(() => {
    process.exit(0);
  }, 1000);
});

/**
 * Health check endpoint
 * GET /api/dev/health
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: isDevMode ? 'development' : 'production',
    heartbeat: heartbeatWs ? heartbeatWs.readyState === WebSocket.OPEN : false,
    timestamp: new Date().toISOString()
  });
});

/**
 * Development status endpoint
 * GET /api/dev/status
 */
router.get('/status', (req, res) => {
  if (!isDevMode) {
    return res.status(403).json({
      error: 'Development endpoints only available in development mode'
    });
  }
  
  res.json({
    devMode: isDevMode,
    heartbeatConnected: heartbeatWs ? heartbeatWs.readyState === WebSocket.OPEN : false,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString()
  });
});

// Initialize heartbeat service when module is loaded
setTimeout(initHeartbeatService, 2000); // Small delay to let dev manager start first

module.exports = {
  router,
  initHeartbeatService,
  signalShutdown
};
