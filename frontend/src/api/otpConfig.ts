/**
 * OTP Configuration API Service
 * Fetches OTP configuration from backend to ensure frontend-backend synchronization
 */

import axios from './axios';

export interface OTPConfig {
  otp_lifetime_minutes: number;
  otp_lifetime_seconds: number;
  otp_length: number;
  max_attempts_per_otp: number;
  account_lockout_minutes: number;
  security_policy: string;
}

/**
 * Fetch OTP configuration from backend
 */
export const fetchOTPConfig = async (): Promise<OTPConfig> => {
  try {
    const response = await axios.get('/otp-config/');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch OTP configuration:', error);
    // Fallback to default 5-minute configuration
    return {
      otp_lifetime_minutes: 5,
      otp_lifetime_seconds: 300,
      otp_length: 6,
      max_attempts_per_otp: 5,
      account_lockout_minutes: 15,
      security_policy: 'strict_5_minute_otp_lifetime'
    };
  }
};

/**
 * Validate OTP configuration
 */
export const validateOTPConfig = (config: OTPConfig): boolean => {
  // Ensure strict 5-minute policy
  if (config.otp_lifetime_minutes !== 5) {
    console.error(`SECURITY ALERT: OTP lifetime is ${config.otp_lifetime_minutes} minutes, expected 5 minutes`);
    return false;
  }
  
  if (config.security_policy !== 'strict_5_minute_otp_lifetime') {
    console.error(`SECURITY ALERT: Invalid security policy: ${config.security_policy}`);
    return false;
  }
  
  return true;
};

/**
 * Get OTP lifetime in seconds with validation
 */
export const getOTPLifetimeSeconds = (config: OTPConfig): number => {
  if (!validateOTPConfig(config)) {
    console.warn('OTP config validation failed, using fallback 5-minute lifetime');
    return 300; // 5 minutes in seconds
  }
  return config.otp_lifetime_seconds;
};
