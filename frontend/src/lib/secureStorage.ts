/**
 * Secure token storage utility
 * Provides secure storage mechanisms for sensitive data like JWT tokens
 */

interface TokenData {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

class SecureStorage {
  private static readonly ACCESS_TOKEN_KEY = 'access_token';
  private static readonly REFRESH_TOKEN_KEY = 'refresh_token';
  private static readonly EXPIRES_AT_KEY = 'expires_at';

  /**
   * Store tokens securely
   * Uses sessionStorage for better security (cleared on tab close)
   * Falls back to localStorage if sessionStorage is not available
   */
  static setTokens(accessToken: string, refreshToken: string, expiresIn: number): void {
    const expiresAt = Date.now() + (expiresIn * 1000);
    
    try {
      // Try sessionStorage first (more secure)
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem(this.ACCESS_TOKEN_KEY, accessToken);
        sessionStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
        sessionStorage.setItem(this.EXPIRES_AT_KEY, expiresAt.toString());
        return;
      }
    } catch (error) {
      console.warn('SessionStorage not available, falling back to localStorage');
    }

    // Fallback to localStorage
    try {
      localStorage.setItem(this.ACCESS_TOKEN_KEY, accessToken);
      localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
      localStorage.setItem(this.EXPIRES_AT_KEY, expiresAt.toString());
    } catch (error) {
      console.error('Failed to store tokens:', error);
      throw new Error('Unable to store authentication tokens');
    }
  }

  /**
   * Retrieve tokens
   */
  static getTokens(): TokenData | null {
    try {
      // Try sessionStorage first
      let accessToken: string | null = null;
      let refreshToken: string | null = null;
      let expiresAt: string | null = null;

      if (typeof sessionStorage !== 'undefined') {
        accessToken = sessionStorage.getItem(this.ACCESS_TOKEN_KEY);
        refreshToken = sessionStorage.getItem(this.REFRESH_TOKEN_KEY);
        expiresAt = sessionStorage.getItem(this.EXPIRES_AT_KEY);
      }

      // Fallback to localStorage if sessionStorage is empty
      if (!accessToken && typeof localStorage !== 'undefined') {
        accessToken = localStorage.getItem(this.ACCESS_TOKEN_KEY);
        refreshToken = localStorage.getItem(this.REFRESH_TOKEN_KEY);
        expiresAt = localStorage.getItem(this.EXPIRES_AT_KEY);
      }

      if (!accessToken || !refreshToken || !expiresAt) {
        return null;
      }

      return {
        accessToken,
        refreshToken,
        expiresAt: parseInt(expiresAt, 10)
      };
    } catch (error) {
      console.error('Failed to retrieve tokens:', error);
      return null;
    }
  }

  /**
   * Check if access token is expired
   */
  static isAccessTokenExpired(): boolean {
    const tokens = this.getTokens();
    if (!tokens) return true;
    
    // Add 5 minute buffer to account for clock skew
    return Date.now() >= (tokens.expiresAt - 5 * 60 * 1000);
  }

  /**
   * Get access token if not expired
   */
  static getAccessToken(): string | null {
    const tokens = this.getTokens();
    if (!tokens || this.isAccessTokenExpired()) {
      return null;
    }
    return tokens.accessToken;
  }

  /**
   * Get refresh token
   */
  static getRefreshToken(): string | null {
    const tokens = this.getTokens();
    return tokens?.refreshToken || null;
  }

  /**
   * Clear all tokens
   */
  static clearTokens(): void {
    try {
      // Clear from sessionStorage
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem(this.ACCESS_TOKEN_KEY);
        sessionStorage.removeItem(this.REFRESH_TOKEN_KEY);
        sessionStorage.removeItem(this.EXPIRES_AT_KEY);
      }

      // Clear from localStorage
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(this.ACCESS_TOKEN_KEY);
        localStorage.removeItem(this.REFRESH_TOKEN_KEY);
        localStorage.removeItem(this.EXPIRES_AT_KEY);
      }
    } catch (error) {
      console.error('Failed to clear tokens:', error);
    }
  }

  /**
   * Update only the access token (after refresh)
   */
  static updateAccessToken(accessToken: string, expiresIn: number): void {
    const expiresAt = Date.now() + (expiresIn * 1000);
    
    try {
      // Try sessionStorage first
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem(this.ACCESS_TOKEN_KEY, accessToken);
        sessionStorage.setItem(this.EXPIRES_AT_KEY, expiresAt.toString());
        return;
      }
    } catch (error) {
      console.warn('SessionStorage not available, falling back to localStorage');
    }

    // Fallback to localStorage
    try {
      localStorage.setItem(this.ACCESS_TOKEN_KEY, accessToken);
      localStorage.setItem(this.EXPIRES_AT_KEY, expiresAt.toString());
    } catch (error) {
      console.error('Failed to update access token:', error);
      throw new Error('Unable to update access token');
    }
  }
}

export default SecureStorage;
