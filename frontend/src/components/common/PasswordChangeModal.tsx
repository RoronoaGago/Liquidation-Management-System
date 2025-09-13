import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { EyeIcon, EyeClosedIcon } from "lucide-react";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import { toast } from "react-toastify";
interface PasswordChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}
const PasswordChangeModal = ({
  isOpen,
  onClose,
  onSuccess,
}: PasswordChangeModalProps) => {
  const { changePassword, passwordChangeRequired } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    general: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();

  // Add early return if modal is not open
  if (!isOpen) {
    return null;
  }
  const validateForm = () => {
    let valid = true;
    const newErrors = {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
      general: "",
    };

    // Current password validation
    if (!currentPassword) {
      newErrors.currentPassword = "Current password is required";
      valid = false;
    }

    // New password validation
    if (!newPassword) {
      newErrors.newPassword = "New password is required";
      valid = false;
    } else {
      // Minimum length
      if (newPassword.length < 8) {
        newErrors.newPassword = "Password must be at least 8 characters";
        valid = false;
      }
      // Different from current password
      else if (currentPassword && newPassword === currentPassword) {
        newErrors.newPassword =
          "New password must be different from current password";
        valid = false;
      }
      // Contains at least one uppercase letter
      else if (!/[A-Z]/.test(newPassword)) {
        newErrors.newPassword =
          "Password must contain at least one uppercase letter";
        valid = false;
      }
      // Contains at least one lowercase letter
      else if (!/[a-z]/.test(newPassword)) {
        newErrors.newPassword =
          "Password must contain at least one lowercase letter";
        valid = false;
      }
      // Contains at least one number
      else if (!/[0-9]/.test(newPassword)) {
        newErrors.newPassword = "Password must contain at least one number";
        valid = false;
      }
      // Contains at least one special character
      else if (!/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) {
        newErrors.newPassword =
          "Password must contain at least one special character";
        valid = false;
      }
      // No whitespace allowed
      else if (/\s/.test(newPassword)) {
        newErrors.newPassword = "Password cannot contain whitespace";
        valid = false;
      }
      // Maximum length (optional)
      else if (newPassword.length > 64) {
        newErrors.newPassword = "Password must be less than 64 characters";
        valid = false;
      }
    }

    // Confirm password validation
    if (!confirmPassword) {
      newErrors.confirmPassword = "Please confirm your new password";
      valid = false;
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = "Passwords don't match";
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      toast.success("Password changed successfully!");
      onSuccess();
    } catch (err) {
      console.error("Password change error:", err);
      setErrors((prev) => ({
        ...prev,
        general: "Password change failed. Please check your current password.",
      }));
    } finally {
      setIsLoading(false);
    }
  };

  if (!passwordChangeRequired) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-2 text-gray-800 dark:text-white">
          Change Your Password
        </h2>
        <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">
          You must change your password before continuing.
        </p>

        {errors.general && (
          <div className="p-3 mb-6 text-sm text-red-700 bg-red-100 rounded-lg dark:bg-red-900 dark:text-red-100">
            {errors.general}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label
              htmlFor="currentPassword"
              className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Current Password
            </Label>
            <div className="relative">
              <Input
                id="currentPassword"
                type={showCurrentPassword ? "text" : "password"}
                placeholder="Enter current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2"
                required
                error={!!errors.currentPassword}
                hint={errors.currentPassword}
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-4 top-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                {showCurrentPassword ? (
                  <EyeClosedIcon className="w-5 h-5" />
                ) : (
                  <EyeIcon className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          <div>
            <Label
              htmlFor="newPassword"
              className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              New Password
            </Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showNewPassword ? "text" : "password"}
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2"
                required
                error={!!errors.newPassword}
                hint={errors.newPassword}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-4 top-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                {showNewPassword ? (
                  <EyeClosedIcon className="w-5 h-5" />
                ) : (
                  <EyeIcon className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          <div>
            <Label
              htmlFor="confirmPassword"
              className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Confirm New Password
            </Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2"
                required
                error={!!errors.confirmPassword}
                hint={errors.confirmPassword}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                {showConfirmPassword ? (
                  <EyeClosedIcon className="w-5 h-5" />
                ) : (
                  <EyeIcon className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          <button
            className="w-full px-4 py-2 mt-6 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 dark:bg-brand-500 dark:hover:bg-brand-600 disabled:opacity-50"
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? "Updating..." : "Change Password"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default PasswordChangeModal;
