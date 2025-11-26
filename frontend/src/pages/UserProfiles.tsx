import PageBreadcrumb from "../components/common/PageBreadCrumb";
import { useEffect, useMemo, useRef, useState } from "react";
import api from "@/api/axios";
import { Bounce, toast } from "react-toastify";
import { useAuth } from "@/context/AuthContext";
import Input from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Loader2, UploadIcon, KeyIcon } from "lucide-react";
import { User } from "@/lib/types";
import Label from "@/components/form/Label";
import axios from "axios";
import { updateESignature } from "@/api/user";
import { EyeIcon, EyeClosedIcon, CheckIcon, XIcon } from "lucide-react";

// Utility function to add cache-busting parameter to image URLs
const addCacheBustingToUrl = (url: string | null | undefined): string | undefined => {
  if (!url) return undefined;
  return `${url}?t=${Date.now()}`;
};

// Password Requirements Interface
interface PasswordRequirement {
  label: string;
  test: (password: string, currentPassword?: string) => boolean;
  met: boolean;
}

// Change Password Form Component
interface ChangePasswordFormProps {
  onSuccess: () => void;
}

const ChangePasswordForm: React.FC<ChangePasswordFormProps> = ({ onSuccess }) => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{
    currentPassword?: string;
    confirmPassword?: string;
    general?: string;
  }>({});

  const { changePassword } = useAuth();

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);
    setErrors({});

    try {
      await changePassword(currentPassword, newPassword);
      onSuccess();
    } catch (err: any) {
      console.error("Password change error:", err);
      setErrors({
        general: err.response?.data?.error || "Password change failed. Please check your current password.",
      });
    } finally {
      setIsLoading(false);
    }
  };


  const allRequirementsMet = requirements.every((req) => req.met);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errors.general && (
        <div className="p-3 mb-6 text-sm text-red-700 bg-red-100 rounded-lg dark:bg-red-900 dark:text-red-100">
          {errors.general}
        </div>
      )}

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
            error={Boolean(newPassword && !allRequirementsMet)}
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
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="animate-spin size-4" />
            Updating...
          </span>
        ) : (
          "Change Password"
        )}
      </button>
    </form>
  );
};

interface FormErrors {
  first_name?: string;
  last_name?: string;
  username?: string;
  email?: string;
}

// Validation functions
const validateEmail = (email: string) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};



export default function UserProfiles() {
  const [loading, setLoading] = useState(true);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [displayUser, setDisplayUser] = useState<User | null>(null); // For display only
  const [editUser, setEditUser] = useState<User | null>(null); // For editing only
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
  const [isUploadingSignature, setIsUploadingSignature] = useState(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [isUploadingProfilePicture, setIsUploadingProfilePicture] = useState(false);
  const [isProfilePictureModalOpen, setIsProfilePictureModalOpen] = useState(false);
  const [profilePicturePreview, setProfilePicturePreview] = useState<string | null>(null);

  // Required fields for editing
  const requiredFields = ["first_name", "last_name", "username", "email"];

  // Get auth context
  const { user, updateUser } = useAuth();

  // Check if user role requires signature
  const requiresSignature = (userRole: string) => {
    return ["school_head", "superintendent", "accountant"].includes(userRole);
  };

  // Check if form is valid
  const isFormValid = useMemo(() => {
    if (!editUser) return false;

    return (
      requiredFields.every(
        (field) => editUser[field as keyof User]?.toString().trim() !== ""
      ) && Object.keys(formErrors).length === 0
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editUser, formErrors]);

  // Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const response = await api.get(
          `users/${user?.user_id}/`
        );
        
        // Add cache-busting parameters to image URLs
        const updatedProfilePicture = addCacheBustingToUrl(response.data.profile_picture);
        const updatedESignature = addCacheBustingToUrl(response.data.e_signature);
        
        const userDataWithCacheBusting = {
          ...response.data,
          profile_picture: updatedProfilePicture,
          e_signature: updatedESignature
        };
        
        setDisplayUser(userDataWithCacheBusting);
        setEditUser({ ...userDataWithCacheBusting }); // Initialize edit user without password field
      } catch (err) {
        setError(err as Error);
        toast.error("Failed to fetch user data");
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [user?.user_id]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editUser) return;

    if (!isFormValid) {
      toast.error("Please fix the errors in the form", {
        position: "top-center",
        autoClose: 2000,
        style: { fontFamily: "Outfit, sans-serif" },
        hideProgressBar: false,
        closeOnClick: false,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "light",
        transition: Bounce,
      });
      return;
    }

    // Open confirmation dialog before submitting
    setIsConfirmDialogOpen(true);
  };

  // Handle edit user
  const handleEditUser = () => {
    if (displayUser) {
      setEditUser({ ...displayUser }); // Reset edit user to current display state
      setFormErrors({});
      setIsDialogOpen(true);
    }
  };

  // Handle signature file selection
  const handleSignatureFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type and size
      const validTypes = ["image/jpeg", "image/jpg", "image/png"];
      const maxSize = 5 * 1024 * 1024; // 5MB

      if (!validTypes.includes(file.type)) {
        toast.error("Please upload a JPG, JPEG, or PNG file");
        return;
      }

      if (file.size > maxSize) {
        toast.error("File size must be less than 5MB");
        return;
      }

      setSignatureFile(file);
      setSignaturePreview(URL.createObjectURL(file));
    }
  };

  // Handle signature upload
  const handleSignatureUpload = async () => {
    if (!signatureFile) {
      toast.error("Please select a signature file");
      return;
    }

    setIsUploadingSignature(true);
    try {
      await updateESignature(signatureFile);
      
      // Refresh user data to get updated signature
      const response = await api.get(`users/${user?.user_id}/`);
      
      // Add cache-busting parameters to URLs
      const updatedProfilePicture = addCacheBustingToUrl(response.data.profile_picture);
      const updatedESignature = addCacheBustingToUrl(response.data.e_signature);
      
      setDisplayUser({
        ...response.data,
        profile_picture: updatedProfilePicture,
        e_signature: updatedESignature
      });
      setEditUser({ 
        ...response.data,
        profile_picture: updatedProfilePicture,
        e_signature: updatedESignature
      });
      
      // Update auth context if this is the current user
      if (user?.user_id === response.data.id) {
        updateUser({
          user_id: response.data.id,
          first_name: response.data.first_name,
          last_name: response.data.last_name,
          email: response.data.email,
          phone_number: response.data.phone_number,
          role: response.data.role,
          profile_picture: updatedProfilePicture,
          e_signature: updatedESignature,
        });
      }

      toast.success("Signature uploaded successfully!");
      setSignatureFile(null);
      setSignaturePreview(null);
    } catch (error) {
      console.error("Signature upload error:", error);
      toast.error("Failed to upload signature. Please try again.");
    } finally {
      setIsUploadingSignature(false);
    }
  };

  // Handle profile picture file selection
  const handleProfilePictureFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type and size
      const validTypes = ["image/jpeg", "image/jpg", "image/png"];
      const maxSize = 5 * 1024 * 1024; // 5MB

      if (!validTypes.includes(file.type)) {
        toast.error("Please upload a JPG, JPEG, or PNG file");
        return;
      }

      if (file.size > maxSize) {
        toast.error("File size must be less than 5MB");
        return;
      }

      setProfilePicturePreview(URL.createObjectURL(file));
    }
  };

  // Handle main profile picture upload
  const handleMainProfilePictureUpload = async (file: File) => {
    setIsUploadingProfilePicture(true);
    try {
      const formData = new FormData();
      formData.append('profile_picture', file);

      const response = await api.put(`/users/${user?.user_id}/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Add cache-busting parameter to profile picture URL
      const updatedProfilePicture = addCacheBustingToUrl(response.data.profile_picture);

      // Update display user with cache-busted URL
      setDisplayUser({
        ...response.data,
        profile_picture: updatedProfilePicture
      });
      setEditUser({ 
        ...response.data,
        profile_picture: updatedProfilePicture
      });
      
      // Update auth context with cache-busted URL
      updateUser({
        user_id: response.data.id,
        first_name: response.data.first_name,
        last_name: response.data.last_name,
        email: response.data.email,
        phone_number: response.data.phone_number,
        role: response.data.role,
        profile_picture: updatedProfilePicture,
      });

      toast.success("Profile picture updated successfully!");
      setIsProfilePictureModalOpen(false);
      setProfilePicturePreview(null);
    } catch (error) {
      console.error("Profile picture upload error:", error);
      toast.error("Failed to upload profile picture. Please try again.");
    } finally {
      setIsUploadingProfilePicture(false);
    }
  };

  // Handle remove profile picture
  const handleRemoveProfilePicture = async () => {
    setIsUploadingProfilePicture(true);
    try {
      const formData = new FormData();
      formData.append('profile_picture', ''); // Empty string to remove

      const response = await api.put(`/users/${user?.user_id}/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Update display user
      setDisplayUser({
        ...response.data,
        profile_picture: undefined
      });
      setEditUser({ 
        ...response.data,
        profile_picture: undefined
      });
      
      // Update auth context
      updateUser({
        user_id: response.data.id,
        first_name: response.data.first_name,
        last_name: response.data.last_name,
        email: response.data.email,
        phone_number: response.data.phone_number,
        role: response.data.role,
        profile_picture: undefined,
      });

      toast.success("Profile picture removed successfully!");
      setIsProfilePictureModalOpen(false);
    } catch (error) {
      console.error("Profile picture removal error:", error);
      toast.error("Failed to remove profile picture. Please try again.");
    } finally {
      setIsUploadingProfilePicture(false);
    }
  };



  // Handle form field changes with validation
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    if (!editUser) return;

    const { name, value } = e.target;

    // Update edit user data immediately
    setEditUser((prev) => ({
      ...prev!,
      [name]: value,
    }));

    // Clear previous timeout
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    // Set new timeout for validation
    debounceTimeout.current = setTimeout(() => {
      const newErrors = { ...formErrors };

      switch (name) {
        case "email":
          if (!validateEmail(value)) {
            newErrors.email = "Please enter a valid email address";
          } else {
            delete newErrors.email;
          }
          break;
        default:
          // For required fields
          if (requiredFields.includes(name) && !value.trim()) {
            newErrors[name as keyof FormErrors] = "This field is required";
          } else {
            delete newErrors[name as keyof FormErrors];
          }
      }

      setFormErrors(newErrors);
    }, 500);
  };

  const handleConfirmedEdit = async () => {
    if (!editUser) return;

    setIsSubmitting(true);

    try {
      const payload = {
        ...editUser,
      };

      const response = await api.put(
        `/users/${editUser.id}/`,
        payload
      );

      // Add cache-busting parameters to image URLs
      const updatedProfilePicture = addCacheBustingToUrl(response.data.profile_picture);
      const updatedESignature = addCacheBustingToUrl(response.data.e_signature);

      const userDataWithCacheBusting = {
        ...response.data,
        profile_picture: updatedProfilePicture,
        e_signature: updatedESignature
      };

      // Update display user
      setDisplayUser(userDataWithCacheBusting);
      // Update auth context if this is the current user
      if (user?.user_id === editUser.id) {
        // Update user data (no sensitive fields like password in profile update)
        updateUser({
          user_id: response.data.id,
          first_name: response.data.first_name,
          last_name: response.data.last_name,
          email: response.data.email,
          phone_number: response.data.phone_number,
          role: response.data.role,
          profile_picture: updatedProfilePicture,
        });
      }

      // Show success toast with consistent styling
      toast.success("Profile updated successfully!");

      // Close all dialogs
      setIsDialogOpen(false);
      setIsConfirmDialogOpen(false);
    } catch (error) {
      let errorMessage = "Failed to update profile. Please try again.";

      if (axios.isAxiosError(error) && error.response) {
        if (error.response.data.username) {
          errorMessage = "Username already exists.";
        } else if (error.response.data.email) {
          errorMessage = "Email already exists.";
        }
      }

      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Function to generate user initials
  const getUserInitials = () => {
    if (!displayUser) return "U";
    const firstNameChar = displayUser.first_name?.charAt(0) || "";
    const lastNameChar = displayUser.last_name?.charAt(0) || "";
    return `${firstNameChar}${lastNameChar}`.toUpperCase() || "U";
  };

  // Function to generate random background color based on user id or name
  const getAvatarColor = () => {
    if (!displayUser) return "bg-gray-500";
    const colors = [
      "bg-blue-500",
      "bg-green-500",
      "bg-purple-500",
      "bg-pink-500",
      "bg-orange-500",
      "bg-indigo-500",
    ];
    // eslint-disable-next-line prefer-const
    let stringId = displayUser.id.toString();
    const hash =
      displayUser.id && typeof stringId === "string"
        ? stringId.charCodeAt(0) + stringId.charCodeAt(stringId.length - 1)
        : (typeof displayUser.first_name === "string"
            ? displayUser.first_name.charCodeAt(0)
            : 0) +
          (typeof displayUser.last_name === "string"
            ? displayUser.last_name.charCodeAt(0)
            : 0);

    return colors[hash % colors.length];
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin h-8 w-8 text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 text-center p-4">
        Error loading profile: {error.message}
      </div>
    );
  }

  return (
    <>
      <PageBreadcrumb pageTitle="Profile" />

      <div className="max-w-4xl mx-auto space-y-8">
        {/* Profile Header Card */}
        <div className="relative overflow-hidden bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/50 dark:from-gray-900 dark:via-gray-800/50 dark:to-gray-900/50 border border-gray-200/60 dark:border-gray-700/60 rounded-3xl shadow-xl backdrop-blur-sm">
          {/* Background Pattern */}
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%239C92AC%22%20fill-opacity%3D%220.03%22%3E%3Ccircle%20cx%3D%2230%22%20cy%3D%2230%22%20r%3D%222%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-40"></div>
          
          <div className="relative p-8 lg:p-12">
            {/* Profile Picture and Basic Info Section */}
            <div className="flex flex-col lg:flex-row items-center lg:items-start gap-8">
              {/* Profile Picture */}
              <div className="relative flex-shrink-0">
                <div
                  className={`flex items-center justify-center w-36 h-36 lg:w-40 lg:h-40 rounded-full shadow-2xl border-4 border-white/80 dark:border-gray-800/80 ${getAvatarColor()} text-white text-6xl font-bold transition-all duration-300 hover:scale-105`}
                >
                  {displayUser?.profile_picture ? (
                    <img
                      src={`http://127.0.0.1:8000${displayUser.profile_picture}`}
                      alt="Profile"
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <span>{getUserInitials()}</span>
                  )}
                </div>
                <button
                  className="absolute -bottom-1 -right-1 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 rounded-full p-3 shadow-lg hover:bg-blue-50 dark:hover:bg-gray-700 hover:shadow-xl transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => setIsProfilePictureModalOpen(true)}
                  title="Change Profile Picture"
                  disabled={isUploadingProfilePicture}
                >
                  {isUploadingProfilePicture ? (
                    <Loader2 className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin" />
                  ) : (
                    <svg
                      className="w-5 h-5 text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  )}
                </button>
              </div>

              {/* User Information */}
              <div className="flex-1 text-center lg:text-left space-y-4">
                <div>
                  <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-2">
                    {displayUser?.first_name || "-"} {displayUser?.last_name || ""}
                  </h1>
                  <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-4">
                    <div className="inline-flex items-center px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-full text-sm font-semibold">
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                      </svg>
                      {displayUser?.role
                        ? displayUser.role
                            .replace(/_/g, " ")
                            .replace(/\b\w/g, (l) => l.toUpperCase())
                        : "User"}
                    </div>
                    {displayUser?.role === "district_admin" && displayUser?.school_district && (
                      <div className="inline-flex items-center px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm">
                        {displayUser.school_district.districtName}
                      </div>
                    )}
                    {(displayUser?.role === "school_head" || displayUser?.role === "school_admin") && displayUser?.school?.schoolName && (
                      <div className="inline-flex items-center px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm">
                        {displayUser.school.schoolName}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center justify-center lg:justify-start gap-2 text-gray-600 dark:text-gray-400">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                  </svg>
                  <span className="text-base">{displayUser?.email || "-"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* User Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Contact Information Card */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Contact Information</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Email Address</label>
                <p className="text-base text-gray-900 dark:text-white font-medium">{displayUser?.email || "-"}</p>
              </div>
              
              {displayUser?.phone_number && (
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Phone Number</label>
                  <p className="text-base text-gray-900 dark:text-white font-medium">{displayUser.phone_number}</p>
                </div>
              )}
              
              {(displayUser?.role === "school_head" || displayUser?.role === "school_admin") && displayUser?.school && (
                <>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">School</label>
                    <p className="text-base text-gray-900 dark:text-white font-medium">{displayUser.school.schoolName || "-"}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Legislative District</label>
                    <p className="text-base text-gray-900 dark:text-white font-medium">{displayUser.school.legislativeDistrict || "-"}</p>
                  </div>
                </>
              )}
              
              {displayUser?.role === "district_admin" && displayUser?.school_district && (
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">School District</label>
                  <p className="text-base text-gray-900 dark:text-white font-medium">{displayUser.school_district.districtName}</p>
                </div>
              )}
            </div>
          </div>

          {/* Account Actions Card */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Account Actions</h2>
            </div>
            
            <div className="space-y-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleEditUser}
                className="w-full flex items-center justify-center gap-3 py-4 px-6 border-2 border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200"
              >
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <div className="text-left">
                  <div className="font-semibold text-gray-900 dark:text-white">Edit Profile Info</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Update your personal information</div>
                </div>
              </Button>
              
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsChangePasswordModalOpen(true)}
                className="w-full flex items-center justify-center gap-3 py-4 px-6 border-2 border-gray-200 dark:border-gray-600 hover:border-orange-300 dark:hover:border-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-all duration-200"
              >
                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                  <KeyIcon className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-gray-900 dark:text-white">Change Password</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Update your account password</div>
                </div>
              </Button>
            </div>
          </div>
        </div>

        {/* E-Signature Section - Only show for roles that require signatures */}
        {displayUser && requiresSignature(displayUser.role) && (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">E-Signature</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Upload your digital signature for document approval</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => document.getElementById('signature-upload')?.click()}
                className="flex items-center gap-2"
              >
                <UploadIcon className="w-4 h-4" />
                {displayUser.e_signature ? "Change" : "Upload"}
              </Button>
            </div>
            
            <input
              type="file"
              id="signature-upload"
              accept="image/jpeg,image/jpg,image/png"
              onChange={handleSignatureFileChange}
              className="hidden"
            />

            {signaturePreview ? (
              <div className="space-y-6">
                <div className="border-2 border-dashed border-blue-300 dark:border-blue-600 rounded-xl p-6 bg-blue-50/50 dark:bg-blue-900/10">
                  <div className="text-center mb-4">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">Signature Preview</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Review your signature before uploading</p>
                  </div>
                  <div className="bg-white dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                    <img
                      src={signaturePreview}
                      alt="Signature preview"
                      className="max-w-full max-h-40 object-contain mx-auto"
                    />
                  </div>
                </div>
                <div className="flex gap-3 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setSignatureFile(null);
                      setSignaturePreview(null);
                      const fileInput = document.getElementById('signature-upload') as HTMLInputElement;
                      if (fileInput) fileInput.value = "";
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    onClick={handleSignatureUpload}
                    disabled={isUploadingSignature}
                    className="flex items-center gap-2"
                  >
                    {isUploadingSignature ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <UploadIcon className="w-4 h-4" />
                        Upload Signature
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : displayUser.e_signature ? (
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 bg-gray-50/50 dark:bg-gray-700/20">
                <div className="text-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">Current Signature</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Your uploaded e-signature</p>
                </div>
                <div className="bg-white dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                  <img
                    src={`http://127.0.0.1:8000${displayUser.e_signature}`}
                    alt="Current signature"
                    className="max-w-full max-h-40 object-contain mx-auto"
                  />
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-12 text-center bg-gray-50/50 dark:bg-gray-700/20">
                <div className="max-w-sm mx-auto">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <UploadIcon className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Signature Uploaded</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    Upload your digital signature to enable document approval functionality.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('signature-upload')?.click()}
                    className="flex items-center gap-2 mx-auto"
                  >
                    <UploadIcon className="w-4 h-4" />
                    Upload Signature
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Hidden file input for profile picture */}
        <input
          type="file"
          id="profile_picture_upload"
          accept="image/jpeg,image/jpg,image/png"
          onChange={handleProfilePictureFileChange}
          className="hidden"
        />

        {/* Edit User Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="w-full max-w-2xl rounded-2xl bg-white dark:bg-gray-800 p-8 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
            <DialogHeader className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                  <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <div>
                  <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-white">
                    Edit Profile
                  </DialogTitle>
                  <DialogDescription className="text-gray-600 dark:text-gray-400">
                    Update your personal information and contact details
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {editUser && (
              <form className="space-y-6" onSubmit={handleSubmit}>
                {/* Personal Information Section */}
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6 space-y-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-gray-200 dark:bg-gray-600 rounded-lg">
                      <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Personal Information</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="first_name" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        First Name *
                      </Label>
                      <Input
                        type="text"
                        id="first_name"
                        name="first_name"
                        value={editUser.first_name}
                        onChange={handleChange}
                        className={`${formErrors.first_name ? "border-red-500 focus:border-red-500" : "border-gray-300 dark:border-gray-600 focus:border-blue-500"} transition-colors`}
                        placeholder="Enter your first name"
                      />
                      {formErrors.first_name && (
                        <p className="text-red-500 text-sm flex items-center gap-1">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          {formErrors.first_name}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="last_name" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Last Name *
                      </Label>
                      <Input
                        type="text"
                        id="last_name"
                        name="last_name"
                        value={editUser.last_name}
                        onChange={handleChange}
                        className={`${formErrors.last_name ? "border-red-500 focus:border-red-500" : "border-gray-300 dark:border-gray-600 focus:border-blue-500"} transition-colors`}
                        placeholder="Enter your last name"
                      />
                      {formErrors.last_name && (
                        <p className="text-red-500 text-sm flex items-center gap-1">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          {formErrors.last_name}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Email Address *
                    </Label>
                    <Input
                      type="email"
                      id="email"
                      name="email"
                      value={editUser.email}
                      onChange={handleChange}
                      className={`${formErrors.email ? "border-red-500 focus:border-red-500" : "border-gray-300 dark:border-gray-600 focus:border-blue-500"} transition-colors`}
                      placeholder="Enter your email address"
                    />
                    {formErrors.email && (
                      <p className="text-red-500 text-sm flex items-center gap-1">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {formErrors.email}
                      </p>
                    )}
                  </div>
                </div>


                {/* Action Buttons */}
                <div className="flex justify-end gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      setFormErrors({});
                    }}
                    disabled={isSubmitting}
                    className="px-6 py-2"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={!isFormValid || isSubmitting}
                    className="px-6 py-2 flex items-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="animate-spin size-4" />
                        Saving Changes...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Confirmation Dialog */}
        <Dialog
          open={isConfirmDialogOpen}
          onOpenChange={setIsConfirmDialogOpen}
        >
          <DialogContent className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-800 p-8 shadow-2xl">
            <DialogHeader className="mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl">
                  <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">
                  Confirm Changes
                </DialogTitle>
              </div>
            </DialogHeader>

            <div className="space-y-6">
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                Are you sure you want to update your profile information? This action cannot be undone.
              </p>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsConfirmDialogOpen(false)}
                  disabled={isSubmitting}
                  className="px-6 py-2"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleConfirmedEdit}
                  disabled={isSubmitting}
                  className="px-6 py-2 flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="animate-spin size-4" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Confirm Changes
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Profile Picture Modal */}
        <Dialog open={isProfilePictureModalOpen} onOpenChange={setIsProfilePictureModalOpen}>
          <DialogContent className="w-full max-w-lg rounded-2xl bg-white dark:bg-gray-800 p-8 shadow-2xl">
            <DialogHeader className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                  <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-white">
                    Profile Picture
                  </DialogTitle>
                  <DialogDescription className="text-gray-600 dark:text-gray-400">
                    View, change, or remove your profile picture
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-6">
              {/* Current Profile Picture Display */}
              <div className="text-center">
                <div className="relative inline-block">
                  <div
                    className={`flex items-center justify-center w-32 h-32 rounded-full shadow-lg border-4 border-white/80 dark:border-gray-800/80 ${getAvatarColor()} text-white text-4xl font-bold`}
                  >
                    {displayUser?.profile_picture ? (
                      <img
                        src={`http://127.0.0.1:8000${displayUser.profile_picture}`}
                        alt="Current Profile"
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <span>{getUserInitials()}</span>
                    )}
                  </div>
                </div>
                <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                  {displayUser?.profile_picture ? "Current profile picture" : "No profile picture set"}
                </p>
              </div>

              {/* Preview New Picture */}
              {profilePicturePreview && (
                <div className="border-2 border-dashed border-blue-300 dark:border-blue-600 rounded-xl p-6 bg-blue-50/50 dark:bg-blue-900/10">
                  <div className="text-center mb-4">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">New Profile Picture</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Preview of your new profile picture</p>
                  </div>
                  <div className="flex justify-center">
                    <div className="relative">
                      <img
                        src={profilePicturePreview}
                        alt="New profile picture preview"
                        className="w-24 h-24 rounded-full object-cover border-4 border-white dark:border-gray-800 shadow-lg"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col gap-3">
                {!profilePicturePreview && (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('profile_picture_upload')?.click()}
                      className="w-full flex items-center justify-center gap-3 py-3"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {displayUser?.profile_picture ? "Change Picture" : "Upload Picture"}
                    </Button>
                    
                    {displayUser?.profile_picture && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleRemoveProfilePicture}
                        disabled={isUploadingProfilePicture}
                        className="w-full flex items-center justify-center gap-3 py-3 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
                      >
                        {isUploadingProfilePicture ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        )}
                        Remove Picture
                      </Button>
                    )}
                  </>
                )}

                {profilePicturePreview && (
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setProfilePicturePreview(null);
                        const fileInput = document.getElementById('profile_picture_upload') as HTMLInputElement;
                        if (fileInput) fileInput.value = "";
                      }}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      onClick={() => {
                        const fileInput = document.getElementById('profile_picture_upload') as HTMLInputElement;
                        const file = fileInput.files?.[0];
                        if (file) {
                          handleMainProfilePictureUpload(file);
                        }
                      }}
                      disabled={isUploadingProfilePicture}
                      className="flex-1 flex items-center justify-center gap-2"
                    >
                      {isUploadingProfilePicture ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Upload Picture
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Change Password Modal */}
        <Dialog open={isChangePasswordModalOpen} onOpenChange={setIsChangePasswordModalOpen}>
          <DialogContent className="w-full max-w-lg rounded-2xl bg-white dark:bg-gray-800 p-8 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
            <DialogHeader className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
                  <KeyIcon className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-white">
                    Change Password
                  </DialogTitle>
                  <DialogDescription className="text-gray-600 dark:text-gray-400">
                    Enter your current password and choose a new secure password
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <ChangePasswordForm 
              onSuccess={() => {
                setIsChangePasswordModalOpen(false);
                toast.success("Password changed successfully! Please log in again.");
              }}
            />
          </DialogContent>
        </Dialog>

      </div>
    </>
  );
}
