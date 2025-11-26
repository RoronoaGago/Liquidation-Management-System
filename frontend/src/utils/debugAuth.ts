/**
 * Authentication Debug Utility
 * Use this to debug authentication and session issues
 */

import SecureStorage from '../lib/secureStorage';
import { JWT_CONFIG } from '../config/api';

export const debugAuth = () => {
  console.log('🔍 Authentication Debug Information');
  console.log('=====================================');
  
  // Check token storage
  const tokens = SecureStorage.getTokens();
  console.log('📦 Token Storage Status:');
  console.log('- Tokens exist:', !!tokens);
  
  if (tokens) {
    const now = Date.now();
    const expiresAt = tokens.expiresAt;
    const remainingMs = expiresAt - now;
    const remainingMinutes = Math.floor(remainingMs / (1000 * 60));
    const remainingSeconds = Math.floor(remainingMs / 1000);
    
    console.log('- Access token expires at:', new Date(expiresAt).toLocaleString());
    console.log('- Time remaining:', `${remainingMinutes}m ${remainingSeconds % 60}s`);
    console.log('- Is expired:', SecureStorage.isAccessTokenExpired());
    console.log('- Buffer applied:', (expiresAt - now) < (5 * 60 * 1000) ? 'Yes (5min buffer)' : 'No');
  }
  
  // Check configuration
  console.log('\n⚙️ Configuration:');
  console.log('- JWT Access Token Lifetime:', JWT_CONFIG.ACCESS_TOKEN_LIFETIME_MINUTES, 'minutes');
  console.log('- JWT Refresh Token Lifetime:', JWT_CONFIG.REFRESH_TOKEN_LIFETIME_DAYS, 'days');
  console.log('- Inactivity Timeout:', JWT_CONFIG.INACTIVITY_TIMEOUT_MINUTES, 'minutes');
  console.log('- Clock Skew Buffer:', JWT_CONFIG.CLOCK_SKEW_BUFFER_MINUTES, 'minutes');
  
  // Check browser storage
  console.log('\n💾 Browser Storage (localStorage only):');
  try {
    const localStorageKeys = Object.keys(localStorage).filter(key => 
      key.includes('token') || key.includes('auth') || key.includes('session')
    );
    
    console.log('- LocalStorage auth keys:', localStorageKeys);
    
    // Check specific token values
    if (localStorageKeys.length > 0) {
      console.log('- LocalStorage token values:');
      localStorageKeys.forEach(key => {
        const value = localStorage.getItem(key);
        console.log(`  ${key}: ${value ? value.substring(0, 20) + '...' : 'null'}`);
      });
    } else {
      console.log('- No auth tokens found in localStorage');
    }
  } catch (error) {
    console.log('- Storage access error:', error);
  }
  
  // Check current time
  console.log('\n🕐 Current Time:');
  console.log('- Browser time:', new Date().toLocaleString());
  console.log('- Timestamp:', Date.now());
  
  return {
    hasTokens: !!tokens,
    isExpired: tokens ? SecureStorage.isAccessTokenExpired() : true,
    remainingTime: tokens ? Math.floor((tokens.expiresAt - Date.now()) / 1000) : 0,
    config: JWT_CONFIG
  };
};

export const clearAuthDebug = () => {
  console.log('🧹 Clearing all authentication data...');
  SecureStorage.clearTokens();
  localStorage.removeItem('app_initialized');
  console.log('✅ Authentication data cleared from localStorage');
};

export const testTokenRefresh = async () => {
  console.log('🔄 Testing token refresh...');
  const refreshToken = SecureStorage.getRefreshToken();
  
  if (!refreshToken) {
    console.log('❌ No refresh token available');
    return false;
  }
  
  try {
    const response = await fetch('http://127.0.0.1:8000/api/token/refresh/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh: refreshToken })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Token refresh successful');
      console.log('- New access token received:', !!data.access);
      return true;
    } else {
      console.log('❌ Token refresh failed:', response.status, response.statusText);
      return false;
    }
  } catch (error) {
    console.log('❌ Token refresh error:', error);
    return false;
  }
};

// Make functions available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).debugAuth = debugAuth;
  (window as any).clearAuthDebug = clearAuthDebug;
  (window as any).testTokenRefresh = testTokenRefresh;
}
