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
import { API_CONFIG, API_ENDPOINTS, JWT_CONFIG } from "../config/api";
import { useInactivity } from "../hooks/useInactivity";
import AutoLogoutModal from "../components/AutoLogoutModal";
import "../utils/debugAuth"; // Import debug utilities
import "../utils/debugRefresh"; // Import refresh debug utilities

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
  showAutoLogoutModal: (reason: 'inactivity' | 'token_expired' | 'session_expired' | 'password_changed' | 'new_user') => void;
  isNewUser: boolean;
  showReLoginModal: (isNewUser: boolean) => void;
  handleReLogin: () => void;
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
  const [isNewUser, setIsNewUser] = useState(false);
  const [autoLogoutModal, setAutoLogoutModal] = useState<{
    visible: boolean;
    reason: 'inactivity' | 'token_expired' | 'session_expired' | 'password_changed' | 'new_user';
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
        // Check if this is a new user before updating tokens
        const isNewUser = response.data.is_new_user || false;
        
        // Clear authentication state immediately for security
        setIsAuthenticated(false);
        setUser(null);
        setPasswordChangeRequired(false);
        setESignatureRequired(false);
        setSetupFlowActive(false);
        
        // Clear tokens from storage
        SecureStorage.clearTokens();
        
        // Clear axios authorization header
        api.defaults.headers.common["Authorization"] = "";
        
        // For security reasons, always show re-login modal after password change
        // This ensures the user must re-authenticate with their new password
        showReLoginModal(isNewUser);
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

  const showReLoginModal = (isNewUser: boolean) => {
    setIsNewUser(isNewUser);
    setAutoLogoutModal({
      visible: true,
      reason: isNewUser ? 'new_user' : 'password_changed'
    });
  };

  const handleReLogin = () => {
    // Close the modal first
    setAutoLogoutModal({
      visible: false,
      reason: 'inactivity'
    });
    
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
    setIsNewUser(false);
    setInactivityModalShown(false);
    setIsShowingLogoutModal(false);
    setIsInitialized(false);
    
    // Clear initialization flag
    localStorage.removeItem('app_initialized');
    
    // Navigate to login
    navigate('/login');
  };

  const showAutoLogoutModal = (reason: 'inactivity' | 'token_expired' | 'session_expired' | 'password_changed' | 'new_user') => {
    // Prevent showing inactivity modal multiple times
    if (reason === 'inactivity' && inactivityModalShown) {
      return;
    }
    
    setAutoLogoutModal({ visible: true, reason });
    setIsShowingLogoutModal(true); // Prevent checkAuth from running
    
    // Persist modal state to localStorage
    SecureStorage.setLogoutModalState(true, reason);
    
    if (reason === 'inactivity') {
      setInactivityModalShown(true);
    }
  };

  const handleAutoLogoutModalClose = () => {
    setAutoLogoutModal({ visible: false, reason: 'inactivity' });
    // Clear persisted modal state
    SecureStorage.clearLogoutModalState();
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
    
    // Clear persisted modal state
    SecureStorage.clearLogoutModalState();
    
    // Close modal and navigate to login
    setAutoLogoutModal({ visible: false, reason: 'inactivity' });
    navigate('/login');
  };

  // Handle inactivity detection (1 hour = 3600000 ms)
  const handleInactivity = () => {
    console.log('🚨 Inactivity detected! isAuthenticated:', isAuthenticated);
    if (isAuthenticated && !isShowingLogoutModal) {
      console.log('🚨 Showing inactivity logout modal');
      showAutoLogoutModal('inactivity');
      // Don't clear tokens immediately - let user decide when to logout
    }
  };

  // Use inactivity hook only when authenticated and not in setup flow
  const inactivityEnabled = isAuthenticated && !setupFlowActive && !isLoading;
  console.log('🔧 Inactivity hook enabled:', inactivityEnabled, {
    isAuthenticated,
    setupFlowActive,
    isLoading,
    timeout: JWT_CONFIG.INACTIVITY_TIMEOUT_MINUTES
  });
  
  useInactivity({
    timeout: JWT_CONFIG.INACTIVITY_TIMEOUT_MINUTES * 60 * 1000, // Convert minutes to milliseconds
    onInactivity: handleInactivity,
    events: ['mousedown', 'keypress', 'touchstart', 'click', 'keydown'], // Removed mousemove and scroll to reduce frequency
    enabled: inactivityEnabled,
    throttleMs: 5000 // 5 seconds throttle to prevent excessive resets (reduced from 10 seconds)
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

    const handleTokenUpdate = () => {
      console.log('Token update event received, re-checking authentication...');
      // Trigger a re-check of authentication state
      const checkAuth = async () => {
        const accessToken = SecureStorage.getAccessToken();
        const refreshToken = SecureStorage.getRefreshToken();
        
        console.log('🔍 AuthContext token update check:');
        console.log('- Has access token:', !!accessToken);
        console.log('- Has refresh token:', !!refreshToken);
        console.log('- Access token expired:', SecureStorage.isAccessTokenExpired());

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
            console.log('✅ Authentication state updated successfully');
          } catch (error) {
            console.error('❌ Error updating authentication state:', error);
            SecureStorage.clearTokens();
            setIsAuthenticated(false);
            setUser(null);
          }
        }
      };
      
      checkAuth();
    };

    window.addEventListener('auth:logout', handleLogout as EventListener);
    window.addEventListener('auth:token-updated', handleTokenUpdate);
    
    return () => {
      window.removeEventListener('auth:logout', handleLogout as EventListener);
      window.removeEventListener('auth:token-updated', handleTokenUpdate);
    };
  }, [navigate, isInitialized]);

  useEffect(() => {
    const checkAuth = async () => {
      // Don't run checkAuth if logout modal is showing
      if (isShowingLogoutModal) {
        return;
      }
      
      // Check for persisted logout modal state first
      const persistedModalState = SecureStorage.getLogoutModalState();
      if (persistedModalState?.visible) {
        console.log('🔄 Restoring persisted logout modal state:', persistedModalState);
        setAutoLogoutModal({ visible: true, reason: persistedModalState.reason });
        setIsShowingLogoutModal(true);
        setIsLoading(false);
        return;
      }
      
      // Use SecureStorage to get tokens from localStorage
      const accessToken = SecureStorage.getAccessToken();
      const refreshToken = SecureStorage.getRefreshToken();
      
      console.log('🔍 AuthContext checkAuth:');
      console.log('- Has access token:', !!accessToken);
      console.log('- Has refresh token:', !!refreshToken);
      console.log('- Access token expired:', SecureStorage.isAccessTokenExpired());

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
          
          // Check if setup flow should be activated (same logic as in login)
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
            }
          }
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
        console.log('🔄 Attempting token refresh in AuthContext...');
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
              JWT_CONFIG.ACCESS_TOKEN_LIFETIME_MINUTES * 60 // Convert minutes to seconds
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
            
            // Check if setup flow should be activated (same logic as in login)
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
              }
            }
            
            setIsLoading(false);
            return;
          }
        } catch (error) {
          console.log('❌ Token refresh failed in AuthContext:', error);
          // Refresh failed, clear tokens
          SecureStorage.clearTokens();
          setIsAuthenticated(false);
          setUser(null);
        }
      } else {
        console.log('❌ No refresh token available in AuthContext');
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
      const userData = decodeToken(token);

      setUser(userData);
      setIsAuthenticated(true);
      setPasswordChangeRequired(userData.password_change_required || false);
      setInactivityModalShown(false); // Reset inactivity modal state on login
      setIsShowingLogoutModal(false); // Reset logout modal flag on login
      
      // Clear any persisted logout modal state on successful login
      SecureStorage.clearLogoutModalState();

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
      // Clear tokens using secure storage
      SecureStorage.clearTokens();
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
        isNewUser,
        showReLoginModal,
        handleReLogin,
      }}
    >
      {children}
      <AutoLogoutModal
        visible={autoLogoutModal.visible}
        reason={autoLogoutModal.reason}
        onLogin={autoLogoutModal.reason === 'password_changed' || autoLogoutModal.reason === 'new_user' ? handleReLogin : handleAutoLogoutLogin}
        userName={user?.first_name || "User"}
        isNewUser={isNewUser}
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
