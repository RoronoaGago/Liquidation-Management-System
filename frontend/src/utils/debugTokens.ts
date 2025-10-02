/**
 * Debug Token Utility
 * Use this to debug token issues
 */

import SecureStorage from "../lib/secureStorage";

export const debugTokens = () => {
  console.log("🔍 Debugging Token Storage...");
  
  // Check sessionStorage
  console.log("\n📦 SessionStorage:");
  console.log("- access_token:", sessionStorage.getItem('access_token'));
  console.log("- refresh_token:", sessionStorage.getItem('refresh_token'));
  console.log("- expires_at:", sessionStorage.getItem('expires_at'));
  
  // Check localStorage
  console.log("\n📦 LocalStorage:");
  console.log("- access_token:", localStorage.getItem('access_token'));
  console.log("- refresh_token:", localStorage.getItem('refresh_token'));
  console.log("- expires_at:", localStorage.getItem('expires_at'));
  
  // Check SecureStorage
  console.log("\n🔐 SecureStorage:");
  const tokens = SecureStorage.getTokens();
  console.log("- Tokens:", tokens);
  console.log("- Access Token:", SecureStorage.getAccessToken());
  console.log("- Refresh Token:", SecureStorage.getRefreshToken());
  console.log("- Is Expired:", SecureStorage.isAccessTokenExpired());
  
  // Check old localStorage keys (for migration)
  console.log("\n🔄 Old Token Keys:");
  console.log("- accessToken:", localStorage.getItem('accessToken'));
  console.log("- refreshToken:", localStorage.getItem('refreshToken'));
  
  return {
    sessionStorage: {
      access_token: sessionStorage.getItem('access_token'),
      refresh_token: sessionStorage.getItem('refresh_token'),
      expires_at: sessionStorage.getItem('expires_at')
    },
    localStorage: {
      access_token: localStorage.getItem('access_token'),
      refresh_token: localStorage.getItem('refresh_token'),
      expires_at: localStorage.getItem('expires_at')
    },
    secureStorage: tokens,
    oldKeys: {
      accessToken: localStorage.getItem('accessToken'),
      refreshToken: localStorage.getItem('refreshToken')
    }
  };
};

export const migrateOldTokens = () => {
  console.log("🔄 Migrating old tokens to new format...");
  
  const oldAccessToken = localStorage.getItem('accessToken');
  const oldRefreshToken = localStorage.getItem('refreshToken');
  
  if (oldAccessToken && oldRefreshToken) {
    console.log("✅ Found old tokens, migrating...");
    
    // Store in new format
    SecureStorage.setTokens(oldAccessToken, oldRefreshToken, 15 * 60);
    
    // Clear old tokens
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    
    console.log("✅ Migration complete!");
    return true;
  } else {
    console.log("❌ No old tokens found to migrate");
    return false;
  }
};

export const clearAllTokens = () => {
  console.log("🧹 Clearing all tokens...");
  
  // Clear sessionStorage
  sessionStorage.removeItem('access_token');
  sessionStorage.removeItem('refresh_token');
  sessionStorage.removeItem('expires_at');
  
  // Clear localStorage
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('expires_at');
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  
  console.log("✅ All tokens cleared!");
};

// Add to window for easy debugging
if (typeof window !== 'undefined') {
  (window as any).debugTokens = debugTokens;
  (window as any).migrateOldTokens = migrateOldTokens;
  (window as any).clearAllTokens = clearAllTokens;
  console.log("🔧 Debug functions added to window:");
  console.log("- debugTokens() - Show all token storage");
  console.log("- migrateOldTokens() - Migrate old token format");
  console.log("- clearAllTokens() - Clear all tokens");
}
