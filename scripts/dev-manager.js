const { spawn } = require('child_process');
const WebSocket = require('ws');
const path = require('path');

class DevManager {
  constructor() {
    this.processes = new Map();
    this.wss = null;
    this.isShuttingDown = false;
    this.clientConnected = false;
    this.heartbeatInterval = null;
    this.lastHeartbeat = Date.now();
    
    // Bind methods to preserve context
    this.gracefulShutdown = this.gracefulShutdown.bind(this);
    this.checkHeartbeat = this.checkHeartbeat.bind(this);
    
    // Handle process termination signals
    process.on('SIGINT', this.gracefulShutdown);
    process.on('SIGTERM', this.gracefulShutdown);
    process.on('exit', this.gracefulShutdown);
    process.on('uncaughtException', (error) => {
      console.error('❌ Uncaught Exception:', error);
      this.gracefulShutdown();
    });
  }

  async start() {
    console.log('🚀 Starting Student Grievance System with Auto-Shutdown...\n');
    
    try {
      // Start WebSocket server for heartbeat
      await this.startWebSocketServer();
      
      // Start backend first
      await this.startBackend();
      
      // Wait for backend to be ready
      await this.waitForBackend();
      
      // Start frontend
      await this.startFrontend();
      
      // Wait for frontend to be ready
      await this.waitForFrontend();
      
      // Start heartbeat monitoring
      this.startHeartbeatMonitoring();
      
      console.log('\n✅ All services started successfully!');
      console.log('📱 Frontend: http://localhost:3000');
      console.log('🔧 Backend:  http://localhost:5000');
      console.log('💡 WebSocket: ws://localhost:8080');
      console.log('\n🔄 Auto-shutdown enabled - close browser tab to stop all services\n');
      
    } catch (error) {
      console.error('❌ Failed to start services:', error);
      await this.gracefulShutdown();
      process.exit(1);
    }
  }

  async startWebSocketServer() {
    return new Promise((resolve, reject) => {
      try {
        this.wss = new WebSocket.Server({ port: 8080 });
        
        this.wss.on('connection', (ws) => {
          console.log('🔗 Frontend connected to heartbeat service');
          this.clientConnected = true;
          this.lastHeartbeat = Date.now();
          
          ws.on('message', (message) => {
            try {
              const data = JSON.parse(message);
              if (data.type === 'heartbeat') {
                this.lastHeartbeat = Date.now();
              } else if (data.type === 'shutdown') {
                console.log('🛑 Shutdown signal received from frontend');
                this.gracefulShutdown();
              }
            } catch (err) {
              console.warn('⚠️ Invalid message received:', message.toString());
            }
          });
          
          ws.on('close', () => {
            console.log('💔 Frontend disconnected from heartbeat service');
            this.clientConnected = false;
            // Give a short grace period before shutdown
            setTimeout(() => {
              if (!this.clientConnected && !this.isShuttingDown) {
                console.log('🛑 No client reconnection detected, initiating shutdown...');
                this.gracefulShutdown();
              }
            }, 2000);
          });
        });
        
        this.wss.on('listening', () => {
          console.log('💡 WebSocket heartbeat server started on port 8080');
          resolve();
        });
        
        this.wss.on('error', reject);
        
      } catch (error) {
        reject(error);
      }
    });
  }

  async startBackend() {
    return new Promise((resolve, reject) => {
      console.log('🔧 Starting backend server...');
      
      const backend = spawn('npm', ['run', 'dev'], {
        cwd: path.join(__dirname, '../backend'),
        stdio: ['inherit', 'pipe', 'pipe'],
        shell: true
      });

      this.processes.set('backend', backend);

      let output = '';
      
      backend.stdout.on('data', (data) => {
        const text = data.toString();
        output += text;
        process.stdout.write(`[BACKEND] ${text}`);
        
        // Check if backend is ready
        if (text.includes('Student Grievance System API running on port 5000')) {
          resolve();
        }
      });

      backend.stderr.on('data', (data) => {
        const text = data.toString();
        process.stderr.write(`[BACKEND ERROR] ${text}`);
      });

      backend.on('error', (error) => {
        console.error('❌ Backend process error:', error);
        reject(error);
      });

      backend.on('exit', (code) => {
        if (code !== 0 && !this.isShuttingDown) {
          console.error(`❌ Backend exited with code ${code}`);
          reject(new Error(`Backend process exited with code ${code}`));
        }
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        if (!output.includes('Student Grievance System API running on port 5000')) {
          reject(new Error('Backend startup timeout'));
        }
      }, 30000);
    });
  }

  async startFrontend() {
    return new Promise((resolve, reject) => {
      console.log('📱 Starting frontend server...');
      
      const frontend = spawn('npm', ['start'], {
        cwd: path.join(__dirname, '../frontend'),
        stdio: ['inherit', 'pipe', 'pipe'],
        shell: true,
        env: { ...process.env, BROWSER: 'none' } // Prevent auto-opening browser
      });

      this.processes.set('frontend', frontend);

      let output = '';
      
      frontend.stdout.on('data', (data) => {
        const text = data.toString();
        output += text;
        process.stdout.write(`[FRONTEND] ${text}`);
        
        // Check if frontend is ready
        if (text.includes('webpack compiled successfully') || text.includes('Compiled successfully')) {
          resolve();
        }
      });

      frontend.stderr.on('data', (data) => {
        const text = data.toString();
        // Filter out common warnings
        if (!text.includes('DeprecationWarning') && !text.includes('ExperimentalWarning')) {
          process.stderr.write(`[FRONTEND] ${text}`);
        }
      });

      frontend.on('error', (error) => {
        console.error('❌ Frontend process error:', error);
        reject(error);
      });

      frontend.on('exit', (code) => {
        if (code !== 0 && !this.isShuttingDown) {
          console.error(`❌ Frontend exited with code ${code}`);
          reject(new Error(`Frontend process exited with code ${code}`));
        }
      });

      // Timeout after 60 seconds
      setTimeout(() => {
        if (!output.includes('webpack compiled successfully') && !output.includes('Compiled successfully')) {
          reject(new Error('Frontend startup timeout'));
        }
      }, 60000);
    });
  }

  async waitForBackend() {
    const waitOn = require('wait-on');
    console.log('⏳ Waiting for backend to be ready...');
    
    try {
      await waitOn({
        resources: ['http://localhost:5000/api/dev/health'],
        timeout: 30000,
        interval: 1000
      });
      console.log('✅ Backend is ready');
    } catch (error) {
      throw new Error('Backend failed to start within timeout period');
    }
  }

  async waitForFrontend() {
    const waitOn = require('wait-on');
    console.log('⏳ Waiting for frontend to be ready...');
    
    try {
      await waitOn({
        resources: ['http://localhost:3000'],
        timeout: 60000,
        interval: 1000
      });
      console.log('✅ Frontend is ready');
    } catch (error) {
      throw new Error('Frontend failed to start within timeout period');
    }
  }

  startHeartbeatMonitoring() {
    this.heartbeatInterval = setInterval(this.checkHeartbeat, 10000); // Check every 10 seconds
  }

  checkHeartbeat() {
    const now = Date.now();
    const timeSinceLastHeartbeat = now - this.lastHeartbeat;
    
    // If no heartbeat for 30 seconds and client was connected, initiate shutdown
    if (this.clientConnected && timeSinceLastHeartbeat > 30000) {
      console.log('💔 Heartbeat timeout detected, initiating shutdown...');
      this.gracefulShutdown();
    }
  }

  async gracefulShutdown() {
    if (this.isShuttingDown) return;
    
    this.isShuttingDown = true;
    console.log('\n🛑 Initiating graceful shutdown...');

    // Clear heartbeat interval
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Close WebSocket server
    if (this.wss) {
      console.log('🔌 Closing WebSocket server...');
      this.wss.close();
    }

    // Kill all processes
    for (const [name, process] of this.processes) {
      try {
        console.log(`🔄 Stopping ${name}...`);
        
        if (process && !process.killed) {
          // Try graceful shutdown first
          process.kill('SIGTERM');
          
          // Force kill after 5 seconds if still running
          setTimeout(() => {
            if (!process.killed) {
              console.log(`⚡ Force killing ${name}...`);
              process.kill('SIGKILL');
            }
          }, 5000);
        }
      } catch (error) {
        console.warn(`⚠️ Error stopping ${name}:`, error.message);
      }
    }

    console.log('✅ Graceful shutdown completed');
    
    // Give processes time to cleanup
    setTimeout(() => {
      process.exit(0);
    }, 6000);
  }
}

// Start the development manager
const devManager = new DevManager();
devManager.start().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
