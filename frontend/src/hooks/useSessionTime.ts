/**
 * Hook to track and display remaining session time
 */

import { useState, useEffect } from 'react';
import { getSessionStatus } from '../utils/sessionTime';

export const useSessionTime = (updateInterval: number = 1000) => {
  const [sessionStatus, setSessionStatus] = useState(getSessionStatus());

  useEffect(() => {
    // Update immediately
    setSessionStatus(getSessionStatus());

    // Set up interval to update every second
    const interval = setInterval(() => {
      setSessionStatus(getSessionStatus());
    }, updateInterval);

    return () => clearInterval(interval);
  }, [updateInterval]);

  return sessionStatus;
};
