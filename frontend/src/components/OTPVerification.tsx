// components/OTPVerification.tsx
import { useState, useRef, useEffect } from "react";
import { ArrowLeft, Mail, RefreshCw, AlertTriangle, Clock } from "lucide-react";
import Button from "./ui/button/Button";
import { toast } from "react-toastify";
import { verifyOTP, resendOTP } from "@/api/axios";

interface OTPVerificationProps {
  email: string;
  onBack: () => void;
  onSuccess: () => void;
}

export default function OTPVerification({
  email,
  onBack,
  onSuccess,
}: OTPVerificationProps) {
  console.log('📧 OTPVerification: Component initialized', {
    email,
    timestamp: new Date().toISOString()
  });

  const [otp, setOtp] = useState(Array(6).fill(""));
  const [isLoading, setIsLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [error, setError] = useState("");
  const [errorType, setErrorType] = useState<'error' | 'warning' | 'info'>('error');
  const [isAccountLocked, setIsAccountLocked] = useState(false);
  const [lockoutTime, setLockoutTime] = useState(0);
  const [otpExpiry, setOtpExpiry] = useState(5 * 60); // 5 minutes in seconds
  const inputRefs = useRef<HTMLInputElement[]>([]);

  // Set up resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(
        () => setResendCooldown(resendCooldown - 1),
        1000
      );
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Set up OTP expiry timer
  useEffect(() => {
    if (otpExpiry > 0) {
      const timer = setTimeout(
        () => setOtpExpiry(otpExpiry - 1),
        1000
      );
      return () => clearTimeout(timer);
    }
  }, [otpExpiry]);

  // Set up account lockout timer
  useEffect(() => {
    if (lockoutTime > 0) {
      const timer = setTimeout(
        () => setLockoutTime(lockoutTime - 1),
        1000
      );
      return () => clearTimeout(timer);
    } else if (isAccountLocked) {
      setIsAccountLocked(false);
    }
  }, [lockoutTime, isAccountLocked]);

  const handleChange = (value: string, index: number) => {
    if (!/^\d*$/.test(value)) {
      console.log('📧 OTPVerification: Invalid OTP input - non-numeric character', {
        value,
        index,
        email
      });
      return; // Only allow numbers
    }

    const newOtp = [...otp];
    newOtp[index] = value;
    
    console.log('📧 OTPVerification: OTP input changed', {
      index,
      value,
      newOtpLength: newOtp.join('').length,
      currentOtp: newOtp.join('').replace(/./g, '*'), // Mask for security
      email
    });

    setOtp(newOtp);
    setError(""); // Clear error when user starts typing
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpValue = otp.join("");
    
    console.log('📧 OTPVerification: OTP submission started', {
      email,
      otpValue: otpValue.replace(/./g, '*'), // Mask OTP for security
      otpLength: otpValue.length,
      isAccountLocked,
      lockoutTime
    });

    setError(""); // Clear previous error
    setErrorType('error');

    if (otpValue.length !== 6) {
      console.log('📧 OTPVerification: OTP validation failed - invalid length', {
        otpLength: otpValue.length,
        expectedLength: 6,
        email
      });
      setError("Please enter a valid 6-digit OTP");
      setErrorType('error');
      return;
    }

    setIsLoading(true);

    try {
      console.log('📧 OTPVerification: Verifying OTP with backend', {
        email,
        otpLength: otpValue.length
      });

      await verifyOTP(email, otpValue);
      
      console.log('📧 OTPVerification: OTP verification successful', {
        email
      });

      toast.success("OTP verified successfully!");
      onSuccess(); // Just navigate away, no need to set loading to false
    } catch (err: any) {
      setIsLoading(false);
      const errorMessage = err.message || "Invalid OTP. Please try again.";
      
      console.error('📧 OTPVerification: OTP verification failed', {
        error: errorMessage,
        errorType: typeof err,
        stack: err.stack,
        email
      });

      setError(errorMessage);
      
      // Determine error type based on message content
      if (errorMessage.includes('locked') || errorMessage.includes('suspicious')) {
        setErrorType('warning');
        setIsAccountLocked(true);
        setLockoutTime(15 * 60); // 15 minutes
        
        console.log('📧 OTPVerification: Account locked due to suspicious activity', {
          lockoutTime: 15 * 60,
          email
        });
      } else if (errorMessage.includes('rate limit') || errorMessage.includes('too many')) {
        setErrorType('warning');
      } else {
        setErrorType('error');
      }
    }
  };

  const handleResendOTP = async () => {
    if (resendCooldown > 0 || isAccountLocked) {
      console.log('📧 OTPVerification: Resend OTP blocked', {
        cooldownRemaining: resendCooldown,
        isAccountLocked,
        email
      });
      return;
    }

    console.log('📧 OTPVerification: Resending OTP', {
      email,
      currentOtpLength: otp.join('').length,
      currentCooldown: resendCooldown
    });

    setResendCooldown(60); // 60 seconds cooldown
    setError(""); // Clear any previous errors
    setErrorType('error');
    setOtpExpiry(5 * 60); // Reset OTP expiry timer

    try {
      await resendOTP(email);
      
      console.log('📧 OTPVerification: OTP resend successful', {
        email,
        newCooldown: 60,
        timerReset: 5 * 60
      });

      toast.success("OTP sent to your email!");
      // Clear the current OTP inputs
      setOtp(Array(6).fill(""));
      // Focus on first input
      inputRefs.current[0]?.focus();
    } catch (error: any) {
      const errorMessage = error.message || "Failed to send OTP. Please try again.";
      
      console.error('📧 OTPVerification: OTP resend failed', {
        error: errorMessage,
        errorType: typeof error,
        stack: error.stack,
        email
      });

      setError(errorMessage);
      
      // Determine error type based on message content
      if (errorMessage.includes('locked') || errorMessage.includes('suspicious')) {
        setErrorType('warning');
        setIsAccountLocked(true);
        setLockoutTime(15 * 60); // 15 minutes
        
        console.log('📧 OTPVerification: Account locked during resend', {
          lockoutTime: 15 * 60,
          email
        });
      } else if (errorMessage.includes('rate limit') || errorMessage.includes('too many')) {
        setErrorType('warning');
      } else {
        setErrorType('error');
      }
      
      toast.error(errorMessage);
      setResendCooldown(0); // Reset cooldown on error
    }
  };

  return (
    <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
      {/* Header */}
      <div className="flex items-center mb-6">
        <button
          onClick={onBack}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 mr-2"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </button>
        <h2 className="text-xl font-bold text-gray-800 dark:text-white">
          Verify Your Email
        </h2>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mx-auto mb-4 dark:bg-blue-900/30">
          <Mail className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        </div>
        <p className="text-center text-gray-600 dark:text-gray-400 mb-2">
          Enter the 6-digit code sent to
        </p>
        <p className="text-center font-medium text-gray-800 dark:text-white mb-4">
          {email}
        </p>
        
        {/* Security Indicators */}
        <div className="flex items-center justify-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-4">
          {/* <div className="flex items-center gap-1">
            <Shield className="h-4 w-4" />
            <span>Secure</span>
          </div> */}
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>Expires in {Math.floor(otpExpiry / 60)}:{(otpExpiry % 60).toString().padStart(2, '0')}</span>
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
          {errorType === 'warning' ? (
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          )}
          <span>{error}</span>
        </div>
      )}

      {/* Account Lockout Warning */}
      {isAccountLocked && (
        <div className="p-3 mb-6 text-sm text-amber-700 bg-amber-100 rounded-lg dark:bg-amber-900 dark:text-amber-100 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <div>
            <p className="font-medium">Account Temporarily Locked</p>
            <p className="text-xs mt-1">
              Try again in {Math.floor(lockoutTime / 60)}:{(lockoutTime % 60).toString().padStart(2, '0')}
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
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
              onChange={(e) => handleChange(e.target.value, index)}
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
            onClick={handleResendOTP}
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
        <Button
          type="submit"
          className="w-full flex items-center justify-center gap-2"
          loading={isLoading}
          disabled={isLoading || otp.join("").length !== 6 || isAccountLocked}
        >
          {isLoading ? "Verifying..." : isAccountLocked ? "Account Locked" : "Verify & Continue"}
        </Button>
      </form>
    </div>
  );
}
