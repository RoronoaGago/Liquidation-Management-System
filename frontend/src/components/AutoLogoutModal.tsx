import React from "react";
import { LogoutOutlined, ClockCircleOutlined } from "@ant-design/icons";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Button from "./ui/button/Button";

interface AutoLogoutModalProps {
  visible: boolean;
  onClose: () => void;
  onLogin: () => void;
}

const AutoLogoutModal: React.FC<AutoLogoutModalProps> = ({
  visible,
  onClose,
  onLogin,
}) => {
  return (
    <Dialog open={visible} onOpenChange={onClose}>
      <DialogContent 
        className="w-full max-w-lg rounded-2xl bg-white dark:bg-gray-800 p-0 shadow-2xl border-0 overflow-hidden backdrop-blur-sm"
        onInteractOutside={(e) => e.preventDefault()} // Prevent closing when clicking outside
      >
        {/* Header with gradient background */}
        <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border-b border-orange-200 dark:border-orange-800">
          <DialogHeader className="px-8 py-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-orange-100 to-red-100 dark:from-orange-800 dark:to-red-800 shadow-lg">
                <ClockCircleOutlined className="text-2xl text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  Session Expired
                </DialogTitle>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Your session has ended
                </p>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Content */}
        <div className="px-8 py-8 space-y-6">
          {/* Message with better typography */}
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-50 dark:bg-gray-700 flex items-center justify-center">
              <LogoutOutlined className="text-2xl text-gray-500 dark:text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              You've been logged out
            </h3>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed max-w-sm mx-auto">
              For your security, you have been automatically logged out due to inactivity. 
              Please log in again to continue.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Button
              onClick={onLogin}
              startIcon={<LogoutOutlined />}
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
            >
              Login Again
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AutoLogoutModal;