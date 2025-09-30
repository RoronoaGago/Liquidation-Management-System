import axios from "axios";

// Define your API response data types
interface TokenResponse {
  access: string;
  refresh?: string;
}

const api = axios.create({
  baseURL: "http://127.0.0.1:8000/api/",
  headers: {
    "Content-Type": "application/json",
  },
});

// Helper function to get tokens
const getTokens = () => ({
  accessToken: localStorage.getItem("accessToken"),
  refreshToken: localStorage.getItem("refreshToken"),
});

// Set initial token if available
const { accessToken } = getTokens();
if (accessToken) {
  api.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;
}

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const { accessToken } = getTokens();
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 and we haven't already retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // Don't try to refresh token for authentication endpoints
      const isAuthEndpoint =
        originalRequest.url?.includes("/token/") ||
        originalRequest.url?.includes("/request-otp/") ||
        originalRequest.url?.includes("/verify-otp/") ||
        originalRequest.url?.includes("/resend-otp/");

      if (isAuthEndpoint) {
        return Promise.reject(error);
      }

      try {
        const { refreshToken } = getTokens();
        if (!refreshToken) {
          // Clear any stale tokens and redirect to login
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
          // window.location.href = '/login';
          throw new Error("No refresh token available");
        }

        const response = await axios.post<TokenResponse>(
          //   "http://127.0.0.1:8000/api/token/refresh/",
          "http://192.168.1.91:8000/api/token/refresh/",
          { refresh: refreshToken }
        );

        localStorage.setItem("accessToken", response.data.access);
        if (response.data.refresh) {
          localStorage.setItem("refreshToken", response.data.refresh);
        }

        api.defaults.headers.common[
          "Authorization"
        ] = `Bearer ${response.data.access}`;
        originalRequest.headers.Authorization = `Bearer ${response.data.access}`;

        return api(originalRequest);
      } catch (err) {
        // If refresh fails, clear storage and redirect to login
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        // window.location.href = '/login';
        return Promise.reject(err);
      }
    }

    return Promise.reject(error);
  }
);

// api/axios.ts (add these functions)
export const requestOTP = async (email: string, password: string) => {
  try {
    // Create a new axios instance without interceptors for auth requests
    const authApi = axios.create({
      baseURL: "http://127.0.0.1:8000/api/",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const response = await authApi.post("/request-otp-secure/", { email, password });
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
      baseURL: "http://127.0.0.1:8000/api/",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const response = await authApi.post("/verify-otp-secure/", { email, otp });
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
      baseURL: "http://127.0.0.1:8000/api/",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const response = await authApi.post("/resend-otp-secure/", { email });
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
    } else {
      // Generic error
      throw new Error(errorData?.error || "Failed to resend OTP. Please try again.");
    }
  }
};

export default api;
