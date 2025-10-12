import React from "react";
import { LogOut, Clock, AlertTriangle, Shield } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Button from "./ui/button/Button";

interface AutoLogoutModalProps {
  visible: boolean;
  reason: 'inactivity' | 'token_expired' | 'session_expired' | 'password_changed' | 'new_user' | 'user_deleted';
  onLogin: () => void;
  userName?: string;
  isNewUser?: boolean;
}

const AutoLogoutModal: React.FC<AutoLogoutModalProps> = ({
  visible,
  reason,
  onLogin,
  userName,
  isNewUser,
}) => {
  const getReasonConfig = () => {
    switch (reason) {
      case 'inactivity':
        return {
          title: 'Session Timeout',
          subtitle: 'Due to inactivity',
          icon: Clock,
          iconColor: 'text-amber-600 dark:text-amber-400',
          iconBg: 'bg-amber-100 dark:bg-amber-900/30',
          headerBg: 'from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20',
          borderColor: 'border-amber-200 dark:border-amber-800',
          message: 'You\'ve been logged out due to inactivity',
          description: 'For your security, you have been automatically logged out due to inactivity. Please log in again to continue.'
        };
      case 'token_expired':
        return {
          title: 'Session Expired',
          subtitle: 'Token has expired',
          icon: AlertTriangle,
          iconColor: 'text-red-600 dark:text-red-400',
          iconBg: 'bg-red-100 dark:bg-red-900/30',
          headerBg: 'from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20',
          borderColor: 'border-red-200 dark:border-red-800',
          message: 'Your session has expired',
          description: 'Your authentication token has expired. Please log in again to continue.'
        };
      case 'session_expired':
        return {
          title: 'Session Expired',
          subtitle: 'Due to inactivity',
          icon: Clock,
          iconColor: 'text-amber-600 dark:text-amber-400',
          iconBg: 'bg-amber-100 dark:bg-amber-900/30',
          headerBg: 'from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20',
          borderColor: 'border-amber-200 dark:border-amber-800',
          message: 'Your session has expired due to inactivity',
          description: 'You\'ve been automatically logged out after 5 minutes of inactivity. Please log in again to continue.'
        };
      case 'password_changed':
        return {
          title: 'Password Changed Successfully!',
          subtitle: 'Your password has been updated',
          icon: Shield,
          iconColor: 'text-green-600 dark:text-green-400',
          iconBg: 'bg-green-100 dark:bg-green-900/30',
          headerBg: 'from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20',
          borderColor: 'border-green-200 dark:border-green-800',
          message: 'Password Updated Successfully',
          description: 'Your new password has been saved and is now active. You must log in again to continue.'
        };
      case 'new_user':
        return {
          title: 'Password Changed Successfully!',
          subtitle: 'Your password has been updated',
          icon: Shield,
          iconColor: 'text-green-600 dark:text-green-400',
          iconBg: 'bg-green-100 dark:bg-green-900/30',
          headerBg: 'from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20',
          borderColor: 'border-green-200 dark:border-green-800',
          message: 'Welcome to the MOOE Liquidation Management System!',
          description: 'Your account setup is almost complete. You must log in again to continue.'
        };
      case 'user_deleted':
        return {
          title: 'Account Removed',
          subtitle: 'Your account has been deactivated',
          icon: AlertTriangle,
          iconColor: 'text-red-600 dark:text-red-400',
          iconBg: 'bg-red-100 dark:bg-red-900/30',
          headerBg: 'from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20',
          borderColor: 'border-red-200 dark:border-red-800',
          message: 'Your account has been removed from the system',
          description: 'Your account is no longer active. Please contact your administrator for assistance.'
        };
      default:
        return {
          title: 'Session Ended',
          subtitle: 'Your session has ended',
          icon: Shield,
          iconColor: 'text-blue-600 dark:text-blue-400',
          iconBg: 'bg-blue-100 dark:bg-blue-900/30',
          headerBg: 'from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20',
          borderColor: 'border-blue-200 dark:border-blue-800',
          message: 'You\'ve been logged out',
          description: 'For your security, you have been logged out. Please log in again to continue.'
        };
    }
  };

  const config = getReasonConfig();
  const IconComponent = config.icon;

  return (
    <Dialog open={visible} onOpenChange={() => {}}>
      <DialogContent 
        className="w-full max-w-lg rounded-2xl bg-white dark:bg-gray-800 p-0 shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden [&>button]:hidden"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* Header with dynamic gradient background */}
        <div className={`bg-gradient-to-r ${config.headerBg} border-b ${config.borderColor}`}>
          <DialogHeader className="px-8 py-6">
            <div className="flex items-center gap-4">
              <div className={`flex items-center justify-center w-14 h-14 rounded-full ${config.iconBg} shadow-lg`}>
                <IconComponent className={`text-2xl ${config.iconColor}`} />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  {config.title}
                </DialogTitle>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {config.subtitle}
                </p>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Content */}
        <div className="px-8 py-8 space-y-6">
          {/* Main message */}
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center shadow-lg">
              <LogOut className="text-3xl text-gray-500 dark:text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
              {config.message}
            </h3>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed max-w-sm mx-auto text-base">
              {config.description}
            </p>
          </div>

          {/* User greeting for password change scenarios and session expired */}
          {(reason === 'password_changed' || reason === 'new_user' || reason === 'session_expired') && userName && (
            <div className={`text-center py-4 rounded-xl border ${
              reason === 'session_expired' 
                ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
            }`}>
              <p className="text-lg font-medium text-gray-900 dark:text-white">
                {reason === 'session_expired' ? `Hello, ${userName}!` : `Thank you, ${userName}!`}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {reason === 'session_expired' 
                  ? "Your session has expired due to inactivity. Please log in again to continue."
                  : isNewUser 
                    ? "Welcome to the system! Your account setup is almost complete."
                    : "Your password has been successfully updated."
                }
              </p>
            </div>
          )}

          {/* Security notice */}
          <div className="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                  Security Notice
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  This automatic logout helps protect your account
                </p>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex justify-center pt-2">
            <Button
              onClick={onLogin}
              className={`px-10 py-3 font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 flex items-center gap-2 ${
                reason === 'user_deleted' 
                  ? 'bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white' 
                  : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white'
              }`}
            >
              <LogOut className="h-4 w-4" />
              {reason === 'user_deleted' ? 'Go to Login Page' : 'Login Again'}
            </Button>
          </div>

          {/* Footer note */}
          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Click the button above to return to the login page
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AutoLogoutModal;