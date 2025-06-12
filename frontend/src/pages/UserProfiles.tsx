import PageBreadcrumb from "../components/common/PageBreadCrumb";
import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { Bounce, ToastContainer, toast } from "react-toastify";
import { useAuth } from "@/context/AuthContext";
import { EyeCloseIcon, CalenderIcon } from "@/icons";
import { calculateAge } from "@/lib/helpers";
import Input from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { EyeIcon, Loader2 } from "lucide-react";
import { User } from "@/lib/types";
import Label from "@/components/form/Label";

interface FormErrors {
  first_name?: string;
  last_name?: string;
  username?: string;
  email?: string;
  password?: string;
  confirm_password?: string;
  phone_number?: string;
}

// Validation functions
const validateEmail = (email: string) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

const validatePassword = (password: string) => {
  const re = /^.{8,}$/;
  return re.test(password);
};

const validatePhoneNumber = (phone: string) => {
  const re = /^[+\d][\d\s]*$/;
  return re.test(phone);
};

export default function UserProfiles() {
  const [loading, setLoading] = useState(true);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [displayUser, setDisplayUser] = useState<User | null>(null); // For display only
  const [editUser, setEditUser] = useState<User | null>(null); // For editing only
  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  // Required fields for editing
  const requiredFields = ["first_name", "last_name", "username", "email"];

  // Get auth context
  const { user, updateUser } = useAuth();

  // Check if form is valid
  const isFormValid = useMemo(() => {
    if (!editUser) return false;

    return (
      requiredFields.every(
        (field) => editUser[field as keyof User]?.toString().trim() !== ""
      ) && Object.keys(formErrors).length === 0
    );
  }, [editUser, formErrors]);

  // Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const response = await axios.get(
          `http://127.0.0.1:8000/api/users/${user?.user_id}`
        );
        setDisplayUser(response.data);
        console.log(response.data);
        console.log("Hi");
        setEditUser({ ...response.data, password: "" }); // Initialize edit user with empty password
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
      setEditUser({ ...displayUser, password: "" }); // Reset edit user to current display state
      setFormErrors({});
      setIsDialogOpen(true);
    }
  };

  // Handle phone number input
  const handlePhoneNumberInput = (e: React.FormEvent<HTMLInputElement>) => {
    const input = e.target as HTMLInputElement;
    input.value = input.value.replace(/[^0-9+]/g, "");
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
        case "password":
          if (value && !validatePassword(value)) {
            newErrors.password = "Password must be at least 8 characters";
          } else {
            delete newErrors.password;
          }
          break;
        case "phone_number":
          if (value && !validatePhoneNumber(value)) {
            newErrors.phone_number = "Please enter a valid phone number";
          } else {
            delete newErrors.phone_number;
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
        // Don't send password if it's empty
        password: editUser.password || undefined,
      };

      const response = await axios.put(
        `http://127.0.0.1:8000/api/users/${editUser.id}/`,
        payload
      );

      // Update display user
      setDisplayUser(response.data);
      console.log(response.data);
      // Update auth context if this is the current user
      if (user?.user_id === editUser.id) {
        // Case 1: Sensitive data changed → Update token & user
        if (response.data.token) {
          console.log("this is inside");
          localStorage.setItem("access_token", response.data.token.access);
          localStorage.setItem("refresh_token", response.data.token.refresh);
          console.log("ohmahgah");
          console.log(response.data.token.access);
          updateUser(
            {
              user_id: response.data.id,
              username: response.data.username,
              first_name: response.data.first_name,
              last_name: response.data.last_name,
              email: response.data.email,
              phone_number: response.data.phone_number,
            },
            response.data.token.access
          );
          // toast.success("Profile updated! Please log in again.");
        }
        // Case 2: Non-sensitive data → Just update user
        else {
          updateUser({
            user_id: response.data.id,
            username: response.data.username,
            first_name: response.data.first_name,
            last_name: response.data.last_name,
            email: response.data.email,
            phone_number: response.data.phone_number,
          });
          toast.success("Profile updated!");
        }
      }

      // Show success toast with consistent styling
      toast.success("Profile updated successfully!", {
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
        } else if (error.response.data.password) {
          errorMessage = "Password doesn't meet requirements.";
        }
      }

      toast.error(errorMessage, {
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
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
        <h3 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90 lg:mb-7">
          Profile
        </h3>
        <div className="space-y-6">
          <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-col items-center w-full gap-6 xl:flex-row">
                <div
                  className={`flex items-center justify-center w-20 h-20 rounded-full ${getAvatarColor()} text-white text-3xl font-bold`}
                >
                  {getUserInitials()}
                </div>
                <div className="order-3 xl:order-2">
                  <h4 className="mb-2 text-lg font-semibold text-center text-gray-800 dark:text-white/90 xl:text-left">
                    {displayUser?.first_name} {displayUser?.last_name}
                  </h4>
                  <div className="flex flex-col items-center gap-1 text-center xl:flex-row xl:gap-3 xl:text-left">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Administrator
                    </p>
                    <div className="hidden h-3.5 w-px bg-gray-300 dark:bg-gray-700 xl:block"></div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {displayUser?.username}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 lg:mb-6">
                  User Details
                </h4>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-7 2xl:gap-x-32">
                  <div>
                    <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                      First Name
                    </p>
                    <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                      {displayUser?.first_name}
                    </p>
                  </div>

                  <div>
                    <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                      Last Name
                    </p>
                    <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                      {displayUser?.last_name}
                    </p>
                  </div>

                  <div>
                    <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                      Email address
                    </p>
                    <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                      {displayUser?.email}
                    </p>
                  </div>

                  <div>
                    <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                      Phone
                    </p>
                    <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                      {displayUser?.phone_number}
                    </p>
                  </div>

                  <div>
                    <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                      Age
                    </p>
                    <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                      {calculateAge(displayUser?.date_of_birth)}
                    </p>
                  </div>
                </div>
              </div>

              <button
                className="flex w-full items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200 lg:inline-flex lg:w-auto"
                onClick={handleEditUser}
              >
                <svg
                  className="fill-current"
                  width="18"
                  height="18"
                  viewBox="0 0 18 18"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M15.0911 2.78206C14.2125 1.90338 12.7878 1.90338 11.9092 2.78206L4.57524 10.116C4.26682 10.4244 4.0547 10.8158 3.96468 11.2426L3.31231 14.3352C3.25997 14.5833 3.33653 14.841 3.51583 15.0203C3.69512 15.1996 3.95286 15.2761 4.20096 15.2238L7.29355 14.5714C7.72031 14.4814 8.11172 14.2693 8.42013 13.9609L15.7541 6.62695C16.6327 5.74827 16.6327 4.32365 15.7541 3.44497L15.0911 2.78206ZM12.9698 3.84272C13.2627 3.54982 13.7376 3.54982 14.0305 3.84272L14.6934 4.50563C14.9863 4.79852 14.9863 5.2734 14.6934 5.56629L14.044 6.21573L12.3204 4.49215L12.9698 3.84272ZM11.2597 5.55281L5.6359 11.1766C5.53309 11.2794 5.46238 11.4099 5.43238 11.5522L5.01758 13.5185L6.98394 13.1037C7.1262 13.0737 7.25666 13.003 7.35947 12.9002L12.9833 7.27639L11.2597 5.55281Z"
                    fill=""
                  />
                </svg>
                Edit
              </button>
            </div>
          </div>
        </div>

        {/* Edit User Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="w-full rounded-lg bg-white dark:bg-gray-800 p-8 shadow-xl">
            <DialogHeader className="mb-8">
              <DialogTitle className="text-3xl font-bold text-gray-800 dark:text-white">
                Edit Profile
              </DialogTitle>
              <DialogDescription className="text-gray-600 dark:text-gray-400">
                Update your profile details below
              </DialogDescription>
            </DialogHeader>

            {editUser && (
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name" className="text-base">
                      First Name *
                    </Label>
                    <Input
                      type="text"
                      id="first_name"
                      name="first_name"
                      value={editUser.first_name}
                      onChange={handleChange}
                      className={formErrors.first_name ? "border-red-500" : ""}
                    />
                    {formErrors.first_name && (
                      <p className="text-red-500 text-sm">
                        {formErrors.first_name}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name" className="text-base">
                      Last Name *
                    </Label>
                    <Input
                      type="text"
                      id="last_name"
                      name="last_name"
                      value={editUser.last_name}
                      onChange={handleChange}
                      className={formErrors.last_name ? "border-red-500" : ""}
                    />
                    {formErrors.last_name && (
                      <p className="text-red-500 text-sm">
                        {formErrors.last_name}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="username" className="text-base">
                    Username *
                  </Label>
                  <Input
                    type="text"
                    id="username"
                    name="username"
                    value={editUser.username}
                    onChange={handleChange}
                    className={formErrors.username ? "border-red-500" : ""}
                  />
                  {formErrors.username && (
                    <p className="text-red-500 text-sm">
                      {formErrors.username}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-base">
                    Email *
                  </Label>
                  <Input
                    type="email"
                    id="email"
                    name="email"
                    value={editUser.email}
                    onChange={handleChange}
                    className={formErrors.email ? "border-red-500" : ""}
                  />
                  {formErrors.email && (
                    <p className="text-red-500 text-sm">{formErrors.email}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-base">
                    Password (leave blank to keep current)
                  </Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      id="password"
                      name="password"
                      value={editUser.password || ""}
                      onChange={handleChange}
                      className={formErrors.password ? "border-red-500" : ""}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 transform -translate-y-1/2"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeCloseIcon className="h-5 w-5 text-gray-400" />
                      ) : (
                        <EyeIcon className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                  {formErrors.password && (
                    <p className="text-red-500 text-sm">
                      {formErrors.password}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date_of_birth" className="text-base">
                    Birthdate
                  </Label>
                  <div className="relative">
                    <Input
                      type="date"
                      id="date_of_birth"
                      name="date_of_birth"
                      className="[&::-webkit-calendar-picker-indicator]:opacity-0 w-full p-3.5 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 text-base"
                      value={editUser?.date_of_birth}
                      onChange={handleChange}
                      max={new Date().toISOString().split("T")[0]}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                      <CalenderIcon className="size-5" />
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone_number" className="text-base">
                    Phone Number
                  </Label>
                  <Input
                    type="tel"
                    id="phone_number"
                    name="phone_number"
                    value={editUser.phone_number || ""}
                    onChange={handleChange}
                    onInput={handlePhoneNumberInput}
                    className={formErrors.phone_number ? "border-red-500" : ""}
                  />
                  {formErrors.phone_number && (
                    <p className="text-red-500 text-sm">
                      {formErrors.phone_number}
                    </p>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      setFormErrors({});
                    }}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={!isFormValid || isSubmitting}
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="animate-spin size-4" />
                        Saving...
                      </span>
                    ) : (
                      "Save Changes"
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
          <DialogContent className="w-full rounded-lg bg-white dark:bg-gray-800 p-8 shadow-xl">
            <DialogHeader className="mb-8">
              <DialogTitle className="text-3xl font-bold text-gray-800 dark:text-white">
                Confirm Changes
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <p className="text-gray-600 dark:text-gray-400">
                Are you sure you want to update your profile information?
              </p>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsConfirmDialogOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleConfirmedEdit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="animate-spin size-4" />
                      Updating...
                    </span>
                  ) : (
                    "Confirm Changes"
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <ToastContainer
          position="top-center"
          autoClose={2000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick={false}
          rtl={false}
          pauseOnFocusLoss
        />
      </div>
    </>
  );
}
