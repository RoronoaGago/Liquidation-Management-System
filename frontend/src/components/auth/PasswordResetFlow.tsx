import React, { useState } from 'react';
import PasswordResetModal from './PasswordResetModal';
import NewPasswordModal from './NewPasswordModal';
import SuccessModal from '../common/SuccessModal';

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
          <SuccessModal
            isOpen={true}
            onClose={() => {
              handleClose();
              onSuccess();
            }}
            title="Password Reset Successful!"
            message="Your password has been successfully reset. You can now log in with your new password."
            autoClose={true}
            autoCloseDelay={3}
            showCountdown={true}
            primaryButtonText="Continue to Login"
          />
        );
      default:
        return null;
    }
  };

  return renderCurrentStep();
};

export default PasswordResetFlow;
