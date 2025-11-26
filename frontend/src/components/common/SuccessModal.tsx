import React, { useState, useEffect } from 'react';
import { CheckCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  autoClose?: boolean;
  autoCloseDelay?: number; // in seconds
  showCountdown?: boolean;
  primaryButtonText?: string;
  onPrimaryAction?: () => void;
}

const SuccessModal: React.FC<SuccessModalProps> = ({
  isOpen,
  onClose,
  title,
  message,
  autoClose = true,
  autoCloseDelay = 3,
  showCountdown = true,
  primaryButtonText = "Continue",
  onPrimaryAction,
}) => {
  const [timeLeft, setTimeLeft] = useState(autoCloseDelay);
  const [progressWidth, setProgressWidth] = useState(100);

  // Reset timer when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeLeft(autoCloseDelay);
      setProgressWidth(100);
    }
  }, [isOpen, autoCloseDelay]);

  // Countdown timer
  useEffect(() => {
    if (!isOpen || !autoClose) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        const newTime = prev - 1;
        // Update progress width to match the countdown
        setProgressWidth((newTime / autoCloseDelay) * 100);
        
        if (newTime <= 0) {
          clearInterval(timer);
          onClose();
          return 0;
        }
        return newTime;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, autoClose, onClose, autoCloseDelay]);

  const handlePrimaryAction = () => {
    if (onPrimaryAction) {
      onPrimaryAction();
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent showCloseButton={false} className="w-full max-w-lg rounded-2xl bg-white dark:bg-gray-800 p-0 shadow-2xl border-0 overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-green-50/50 via-transparent to-emerald-50/30 dark:from-green-900/10 dark:via-transparent dark:to-emerald-900/5"></div>
        
        {/* Main Content Container */}
        <div className="relative flex flex-col items-center text-center px-10 py-12">
          {/* Success Icon with Enhanced Animation */}
          <div className="relative mb-8">
            {/* Outer Ring Animation */}
            <div className="absolute inset-0 bg-green-100 dark:bg-green-900/30 rounded-full scale-125 animate-ping opacity-20"></div>
            <div className="absolute inset-0 bg-green-200 dark:bg-green-800/40 rounded-full scale-110 animate-pulse"></div>
            
            {/* Main Icon Container */}
            <div className="relative flex items-center justify-center w-24 h-24 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full shadow-xl">
              <CheckCircle className="h-12 w-12 text-white animate-scale-in" />
            </div>
            
            {/* Sparkle Effects */}
            <div className="absolute -top-2 -right-2 w-4 h-4 bg-yellow-400 rounded-full animate-bounce"></div>
            <div className="absolute -bottom-2 -left-2 w-3 h-3 bg-blue-400 rounded-full animate-bounce delay-300"></div>
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-purple-400 rounded-full animate-bounce delay-150"></div>
          </div>

          {/* Header Section with Better Typography */}
          <div className="space-y-4 mb-8">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white leading-tight">
              {title}
            </h2>
            <div className="w-20 h-1 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full mx-auto"></div>
            <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed max-w-md">
              {message}
            </p>
          </div>

          {/* Status Indicator with Enhanced Design */}
          {autoClose && showCountdown && timeLeft > 0 && (
            <div className="flex items-center justify-center space-x-3 px-6 py-3 bg-green-50 dark:bg-green-900/20 rounded-full border border-green-200 dark:border-green-800">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-base font-medium text-green-700 dark:text-green-300">
                Redirecting in {timeLeft} second{timeLeft !== 1 ? 's' : ''}...
              </span>
            </div>
          )}
        </div>

        {/* Enhanced Progress Bar */}
        {autoClose && (
          <div className="relative h-3 bg-gray-100 dark:bg-gray-700 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-green-500 via-emerald-500 to-green-600 h-full rounded-full transform -translate-x-full animate-progress-smooth"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent h-full animate-shimmer"></div>
          </div>
        )}

        {/* Manual Action Button (only show if not auto-closing) */}
        {!autoClose && (
          <div className="p-6">
            <button
              onClick={handlePrimaryAction}
              className="w-full px-6 py-3 text-base font-semibold text-white bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 border border-transparent rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200"
            >
              {primaryButtonText}
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SuccessModal;
