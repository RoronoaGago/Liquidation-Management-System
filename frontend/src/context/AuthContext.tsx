import {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
} from "react";
import { login as authLogin, logout as authLogout } from "../api/auth";
import { jwtDecode } from "jwt-decode";

interface UserData {
  user_id: string | number;
  role: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  school_district?: string; // Optional for district admin
  email: string;
  profile_picture?: string;
}
interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: UserData | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (userData: UserData, newToken?: string) => void; // Add this
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [user, setUser] = useState<UserData | null>(null); // Store user data
  // const [userRole] = useState<string>("admin"); // Default to admin
  // Decode token and extract user info
  const decodeToken = (token: string): UserData => {
    try {
      const decoded = jwtDecode<{
        user_id: string;
        email: string;
        school_district?: string; // Optional for district admin
        first_name: string;
        last_name: string;
        role: string;
        profile_picture: string;
      }>(token);
      return {
        user_id: decoded.user_id,
        first_name: decoded.first_name,
        last_name: decoded.last_name,
        email: decoded.email,
        school_district: decoded.school_district || "", // Optional for district admin
        role: decoded.role,
        profile_picture: decoded.profile_picture,
      };
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      throw new Error("Invalid token");
    }
  };
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem("accessToken");
      if (token) {
        try {
          setUser(decodeToken(token));

          setIsAuthenticated(true);
        } catch {
          // If token is invalid, clear it
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
    } catch (error) {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      setIsAuthenticated(false);
      setUser(null);

      // Pass through the error message from auth.ts
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
