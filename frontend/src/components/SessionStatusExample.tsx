/**
 * Example component showing how to use session time utilities
 * This is just an example - you can integrate this into your existing components
 */

import React from 'react';
import SessionTimer from './SessionTimer';
import { useSessionTime } from '../hooks/useSessionTime';

export default function SessionStatusExample() {
  const sessionStatus = useSessionTime();

  return (
    <div className="bg-white p-4 rounded-lg shadow-md border">
      <h3 className="text-lg font-semibold mb-4">Session Status</h3>
      
      {/* Simple timer display */}
      <div className="mb-4">
        <SessionTimer />
      </div>
      
      {/* Detailed status */}
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span>Remaining Time:</span>
          <span className="font-medium">{sessionStatus.formattedTime}</span>
        </div>
        
        <div className="flex justify-between">
          <span>Status:</span>
          <span className={sessionStatus.isExpired ? 'text-red-600' : 'text-green-600'}>
            {sessionStatus.isExpired ? 'Expired' : 'Active'}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span>JWT Token:</span>
          <span>{sessionStatus.remainingMinutes} minutes</span>
        </div>
        
        <div className="flex justify-between">
          <span>Inactivity Timeout:</span>
          <span>{sessionStatus.inactivityTimeout} minutes</span>
        </div>
      </div>
      
      {/* Console command reminder */}
      <div className="mt-4 p-2 bg-gray-100 rounded text-xs">
        <strong>Console Command:</strong> Open browser console and type <code>checkSessionTime()</code> to get detailed session information.
      </div>
    </div>
  );
}
