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
import { CalenderIcon, PlusIcon, UserIcon } from "../icons";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { EyeClosedIcon, EyeIcon, Loader2Icon } from "lucide-react";

interface UserFormData {
  first_name: string;
  last_name: string;
  username: string;
  password: string;
  confirm_password: string;
  date_of_birth: string;
  email: string;
  phone_number: string;
  role: string;
  school: string;
  profile_picture_base64: string;
}

const ManageUsers = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const [formData, setFormData] = useState<UserFormData>({
    first_name: "",
    last_name: "",
    username: "",
    password: "",
    confirm_password: "",
    date_of_birth: "",
    email: "",
    phone_number: "",
    role: "school_admin",
    school: "",
    profile_picture_base64: "",
  });

  const roleOptions = [
    { value: "admin", label: "Administrator" },
    { value: "school_head", label: "School Head" },
    { value: "school_admin", label: "School Admin Assistant" },
    { value: "district_admin", label: "District Admin Assistant" },
    { value: "superintendent", label: "Division Superintendent" },
    { value: "liquidator", label: "Liquidator" },
    { value: "accountant", label: "Division Accountant" },
  ];

  const requiredFields = [
    "first_name",
    "last_name",
    "username",
    "password",
    "confirm_password",
    "email",
    "role",
  ];

  const isFormValid =
    requiredFields.every(
      (field) => formData[field as keyof UserFormData]?.trim() !== ""
    ) &&
    (formData.role !== "school_head" && formData.role !== "school_admin"
      ? true
      : formData.school.trim() !== "") &&
    Object.keys(errors).length === 0;

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
    const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    return re.test(email);
  };

  const validatePassword = (password: string) => {
    const re =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return re.test(password);
  };

  const validatePhoneNumber = (phone: string) => {
    const re = /^[+\d][\d\s-()]*\d$/;
    return re.test(phone);
  };

  const validateDateOfBirth = (dateString: string) => {
    if (!dateString) return "";
    const birthDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (birthDate > today) {
      return "Birthdate cannot be in the future.";
    }

    const minAgeDate = new Date(
      today.getFullYear() - 18,
      today.getMonth(),
      today.getDate()
    );

    if (birthDate > minAgeDate) {
      return "You must be at least 18 years old.";
    }

    return "";
  };

  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));

    if (name === "role" && !["school_head", "school_admin"].includes(value)) {
      setFormData((prev) => ({ ...prev, school: "" }));
    }

    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    debounceTimeout.current = setTimeout(() => {
      const newErrors = { ...errors };

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
        case "role":
          if (value === "admin" && currentUser?.role !== "admin") {
            newErrors.role = "Only administrators can create admin users.";
          } else {
            delete newErrors.role;
          }
          break;
        case "school":
          if (
            (formData.role === "school_head" ||
              formData.role === "school_admin") &&
            !value.trim()
          ) {
            newErrors.school = "School is required for this role.";
          } else {
            delete newErrors.school;
          }
          break;
        default:
          if (requiredFields.includes(name) && !value.trim()) {
            newErrors[name as keyof typeof newErrors] =
              "This field is required.";
          } else {
            delete newErrors[name as keyof typeof newErrors];
          }
      }

      setErrors(newErrors);
    }, 500);
  };

  const handlePhoneNumberInput = (e: React.FormEvent<HTMLInputElement>) => {
    const input = e.target as HTMLInputElement;
    input.value = input.value.replace(/[^0-9+\-() ]/g, "");
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // You can still set a preview if needed
      const reader = new FileReader();
      reader.onload = (event) => {
        setPreviewImage(event.target?.result as string);
      };
      reader.readAsDataURL(file); // This is just for preview, not for sending

      // Store the File object itself in your state or directly append to FormData
      setFormData((prev) => ({
        ...prev,
        profile_picture: file, // Store the actual File object
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Final validation check
    const finalErrors: Record<string, string> = {};
    requiredFields.forEach((field) => {
      if (!formData[field as keyof UserFormData]?.trim()) {
        finalErrors[field] = "This field is required.";
      }
    });

    if (formData.role === "admin" && currentUser?.role !== "admin") {
      finalErrors.role = "Only administrators can create admin users.";
    }

    if (
      (formData.role === "school_head" || formData.role === "school_admin") &&
      !formData.school.trim()
    ) {
      finalErrors.school = "School is required for this role.";
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
      console.log(formData);
      const response = await axios.post("http://127.0.0.1:8000/api/users/", {
        ...formData,
        profile_picture: formData.profile_picture_base64,
        headers: { "Content-Type": "mutipart/form-data" },
      });
      console.log(response.data);
      console.log(formData);
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

      // Reset form
      setFormData({
        first_name: "",
        last_name: "",
        username: "",
        password: "",
        confirm_password: "",
        date_of_birth: "",
        email: "",
        phone_number: "",
        role: "school_admin",
        school: "",
        profile_picture_base64: "",
      });
      setPreviewImage(null);
      setErrors({});
      setIsDialogOpen(false);
    } catch (error: any) {
      let errorMessage = "Failed to add user. Please try again.";
      console.error(error);

      if (axios.isAxiosError(error) && error.response) {
        if (error.response.data.username) {
          errorMessage = "Username already exists.";
        } else if (error.response.data.email) {
          errorMessage = "Email already exists.";
        } else if (error.response.data.password) {
          errorMessage = "Password doesn't meet requirements.";
        } else if (error.response.data.detail) {
          errorMessage = error.response.data.detail;
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
            <DialogContent className="w-full rounded-lg bg-white dark:bg-gray-800 p-8 shadow-xl max-h-[90vh] overflow-y-auto">
              <DialogHeader className="mb-8">
                <DialogTitle className="text-3xl font-bold text-gray-800 dark:text-white">
                  Add New User
                </DialogTitle>
                <DialogDescription className="text-gray-600 dark:text-gray-400">
                  Fill in the user details below
                </DialogDescription>
              </DialogHeader>

              <form className="space-y-4" onSubmit={handleSubmit}>
                {/* Profile Picture Upload */}
                <div className="space-y-2">
                  <Label htmlFor="profile_picture" className="text-base">
                    Profile Picture
                  </Label>
                  <div className="flex items-center gap-4">
                    {previewImage ? (
                      <img
                        src={previewImage}
                        className="w-16 h-16 rounded-full object-cover"
                        alt="Preview"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
                        <UserIcon className="w-8 h-8 text-gray-500" />
                      </div>
                    )}
                    <input
                      type="file"
                      id="profile_picture"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <Label
                      htmlFor="profile_picture"
                      className="cursor-pointer px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md"
                    >
                      Upload Photo
                    </Label>
                  </div>
                </div>

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
                  <Label htmlFor="role" className="text-base">
                    Role *
                  </Label>
                  <select
                    id="role"
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    className="h-11 w-full appearance-none rounded-lg border-2 border-gray-300 bg-transparent px-4 py-2.5 pr-11 text-sm shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                  >
                    {roleOptions.map((option) => (
                      <option
                        key={option.value}
                        value={option.value}
                        className="text-gray-700"
                        disabled={
                          option.value === "admin" &&
                          currentUser?.role !== "admin"
                        }
                      >
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {errors.role && (
                    <p className="text-red-500 text-sm">{errors.role}</p>
                  )}
                </div>

                {(formData.role === "school_head" ||
                  formData.role === "school_admin") && (
                  <div className="space-y-2">
                    <Label htmlFor="school" className="text-base">
                      School *
                    </Label>
                    <Input
                      type="text"
                      id="school"
                      name="school"
                      className="w-full p-3.5 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 text-base"
                      placeholder="Enter school name"
                      value={formData.school}
                      onChange={handleChange}
                    />
                    {errors.school && (
                      <p className="text-red-500 text-sm">{errors.school}</p>
                    )}
                  </div>
                )}

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
                      max={new Date().toISOString().split("T")[0]}
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
                      setErrors({});
                      setFormData({
                        first_name: "",
                        last_name: "",
                        username: "",
                        password: "",
                        confirm_password: "",
                        date_of_birth: "",
                        email: "",
                        phone_number: "",
                        role: "school_admin",
                        school: "",
                        profile_picture_base64: "",
                      });
                      setPreviewImage(null);
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
                        <Loader2Icon className="animate-spin size-4" />
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
