/**
 * OTP Utility Functions
 */

/**
 * Format seconds into MM:SS format
 */
export const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

/**
 * Determine error type based on error message
 */
export const getErrorType = (message: string): 'error' | 'warning' | 'info' => {
  if (message.includes('locked') || message.includes('suspicious')) {
    return 'warning';
  } else if (message.includes('rate limit') || message.includes('too many')) {
    return 'warning';
  } else if (message.includes('expired') || message.includes('invalid')) {
    return 'error';
  } else {
    return 'error';
  }
};

/**
 * Extract lockout time from error message (if available)
 */
export const extractLockoutTime = (message: string): number => {
  // Look for patterns like "15 minutes", "1 hour", etc.
  const timeMatch = message.match(/(\d+)\s*(minute|hour|second)/i);
  if (timeMatch) {
    const value = parseInt(timeMatch[1]);
    const unit = timeMatch[2].toLowerCase();
    
    switch (unit) {
      case 'hour':
        return value * 60 * 60;
      case 'minute':
        return value * 60;
      case 'second':
        return value;
      default:
        return 15 * 60; // Default 15 minutes
    }
  }
  
  return 15 * 60; // Default 15 minutes
};

/**
 * Check if OTP is expired based on timestamp
 * Uses strict 5-minute validation
 */
export const isOTPExpired = (generatedAt: Date, lifetimeMinutes: number = 5): boolean => {
  // Security validation: ensure exactly 5 minutes
  if (lifetimeMinutes !== 5) {
    console.warn(`SECURITY WARNING: OTP lifetime is ${lifetimeMinutes} minutes, expected 5 minutes. Using 5 minutes for security.`);
    lifetimeMinutes = 5;
  }
  
  const now = new Date();
  const expiryTime = new Date(generatedAt.getTime() + lifetimeMinutes * 60 * 1000);
  return now > expiryTime;
};

/**
 * Get remaining time for OTP
 * Uses strict 5-minute validation
 */
export const getOTPRemainingTime = (generatedAt: Date, lifetimeMinutes: number = 5): number => {
  // Security validation: ensure exactly 5 minutes
  if (lifetimeMinutes !== 5) {
    console.warn(`SECURITY WARNING: OTP lifetime is ${lifetimeMinutes} minutes, expected 5 minutes. Using 5 minutes for security.`);
    lifetimeMinutes = 5;
  }
  
  const now = new Date();
  const expiryTime = new Date(generatedAt.getTime() + lifetimeMinutes * 60 * 1000);
  const remainingMs = expiryTime.getTime() - now.getTime();
  return Math.max(0, Math.floor(remainingMs / 1000));
};

/**
 * Validate OTP lifetime configuration
 */
export const validateOTPLifetime = (lifetimeMinutes: number): boolean => {
  if (lifetimeMinutes !== 5) {
    console.error(`SECURITY VIOLATION: OTP lifetime must be exactly 5 minutes, got ${lifetimeMinutes}`);
    return false;
  }
  return true;
};
