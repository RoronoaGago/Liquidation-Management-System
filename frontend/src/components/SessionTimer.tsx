/**
 * Session Timer Component
 * Displays remaining session time
 */

import React from 'react';
import { useSessionTime } from '../hooks/useSessionTime';

interface SessionTimerProps {
  showDetails?: boolean;
  className?: string;
}

export default function SessionTimer({ 
  showDetails = false, 
  className = '' 
}: SessionTimerProps) {
  const sessionStatus = useSessionTime();

  if (sessionStatus.isExpired) {
    return (
      <div className={`text-red-600 ${className}`}>
        Session Expired
      </div>
    );
  }

  return (
    <div className={`text-sm ${className}`}>
      <div className="font-medium">
        Session: {sessionStatus.formattedTime}
      </div>
      {showDetails && (
        <div className="text-xs text-gray-500 mt-1">
          <div>JWT Token: {sessionStatus.remainingMinutes} minutes remaining</div>
          <div>Inactivity timeout: {sessionStatus.inactivityTimeout} minutes</div>
        </div>
      )}
    </div>
  );
}
