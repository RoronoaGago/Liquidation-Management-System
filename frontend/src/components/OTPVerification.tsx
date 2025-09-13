// components/OTPVerification.tsx
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Mail, RefreshCw, Loader2 } from "lucide-react"; // Add Loader2 import
import Button from "./ui/button/Button";
import Input from "./form/input/InputField";
import { useAuth } from "@/context/AuthContext";
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
  const [otp, setOtp] = useState(Array(6).fill(""));
  const [isLoading, setIsLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [error, setError] = useState(""); // <-- Add error state
  const inputRefs = useRef<HTMLInputElement[]>([]);
  const navigate = useNavigate();
  const { login } = useAuth();

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

  const handleChange = (value: string, index: number) => {
    if (!/^\d*$/.test(value)) return; // Only allow numbers

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

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
    setError(""); // Clear previous error

    if (otpValue.length !== 6) {
      setError("Please enter a valid 6-digit OTP");
      return;
    }

    setIsLoading(true);

    try {
      await verifyOTP(email, otpValue);
      toast.success("OTP verified successfully!");
      onSuccess(); // Just navigate away, no need to set loading to false
    } catch (err: any) {
      setIsLoading(false);
      setError(err.message || "Invalid OTP. Please try again.");
    }
  };

  const handleResendOTP = async () => {
    if (resendCooldown > 0) return;

    setResendCooldown(60); // 60 seconds cooldown

    try {
      await resendOTP(email);
      toast.success("OTP sent to your email!");
    } catch (error: any) {
      toast.error(error.message || "Failed to send OTP. Please try again.");
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
        <p className="text-center font-medium text-gray-800 dark:text-white mb-6">
          {email}
        </p>
      </div>

      {/* Error display (same style as SignInForm) */}
      {error && (
        <div className="p-3 mb-6 text-sm text-red-700 bg-red-100 rounded-lg dark:bg-red-900 dark:text-red-100">
          {error}
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
              className="w-12 h-12 text-center text-xl font-semibold"
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
          disabled={isLoading || otp.join("").length !== 6}
        >
          {isLoading ? "Verifying..." : "Verify & Continue"}
        </Button>
      </form>
    </div>
  );
}
