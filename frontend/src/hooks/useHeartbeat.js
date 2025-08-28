import { useEffect, useRef } from 'react';
import heartbeatService from '../services/heartbeatService';

/**
 * React hook for integrating with the development heartbeat service
 * Automatically handles initialization and cleanup
 */
export const useHeartbeat = () => {
  const isInitialized = useRef(false);

  useEffect(() => {
    // Only initialize once
    if (!isInitialized.current && process.env.NODE_ENV === 'development') {
      console.log('🚀 Initializing heartbeat service from React...');
      heartbeatService.init();
      isInitialized.current = true;
    }

    // Cleanup on unmount
    return () => {
      if (isInitialized.current) {
        console.log('🧹 Cleaning up heartbeat service...');
        heartbeatService.cleanup();
        isInitialized.current = false;
      }
    };
  }, []);

  // Return service status and methods
  return {
    status: heartbeatService.getStatus(),
    service: heartbeatService
  };
};

export default useHeartbeat;
