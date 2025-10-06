import { useEffect, useRef, useCallback } from 'react';

interface UseInactivityOptions {
  timeout: number; // in milliseconds
  onInactivity: () => void;
  events?: string[];
  enabled?: boolean; // Whether inactivity detection is enabled
  throttleMs?: number; // Throttle time in milliseconds to prevent excessive resets
}

/**
 * Hook to detect user inactivity and trigger a callback
 * @param timeout - Time in milliseconds before considering user inactive
 * @param onInactivity - Callback function to execute when user becomes inactive
 * @param events - Array of events to listen for user activity
 * @param throttleMs - Minimum time between timer resets to prevent excessive resets
 */
export const useInactivity = ({
  timeout,
  onInactivity,
  events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'],
  enabled = true,
  throttleMs = 5000 // 5 seconds throttle by default
}: UseInactivityOptions) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const throttleRef = useRef<NodeJS.Timeout | null>(null);
  const isActiveRef = useRef(true);
  const lastResetTime = useRef<number>(0);

  const resetTimer = useCallback(() => {
    const now = Date.now();
    
    // Throttle timer resets to prevent excessive calls
    if (now - lastResetTime.current < throttleMs) {
      return;
    }
    
    lastResetTime.current = now;
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Only log occasionally to reduce console spam
    if (Math.random() < 0.01) { // 1% chance to log
      console.log('⏰ Resetting inactivity timer, will trigger in', timeout / 1000 / 60, 'minutes');
    }
    
    timeoutRef.current = setTimeout(() => {
      if (isActiveRef.current) {
        console.log('⏰ Inactivity timeout reached, triggering logout');
        isActiveRef.current = false;
        onInactivity();
      }
    }, timeout);
  }, [timeout, onInactivity, throttleMs]);

  const handleActivity = useCallback(() => {
    if (!isActiveRef.current) {
      console.log('🔄 User became active again, resetting inactivity timer');
      isActiveRef.current = true;
    }
    
    // Use throttling to prevent excessive timer resets
    if (throttleRef.current) {
      clearTimeout(throttleRef.current);
    }
    
    throttleRef.current = setTimeout(() => {
      resetTimer();
    }, 100); // Small delay to batch rapid events
  }, [resetTimer]);

  useEffect(() => {
    // Only set up inactivity detection if enabled
    if (!enabled) {
      return;
    }

    console.log('🔄 Setting up inactivity detection with timeout:', timeout, 'ms');

    // Add event listeners
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    // Start the timer immediately when enabled
    resetTimer();

    // Cleanup
    return () => {
      console.log('🧹 Cleaning up inactivity detection');
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      if (throttleRef.current) {
        clearTimeout(throttleRef.current);
      }
    };
  }, [events, handleActivity, resetTimer, enabled]);

  // Return function to manually reset the timer
  return {
    resetTimer: handleActivity,
    isActive: isActiveRef.current
  };
};
