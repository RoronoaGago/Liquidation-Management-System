import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from "axios";
import SecureStorage from "../lib/secureStorage";
import { API_CONFIG, API_ENDPOINTS, HTTP_STATUS, ERROR_MESSAGES, JWT_CONFIG } from "../config/api";

// Define your API response data types
interface RefreshTokenResponse {
  access: string;
  refresh?: string;
}

const api = axios.create({
  baseURL: API_CONFIG.baseURL,
  timeout: API_CONFIG.timeout,
  headers: {
    "Content-Type": "application/json",
  },
});

// Set initial token if available
const accessToken = SecureStorage.getAccessToken();
if (accessToken) {
  api.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;
}

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const accessToken = SecureStorage.getAccessToken();
    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor with improved error handling and retry logic
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    // If error is 401 and we haven't already retried
    if (error.response?.status === HTTP_STATUS.UNAUTHORIZED && !originalRequest._retry) {
      originalRequest._retry = true;

      // Don't try to refresh token for authentication endpoints
      const isAuthEndpoint = originalRequest.url && (
        originalRequest.url.includes(API_ENDPOINTS.AUTH.LOGIN) ||
        originalRequest.url.includes(API_ENDPOINTS.AUTH.REFRESH) ||
        originalRequest.url.includes(API_ENDPOINTS.OTP.REQUEST) ||
        originalRequest.url.includes(API_ENDPOINTS.OTP.VERIFY) ||
        originalRequest.url.includes(API_ENDPOINTS.OTP.RESEND)
      );

      if (isAuthEndpoint) {
        return Promise.reject(error);
      }

      try {
        const refreshToken = SecureStorage.getRefreshToken();
        console.log('🔄 Attempting token refresh...');
        console.log('- Has refresh token:', !!refreshToken);
        
        if (!refreshToken) {
          console.log('❌ No refresh token available, clearing tokens');
          // Clear any stale tokens
          SecureStorage.clearTokens();
          throw new Error(ERROR_MESSAGES.UNAUTHORIZED);
        }

        console.log('- Making refresh request to:', `${API_CONFIG.baseURL}${API_ENDPOINTS.AUTH.REFRESH}`);
        const response = await axios.post<RefreshTokenResponse>(
          `${API_CONFIG.baseURL}${API_ENDPOINTS.AUTH.REFRESH}`,
          { refresh: refreshToken },
          { timeout: API_CONFIG.timeout }
        );
        
        console.log('✅ Token refresh successful');

        // Update tokens securely
        SecureStorage.setTokens(
          response.data.access,
          response.data.refresh || refreshToken,
          JWT_CONFIG.ACCESS_TOKEN_LIFETIME_MINUTES * 60 // Convert minutes to seconds
        );

        // Update authorization header
        api.defaults.headers.common["Authorization"] = `Bearer ${response.data.access}`;
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${response.data.access}`;
        }

        return api(originalRequest);
      } catch (refreshError: any) {
        console.log('❌ Token refresh failed:', refreshError);
        
        // Handle specific error cases from token refresh
        const isUserDeleted = refreshError.response?.status === 403 || 
                             refreshError.response?.data?.error?.includes('no longer exists') ||
                             refreshError.response?.data?.error?.includes('User account no longer exists');
        
        if (isUserDeleted) {
          console.log('🚨 User account no longer exists, clearing all tokens');
          // Clear tokens immediately for deleted users
          SecureStorage.clearTokens();
          // Clear authorization header
          api.defaults.headers.common["Authorization"] = "";
        }
        
        // Only dispatch logout event if this is not during initial app load
        // Check if the app has been initialized by looking for a flag in localStorage
        const isAppInitialized = localStorage.getItem('app_initialized') === 'true';
        console.log('- App initialized:', isAppInitialized);
        
        if (isAppInitialized) {
          console.log('🚨 Dispatching logout event due to refresh failure');
          // Dispatch custom event for auth context to handle
          window.dispatchEvent(new CustomEvent('auth:logout', { 
            detail: { 
              reason: isUserDeleted ? 'user_deleted' : 'token_refresh_failed',
              message: isUserDeleted ? 
                'Your account has been removed. Please contact support.' : 
                'Your session has expired. Please log in again to continue.'
            } 
          }));
        }
        
        return Promise.reject(new Error(ERROR_MESSAGES.UNAUTHORIZED));
      }
    }

    // Handle other HTTP errors
    if (error.response?.status === HTTP_STATUS.FORBIDDEN) {
      // Check if this is a user deletion scenario
      const isUserDeleted = error.response?.data?.error?.includes('no longer exists') ||
                           error.response?.data?.error?.includes('User account no longer exists') ||
                           error.response?.data?.detail?.includes('no longer exists');
      
      if (isUserDeleted) {
        console.log('🚨 User account no longer exists (403 error), clearing all tokens');
        // Clear tokens immediately for deleted users
        SecureStorage.clearTokens();
        // Clear authorization header
        api.defaults.headers.common["Authorization"] = "";
        
        // Dispatch logout event
        const isAppInitialized = localStorage.getItem('app_initialized') === 'true';
        if (isAppInitialized) {
          window.dispatchEvent(new CustomEvent('auth:logout', { 
            detail: { 
              reason: 'user_deleted',
              message: 'Your account has been removed. Please contact support.'
            } 
          }));
        }
      }
      
      return Promise.reject(new Error(ERROR_MESSAGES.FORBIDDEN));
    }
    
    if (error.response?.status === HTTP_STATUS.NOT_FOUND) {
      return Promise.reject(new Error(ERROR_MESSAGES.NOT_FOUND));
    }
    
    if (error.response && error.response.status >= HTTP_STATUS.INTERNAL_SERVER_ERROR) {
      return Promise.reject(new Error(ERROR_MESSAGES.SERVER_ERROR));
    }

    // Network errors
    if (!error.response) {
      return Promise.reject(new Error(ERROR_MESSAGES.NETWORK_ERROR));
    }

    return Promise.reject(error);
  }
);

// OTP Functions with improved error handling
export const requestOTP = async (email: string, password: string) => {
  try {
    // Create a new axios instance without interceptors for auth requests
    const authApi = axios.create({
      baseURL: API_CONFIG.baseURL,
      timeout: API_CONFIG.timeout,
      headers: {
        "Content-Type": "application/json",
      },
    });

    const response = await authApi.post(API_ENDPOINTS.OTP.REQUEST, { email, password });
    return response.data;
  } catch (error: any) {
    const status = error.response?.status;
    const errorData = error.response?.data;
    
    // Handle specific error cases
    if (status === 423) {
      // Account locked
      throw new Error(errorData?.error || "Account temporarily locked due to suspicious activity. Please try again later.");
    } else if (status === 429) {
      // Rate limited
      throw new Error(errorData?.error || "Too many requests. Please wait before requesting another OTP.");
    } else if (status === 403) {
      // Account inactive
      throw new Error(errorData?.error || "Your account has been archived. Please contact support.");
    } else if (status === 400) {
      // Invalid credentials
      throw new Error(errorData?.error || "Invalid email or password");
    } else if (!error.response) {
      // Network error
      throw new Error(ERROR_MESSAGES.NETWORK_ERROR);
    } else {
      // Generic error
      throw new Error(errorData?.error || "Failed to send OTP. Please try again.");
    }
  }
};

export const verifyOTP = async (email: string, otp: string) => {
  try {
    // Create a new axios instance without interceptors for auth requests
    const authApi = axios.create({
      baseURL: API_CONFIG.baseURL,
      timeout: API_CONFIG.timeout,
      headers: {
        "Content-Type": "application/json",
      },
    });

    const response = await authApi.post(API_ENDPOINTS.OTP.VERIFY, { email, otp });
    
    // Store tokens if they exist in the response
    if (response.data?.access) {
      SecureStorage.setTokens(
        response.data.access,
        response.data.refresh || "",
        JWT_CONFIG.ACCESS_TOKEN_LIFETIME_MINUTES * 60 // Convert minutes to seconds
      );
    }
    
    return response.data;
  } catch (error: any) {
    const status = error.response?.status;
    const errorData = error.response?.data;
    
    // Handle specific error cases
    if (status === 423) {
      // Account locked
      throw new Error(errorData?.error || "Account temporarily locked due to suspicious activity. Please try again later.");
    } else if (status === 429) {
      // Rate limited
      throw new Error(errorData?.error || "Too many attempts. Please wait before trying again.");
    } else if (status === 400) {
      // Invalid OTP or expired
      throw new Error(errorData?.error || "Invalid or expired OTP. Please try again.");
    } else if (status === 403) {
      // Account inactive
      throw new Error(errorData?.error || "Your account is inactive. Please contact the administrator.");
    } else if (!error.response) {
      // Network error
      throw new Error(ERROR_MESSAGES.NETWORK_ERROR);
    } else {
      // Generic error
      throw new Error(errorData?.error || "Invalid OTP. Please try again.");
    }
  }
};

export const resendOTP = async (email: string) => {
  try {
    // Create a new axios instance without interceptors for auth requests
    const authApi = axios.create({
      baseURL: API_CONFIG.baseURL,
      timeout: API_CONFIG.timeout,
      headers: {
        "Content-Type": "application/json",
      },
    });

    const response = await authApi.post(API_ENDPOINTS.OTP.RESEND, { email });
    return response.data;
  } catch (error: any) {
    const status = error.response?.status;
    const errorData = error.response?.data;
    
    // Handle specific error cases
    if (status === 423) {
      // Account locked
      throw new Error(errorData?.error || "Account temporarily locked due to suspicious activity. Please try again later.");
    } else if (status === 429) {
      // Rate limited
      throw new Error(errorData?.error || "Too many requests. Please wait before requesting another OTP.");
    } else if (status === 403) {
      // Account inactive
      throw new Error(errorData?.error || "Your account is inactive. Please contact the administrator.");
    } else if (!error.response) {
      // Network error
      throw new Error(ERROR_MESSAGES.NETWORK_ERROR);
    } else {
      // Generic error
      throw new Error(errorData?.error || "Failed to resend OTP. Please try again.");
    }
  }
};

// Password Reset Functions
export const requestPasswordResetOTP = async (email: string) => {
  try {
    // Create a new axios instance without interceptors for auth requests
    const authApi = axios.create({
      baseURL: API_CONFIG.baseURL,
      timeout: API_CONFIG.timeout,
      headers: {
        "Content-Type": "application/json",
      },
    });

    const response = await authApi.post(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, { email });
    return response.data;
  } catch (error: any) {
    const status = error.response?.status;
    const errorData = error.response?.data;
    
    // Handle specific error cases
    if (status === 423) {
      // Account locked
      throw new Error(errorData?.error || "Account temporarily locked due to suspicious activity. Please try again later.");
    } else if (status === 429) {
      // Rate limited
      throw new Error(errorData?.error || "Too many requests. Please wait before requesting another OTP.");
    } else if (status === 403) {
      // Account inactive
      throw new Error(errorData?.error || "Your account is inactive. Please contact the administrator.");
    } else if (!error.response) {
      // Network error
      throw new Error(ERROR_MESSAGES.NETWORK_ERROR);
    } else {
      // Generic error
      throw new Error(errorData?.error || "Failed to send password reset OTP. Please try again.");
    }
  }
};

export const verifyPasswordResetOTP = async (email: string, otp: string) => {
  try {
    // Create a new axios instance without interceptors for auth requests
    const authApi = axios.create({
      baseURL: API_CONFIG.baseURL,
      timeout: API_CONFIG.timeout,
      headers: {
        "Content-Type": "application/json",
      },
    });

    const response = await authApi.post(API_ENDPOINTS.AUTH.VERIFY_PASSWORD_RESET_OTP, { email, otp });
    return response.data;
  } catch (error: any) {
    const status = error.response?.status;
    const errorData = error.response?.data;
    
    // Handle specific error cases
    if (status === 423) {
      // Account locked
      throw new Error(errorData?.error || "Account temporarily locked due to suspicious activity. Please try again later.");
    } else if (status === 429) {
      // Rate limited
      throw new Error(errorData?.error || "Too many attempts. Please wait before trying again.");
    } else if (status === 400) {
      // Invalid OTP or expired
      throw new Error(errorData?.error || "Invalid or expired OTP. Please try again.");
    } else if (status === 403) {
      // Account inactive
      throw new Error(errorData?.error || "Your account is inactive. Please contact the administrator.");
    } else if (!error.response) {
      // Network error
      throw new Error(ERROR_MESSAGES.NETWORK_ERROR);
    } else {
      // Generic error
      throw new Error(errorData?.error || "Invalid OTP. Please try again.");
    }
  }
};

export const resetPasswordWithToken = async (userId: string, resetToken: string, newPassword: string) => {
  try {
    // Create a new axios instance without interceptors for auth requests
    const authApi = axios.create({
      baseURL: API_CONFIG.baseURL,
      timeout: API_CONFIG.timeout,
      headers: {
        "Content-Type": "application/json",
      },
    });

    const response = await authApi.post(API_ENDPOINTS.AUTH.RESET_PASSWORD, { 
      user_id: userId, 
      reset_token: resetToken, 
      new_password: newPassword 
    });
    return response.data;
  } catch (error: any) {
    const status = error.response?.status;
    const errorData = error.response?.data;
    
    // Handle specific error cases
    if (status === 400) {
      // Invalid token or password requirements
      throw new Error(errorData?.error || "Invalid reset token or password does not meet requirements.");
    } else if (status === 403) {
      // Account inactive
      throw new Error(errorData?.error || "Your account is inactive. Please contact the administrator.");
    } else if (!error.response) {
      // Network error
      throw new Error(ERROR_MESSAGES.NETWORK_ERROR);
    } else {
      // Generic error
      throw new Error(errorData?.error || "Failed to reset password. Please try again.");
    }
  }
};

export default api;
