/**
 * API Configuration
 * Centralized configuration for API endpoints and settings
 */

// Environment-based API configuration
const getApiConfig = () => {
  const isDevelopment = import.meta.env.DEV;
  const isProduction = import.meta.env.PROD;

  if (isDevelopment) {
    // Development configuration
    return {
      baseURL: import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/',
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
    };
  }

  if (isProduction) {
    // Production configuration
    return {
      baseURL: import.meta.env.VITE_API_BASE_URL || 'https://your-production-api.com/api/',
      timeout: 15000,
      retryAttempts: 2,
      retryDelay: 2000,
    };
  }

  // Default fallback
  return {
    baseURL: 'http://127.0.0.1:8000/api/',
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000,
  };
};

export const API_CONFIG = getApiConfig();

// JWT Token Configuration
export const JWT_CONFIG = {
  // Access token lifetime in minutes (should match backend SIMPLE_JWT.ACCESS_TOKEN_LIFETIME)
  ACCESS_TOKEN_LIFETIME_MINUTES: 900, // 15 hours
  
  // Refresh token lifetime in days (should match backend SIMPLE_JWT.REFRESH_TOKEN_LIFETIME)
  REFRESH_TOKEN_LIFETIME_DAYS: 7,
  
  // Buffer time in minutes to account for clock skew and network delays
  CLOCK_SKEW_BUFFER_MINUTES: 5,
  
  // Inactivity timeout in minutes (frontend-only setting)
  INACTIVITY_TIMEOUT_MINUTES: 60, // 1 hour
} as const;

// API Endpoints
export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: '/token/',
    REFRESH: '/token/refresh/',
    LOGOUT: '/logout/',
    CHANGE_PASSWORD: '/change-password/',
    FORGOT_PASSWORD: '/forgot-password/',
    VERIFY_PASSWORD_RESET_OTP: '/verify-password-reset-otp/',
    RESET_PASSWORD: '/reset-password/',
  },
  
  // OTP
  OTP: {
    REQUEST: '/request-otp-secure/',
    VERIFY: '/verify-otp-secure/',
    RESEND: '/resend-otp-secure/',
  },
  
  // User Management
  USER: {
    ME: '/user/me/',
    LIST: '/users/',
    DETAIL: (id: string | number) => `/users/${id}/`,
  },
  
  // Schools
  SCHOOL: {
    LIST: '/schools/',
    DETAIL: (id: string | number) => `/schools/${id}/`,
    SEARCH: '/schools/search/',
  },
  
  // Requests
  REQUEST: {
    LIST: '/requests/',
    DETAIL: (id: string | number) => `/requests/${id}/`,
    APPROVE: (id: string | number) => `/requests/${id}/approve/`,
    REJECT: (id: string | number) => `/requests/${id}/reject/`,
  },
  
  // Liquidations
  LIQUIDATION: {
    LIST: '/liquidations/',
    DETAIL: (id: string | number) => `/liquidations/${id}/`,
    SUBMIT: (id: string | number) => `/liquidations/${id}/submit/`,
  },
} as const;

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection.',
  UNAUTHORIZED: 'Your session has expired. Please log in again.',
  FORBIDDEN: 'You do not have permission to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',
  SERVER_ERROR: 'Server error. Please try again later.',
  VALIDATION_ERROR: 'Please check your input and try again.',
} as const;
