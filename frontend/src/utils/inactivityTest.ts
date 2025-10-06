/**
 * Inactivity Detection Test Utility
 * Use this to test and debug inactivity detection issues
 */

import { JWT_CONFIG } from '../config/api';

export const testInactivityDetection = () => {
  console.log('🧪 Testing Inactivity Detection...');
  
  // Check current configuration
  console.log('📋 Current Configuration:');
  console.log('- Inactivity Timeout:', JWT_CONFIG.INACTIVITY_TIMEOUT_MINUTES, 'minutes');
  console.log('- Inactivity Timeout (ms):', JWT_CONFIG.INACTIVITY_TIMEOUT_MINUTES * 60 * 1000);
  
  // Test event listeners
  console.log('\n🎯 Testing Event Listeners...');
  const testEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click', 'keydown'];
  
  testEvents.forEach(event => {
    const handler = () => {
      console.log(`✅ Event detected: ${event}`);
    };
    
    document.addEventListener(event, handler, true);
    
    // Remove after 5 seconds
    setTimeout(() => {
      document.removeEventListener(event, handler, true);
    }, 5000);
  });
  
  console.log('🎯 Move your mouse, click, or press keys to test event detection...');
  console.log('⏰ You have 5 seconds to test each event type');
  
  // Test timer functionality
  console.log('\n⏰ Testing Timer Functionality...');
  let testTimer: NodeJS.Timeout;
  
  const startTestTimer = () => {
    console.log('⏰ Starting 10-second test timer...');
    testTimer = setTimeout(() => {
      console.log('⏰ Test timer completed - this means the timer mechanism works');
    }, 10000);
  };
  
  const resetTestTimer = () => {
    if (testTimer) {
      clearTimeout(testTimer);
      console.log('⏰ Test timer reset');
    }
    startTestTimer();
  };
  
  // Add a test event listener to reset the timer
  const testHandler = () => {
    resetTestTimer();
  };
  
  document.addEventListener('click', testHandler, true);
  
  startTestTimer();
  
  console.log('🎯 Click anywhere to reset the test timer');
  console.log('⏰ If you don\'t click for 10 seconds, the timer should complete');
  
  // Cleanup after 30 seconds
  setTimeout(() => {
    document.removeEventListener('click', testHandler, true);
    if (testTimer) {
      clearTimeout(testTimer);
    }
    console.log('🧹 Test cleanup completed');
  }, 30000);
};

// Make it available globally
if (typeof window !== 'undefined') {
  (window as any).testInactivityDetection = testInactivityDetection;
}
