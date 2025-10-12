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
  private static readonly LOGOUT_MODAL_KEY = 'logout_modal_state';

  /**
   * Store tokens securely in localStorage only
   */
  static setTokens(accessToken: string, refreshToken: string, expiresIn: number): void {
    const expiresAt = Date.now() + (expiresIn * 1000);
    
    try {
      localStorage.setItem(this.ACCESS_TOKEN_KEY, accessToken);
      localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
      localStorage.setItem(this.EXPIRES_AT_KEY, expiresAt.toString());
      console.log('✅ Tokens stored in localStorage');
    } catch (error) {
      console.error('Failed to store tokens:', error);
      throw new Error('Unable to store authentication tokens');
    }
  }

  /**
   * Retrieve tokens from localStorage only
   */
  static getTokens(): TokenData | null {
    try {
      const accessToken = localStorage.getItem(this.ACCESS_TOKEN_KEY);
      const refreshToken = localStorage.getItem(this.REFRESH_TOKEN_KEY);
      const expiresAt = localStorage.getItem(this.EXPIRES_AT_KEY);

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
    
    // Add 1 minute buffer to account for clock skew (reduced from 5 minutes)
    return Date.now() >= (tokens.expiresAt - 1 * 60 * 1000);
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
   * Clear all tokens from localStorage only
   */
  static clearTokens(): void {
    try {
      localStorage.removeItem(this.ACCESS_TOKEN_KEY);
      localStorage.removeItem(this.REFRESH_TOKEN_KEY);
      localStorage.removeItem(this.EXPIRES_AT_KEY);
      console.log('✅ Tokens cleared from localStorage');
    } catch (error) {
      console.error('Failed to clear tokens:', error);
    }
  }

  /**
   * Update only the access token (after refresh) in localStorage only
   */
  static updateAccessToken(accessToken: string, expiresIn: number): void {
    const expiresAt = Date.now() + (expiresIn * 1000);
    
    try {
      localStorage.setItem(this.ACCESS_TOKEN_KEY, accessToken);
      localStorage.setItem(this.EXPIRES_AT_KEY, expiresAt.toString());
      console.log('✅ Access token updated in localStorage');
    } catch (error) {
      console.error('Failed to update access token:', error);
      throw new Error('Unable to update access token');
    }
  }

  /**
   * Store logout modal state in localStorage
   */
  static setLogoutModalState(visible: boolean, reason: 'inactivity' | 'token_expired' | 'session_expired' | 'password_changed' | 'new_user' | 'user_deleted'): void {
    try {
      const modalState = { visible, reason, timestamp: Date.now() };
      localStorage.setItem(this.LOGOUT_MODAL_KEY, JSON.stringify(modalState));
      console.log('✅ Logout modal state stored in localStorage');
    } catch (error) {
      console.error('Failed to store logout modal state:', error);
    }
  }

  /**
   * Get logout modal state from localStorage
   */
  static getLogoutModalState(): { visible: boolean; reason: 'inactivity' | 'token_expired' | 'session_expired' | 'password_changed' | 'new_user' | 'user_deleted' } | null {
    try {
      const stored = localStorage.getItem(this.LOGOUT_MODAL_KEY);
      if (!stored) return null;
      
      const modalState = JSON.parse(stored);
      
      // Check if the modal state is not too old (e.g., within 1 hour)
      const oneHour = 60 * 60 * 1000;
      if (Date.now() - modalState.timestamp > oneHour) {
        this.clearLogoutModalState();
        return null;
      }
      
      return {
        visible: modalState.visible,
        reason: modalState.reason
      };
    } catch (error) {
      console.error('Failed to retrieve logout modal state:', error);
      return null;
    }
  }

  /**
   * Clear logout modal state from localStorage
   */
  static clearLogoutModalState(): void {
    try {
      localStorage.removeItem(this.LOGOUT_MODAL_KEY);
      console.log('✅ Logout modal state cleared from localStorage');
    } catch (error) {
      console.error('Failed to clear logout modal state:', error);
    }
  }

}

export default SecureStorage;
