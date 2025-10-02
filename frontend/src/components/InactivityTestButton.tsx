import React from 'react';
import { Button, Space, Typography } from 'antd';
import { useAuth } from '../context/AuthContext';

const { Text } = Typography;

/**
 * Test component to demonstrate the auto-logout modal functionality
 * This should only be used for development/testing purposes
 */
const InactivityTestButton: React.FC = () => {
  const { showAutoLogoutModal, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return null;
  }

  const handleTestInactivity = () => {
    showAutoLogoutModal('inactivity');
  };

  const handleTestTokenExpired = () => {
    showAutoLogoutModal('token_expired');
  };

  const handleTestSessionExpired = () => {
    showAutoLogoutModal('session_expired');
  };

  return (
    <div style={{ 
      position: 'fixed', 
      bottom: '20px', 
      right: '20px', 
      zIndex: 1000,
      background: 'white',
      padding: '16px',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      border: '1px solid #d9d9d9'
    }}>
      <Text strong style={{ display: 'block', marginBottom: '8px' }}>
        Test Auto-Logout Modal
      </Text>
      <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: '8px' }}>
        Modal shows first, logout happens on button click
      </Text>
      <Space direction="vertical" size="small">
        <Button 
          size="small" 
          onClick={handleTestInactivity}
          style={{ width: '100%' }}
        >
          Test Inactivity
        </Button>
        <Button 
          size="small" 
          onClick={handleTestTokenExpired}
          style={{ width: '100%' }}
        >
          Test Token Expired
        </Button>
        <Button 
          size="small" 
          onClick={handleTestSessionExpired}
          style={{ width: '100%' }}
        >
          Test Session Expired
        </Button>
      </Space>
    </div>
  );
};

export default InactivityTestButton;
