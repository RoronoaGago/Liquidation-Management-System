/**
 * Authentication Flow Test Utility
 * This file contains utilities to test the complete authentication flow
 */

import SecureStorage from '../lib/secureStorage';
import { API_CONFIG, API_ENDPOINTS } from '../config/api';
import { useInactivity } from '../hooks/useInactivity';
import { AuthProvider, useAuth } from '../context/AuthContext';

export interface AuthFlowTestResult {
  step: string;
  success: boolean;
  message: string;
  details?: any;
}

export class AuthFlowTester {
  private results: AuthFlowTestResult[] = [];

  private addResult(step: string, success: boolean, message: string, details?: any) {
    this.results.push({ step, success, message, details });
    console.log(`[Auth Test] ${step}: ${success ? '✅' : '❌'} ${message}`);
  }

  /**
   * Test secure storage functionality
   */
  testSecureStorage(): boolean {
    try {
      // Test token storage
      const testAccessToken = 'test_access_token_123';
      const testRefreshToken = 'test_refresh_token_456';
      const expiresIn = 900; // 15 minutes

      SecureStorage.setTokens(testAccessToken, testRefreshToken, expiresIn);
      
      const retrievedTokens = SecureStorage.getTokens();
      if (!retrievedTokens) {
        this.addResult('Secure Storage', false, 'Failed to retrieve stored tokens');
        return false;
      }

      if (retrievedTokens.accessToken !== testAccessToken) {
        this.addResult('Secure Storage', false, 'Access token mismatch');
        return false;
      }

      if (retrievedTokens.refreshToken !== testRefreshToken) {
        this.addResult('Secure Storage', false, 'Refresh token mismatch');
        return false;
      }

      // Test token expiry check
      const isExpired = SecureStorage.isAccessTokenExpired();
      if (isExpired) {
        this.addResult('Secure Storage', false, 'Token incorrectly marked as expired');
        return false;
      }

      // Test token retrieval
      const accessToken = SecureStorage.getAccessToken();
      if (accessToken !== testAccessToken) {
        this.addResult('Secure Storage', false, 'Failed to retrieve access token');
        return false;
      }

      const refreshToken = SecureStorage.getRefreshToken();
      if (refreshToken !== testRefreshToken) {
        this.addResult('Secure Storage', false, 'Failed to retrieve refresh token');
        return false;
      }

      // Test token clearing
      SecureStorage.clearTokens();
      const clearedTokens = SecureStorage.getTokens();
      if (clearedTokens) {
        this.addResult('Secure Storage', false, 'Failed to clear tokens');
        return false;
      }

      this.addResult('Secure Storage', true, 'All secure storage tests passed');
      return true;
    } catch (error) {
      this.addResult('Secure Storage', false, `Error: ${error}`);
      return false;
    }
  }

  /**
   * Test API configuration
   */
  testApiConfiguration(): boolean {
    try {
      if (!API_CONFIG.baseURL) {
        this.addResult('API Configuration', false, 'Base URL not configured');
        return false;
      }

      if (!API_ENDPOINTS.AUTH.LOGIN) {
        this.addResult('API Configuration', false, 'Login endpoint not configured');
        return false;
      }

      if (!API_ENDPOINTS.AUTH.REFRESH) {
        this.addResult('API Configuration', false, 'Refresh endpoint not configured');
        return false;
      }

      if (!API_ENDPOINTS.OTP.REQUEST) {
        this.addResult('API Configuration', false, 'OTP request endpoint not configured');
        return false;
      }

      if (!API_ENDPOINTS.OTP.VERIFY) {
        this.addResult('API Configuration', false, 'OTP verify endpoint not configured');
        return false;
      }

      if (!API_ENDPOINTS.OTP.RESEND) {
        this.addResult('API Configuration', false, 'OTP resend endpoint not configured');
        return false;
      }

      this.addResult('API Configuration', true, 'All API endpoints configured correctly');
      return true;
    } catch (error) {
      this.addResult('API Configuration', false, `Error: ${error}`);
      return false;
    }
  }

  /**
   * Test inactivity detection setup
   */
  testInactivityDetection(): boolean {
    try {
      // Check if the inactivity hook is properly imported
      if (!useInactivity) {
        this.addResult('Inactivity Detection', false, 'useInactivity hook not found');
        return false;
      }

      this.addResult('Inactivity Detection', true, 'Inactivity detection hook available');
      return true;
    } catch (error) {
      this.addResult('Inactivity Detection', false, `Error: ${error}`);
      return false;
    }
  }

  /**
   * Test authentication context setup
   */
  testAuthContext(): boolean {
    try {
      // Check if AuthContext components are properly imported
      if (!AuthProvider) {
        this.addResult('Auth Context', false, 'AuthProvider not found');
        return false;
      }

      if (!useAuth) {
        this.addResult('Auth Context', false, 'useAuth hook not found');
        return false;
      }

      this.addResult('Auth Context', true, 'Authentication context properly set up');
      return true;
    } catch (error) {
      this.addResult('Auth Context', false, `Error: ${error}`);
      return false;
    }
  }

  /**
   * Run all authentication flow tests
   */
  runAllTests(): AuthFlowTestResult[] {
    console.log('🔐 Starting Authentication Flow Tests...\n');
    
    this.testSecureStorage();
    this.testApiConfiguration();
    this.testInactivityDetection();
    this.testAuthContext();

    const passed = this.results.filter(r => r.success).length;
    const total = this.results.length;

    console.log(`\n📊 Test Results: ${passed}/${total} tests passed`);
    
    if (passed === total) {
      console.log('🎉 All authentication flow tests passed!');
    } else {
      console.log('⚠️  Some tests failed. Please review the results above.');
    }

    return this.results;
  }

  /**
   * Get test results
   */
  getResults(): AuthFlowTestResult[] {
    return this.results;
  }

  /**
   * Clear test results
   */
  clearResults(): void {
    this.results = [];
  }
}

// Export a default instance for easy use
export const authFlowTester = new AuthFlowTester();

// Auto-run tests in development mode - DISABLED
// This was causing tokens to be cleared on page refresh
// if (import.meta.env.DEV) {
//   // Run tests after a short delay to ensure all modules are loaded
//   setTimeout(() => {
//     authFlowTester.runAllTests();
//   }, 1000);
// }
