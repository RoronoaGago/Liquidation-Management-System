import React, { useState, useEffect, useRef } from 'react';
import { requestPasswordResetOTP, verifyPasswordResetOTP } from '../../api/axios';
import { ArrowLeftIcon, MailIcon, Clock, RefreshCw, AlertTriangle } from 'lucide-react';
import Input from '../form/input/InputField';
import Label from '../form/Label';
import { validateEmail } from '../../lib/helpers';

interface PasswordResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (email: string, resetToken: string, userId: string) => void;
}

type Step = 'email' | 'otp';

const PasswordResetModal: React.FC<PasswordResetModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  console.log('🔄 PasswordResetModal: Component initialized', {
    isOpen,
    currentStep: 'email'
  });

  const [currentStep, setCurrentStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(Array(6).fill(""));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [errorType, setErrorType] = useState<'error' | 'warning' | 'info'>('error');
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes in seconds
  const [resendCooldown, setResendCooldown] = useState(0);
  const [emailError, setEmailError] = useState('');
  const inputRefs = useRef<HTMLInputElement[]>([]);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  // Countdown timer
  useEffect(() => {
    if (currentStep === 'otp' && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft, currentStep]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Debounced email validation
  useEffect(() => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    if (email.trim()) {
      debounceTimeout.current = setTimeout(() => {
        if (!validateEmail(email.trim())) {
          setEmailError('Please enter a valid email address');
        } else {
          setEmailError('');
        }
      }, 500);
    } else {
      setEmailError('');
    }

    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, [email]);


  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('🔄 PasswordResetModal: Email submission started', {
      email: email.trim(),
      emailLength: email.trim().length
    });

    // Validate email
    if (!email.trim()) {
      console.log('🔄 PasswordResetModal: Email validation failed - empty email');
      setEmailError('Please enter your email address');
      return;
    }

    if (!validateEmail(email.trim())) {
      console.log('🔄 PasswordResetModal: Email validation failed - invalid format');
      setEmailError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    setError('');
    setEmailError('');

    try {
      console.log('🔄 PasswordResetModal: Requesting password reset OTP', {
        email: email.trim()
      });
      
      await requestPasswordResetOTP(email.trim());
      
      console.log('🔄 PasswordResetModal: OTP request successful, moving to OTP step');
      setCurrentStep('otp');
      setTimeLeft(300); // Reset timer
    } catch (err: any) {
      console.error('🔄 PasswordResetModal: OTP request failed', {
        error: err.message,
        errorType: typeof err,
        stack: err.stack
      });
      setError(err.message || 'Failed to send password reset OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpValue = otp.join("");
    
    console.log('🔄 PasswordResetModal: OTP submission started', {
      email,
      otpValue: otpValue.replace(/./g, '*'), // Mask OTP for security
      otpLength: otpValue.length
    });

    setError('');
    setErrorType('error');

    if (otpValue.length !== 6) {
      console.log('🔄 PasswordResetModal: OTP validation failed - invalid length', {
        otpLength: otpValue.length,
        expectedLength: 6
      });
      setError('Please enter a valid 6-digit OTP');
      setErrorType('error');
      return;
    }

    setIsLoading(true);

    try {
      console.log('🔄 PasswordResetModal: Verifying OTP with backend', {
        email,
        otpLength: otpValue.length
      });

      const response = await verifyPasswordResetOTP(email, otpValue);
      
      console.log('🔄 PasswordResetModal: OTP verification successful', {
        email,
        hasResetToken: !!response.reset_token,
        userId: response.user_id
      });

      onSuccess(email, response.reset_token, response.user_id);
    } catch (err: any) {
      setIsLoading(false);
      const errorMessage = err.message || 'Invalid OTP. Please try again.';
      
      console.error('🔄 PasswordResetModal: OTP verification failed', {
        error: errorMessage,
        errorType: typeof err,
        stack: err.stack
      });

      setError(errorMessage);
      
      // Determine error type based on message content
      if (errorMessage.includes('locked') || errorMessage.includes('suspicious')) {
        setErrorType('warning');
      } else if (errorMessage.includes('rate limit') || errorMessage.includes('too many')) {
        setErrorType('warning');
      } else {
        setErrorType('error');
      }
    }
  };

  const handleOtpChange = (value: string, index: number) => {
    if (!/^\d*$/.test(value)) {
      console.log('🔄 PasswordResetModal: Invalid OTP input - non-numeric character', {
        value,
        index
      });
      return; // Only allow numbers
    }

    const newOtp = [...otp];
    newOtp[index] = value;
    
    console.log('🔄 PasswordResetModal: OTP input changed', {
      index,
      value,
      newOtpLength: newOtp.join('').length,
      currentOtp: newOtp.join('').replace(/./g, '*') // Mask for security
    });

    setOtp(newOtp);
    setError('');
    setErrorType('error');

    // Auto-focus to next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      // Move to previous input on backspace
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").slice(0, 6);
    if (/^\d+$/.test(pastedData)) {
      const newOtp = [...otp];
      for (let i = 0; i < pastedData.length; i++) {
        if (i < 6) newOtp[i] = pastedData[i];
      }
      setOtp(newOtp);

      // Focus on the last filled input
      const lastFilledIndex = Math.min(pastedData.length - 1, 5);
      inputRefs.current[lastFilledIndex]?.focus();
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) {
      console.log('🔄 PasswordResetModal: Resend OTP blocked - cooldown active', {
        cooldownRemaining: resendCooldown
      });
      return;
    }

    console.log('🔄 PasswordResetModal: Resending OTP', {
      email,
      currentOtpLength: otp.join('').length
    });

    setResendCooldown(60); // 60 seconds cooldown
    setError('');
    setErrorType('error');
    setTimeLeft(300); // Reset OTP expiry timer

    try {
      await requestPasswordResetOTP(email);
      
      console.log('🔄 PasswordResetModal: OTP resend successful', {
        email,
        newCooldown: 60,
        timerReset: 300
      });

      // Clear the current OTP inputs
      setOtp(Array(6).fill(""));
      // Focus on first input
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to resend OTP. Please try again.';
      
      console.error('🔄 PasswordResetModal: OTP resend failed', {
        error: errorMessage,
        errorType: typeof err,
        stack: err.stack
      });

      setError(errorMessage);
      
      // Determine error type based on message content
      if (errorMessage.includes('locked') || errorMessage.includes('suspicious')) {
        setErrorType('warning');
      } else if (errorMessage.includes('rate limit') || errorMessage.includes('too many')) {
        setErrorType('warning');
      } else {
        setErrorType('error');
      }
      
      setResendCooldown(0); // Reset cooldown on error
    }
  };

  const handleClose = () => {
    console.log('🔄 PasswordResetModal: Modal closing - resetting all state');
    setCurrentStep('email');
    setEmail('');
    setOtp(Array(6).fill(""));
    setError('');
    setErrorType('error');
    setEmailError('');
    setIsLoading(false);
    setTimeLeft(300);
    setResendCooldown(0);
    // Clear any pending debounce timeout
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }
    onClose();
  };

  const handleBackToEmail = () => {
    console.log('🔄 PasswordResetModal: Going back to email step');
    setCurrentStep('email');
    setOtp(Array(6).fill(""));
    setError('');
    setErrorType('error');
    setEmailError('');
    setTimeLeft(300);
    setResendCooldown(0);
    // Clear any pending debounce timeout
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center mb-6">
          <button
            onClick={currentStep === 'otp' ? handleBackToEmail : handleClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 mr-2"
          >
            <ArrowLeftIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">
            {currentStep === 'email' ? 'Reset Password' : 'Verify OTP'}
          </h2>
        </div>

        {/* Content */}
        <div>
          {currentStep === 'email' ? (
            <>
              {/* Email Step */}
              <div className="mb-6">
                <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mx-auto mb-4 dark:bg-blue-900/30">
                  <MailIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white text-center mb-2">
                  Forgot your password?
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                  Enter your email address and we'll send you an OTP to reset your password.
                </p>
              </div>

              {/* Enhanced Error display with different types */}
              {error && (
                <div className={`p-3 mb-6 text-sm rounded-lg flex items-center gap-2 ${
                  errorType === 'warning' 
                    ? 'text-amber-700 bg-amber-100 dark:bg-amber-900 dark:text-amber-100'
                    : errorType === 'info'
                    ? 'text-blue-700 bg-blue-100 dark:bg-blue-900 dark:text-blue-100'
                    : 'text-red-700 bg-red-100 dark:bg-red-900 dark:text-red-100'
                }`}>
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleEmailSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email Address
                  </Label>
                  <Input
                    type="text"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2"
                    placeholder="Enter your email address"
                    disabled={isLoading}
                    required
                    error={!!emailError}
                    hint={emailError || undefined}
                  />
                </div>

                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                    disabled={isLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Sending...' : 'Send OTP'}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <>
              {/* OTP Step */}
              <div className="mb-6">
                <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mx-auto mb-4 dark:bg-blue-900/30">
                  <MailIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <p className="text-center text-gray-600 dark:text-gray-400 mb-2">
                  Enter the 6-digit code sent to
                </p>
                <p className="text-center font-medium text-gray-800 dark:text-white mb-4">
                  {email}
                </p>
                
                {/* Security Indicators */}
                <div className="flex items-center justify-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-4">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>Expires in {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</span>
                  </div>
                </div>
              </div>

              {/* Enhanced Error display with different types */}
              {error && (
                <div className={`p-3 mb-6 text-sm rounded-lg flex items-center gap-2 ${
                  errorType === 'warning' 
                    ? 'text-amber-700 bg-amber-100 dark:bg-amber-900 dark:text-amber-100'
                    : errorType === 'info'
                    ? 'text-blue-700 bg-blue-100 dark:bg-blue-900 dark:text-blue-100'
                    : 'text-red-700 bg-red-100 dark:bg-red-900 dark:text-red-100'
                }`}>
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleOtpSubmit} className="space-y-6">
                {/* OTP Inputs */}
                <div className="flex justify-between gap-2">
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => {
                        inputRefs.current[index] = el as HTMLInputElement;
                      }}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(e.target.value, index)}
                      onKeyDown={(e) => handleKeyDown(e, index)}
                      onPaste={index === 0 ? handlePaste : undefined}
                      className="w-12 h-12 text-center text-xl font-semibold border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      autoFocus={index === 0}
                    />
                  ))}
                </div>

                {/* Resend OTP */}
                <div className="text-center">
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendCooldown > 0}
                    className={`text-sm ${
                      resendCooldown > 0
                        ? "text-gray-400 dark:text-gray-500"
                        : "text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                    }`}
                  >
                    {resendCooldown > 0 ? (
                      `Resend code in ${resendCooldown}s`
                    ) : (
                      <span className="flex items-center justify-center">
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Resend verification code
                      </span>
                    )}
                  </button>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isLoading || otp.join("").length !== 6}
                >
                  {isLoading ? "Verifying..." : "Verify & Continue"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PasswordResetModal;
