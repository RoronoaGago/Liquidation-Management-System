import {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
} from "react";
import { login as authLogin, logout as authLogout } from "../api/auth";
import { jwtDecode } from "jwt-decode";
import api from "@/api/axios";
import axios from "axios";
import { useNavigate } from "react-router";
import { District } from "@/lib/types";
import SecureStorage from "../lib/secureStorage";
import { API_CONFIG, API_ENDPOINTS } from "../config/api";
import { useInactivity } from "../hooks/useInactivity";
import AutoLogoutModal from "../components/AutoLogoutModal";

interface UserData {
  user_id: string | number;
  role: string;
  first_name: string;
  last_name: string;
  password_change_required?: boolean;
  phone_number?: string;
  school_district?: District;
  email: string;
  profile_picture?: string;
  e_signature?: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: UserData | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (userData: UserData, newToken?: string) => void;
  changePassword: (
    currentPassword: string,
    newPassword: string
  ) => Promise<void>;
  passwordChangeRequired: boolean;
  eSignatureRequired: boolean;
  setupFlowActive: boolean;
  completeSetupFlow: () => void;
  showAutoLogoutModal: (reason: 'inactivity' | 'token_expired' | 'session_expired') => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [user, setUser] = useState<UserData | null>(null);
  const [passwordChangeRequired, setPasswordChangeRequired] = useState(false);
  const [eSignatureRequired, setESignatureRequired] = useState(false);
  const [setupFlowActive, setSetupFlowActive] = useState(false);
  const [autoLogoutModal, setAutoLogoutModal] = useState<{
    visible: boolean;
    reason: 'inactivity' | 'token_expired' | 'session_expired';
  }>({
    visible: false,
    reason: 'inactivity'
  });
  const [inactivityModalShown, setInactivityModalShown] = useState(false);
  const [isShowingLogoutModal, setIsShowingLogoutModal] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const decodeToken = (token: string): UserData => {
    try {
      const decoded = jwtDecode<{
        user_id: string;
        email: string;
        school_district?: District;
        first_name: string;
        last_name: string;
        role: string;
        profile_picture: string;
        password_change_required?: boolean;
        e_signature?: string;
      }>(token);

      return {
        user_id: decoded.user_id,
        first_name: decoded.first_name,
        last_name: decoded.last_name,
        email: decoded.email,
        school_district: decoded.school_district || undefined,
        role: decoded.role,
        profile_picture: decoded.profile_picture,
        password_change_required: decoded.password_change_required,
        e_signature: decoded.e_signature,
      };
    } catch (error) {
      throw new Error("Invalid token");
    }
  };

  const changePassword = async (
    currentPassword: string,
    newPassword: string
  ) => {
    try {
      const response = await api.post("/change-password/", {
        old_password: currentPassword,
        new_password: newPassword,
      });

      if (response.data.access) {
        SecureStorage.setTokens(
          response.data.access,
          response.data.refresh || "",
          15 * 60 // 15 minutes (access token lifetime)
        );
        setPasswordChangeRequired(false);

        // Check if e-signature is required after password change
        const newUserData = decodeToken(response.data.access);
        setUser(newUserData);
        const requiresESignature = Boolean(
          newUserData.role &&
          ["school_head", "superintendent", "accountant"].includes(
            newUserData.role
          ) &&
          !newUserData.e_signature
        );
        setESignatureRequired(requiresESignature);

        // Set setup flow as active if e-signature is required
        if (requiresESignature) {
          setSetupFlowActive(true);
        } else {
          completeSetupFlow();
        }
      }

      return response.data;
    } catch (error) {
      throw error;
    }
  };

  const completeSetupFlow = () => {
    setSetupFlowActive(false);
    setPasswordChangeRequired(false);
    setESignatureRequired(false);
    navigate("/");
  };

  const showAutoLogoutModal = (reason: 'inactivity' | 'token_expired' | 'session_expired') => {
    // Prevent showing inactivity modal multiple times
    if (reason === 'inactivity' && inactivityModalShown) {
      return;
    }
    
    setAutoLogoutModal({ visible: true, reason });
    setIsShowingLogoutModal(true); // Prevent checkAuth from running
    
    if (reason === 'inactivity') {
      setInactivityModalShown(true);
    }
  };

  const handleAutoLogoutModalClose = () => {
    setAutoLogoutModal({ visible: false, reason: 'inactivity' });
  };

  const handleAutoLogoutLogin = () => {
    // Clear authentication state when user clicks "Go to Login Page"
    SecureStorage.clearTokens();
    
    // Clear axios authorization header
    api.defaults.headers.common["Authorization"] = "";
    
    // Update auth state
    setIsAuthenticated(false);
    setUser(null);
    setPasswordChangeRequired(false);
    setESignatureRequired(false);
    setSetupFlowActive(false);
    setInactivityModalShown(false); // Reset the modal shown state
    setIsShowingLogoutModal(false); // Reset the logout modal flag
    setIsInitialized(false); // Reset initialization flag
    
    // Clear initialization flag
    localStorage.removeItem('app_initialized');
    
    // Close modal and navigate to login
    setAutoLogoutModal({ visible: false, reason: 'inactivity' });
    navigate('/login');
  };

  // Handle inactivity detection (15 minutes = 900000 ms)
  const handleInactivity = () => {
    if (isAuthenticated) {
      showAutoLogoutModal('inactivity');
      // Don't clear tokens immediately - let user decide when to logout
    }
  };

  // Use inactivity hook only when authenticated and not in setup flow
  useInactivity({
    timeout: 15 * 60 * 1000, // 15 minutes in milliseconds
    onInactivity: handleInactivity,
    events: ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click', 'keydown'],
    enabled: isAuthenticated && !setupFlowActive && !isLoading
  });

  // Listen for logout events from axios interceptor
  useEffect(() => {
    const handleLogout = (event: CustomEvent) => {
      console.log('Logout event received:', event.detail);
      
      // Don't show logout modal during initial app load
      if (!isInitialized) {
        console.log('Ignoring logout event during initialization');
        return;
      }
      
      const reason = event.detail?.reason === 'token_refresh_failed' ? 'token_expired' : 'session_expired';
      showAutoLogoutModal(reason);
      // Don't clear tokens immediately - let user decide when to logout
    };

    window.addEventListener('auth:logout', handleLogout as EventListener);
    
    return () => {
      window.removeEventListener('auth:logout', handleLogout as EventListener);
    };
  }, [navigate, isInitialized]);

  useEffect(() => {
    const checkAuth = async () => {
      // Don't run checkAuth if logout modal is showing
      if (isShowingLogoutModal) {
        return;
      }
      
      // Use SecureStorage to get tokens
      const accessToken = SecureStorage.getAccessToken();
      const refreshToken = SecureStorage.getRefreshToken();

      if (accessToken && !SecureStorage.isAccessTokenExpired()) {
        try {
          const userData = decodeToken(accessToken);
          setUser(userData);
          setIsAuthenticated(true);
          setPasswordChangeRequired(userData.password_change_required || false);
          setESignatureRequired(
            (userData.role === "school_head" ||
              userData.role === "superintendent" ||
              userData.role === "accountant") &&
              !userData.e_signature
          );
        } catch {
          SecureStorage.clearTokens();
          setIsAuthenticated(false);
          setUser(null);
        }
        setIsLoading(false);
        return;
      }

      // If access token is missing or expired, try to refresh
      if (refreshToken) {
        try {
          const response = await axios.post(
            `${API_CONFIG.baseURL}${API_ENDPOINTS.AUTH.REFRESH}`,
            { refresh: refreshToken }
          );
          if (response.data?.access) {
            // Update tokens securely
            SecureStorage.setTokens(
              response.data.access,
              response.data.refresh || refreshToken,
              15 * 60 // 15 minutes (access token lifetime)
            );
            
            const userData = decodeToken(response.data.access);
            setUser(userData);
            setIsAuthenticated(true);
            setPasswordChangeRequired(
              userData.password_change_required || false
            );
            setESignatureRequired(
              (userData.role === "school_head" ||
                userData.role === "superintendent" ||
                userData.role === "accountant") &&
                !userData.e_signature
            );
            setIsLoading(false);
            return;
          }
        } catch {
          // Refresh failed, clear tokens
          SecureStorage.clearTokens();
          setIsAuthenticated(false);
          setUser(null);
        }
      }

      setIsLoading(false);
      setIsInitialized(true); // Mark as initialized after first auth check
      localStorage.setItem('app_initialized', 'true'); // Set flag for axios interceptor
    };
    checkAuth();
  }, [isShowingLogoutModal]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const authData = await authLogin(email, password);

      if (!authData?.access) {
        throw new Error("Authentication failed");
      }

      const token = authData.access;
      localStorage.setItem("accessToken", token);
      const userData = decodeToken(token);

      setUser(userData);
      setIsAuthenticated(true);
      setPasswordChangeRequired(userData.password_change_required || false);
      setInactivityModalShown(false); // Reset inactivity modal state on login
      setIsShowingLogoutModal(false); // Reset logout modal flag on login

      // Check if setup flow should be activated
      if (userData.password_change_required) {
        setSetupFlowActive(true);
      } else {
        // Check if e-signature is required
        const requiresESignature =
          userData.role &&
          ["school_head", "superintendent", "accountant"].includes(
            userData.role
          ) &&
          !userData.e_signature;
        if (requiresESignature) {
          setESignatureRequired(true);
          setSetupFlowActive(true);
        } else {
          navigate("/");
        }
      }
    } catch (error) {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      setIsAuthenticated(false);
      setUser(null);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

const logout = async () => {
  try {
    // Call the backend logout endpoint
    await api.post('/logout/');

    // Clear authentication state
    authLogout();
    setIsAuthenticated(false);
    setUser(null);
    setIsInitialized(false); // Reset initialization flag
    localStorage.removeItem('app_initialized'); // Clear initialization flag
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Logout failed:', error.response?.data || error.message);
    } else {
      if (error instanceof Error) {
        console.error('Logout failed:', error.message);
      } else {
        console.error('Logout failed:', error);
      }
    }
  }
};

  const updateUser = (userData: UserData, newToken?: string) => {
    setUser(userData);
    if (newToken) {
      // Update only the access token securely
      SecureStorage.updateAccessToken(newToken, 15 * 60); // 15 minutes
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        user,
        login,
        logout,
        updateUser,
        changePassword,
        passwordChangeRequired,
        eSignatureRequired,
        setupFlowActive,
        completeSetupFlow,
        showAutoLogoutModal,
      }}
    >
      {children}
      <AutoLogoutModal
        visible={autoLogoutModal.visible}
        reason={autoLogoutModal.reason}
        onClose={handleAutoLogoutModalClose}
        onLogin={handleAutoLogoutLogin}
      />
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
