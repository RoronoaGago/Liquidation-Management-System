/**
 * Session Time Utility Functions
 * Calculate remaining session time based on JWT token expiration and inactivity timeout
 */

import SecureStorage from '../lib/secureStorage';
import { JWT_CONFIG } from '../config/api';

/**
 * Get remaining session time in minutes
 * Returns the minimum of JWT token expiration and inactivity timeout
 */
export const getRemainingSessionTime = (): number => {
  const tokens = SecureStorage.getTokens();
  
  if (!tokens) {
    return 0; // No session if no tokens
  }

  const now = Date.now();
  const jwtExpiresAt = tokens.expiresAt;
  
  // Calculate remaining JWT token time in minutes
  const jwtRemainingMs = jwtExpiresAt - now;
  const jwtRemainingMinutes = Math.max(0, Math.floor(jwtRemainingMs / (1000 * 60)));
  
  // Inactivity timeout is 15 minutes from last activity
  // Since we can't track exact last activity time from this utility,
  // we return the JWT remaining time as the session time
  // The inactivity timeout is handled separately by the useInactivity hook
  
  return jwtRemainingMinutes;
};

/**
 * Get remaining session time in seconds (more precise)
 */
export const getRemainingSessionTimeSeconds = (): number => {
  const tokens = SecureStorage.getTokens();
  
  if (!tokens) {
    return 0;
  }

  const now = Date.now();
  const jwtExpiresAt = tokens.expiresAt;
  
  const jwtRemainingMs = jwtExpiresAt - now;
  return Math.max(0, Math.floor(jwtRemainingMs / 1000));
};

/**
 * Check if session is expired
 */
export const isSessionExpired = (): boolean => {
  return getRemainingSessionTime() <= 0;
};

/**
 * Format remaining time as MM:SS
 */
export const formatRemainingTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

/**
 * Get session status information
 */
export const getSessionStatus = () => {
  const remainingMinutes = getRemainingSessionTime();
  const remainingSeconds = getRemainingSessionTimeSeconds();
  const isExpired = isSessionExpired();
  
  return {
    remainingMinutes,
    remainingSeconds,
    isExpired,
    formattedTime: formatRemainingTime(remainingSeconds),
    // JWT token lifetime from configuration
    maxSessionTime: JWT_CONFIG.ACCESS_TOKEN_LIFETIME_MINUTES,
    // Inactivity timeout from configuration
    inactivityTimeout: JWT_CONFIG.INACTIVITY_TIMEOUT_MINUTES
  };
};
