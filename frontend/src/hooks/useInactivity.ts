import { useEffect, useRef, useCallback } from 'react';

interface UseInactivityOptions {
  timeout: number; // in milliseconds
  onInactivity: () => void;
  events?: string[];
  enabled?: boolean; // Whether inactivity detection is enabled
}

/**
 * Hook to detect user inactivity and trigger a callback
 * @param timeout - Time in milliseconds before considering user inactive
 * @param onInactivity - Callback function to execute when user becomes inactive
 * @param events - Array of events to listen for user activity
 */
export const useInactivity = ({
  timeout,
  onInactivity,
  events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'],
  enabled = true
}: UseInactivityOptions) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isActiveRef = useRef(true);

  const resetTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      if (isActiveRef.current) {
        isActiveRef.current = false;
        onInactivity();
      }
    }, timeout);
  }, [timeout, onInactivity]);

  const handleActivity = useCallback(() => {
    if (!isActiveRef.current) {
      isActiveRef.current = true;
    }
    resetTimer();
  }, [resetTimer]);

  useEffect(() => {
    // Only set up inactivity detection if enabled
    if (!enabled) {
      return;
    }

    // Add event listeners
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    // Start the timer after a short delay to avoid triggering on page refresh
    const initialDelay = setTimeout(() => {
      resetTimer();
    }, 2000); // 2 second delay to ensure page is fully loaded

    // Cleanup
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      clearTimeout(initialDelay);
    };
  }, [events, handleActivity, resetTimer, enabled]);

  // Return function to manually reset the timer
  return {
    resetTimer: handleActivity,
    isActive: isActiveRef.current
  };
};
