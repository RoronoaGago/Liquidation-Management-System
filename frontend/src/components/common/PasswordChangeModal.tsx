import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { EyeIcon, EyeClosedIcon, CheckIcon, XIcon } from "lucide-react";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import { toast } from "react-toastify";

interface PasswordChangeModalProps {
  isOpen: boolean;
  onSuccess: () => void;
}

interface PasswordRequirement {
  label: string;
  test: (password: string, currentPassword?: string) => boolean;
  met: boolean;
}

const PasswordChangeModal = ({
  isOpen,
  onSuccess,
}: PasswordChangeModalProps) => {
  const { changePassword, passwordChangeRequired } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState({
    currentPassword: "",
    confirmPassword: "",
    general: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Password requirements state
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
      label: "No spaces & different from current password",
      test: (password, currentPassword) =>
        !/\s/.test(password) &&
        (!currentPassword || password !== currentPassword),
      met: false,
    },
  ]);

  // Real-time validation for new password
  useEffect(() => {
    if (newPassword) {
      setRequirements((prev) =>
        prev.map((req) => ({
          ...req,
          met: req.test(newPassword, currentPassword),
        }))
      );
    } else {
      setRequirements((prev) => prev.map((req) => ({ ...req, met: false })));
    }
  }, [newPassword, currentPassword]);

  // Real-time validation for confirm password
  useEffect(() => {
    if (confirmPassword) {
      if (newPassword !== confirmPassword) {
        setErrors((prev) => ({
          ...prev,
          confirmPassword: "Passwords don't match",
        }));
      } else {
        setErrors((prev) => ({
          ...prev,
          confirmPassword: "",
        }));
      }
    } else {
      setErrors((prev) => ({
        ...prev,
        confirmPassword: "",
      }));
    }
  }, [newPassword, confirmPassword]);

  // Add early return if modal is not open
  if (!isOpen) {
    return null;
  }

  const validateForm = () => {
    let valid = true;
    const newErrors = {
      currentPassword: "",
      confirmPassword: "",
      general: "",
    };

    // Current password validation
    if (!currentPassword) {
      newErrors.currentPassword = "Current password is required";
      valid = false;
    }

    // New password validation - check if all requirements are met
    const allRequirementsMet = requirements.every((req) => req.met);
    if (!newPassword) {
      valid = false;
    } else if (!allRequirementsMet) {
      valid = false;
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

  const resetForm = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setErrors({
      currentPassword: "",
      confirmPassword: "",
      general: "",
    });
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    // Reset requirements
    setRequirements((prev) => prev.map((req) => ({ ...req, met: false })));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      toast.success("Password changed successfully!");
      resetForm();
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

  const allRequirementsMet = requirements.every((req) => req.met);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 w-full max-w-md max-h-[90vh] overflow-y-auto">
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
                error={newPassword && !allRequirementsMet}
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

            {/* Real-time password requirements display */}
            {newPassword && (
              <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Password Requirements:
                </p>
                <div className="space-y-1">
                  {requirements.map((req, index) => (
                    <div key={index} className="flex items-center text-xs">
                      {req.met ? (
                        <CheckIcon className="w-4 h-4 text-green-500 mr-2" />
                      ) : (
                        <XIcon className="w-4 h-4 text-red-500 mr-2" />
                      )}
                      <span
                        className={
                          req.met
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400"
                        }
                      >
                        {req.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
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

            {/* Real-time password match indicator */}
            {confirmPassword && (
              <div className="mt-1 flex items-center text-xs">
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
          </div>

          <button
            className="w-full px-4 py-2 mt-6 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 dark:bg-brand-500 dark:hover:bg-brand-600 disabled:opacity-50"
            type="submit"
            disabled={
              isLoading ||
              !allRequirementsMet ||
              !currentPassword ||
              !confirmPassword ||
              newPassword !== confirmPassword
            }
          >
            {isLoading ? "Updating..." : "Change Password"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default PasswordChangeModal;
