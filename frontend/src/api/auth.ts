import api from "./axios";

export const login = async (email: string, password: string) => {
  try {
    const response = await api.post(
      //   "http://127.0.0.1:8000/api/token/",
      // "http://192.168.1.91:8000/api/token/",
      "http://10.92.169.244:8000/api/token/",

      {
        email,
        password,
      }
    );

    if (response.data?.access) {
      localStorage.setItem("accessToken", response.data.access);
      if (response.data.refresh) {
        localStorage.setItem("refreshToken", response.data.refresh);
      }
      return response.data;
    }

    throw new Error("Authentication failed: No access token received");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
};

export const getProtectedData = async () => {
  try {
    const response = await api.get(
      // "http://10.92.169.244:8000/api/protected/",
      "http://10.92.169.244:8000/api/protected/"
    );
    return response.data;
  } catch (error) {
    console.error("Failed to fetch protected data:", error);
    throw error;
  }
};
