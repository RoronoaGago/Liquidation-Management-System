import SecureStorage from "../lib/secureStorage";
import { API_ENDPOINTS, JWT_CONFIG } from "../config/api";
import api from "./axios";

export const login = async (email: string, password: string) => {
  try {
    const response = await api.post(API_ENDPOINTS.AUTH.LOGIN, {
      email,
      password,
    });

    if (response.data?.access) {
      // Store tokens securely
      SecureStorage.setTokens(
        response.data.access,
        response.data.refresh || "",
        JWT_CONFIG.ACCESS_TOKEN_LIFETIME_MINUTES * 60 // Convert minutes to seconds
      );
      return response.data;
    }
    
    throw new Error("Authentication failed: No access token received");
  } catch (error: any) {
    // Transform Axios error to a more specific error
    if (error.response) {
      // Handle HTTP errors
      if (error.response.status === 401) {
        throw new Error("Invalid email or password");
      } else if (error.response.status >= 500) {
        throw new Error("Server error. Please try again later.");
      }
    }
    // Re-throw other errors
    throw new Error(error.message || "Login failed");
  }
};

export const logout = () => {
  SecureStorage.clearTokens();
};

export const getProtectedData = async () => {
  try {
    const response = await api.get("/protected/");
    return response.data;
  } catch (error) {
    console.error("Failed to fetch protected data:", error);
    throw error;
  }
};
