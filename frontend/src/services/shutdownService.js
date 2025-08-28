import api from './api';

// System shutdown service
export const initiateShutdown = async () => {
  try {
    const response = await api.post('/system/shutdown');
    return response.data;
  } catch (error) {
    console.error('Error initiating shutdown:', error);
    throw error;
  }
};

// Logout user session before shutdown
export const logoutBeforeShutdown = async () => {
  try {
    const token = sessionStorage.getItem('token');
    if (token) {
      console.log('🔓 Logging out user session...');
      await api.post('/auth/logout');
      
      // Clear session storage
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('sessionId');
      console.log('✅ User logged out successfully');
    }
  } catch (error) {
    console.error('⚠️ Logout during shutdown failed:', error);
    // Clear session storage anyway
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('sessionId');
  }
};

// Check system status
export const getSystemStatus = async () => {
  try {
    const response = await api.get('/system/status');
    return response.data;
  } catch (error) {
    console.error('Error getting system status:', error);
    throw error;
  }
};

// Save pending data before shutdown
export const savePendingData = async () => {
  try {
    // Save any pending form data from sessionStorage
    const pendingData = {
      lastActivity: new Date().toISOString(),
      userSession: sessionStorage.getItem('token') ? 'active' : 'inactive',
      currentPath: window.location.pathname,
      formData: {}
    };

    // Check for any unsaved form data
    const forms = document.querySelectorAll('form');
    forms.forEach((form, index) => {
      const formData = new FormData(form);
      const formObj = {};
      for (let [key, value] of formData.entries()) {
        if (value && value.trim() !== '') {
          formObj[key] = value;
        }
      }
      if (Object.keys(formObj).length > 0) {
        pendingData.formData[`form_${index}`] = formObj;
      }
    });

    // Save to localStorage as backup (for recovery purposes only)
    localStorage.setItem('pendingShutdownData', JSON.stringify(pendingData));
    
    console.log('💾 Pending data saved:', pendingData);
    return pendingData;
    
  } catch (error) {
    console.error('Error saving pending data:', error);
    return null;
  }
};

// Cleanup function
export const cleanupBeforeShutdown = () => {
  try {
    // Clear intervals and timeouts
    // eslint-disable-next-line no-implied-eval
    const highestTimeoutId = setTimeout(function() {});
    for (let i = 0; i < highestTimeoutId; i++) {
      clearTimeout(i);
    }
    
    // eslint-disable-next-line no-implied-eval
    const highestIntervalId = setInterval(function() {});
    for (let i = 0; i < highestIntervalId; i++) {
      clearInterval(i);
    }
    
    // Remove event listeners
    window.removeEventListener('beforeunload', handleBeforeUnload);
    window.removeEventListener('unload', handleUnload);
    
    console.log('🧹 Cleanup completed');
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
};

// Detect if this is a page refresh vs actual close
export const isPageRefresh = () => {
  // Check if navigation type is reload
  if (performance.navigation) {
    return performance.navigation.type === performance.navigation.TYPE_RELOAD;
  }
  
  // Fallback for newer browsers
  if (performance.getEntriesByType) {
    const navigationEntries = performance.getEntriesByType('navigation');
    if (navigationEntries.length > 0) {
      return navigationEntries[0].type === 'reload';
    }
  }
  
  return false;
};

// Browser event handlers
let isShuttingDown = false;
let userConfirmedShutdown = false;

const handleBeforeUnload = (event) => {
  // Don't trigger on page refresh
  if (isPageRefresh()) {
    console.log('🔄 Page refresh detected, skipping shutdown');
    return;
  }
  
  // Don't trigger if already shutting down
  if (isShuttingDown) {
    return;
  }
  
  // Mark that user confirmed shutdown
  userConfirmedShutdown = true;
  
  // Perform shutdown operations synchronously using navigator.sendBeacon
  performSynchronousShutdown();
  
  // Show confirmation dialog
  const message = 'Are you sure you want to close the application? This will shutdown both frontend and backend servers.';
  event.preventDefault();
  event.returnValue = message;
  return message;
};

const handleUnload = (event) => {
  // Don't trigger on page refresh
  if (isPageRefresh()) {
    return;
  }
  
  // Only trigger if user actually confirmed shutdown
  if (!userConfirmedShutdown) {
    return;
  }
  
  // Additional fallback shutdown using sendBeacon
  performSynchronousShutdown();
};

// Synchronous shutdown using navigator.sendBeacon for reliability
const performSynchronousShutdown = () => {
  if (isShuttingDown) {
    return;
  }
  
  isShuttingDown = true;
  
  try {
    console.log('🔄 Initiating synchronous shutdown sequence...');
    
    // Logout user synchronously
    const token = sessionStorage.getItem('token');
    if (token) {
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('sessionId');
      
      // Send logout request using sendBeacon (works during page unload)
      if (navigator.sendBeacon) {
        const logoutData = new FormData();
        logoutData.append('token', token);
        navigator.sendBeacon('http://localhost:5000/api/auth/logout', logoutData);
      }
    }
    
    // Save pending data synchronously
    const pendingData = {
      timestamp: new Date().toISOString(),
      formData: sessionStorage.getItem('pendingFormData') || '{}',
      lastAction: 'shutdown'
    };
    localStorage.setItem('pendingShutdownData', JSON.stringify(pendingData));
    
    // Send shutdown signal using sendBeacon (most reliable for page unload)
    if (navigator.sendBeacon) {
      const shutdownData = new FormData();
      shutdownData.append('action', 'shutdown');
      navigator.sendBeacon('http://localhost:5000/api/system/shutdown', shutdownData);
      console.log('✅ Shutdown signal sent via sendBeacon');
    } else {
      // Fallback for older browsers - use synchronous XHR (not recommended but works)
      const xhr = new XMLHttpRequest();
      xhr.open('POST', 'http://localhost:5000/api/system/shutdown', false); // false = synchronous
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.send(JSON.stringify({ action: 'shutdown' }));
      console.log('✅ Shutdown signal sent via synchronous XHR');
    }
    
  } catch (error) {
    console.error('❌ Error during synchronous shutdown:', error);
  }
};

// Initialize shutdown handlers
export const initializeShutdownHandlers = () => {
  // Add event listeners for browser close/tab close
  window.addEventListener('beforeunload', handleBeforeUnload);
  window.addEventListener('unload', handleUnload);
  
  // Add pagehide event as additional fallback (more reliable on mobile)
  window.addEventListener('pagehide', (event) => {
    if (!isPageRefresh() && userConfirmedShutdown) {
      performSynchronousShutdown();
    }
  });
  
  // Add visibility change listener for additional detection
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      // Page is now hidden (could be closing)
      console.log('👁️ Page visibility changed to hidden');
      
      // If user had confirmed shutdown, trigger it
      if (userConfirmedShutdown && !isShuttingDown) {
        performSynchronousShutdown();
      }
    }
  });
  
  console.log('🛡️ Shutdown handlers initialized');
};

// Remove shutdown handlers
export const removeShutdownHandlers = () => {
  window.removeEventListener('beforeunload', handleBeforeUnload);
  window.removeEventListener('unload', handleUnload);
  console.log('🗑️ Shutdown handlers removed');
};
