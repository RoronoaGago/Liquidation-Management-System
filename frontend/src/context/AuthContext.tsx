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
import { useNavigate } from "react-router";

interface UserData {
  user_id: string | number;
  role: string;
  first_name: string;
  last_name: string;
  password_change_required?: boolean;
  phone_number?: string;
  school_district?: string;
  email: string;
  profile_picture?: string;
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [user, setUser] = useState<UserData | null>(null);
  const [passwordChangeRequired, setPasswordChangeRequired] = useState(false);

  const decodeToken = (token: string): UserData => {
    try {
      const decoded = jwtDecode<{
        user_id: string;
        email: string;
        school_district?: string;
        first_name: string;
        last_name: string;
        role: string;
        profile_picture: string;
        password_change_required?: boolean;
      }>(token);

      return {
        user_id: decoded.user_id,
        first_name: decoded.first_name,
        last_name: decoded.last_name,
        email: decoded.email,
        school_district: decoded.school_district || "",
        role: decoded.role,
        profile_picture: decoded.profile_picture,
        password_change_required: decoded.password_change_required,
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
        localStorage.setItem("accessToken", response.data.access);
        setPasswordChangeRequired(false);
      }

      return response.data;
    } catch (error) {
      throw error;
    }
  };

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem("accessToken");
      if (token) {
        try {
          const userData = decodeToken(token);
          setUser(userData);
          setIsAuthenticated(true);
          setPasswordChangeRequired(userData.password_change_required || false);
        } catch {
          localStorage.removeItem("accessToken");
          setIsAuthenticated(false);
          setUser(null);
        }
      }
      setIsLoading(false);
    };
    checkAuth();
  }, []);

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

      if (!userData.password_change_required) {
        navigate("/");
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

  const logout = () => {
    authLogout();
    setIsAuthenticated(false);
    setUser(null);
  };

  const updateUser = (userData: UserData, newToken?: string) => {
    setUser(userData);
    if (newToken) {
      localStorage.setItem("accessToken", newToken);
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
      }}
    >
      {children}
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
