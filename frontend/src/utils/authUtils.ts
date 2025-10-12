/**
 * Authentication utility functions
 * Provides helper functions for managing authentication state
 */

import SecureStorage from "../lib/secureStorage";
import api from "../api/axios";

/**
 * Force clear all authentication state
 * This can be used for debugging or manual cleanup
 */
export const forceClearAuthState = () => {
  console.log('🧹 Force clearing authentication state...');
  
  // Clear tokens
  SecureStorage.clearTokens();
  
  // Clear axios authorization header
  api.defaults.headers.common["Authorization"] = "";
  
  // Clear localStorage flags
  localStorage.removeItem('app_initialized');
  SecureStorage.clearLogoutModalState();
  
  // Dispatch logout event to trigger UI updates
  window.dispatchEvent(new CustomEvent('auth:logout', { 
    detail: { 
      reason: 'manual_clear',
      message: 'Authentication state has been manually cleared.'
    } 
  }));
  
  console.log('✅ Authentication state force cleared');
};

/**
 * Check if user is currently authenticated
 */
export const isUserAuthenticated = (): boolean => {
  const accessToken = SecureStorage.getAccessToken();
  const refreshToken = SecureStorage.getRefreshToken();
  
  return !!(accessToken && refreshToken && !SecureStorage.isAccessTokenExpired());
};

/**
 * Get current authentication status for debugging
 */
export const getAuthStatus = () => {
  const accessToken = SecureStorage.getAccessToken();
  const refreshToken = SecureStorage.getRefreshToken();
  const isExpired = SecureStorage.isAccessTokenExpired();
  const isInitialized = localStorage.getItem('app_initialized') === 'true';
  
  return {
    hasAccessToken: !!accessToken,
    hasRefreshToken: !!refreshToken,
    isAccessTokenExpired: isExpired,
    isAppInitialized: isInitialized,
    isAuthenticated: isUserAuthenticated(),
    authHeader: api.defaults.headers.common["Authorization"] || 'Not set'
  };
};

// Make functions available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).authUtils = {
    forceClearAuthState,
    isUserAuthenticated,
    getAuthStatus
  };
}
