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
      <DialogContent className="w-full max-w-sm [&>button]:hidden">
        {/* Main Content Container */}
        <div className="flex flex-col items-center text-center space-y-6">
          {/* Animated Checkmark Icon */}
          <div className="relative">
            <div className="absolute inset-0 bg-green-100 dark:bg-green-900/20 rounded-full scale-110 animate-pulse"></div>
            <CheckCircle className="relative h-16 w-16 text-green-500 dark:text-green-400 animate-scale-in" />
          </div>

          {/* Header Section */}
          <DialogHeader className="space-y-3">
            <DialogTitle className="text-2xl font-bold leading-tight text-center">
              {title}
            </DialogTitle>
            <DialogDescription className="text-base leading-relaxed text-center max-w-sm">
              {message}
            </DialogDescription>
          </DialogHeader>

          {/* Action Indicator */}
          {autoClose && showCountdown && timeLeft > 0 && (
            <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Closing automatically in {timeLeft} second{timeLeft !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>

        {/* Animated Progress Bar */}
        {autoClose && (
          <div className="mt-6 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
            <div 
              className="bg-green-500 h-2 rounded-full transition-all duration-1000 ease-linear"
              style={{
                width: `${progressWidth}%`
              }}
            ></div>
          </div>
        )}

        {/* Manual Action Button (only show if not auto-closing) */}
        {!autoClose && (
          <div className="mt-6">
            <button
              onClick={handlePrimaryAction}
              className="w-full px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
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
