import React, { useState } from 'react';
import PasswordResetModal from './PasswordResetModal';
import NewPasswordModal from './NewPasswordModal';

interface PasswordResetFlowProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type FlowStep = 'reset' | 'new-password' | 'success';

const PasswordResetFlow: React.FC<PasswordResetFlowProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [currentStep, setCurrentStep] = useState<FlowStep>('reset');
  const [email, setEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [userId, setUserId] = useState('');

  const handleResetSuccess = (userEmail: string, token: string, user: string) => {
    setEmail(userEmail);
    setResetToken(token);
    setUserId(user);
    setCurrentStep('new-password');
  };

  const handlePasswordResetSuccess = () => {
    setCurrentStep('success');
    // Show success message briefly then close
    setTimeout(() => {
      handleClose();
      onSuccess();
    }, 2000);
  };

  const handleClose = () => {
    setCurrentStep('reset');
    setEmail('');
    setResetToken('');
    setUserId('');
    onClose();
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'reset':
        return (
          <PasswordResetModal
            isOpen={isOpen}
            onClose={handleClose}
            onSuccess={handleResetSuccess}
          />
        );
      case 'new-password':
        return (
          <NewPasswordModal
            isOpen={isOpen}
            onClose={handleClose}
            onSuccess={handlePasswordResetSuccess}
            email={email}
            resetToken={resetToken}
            userId={userId}
          />
        );
      case 'success':
        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6 text-center">
                <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-green-100 dark:bg-green-900 rounded-full">
                  <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Password Reset Successful!
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Your password has been successfully reset. You can now login with your new password.
                </p>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return renderCurrentStep();
};

export default PasswordResetFlow;
