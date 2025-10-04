import React, { useState, useEffect } from 'react';
import { resetPasswordWithToken } from '../../api/axios';
import { CheckIcon, EyeClosedIcon, EyeIcon, XIcon } from 'lucide-react';
import Input from '../form/input/InputField';

interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
  met: boolean;
}

interface NewPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  email: string;
  resetToken: string;
  userId: string;
}

const NewPasswordModal: React.FC<NewPasswordModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  email,
  resetToken,
  userId,
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [newPasswordError, setNewPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Password requirements
  const [requirements, setRequirements] = useState<PasswordRequirement[]>([
    {
      label: "8-64 characters long",
      test: (password) => password.length >= 8 && password.length <= 64,
      met: false,
    },
    {
      label: "Contains uppercase, lowercase, and number",
      test: (password) =>
        /[A-Z]/.test(password) &&
        /[a-z]/.test(password) &&
        /[0-9]/.test(password),
      met: false,
    },
    {
      label: "Contains special character (!@#$%^&*...)",
      test: (password) => /[!@#$%^&*(),.?":{}|<>]/.test(password),
      met: false,
    },
    {
      label: "No spaces",
      test: (password) => !/\s/.test(password),
      met: false,
    },
  ]);

  // Real-time validation for new password
  useEffect(() => {
    if (newPassword) {
      setRequirements((prev) =>
        prev.map((req) => ({
          ...req,
          met: req.test(newPassword),
        }))
      );
      // Clear error when user starts typing
      if (newPasswordError) {
        setNewPasswordError('');
      }
    } else {
      setRequirements((prev) => prev.map((req) => ({ ...req, met: false })));
    }
  }, [newPassword, newPasswordError]);

  // Real-time validation for confirm password
  useEffect(() => {
    if (confirmPassword && newPassword !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match');
    } else if (confirmPasswordError) {
      setConfirmPasswordError('');
    }
  }, [confirmPassword, newPassword, confirmPasswordError]);

  const allRequirementsMet = requirements.every((req) => req.met);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous errors
    setError('');
    setNewPasswordError('');
    setConfirmPasswordError('');
    
    let hasErrors = false;

    if (!allRequirementsMet) {
      setNewPasswordError('Please ensure all password requirements are met');
      hasErrors = true;
    }

    if (newPassword !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match');
      hasErrors = true;
    }

    if (hasErrors) {
      return;
    }

    setIsLoading(true);

    try {
      await resetPasswordWithToken(userId, resetToken, newPassword);
      onSuccess();
      handleClose();
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setNewPasswordError('');
    setConfirmPasswordError('');
    setIsLoading(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Create New Password
          </h2>
         
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Almost done!
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Create a new strong password for your account: <strong>{email}</strong>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* New Password */}
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                New Password
              </label>
              <div className="relative">
                <Input
                  type={showNewPassword ? "text" : "password"}
                  id="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  disabled={isLoading}
                  required
                  error={!!newPasswordError}
                  hint={newPasswordError}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center z-10"
                >
                  {showNewPassword ? (
                    <EyeClosedIcon className="h-5 w-5 text-gray-400" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            {/* Password Requirements */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Password Requirements:
              </p>
              {requirements.map((req, index) => (
                <div key={index} className="flex items-center text-sm">
                  {req.met ? (
                    <CheckIcon className="w-4 h-4 text-green-500 mr-2" />
                  ) : (
                    <XIcon className="w-4 h-4 text-red-500 mr-2" />
                  )}
                  <span className={req.met ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                    {req.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Confirm New Password
              </label>
              <div className="relative">
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  disabled={isLoading}
                  required
                  error={!!confirmPasswordError}
                  hint={confirmPasswordError}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center z-10"
                >
                  {showConfirmPassword ? (
                    <EyeClosedIcon className="h-5 w-5 text-gray-400" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            {/* Real-time password match indicator */}
            {confirmPassword && (
              <div className="flex items-center text-xs">
                {newPassword === confirmPassword ? (
                  <>
                    <CheckIcon className="w-4 h-4 text-green-500 mr-1" />
                    <span className="text-green-600 dark:text-green-400">
                      Passwords match
                    </span>
                  </>
                ) : (
                  <>
                    <XIcon className="w-4 h-4 text-red-500 mr-1" />
                    <span className="text-red-600 dark:text-red-400">
                      Passwords don't match
                    </span>
                  </>
                )}
              </div>
            )}

            {error && (
              <div className="flex items-center p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                <XIcon className="w-5 h-5 text-red-500 mr-2 flex-shrink-0" />
                <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
              </div>
            )}

            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={
                  isLoading ||
                  !allRequirementsMet ||
                  !confirmPassword ||
                  newPassword !== confirmPassword
                }
              >
                {isLoading ? 'Resetting...' : 'Reset Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default NewPasswordModal;
