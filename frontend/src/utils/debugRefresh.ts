/**
 * Debug Token Refresh Issues
 * Use this to debug why tokens are being cleared on refresh
 */

import SecureStorage from '../lib/secureStorage';
import { API_CONFIG, API_ENDPOINTS } from '../config/api';

export const debugTokenRefresh = async () => {
  console.log('🔍 Debugging Token Refresh...');
  console.log('=====================================');
  
  // Check current tokens
  const tokens = SecureStorage.getTokens();
  console.log('📦 Current Tokens:');
  console.log('- Has tokens:', !!tokens);
  
  if (tokens) {
    const now = Date.now();
    const expiresAt = tokens.expiresAt;
    const remainingMs = expiresAt - now;
    const remainingMinutes = Math.floor(remainingMs / (1000 * 60));
    
    console.log('- Access token expires at:', new Date(expiresAt).toLocaleString());
    console.log('- Time remaining:', `${remainingMinutes}m ${Math.floor((remainingMs % 60000) / 1000)}s`);
    console.log('- Is expired:', SecureStorage.isAccessTokenExpired());
  }
  
  // Test refresh token
  const refreshToken = SecureStorage.getRefreshToken();
  console.log('\n🔄 Refresh Token Test:');
  console.log('- Has refresh token:', !!refreshToken);
  
  if (refreshToken) {
    try {
      console.log('- Testing refresh endpoint...');
      const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.AUTH.REFRESH}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh: refreshToken })
      });
      
      console.log('- Refresh response status:', response.status);
      console.log('- Refresh response ok:', response.ok);
      
      if (response.ok) {
        const data = await response.json();
        console.log('- New access token received:', !!data.access);
        console.log('- New refresh token received:', !!data.refresh);
        return true;
      } else {
        const errorData = await response.text();
        console.log('- Refresh failed with error:', errorData);
        return false;
      }
    } catch (error) {
      console.log('- Refresh request failed:', error);
      return false;
    }
  }
  
  return false;
};

export const testApiCall = async () => {
  console.log('🌐 Testing API Call...');
  
  try {
    const response = await fetch(`${API_CONFIG.baseURL}user/me/`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SecureStorage.getAccessToken()}`,
        'Content-Type': 'application/json',
      }
    });
    
    console.log('- API call status:', response.status);
    console.log('- API call ok:', response.ok);
    
    if (response.ok) {
      const data = await response.json();
      console.log('- User data received:', !!data);
      return true;
    } else {
      const errorData = await response.text();
      console.log('- API call failed:', errorData);
      return false;
    }
  } catch (error) {
    console.log('- API call error:', error);
    return false;
  }
};

// Make functions available globally
if (typeof window !== 'undefined') {
  (window as any).debugTokenRefresh = debugTokenRefresh;
  (window as any).testApiCall = testApiCall;
}
