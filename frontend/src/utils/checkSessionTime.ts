/**
 * Console utility to check current session time
 * Run this in browser console: checkSessionTime()
 */

import { getSessionStatus } from './sessionTime';

// Make it available globally for console access
declare global {
  interface Window {
    checkSessionTime: () => void;
  }
}

export const checkSessionTime = () => {
  const status = getSessionStatus();
  
  console.log('🔐 Session Status:');
  console.log(`⏰ JWT Remaining Time: ${status.formattedTime} (${status.remainingMinutes} minutes)`);
  console.log(`📊 JWT Token Status: ${status.isExpired ? '❌ Expired' : '✅ Valid'}`);
  console.log(`⏱️  Max JWT Session Time: ${status.maxSessionTime} minutes (15 hours)`);
  console.log(`🚫 Inactivity Timeout: ${status.inactivityTimeout} minutes`);
  
  // Check if we're in a browser environment and can access the inactivity hook
  if (typeof window !== 'undefined') {
    console.log('\n🔍 Inactivity Detection Status:');
    console.log('- Check browser console for inactivity detection logs');
    console.log('- Look for "🔄 Setting up inactivity detection" messages');
    console.log('- Look for "⏰ Resetting inactivity timer" messages');
    console.log('- If you see "🚨 Inactivity detected!" after 10 minutes, that\'s the issue');
  }
  
  if (status.remainingMinutes > 0) {
    console.log(`\n🎯 Your JWT token will expire in ${status.remainingMinutes} minutes`);
    console.log(`⚠️  But you might be logged out due to inactivity after ${status.inactivityTimeout} minutes`);
  } else {
    console.log(`\n⚠️  Your JWT token has expired!`);
  }
  
  return status;
};

// Make it available globally
if (typeof window !== 'undefined') {
  window.checkSessionTime = checkSessionTime;
  
  // Also import and make the inactivity test available
  import('./inactivityTest').then(({ testInactivityDetection }) => {
    (window as any).testInactivityDetection = testInactivityDetection;
  });
}
