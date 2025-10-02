/**
 * Token Testing Utility
 * Use this to test if your refresh token mechanism is working properly
 */

import SecureStorage from "../lib/secureStorage";
import { API_CONFIG, API_ENDPOINTS } from "../config/api";
import axios from "axios";

export const testTokenRefresh = async () => {
  console.log("🧪 Testing Token Refresh Mechanism...");
  
  try {
    // Get current tokens
    const accessToken = SecureStorage.getAccessToken();
    const refreshToken = SecureStorage.getRefreshToken();
    
    console.log("📋 Current Token Status:");
    console.log("- Access Token:", accessToken ? "✅ Present" : "❌ Missing");
    console.log("- Refresh Token:", refreshToken ? "✅ Present" : "❌ Missing");
    console.log("- Access Token Expired:", SecureStorage.isAccessTokenExpired() ? "❌ Yes" : "✅ No");
    
    if (!refreshToken) {
      console.log("❌ No refresh token available for testing");
      return false;
    }
    
    // Test refresh endpoint
    console.log("\n🔄 Testing Refresh Token Endpoint...");
    const response = await axios.post(
      `${API_CONFIG.baseURL}${API_ENDPOINTS.AUTH.REFRESH}`,
      { refresh: refreshToken },
      { timeout: 10000 }
    );
    
    if (response.data?.access) {
      console.log("✅ Refresh Token Working!");
      console.log("- New Access Token:", response.data.access ? "✅ Received" : "❌ Missing");
      console.log("- New Refresh Token:", response.data.refresh ? "✅ Received" : "❌ Not provided");
      
      // Update tokens
      SecureStorage.setTokens(
        response.data.access,
        response.data.refresh || refreshToken,
        15 * 60
      );
      
      console.log("✅ Tokens Updated Successfully!");
      return true;
    } else {
      console.log("❌ Refresh failed - no access token in response");
      return false;
    }
    
  } catch (error: any) {
    console.log("❌ Refresh Token Test Failed:");
    
    if (error.response) {
      console.log("- Status:", error.response.status);
      console.log("- Error:", error.response.data);
      
      if (error.response.status === 401) {
        console.log("🔍 This means your refresh token is invalid/expired");
      } else if (error.response.status === 400) {
        console.log("🔍 This might be a request format issue");
      }
    } else if (error.request) {
      console.log("- Network Error:", "Cannot reach the server");
    } else {
      console.log("- Error:", error.message);
    }
    
    return false;
  }
};

export const simulateTokenExpiry = () => {
  console.log("⏰ Simulating Token Expiry...");
  
  // Get current tokens
  const tokens = SecureStorage.getTokens();
  if (!tokens) {
    console.log("❌ No tokens to simulate expiry");
    return;
  }
  
  // Manually set expiry to past time
  const expiredTokens = {
    ...tokens,
    expiresAt: Date.now() - 1000 // 1 second ago
  };
  
  // Store expired tokens
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem('access_token', expiredTokens.accessToken);
    sessionStorage.setItem('refresh_token', expiredTokens.refreshToken);
    sessionStorage.setItem('expires_at', expiredTokens.expiresAt.toString());
  }
  
  console.log("✅ Tokens set to expired state");
  console.log("- Access Token Expired:", SecureStorage.isAccessTokenExpired() ? "✅ Yes" : "❌ No");
};

// Add to window for easy testing in browser console
if (typeof window !== 'undefined') {
  (window as any).testTokenRefresh = testTokenRefresh;
  (window as any).simulateTokenExpiry = simulateTokenExpiry;
  console.log("🔧 Token testing functions added to window:");
  console.log("- testTokenRefresh() - Test if refresh token works");
  console.log("- simulateTokenExpiry() - Simulate expired tokens");
}
