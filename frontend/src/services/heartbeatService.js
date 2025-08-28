/**
 * Development Heartbeat Service
 * Manages WebSocket connection to development manager for auto-shutdown functionality
 */

class HeartbeatService {
  constructor() {
    this.ws = null;
    this.heartbeatInterval = null;
    this.reconnectTimeout = null;
    this.isDevMode = process.env.NODE_ENV === 'development';
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 2000; // 2 seconds
    this.heartbeatFrequency = 5000; // 5 seconds
    this.isShuttingDown = false;
    
    // Bind methods to preserve context
    this.connect = this.connect.bind(this);
    this.sendHeartbeat = this.sendHeartbeat.bind(this);
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
    this.handleBeforeUnload = this.handleBeforeUnload.bind(this);
    this.handlePageHide = this.handlePageHide.bind(this);
    this.cleanup = this.cleanup.bind(this);
  }

  /**
   * Initialize the heartbeat service
   */
  init() {
    if (!this.isDevMode) {
      console.log('💡 Heartbeat service disabled in production mode');
      return;
    }

    console.log('💓 Initializing development heartbeat service...');
    
    // Set up browser event listeners
    this.setupBrowserEventListeners();
    
    // Connect to WebSocket server with a small delay
    setTimeout(() => {
      this.connect();
    }, 1000);
  }

  /**
   * Set up browser event listeners for detecting tab/window closure
   */
  setupBrowserEventListeners() {
    // Handle visibility change (tab switching, minimizing)
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    
    // Handle page unload (tab/browser closing)
    window.addEventListener('beforeunload', this.handleBeforeUnload);
    
    // Handle page hide (more reliable than beforeunload in some cases)
    window.addEventListener('pagehide', this.handlePageHide);
    
    // Handle focus/blur events
    window.addEventListener('focus', () => {
      if (this.isDevMode && !this.ws) {
        console.log('🔄 Window focused, reconnecting heartbeat...');
        this.connect();
      }
    });
    
    window.addEventListener('blur', () => {
      // Don't disconnect on blur, just reduce heartbeat frequency
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = setInterval(this.sendHeartbeat, this.heartbeatFrequency * 2);
      }
    });
  }

  /**
   * Handle visibility change events
   */
  handleVisibilityChange() {
    if (document.visibilityState === 'hidden') {
      // Tab is hidden (switched to another tab or minimized)
      // Don't shutdown, just log it
      console.log('👁️ Tab hidden, continuing heartbeat...');
    } else if (document.visibilityState === 'visible') {
      // Tab is visible again
      console.log('👁️ Tab visible, resuming normal heartbeat...');
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = setInterval(this.sendHeartbeat, this.heartbeatFrequency);
      }
    }
  }

  /**
   * Handle before unload event (tab/browser closing)
   */
  handleBeforeUnload(event) {
    console.log('🛑 Page unloading, sending shutdown signal...');
    this.sendShutdownSignal();
    
    // Note: In modern browsers, you can't prevent the page from closing
    // or show custom messages in beforeunload without user interaction
  }

  /**
   * Handle page hide event (more reliable detection of page closure)
   */
  handlePageHide(event) {
    if (event.persisted) {
      // Page is being cached (back/forward cache)
      console.log('📄 Page cached, continuing...');
      return;
    }
    
    console.log('🛑 Page hiding, sending shutdown signal...');
    this.sendShutdownSignal();
  }

  /**
   * Connect to the WebSocket server
   */
  connect() {
    if (this.isShuttingDown || !this.isDevMode) return;
    
    try {
      console.log('🔗 Connecting to development manager...');
      
      this.ws = new WebSocket('ws://localhost:8080');
      
      this.ws.onopen = () => {
        console.log('✅ Connected to development manager');
        this.reconnectAttempts = 0;
        this.startHeartbeat();
      };
      
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📨 Message from dev manager:', data);
        } catch (error) {
          console.warn('⚠️ Invalid message from dev manager:', event.data);
        }
      };
      
      this.ws.onclose = (event) => {
        console.log('💔 Disconnected from development manager');
        this.stopHeartbeat();
        
        // Attempt to reconnect if not shutting down
        if (!this.isShuttingDown && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
          
          this.reconnectTimeout = setTimeout(() => {
            this.connect();
          }, this.reconnectDelay * this.reconnectAttempts);
        }
      };
      
      this.ws.onerror = (error) => {
        console.warn('⚠️ WebSocket error:', error);
      };
      
    } catch (error) {
      console.warn('⚠️ Failed to connect to development manager:', error.message);
    }
  }

  /**
   * Start sending heartbeat signals
   */
  startHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    this.heartbeatInterval = setInterval(this.sendHeartbeat, this.heartbeatFrequency);
    
    // Send initial heartbeat
    this.sendHeartbeat();
  }

  /**
   * Stop sending heartbeat signals
   */
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Send a heartbeat signal
   */
  sendHeartbeat() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify({
          type: 'heartbeat',
          timestamp: Date.now(),
          url: window.location.href,
          visibility: document.visibilityState
        }));
      } catch (error) {
        console.warn('⚠️ Failed to send heartbeat:', error.message);
      }
    }
  }

  /**
   * Send shutdown signal to development manager
   */
  sendShutdownSignal() {
    if (this.isShuttingDown) return;
    
    this.isShuttingDown = true;
    
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        console.log('📡 Sending shutdown signal...');
        this.ws.send(JSON.stringify({
          type: 'shutdown',
          timestamp: Date.now(),
          reason: 'page_unload'
        }));
        
        // Give time for message to be sent
        setTimeout(() => {
          this.cleanup();
        }, 100);
        
      } catch (error) {
        console.warn('⚠️ Failed to send shutdown signal:', error.message);
        this.cleanup();
      }
    } else {
      // If WebSocket is not available, try HTTP endpoint
      this.sendShutdownViaHTTP();
    }
  }

  /**
   * Send shutdown signal via HTTP as fallback
   */
  async sendShutdownViaHTTP() {
    try {
      await fetch('/api/dev/shutdown', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reason: 'page_unload',
          timestamp: Date.now()
        })
      });
      console.log('📡 Shutdown signal sent via HTTP');
    } catch (error) {
      console.warn('⚠️ Failed to send shutdown signal via HTTP:', error.message);
    }
    
    this.cleanup();
  }

  /**
   * Clean up resources
   */
  cleanup() {
    this.stopHeartbeat();
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    // Remove event listeners
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('beforeunload', this.handleBeforeUnload);
    window.removeEventListener('pagehide', this.handlePageHide);
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      isDevMode: this.isDevMode,
      connected: this.ws ? this.ws.readyState === WebSocket.OPEN : false,
      reconnectAttempts: this.reconnectAttempts,
      isShuttingDown: this.isShuttingDown,
      visibility: document.visibilityState
    };
  }
}

// Create singleton instance
const heartbeatService = new HeartbeatService();

export default heartbeatService;
