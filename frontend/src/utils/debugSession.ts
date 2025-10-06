/**
 * Debug Session Utility
 * Helps debug session and token issues
 */

import SecureStorage from '../lib/secureStorage';
import { JWT_CONFIG } from '../config/api';

export const debugSession = () => {
  console.log('🔍 Session Debug Information:');
  console.log('================================');
  
  // Check if tokens exist
  const tokens = SecureStorage.getTokens();
  
  if (!tokens) {
    console.log('❌ No tokens found in storage');
    return;
  }
  
  console.log('✅ Tokens found in storage');
  console.log('📝 Access Token (first 20 chars):', tokens.accessToken.substring(0, 20) + '...');
  console.log('🔄 Refresh Token (first 20 chars):', tokens.refreshToken.substring(0, 20) + '...');
  
  // Check expiration
  const now = Date.now();
  const expiresAt = tokens.expiresAt;
  const remainingMs = expiresAt - now;
  const remainingMinutes = Math.floor(remainingMs / (1000 * 60));
  const remainingSeconds = Math.floor(remainingMs / 1000);
  
  console.log('⏰ Current Time:', new Date(now).toLocaleString());
  console.log('⏰ Token Expires At:', new Date(expiresAt).toLocaleString());
  console.log('⏰ Remaining Time:', `${remainingMinutes} minutes (${remainingSeconds} seconds)`);
  
  // Check if expired
  const isExpired = SecureStorage.isAccessTokenExpired();
  console.log('📊 Token Status:', isExpired ? '❌ EXPIRED' : '✅ VALID');
  
  // Check storage location
  let storageLocation = 'Unknown';
  try {
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('access_token')) {
      storageLocation = 'sessionStorage';
    } else if (typeof localStorage !== 'undefined' && localStorage.getItem('access_token')) {
      storageLocation = 'localStorage';
    }
  } catch (error) {
    storageLocation = 'Error checking storage';
  }
  
  console.log('💾 Storage Location:', storageLocation);
  
  // Expected vs Actual
  console.log(`🎯 Expected Token Lifetime: ${JWT_CONFIG.ACCESS_TOKEN_LIFETIME_MINUTES} minutes (${JWT_CONFIG.ACCESS_TOKEN_LIFETIME_MINUTES / 60} hours)`);
  console.log('🎯 Actual Token Lifetime:', Math.floor((expiresAt - (now - remainingMs)) / (1000 * 60)), 'minutes');
  
  return {
    hasTokens: !!tokens,
    isExpired,
    remainingMinutes,
    remainingSeconds,
    storageLocation,
    expiresAt: new Date(expiresAt).toLocaleString()
  };
};

// Make it available globally
if (typeof window !== 'undefined') {
  (window as any).debugSession = debugSession;
}
