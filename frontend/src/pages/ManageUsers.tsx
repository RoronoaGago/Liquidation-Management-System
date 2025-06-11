import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Bounce, ToastContainer, toast } from "react-toastify";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import UsersTable from "../components/tables/BasicTables/UsersTable";
import Button from "../components/ui/button/Button";
import { CalenderIcon, PlusIcon } from "../icons";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import { EyeIcon, Loader2, EyeClosedIcon } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { UserFormData } from "@/lib/types";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";

const ManageUsers = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<UserFormData>({
    first_name: "",
    last_name: "",
    username: "",
    password: "",
    confirm_password: "",
    date_of_birth: "",
    email: "",
    phone_number: "",
  });

  // Required fields
  const requiredFields = [
    "first_name",
    "last_name",
    "username",
    "password",
    "confirm_password",
    "email",
  ];

  // Check if all required fields are filled AND no validation errors exist
  const isFormValid =
    requiredFields.every(
      (field) => formData[field as keyof UserFormData]?.trim() !== ""
    ) && Object.keys(errors).length === 0;

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await axios.get("http://127.0.0.1:8000/api/users/");
        setUsers(response.data);
      } catch (error) {
        toast.error("Failed to fetch users", {
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
      }
    };

    fetchUsers();
  }, []);

  const validateEmail = (email: string) => {
    // A more comprehensive regex for email validation.
    // It checks for:
    // - Alphanumeric characters, dots, underscores, percents, plus, or hyphens before the @
    // - An @ symbol
    // - Alphanumeric characters, dots, or hyphens for the domain name
    // - A dot
    // - 2 to 6 characters for the top-level domain (TLD)
    const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    return re.test(email);
  };

  const validatePassword = (password: string) => {
    // At least 8 characters
    // Add checks for uppercase, lowercase, and number for stronger validation
    const re =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    // The previous regex was only /^.{8,}$/, which is too weak.
    // This new regex ensures:
    // ^                 Start of the string
    // (?=.*[a-z])       At least one lowercase letter
    // (?=.*[A-Z])       At least one uppercase letter
    // (?=.*\d)          At least one digit
    // (?=.*[@$!%*?&])   At least one special character (@$!%*?&)
    // [A-Za-z\d@$!%*?&]{8,} Minimum 8 characters long, consisting of specified chars
    // $                 End of the string
    return re.test(password);
  };

  const validatePhoneNumber = (phone: string) => {
    // Basic phone number validation (allows +, numbers, and spaces)
    // This regex allows for common international formats, starting with a + or digit.
    const re = /^[+\d][\d\s-()]*\d$/; // Allows digits, spaces, hyphens, and parentheses, must end with a digit
    return re.test(phone);
  };

  const validateDateOfBirth = (dateString: string) => {
    if (!dateString) return ""; // No error if field is empty (it's not a required field in your setup)

    const birthDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize today's date to midnight for accurate comparison

    // 1. Check if the birthdate is in the future
    if (birthDate > today) {
      return "Birthdate cannot be in the future.";
    }

    // 2. Check for minimum age (e.g., 18 years old)
    // Set a date 18 years ago from today
    const minAgeDate = new Date(
      today.getFullYear() - 18,
      today.getMonth(),
      today.getDate()
    );

    // If birthDate is after minAgeDate, the user is younger than 18
    if (birthDate > minAgeDate) {
      return "You must be at least 18 years old.";
    }

    return ""; // No error
  };

  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    // Update form data immediately (for better UX)
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));

    // Clear previous timeout (if any)
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    // Set a new timeout for validation (e.g., 1000ms delay)
    debounceTimeout.current = setTimeout(() => {
      const newErrors = { ...errors };

      // Validate based on field type
      switch (name) {
        case "email":
          if (!validateEmail(value)) {
            newErrors.email = "Please enter a valid email address.";
          } else {
            delete newErrors.email;
          }
          break;
        case "password":
          if (!validatePassword(value)) {
            newErrors.password =
              "Password must be at least 8 characters with 1 uppercase, 1 lowercase, 1 number, and 1 special character.";
          } else {
            delete newErrors.password;
            // Validate confirm password if it's already filled
            if (
              formData.confirm_password &&
              value !== formData.confirm_password
            ) {
              newErrors.confirm_password = "Passwords do not match.";
            } else {
              delete newErrors.confirm_password;
            }
          }
          break;
        case "confirm_password":
          if (value !== formData.password) {
            newErrors.confirm_password = "Passwords do not match.";
          } else {
            delete newErrors.confirm_password;
          }
          break;
        case "phone_number":
          if (value && !validatePhoneNumber(value)) {
            newErrors.phone_number = "Please enter a valid phone number.";
          } else {
            delete newErrors.phone_number;
          }
          break;
        case "date_of_birth":
          const dateError = validateDateOfBirth(value);
          if (dateError) {
            newErrors.date_of_birth = dateError;
          } else {
            delete newErrors.date_of_birth;
          }
          break;
        default:
          // For required fields
          if (requiredFields.includes(name) && !value.trim()) {
            newErrors[name] = "This field is required.";
          } else {
            delete newErrors[name];
          }
      }

      setErrors(newErrors);
    }, 1000); // Adjust delay as needed (e.g., 300ms, 500ms, etc.)
  };

  // Cleanup timeout on unmount (optional but recommended)
  useEffect(() => {
    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, []);

  const handlePhoneNumberInput = (e: React.FormEvent<HTMLInputElement>) => {
    const input = e.target as HTMLInputElement;
    // Allow digits, plus, hyphens, and parentheses. Remove any other characters.
    input.value = input.value.replace(/[^0-9+\-() ]/g, "");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Trigger immediate re-validation of all fields on submit to catch any missed errors
    const finalErrors: Record<string, string> = {};
    requiredFields.forEach((field) => {
      if (!formData[field as keyof UserFormData]?.trim()) {
        finalErrors[field] = "This field is required.";
      }
    });

    // Specific validations
    if (formData.email && !validateEmail(formData.email)) {
      finalErrors.email = "Please enter a valid email address.";
    }
    if (formData.password && !validatePassword(formData.password)) {
      finalErrors.password =
        "Password must be at least 8 characters with 1 uppercase, 1 lowercase, 1 number, and 1 special character.";
    }
    if (
      formData.confirm_password &&
      formData.confirm_password !== formData.password
    ) {
      finalErrors.confirm_password = "Passwords do not match.";
    }
    if (formData.phone_number && !validatePhoneNumber(formData.phone_number)) {
      finalErrors.phone_number = "Please enter a valid phone number.";
    }
    const dateError = validateDateOfBirth(formData.date_of_birth);
    if (dateError) {
      finalErrors.date_of_birth = dateError;
    }

    setErrors(finalErrors);

    if (Object.keys(finalErrors).length > 0) {
      toast.error("Please fill in all required fields correctly!", {
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

    setIsSubmitting(true);

    try {
      const response = await axios.post("http://127.0.0.1:8000/api/users/", {
        first_name: formData.first_name,
        last_name: formData.last_name,
        username: formData.username,
        password: formData.password,
        email: formData.email,
        date_of_birth: formData.date_of_birth,
        phone_number: formData.phone_number,
      });

      setUsers((prevUsers) => [...prevUsers, response.data]);

      toast.success("User Added Successfully!", {
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

      setFormData({
        first_name: "",
        last_name: "",
        username: "",
        password: "",
        confirm_password: "",
        date_of_birth: "",
        email: "",
        phone_number: "",
      });
      setErrors({});
      setIsDialogOpen(false);
    } catch (error) {
      let errorMessage = "Failed to add user. Please try again.";

      if (axios.isAxiosError(error) && error.response) {
        if (error.response.data.username) {
          errorMessage = "Username already exists.";
        } else if (error.response.data.email) {
          errorMessage = "Email already exists.";
        } else if (error.response.data.password) {
          errorMessage = "Password doesn't meet requirements.";
        } else if (error.response.data.detail) {
          errorMessage = error.response.data.detail; // Catch general API errors
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

  return (
    <div className="container mx-auto px-4 py-6">
      <PageBreadcrumb pageTitle="Manage Users" />
      <div className="space-y-6">
        <div className="flex justify-end">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                size="md"
                variant="primary"
                startIcon={<PlusIcon className="size-6" />}
              >
                Add New User
              </Button>
            </DialogTrigger>
            <DialogContent className="w-full rounded-lg bg-white dark:bg-gray-800 p-8 shadow-xl">
              <DialogHeader className="mb-8">
                <DialogTitle className="text-3xl font-bold text-gray-800 dark:text-white">
                  Add New User
                </DialogTitle>
                <DialogDescription className="text-gray-600 dark:text-gray-400">
                  Fill in the user details below
                </DialogDescription>
              </DialogHeader>

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
                      className="w-full p-3.5 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 text-base"
                      placeholder="John"
                      value={formData.first_name}
                      onChange={handleChange}
                    />
                    {errors.first_name && (
                      <p className="text-red-500 text-sm">
                        {errors.first_name}
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
                      className="w-full p-3.5 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 text-base"
                      placeholder="Doe"
                      value={formData.last_name}
                      onChange={handleChange}
                    />
                    {errors.last_name && (
                      <p className="text-red-500 text-sm">{errors.last_name}</p>
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
                    placeholder="johndoe123"
                    value={formData.username}
                    onChange={handleChange}
                  />
                  {errors.username && (
                    <p className="text-red-500 text-sm">{errors.username}</p>
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
                    className="w-full p-3.5 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 text-base"
                    placeholder="john@example.com"
                    value={formData.email}
                    onChange={handleChange}
                  />
                  {errors.email && (
                    <p className="text-red-500 text-sm">{errors.email}</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-base">
                      Password *
                    </Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        id="password"
                        name="password"
                        className="w-full p-3.5 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 text-base"
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={handleChange}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2"
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                      >
                        {showPassword ? (
                          <EyeClosedIcon className="h-5 w-5 text-gray-400" />
                        ) : (
                          <EyeIcon className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="text-red-500 text-sm">{errors.password}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm_password" className="text-base">
                      Confirm Password *
                    </Label>
                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? "text" : "password"}
                        id="confirm_password"
                        name="confirm_password"
                        className="w-full p-3.5 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 text-base"
                        placeholder="••••••••"
                        value={formData.confirm_password}
                        onChange={handleChange}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        className="absolute right-3 top-1/2 transform -translate-y-1/2"
                        aria-label={
                          showConfirmPassword
                            ? "Hide password"
                            : "Show password"
                        }
                      >
                        {showConfirmPassword ? (
                          <EyeClosedIcon className="h-5 w-5 text-gray-400" />
                        ) : (
                          <EyeIcon className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                    </div>
                    {errors.confirm_password && (
                      <p className="text-red-500 text-sm">
                        {errors.confirm_password}
                      </p>
                    )}
                  </div>
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
                      value={formData.date_of_birth}
                      onChange={handleChange}
                      max={new Date().toISOString().split("T")[0]} // Prevents selecting future dates via picker
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                      <CalenderIcon className="size-5" />
                    </span>
                  </div>
                  {errors.date_of_birth && (
                    <p className="text-red-500 text-sm">
                      {errors.date_of_birth}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone_number" className="text-base">
                    Phone Number
                  </Label>
                  <Input
                    type="tel"
                    id="phone_number"
                    name="phone_number"
                    className="w-full p-3.5 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 text-base"
                    placeholder="+1 (555) 123-4567"
                    value={formData.phone_number}
                    onChange={handleChange}
                    onInput={handlePhoneNumberInput}
                  />
                  {errors.phone_number && (
                    <p className="text-red-500 text-sm">
                      {errors.phone_number}
                    </p>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={(e) => {
                      e.preventDefault();
                      setIsDialogOpen(false);
                      setErrors({}); // Clear errors on dialog close
                      setFormData({
                        // Reset form data
                        first_name: "",
                        last_name: "",
                        username: "",
                        password: "",
                        confirm_password: "",
                        date_of_birth: "",
                        email: "",
                        phone_number: "",
                      });
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
                        Adding...
                      </span>
                    ) : (
                      "Add User"
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <UsersTable users={users} setUsers={setUsers} />
      </div>
      <ToastContainer
        position="top-center"
        autoClose={2000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick={false}
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
        transition={Bounce}
      />
    </div>
  );
};

export default ManageUsers;
