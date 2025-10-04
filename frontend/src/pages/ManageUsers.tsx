/* eslint-disable no-case-declarations */
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import "../antd-custom.css";
import { Bounce, toast } from "react-toastify";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import UsersTable from "../components/tables/BasicTables/UsersTable";
import Button from "../components/ui/button/Button";
import { PlusIcon, UserIcon } from "../icons";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { Loader2Icon, XIcon } from "lucide-react";
import {
  validateEmail,
} from "@/lib/helpers";
import {
  District,
  FilterOptions,
  School,
  SortableField,
  SortDirection,
  User,
} from "@/lib/types";
import api from "@/api/axios";
import SchoolSelect from "@/components/form/SchoolSelect";
import dayjs from "@/lib/dayjs";
import InlinePageHelp from "@/components/help/InlinePageHelp";
import DynamicContextualHelp from "@/components/help/DynamicContextualHelpComponent";
import { useHelpTrigger } from "@/context/HelpContext";

interface UserFormData {
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  school_id: string;
  school_district_id?: number; // Changed from school_district: string
  profile_picture_base64: string;
}

export const roleOptions = [
  { value: "admin", label: "Administrator" },
  { value: "school_head", label: "School Head" },
  { value: "school_admin", label: "School Admin Assistant" },
  { value: "district_admin", label: "District Admin Assistant" },
  { value: "superintendent", label: "Division Superintendent" },
  { value: "liquidator", label: "Liquidator" },
  { value: "accountant", label: "Division Accountant" },
];

type FormErrors = Partial<Record<keyof UserFormData, string | null>>;
const requiredFields = [
  "first_name",
  "last_name",
  "email",
  "role",
];

const ManageUsers = () => {
  const triggerHelp = useHelpTrigger();
  const [showArchived, setShowArchived] = useState(false);
  const [schools, setSchools] = useState<School[]>([]);
  const [districts, setDistricts] = useState<District[]>([]); // Added for districts
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user: currentUser } = useAuth();
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalUsers, setTotalUsers] = useState(0);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    role: "",
    dateRange: { start: "", end: "" },
    searchTerm: "",
  });
  const [sortConfig, setSortConfig] = useState<{
    key: SortableField;
    direction: SortDirection;
  } | null>({ key: "date_joined", direction: "desc" });
  const [formData, setFormData] = useState<UserFormData>({
    first_name: "",
    last_name: "",
    email: "",
    role: "admin",
    school_id: "",
    school_district_id: undefined, // Changed from school_district
    profile_picture_base64: "",
  });

  const isFormValid =
    requiredFields.every(
      (field) => formData[field as keyof UserFormData]?.toString().trim() !== ""
    ) &&
    (formData.role !== "school_head" && formData.role !== "school_admin"
      ? true
      : formData.school_id.trim() !== "") &&
    (formData.role !== "district_admin" ||
      (formData.school_district_id && formData.school_district_id > 0)) &&
    Object.keys(errors).filter(
      (key) =>
        errors[key as keyof UserFormData] !== undefined &&
        errors[key as keyof UserFormData] !== null
    ).length === 0;

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {
        page: currentPage,
        page_size: itemsPerPage,
        archived: showArchived,
      };
      if (filterOptions.role) params.role = filterOptions.role;
      if (filterOptions.searchTerm) params.search = filterOptions.searchTerm;
      if (filterOptions.dateRange?.start)
        params.date_joined_after = filterOptions.dateRange.start;
      if (filterOptions.dateRange?.end)
        params.date_joined_before = filterOptions.dateRange.end;
      if (sortConfig) {
        params.ordering =
          sortConfig.direction === "asc"
            ? sortConfig.key
            : `-${sortConfig.key}`;
      }
      const response = await api.get("users/", { params });
      setAllUsers(response.data.results || response.data);
      setTotalUsers(response.data.count ?? response.data.length);
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error("Failed to fetch users");
      setError(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    const fetchSchoolsAndDistricts = async () => {
      try {
        const [schoolsResponse, districtsResponse] = await Promise.all([
          api.get("schools/", { params: { page_size: 10000 } }),
          api.get("school-districts/", { params: { page_size: 10000 } }),
        ]);
        setSchools(schoolsResponse.data.results || schoolsResponse.data);
        setDistricts(districtsResponse.data.results || districtsResponse.data);
      } catch (error) {
        console.error("Failed to fetch schools or districts:", error);
      }
    };
    fetchSchoolsAndDistricts();
  }, [showArchived, filterOptions, sortConfig, currentPage, itemsPerPage]);

  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
  const handleChange = (
    e:
      | React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
      | dayjs.Dayjs
      | null,
    name?: keyof UserFormData
  ) => {

    if (!e || !("target" in e)) return;
    const { name: inputName, value } = e.target as {
      name: keyof UserFormData;
      value: string;
    };

    setFormData((prev) => ({
      ...prev,
      [inputName]: inputName === "school_district_id" ? Number(value) : value,
    }));

    if (
      inputName === "role" &&
      !["school_head", "school_admin"].includes(value)
    ) {
      setFormData((prev) => ({ ...prev, school_id: "" }));
    }
    if (inputName === "role" && value !== "district_admin") {
      setFormData((prev) => ({ ...prev, school_district_id: undefined }));
    }

    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    debounceTimeout.current = setTimeout(() => {
      setErrors((prev) => {
        const newErrors = { ...prev };
        switch (inputName) {
          case "email":
            newErrors.email = !validateEmail(value)
              ? "Please enter a valid email address"
              : undefined;
            break;
          case "role":
            newErrors.role =
              value === "admin" && currentUser?.role !== "admin"
                ? "Only administrators can create admin users"
                : undefined;
            break;
          case "school_id":
            newErrors.school_id =
              (formData.role === "school_head" ||
                formData.role === "school_admin") &&
              !value.trim()
                ? "Please select a school from the list"
                : undefined;
            break;
          case "school_district_id":
            newErrors.school_district_id =
              formData.role === "district_admin" &&
              (!value || Number(value) <= 0)
                ? "Please select a school district"
                : undefined;
            break;
          default:
            if (requiredFields.includes(inputName)) {
              newErrors[inputName] = !value.trim()
                ? "This field is required"
                : undefined;
            }
        }
        return newErrors;
      });
    }, 500);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64String = event.target?.result as string;
        setPreviewImage(base64String);
        setFormData((prev) => ({
          ...prev,
          profile_picture_base64: base64String,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setShowConfirmation(true);
  };

  const handleConfirmSubmit = async () => {
    setShowConfirmation(false);

    const finalErrors: Record<string, string> = {};
    requiredFields.forEach((field) => {
      if (!formData[field as keyof UserFormData]?.toString().trim()) {
        finalErrors[field] = "This field is required.";
      }
    });

    if (formData.role === "admin" && currentUser?.role !== "admin") {
      finalErrors.role = "Only administrators can create admin users.";
    }

    if (
      (formData.role === "school_head" || formData.role === "school_admin") &&
      !formData.school_id.trim()
    ) {
      finalErrors.school_id = "School is required for this role.";
    }

    if (formData.role === "district_admin" && !formData.school_district_id) {
      finalErrors.school_district_id =
        "School district is required for district administrators.";
    }
    // Add warning for inactive schools
    if (formData.school_id) {
      const selectedSchool = schools.find(
        (s) => s.schoolId === formData.school_id
      );
      if (selectedSchool && !selectedSchool.is_active) {
        if (
          !window.confirm(
            "You are assigning a user to an inactive school. Are you sure you want to continue?"
          )
        ) {
          setShowConfirmation(false);
          return;
        }
      }
    }
    setErrors(finalErrors);

    if (Object.keys(finalErrors).length > 0) {
      toast.error("Please fill in all required fields correctly!");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await api.post("http://127.0.0.1:8000/api/users/", {
        ...formData,
        headers: { "Content-Type": "application/json" },
      });
      await fetchUsers();
      toast.success("User Added Successfully!");
      setFormData({
        first_name: "",
        last_name: "",
        email: "",
        role: "school_admin",
        school_id: "",
        school_district_id: undefined,
        profile_picture_base64: "",
      });
      setPreviewImage(null);
      setErrors({});
      setIsDialogOpen(false);
    } catch (error: any) {
      console.error("Error adding user:", error);
      let errorMessage = "An error occurred. Please try again.";
      if (axios.isAxiosError(error) && error.response) {
        if (error.response.data.email) {
          errorMessage = "Email already exists.";
        } else if (error.response.data.role) {
          errorMessage = Array.isArray(error.response.data.role)
            ? error.response.data.role[0]
            : error.response.data.role;
        } else if (error.response.data.is_active) {
          errorMessage = Array.isArray(error.response.data.is_active)
            ? error.response.data.is_active[0]
            : error.response.data.is_active;
        } else if (error.response.data.school_district) {
          errorMessage = Array.isArray(error.response.data.school_district)
            ? error.response.data.school_district[0]
            : error.response.data.school_district;
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
        {/* Inline help at the top */}
      <DynamicContextualHelp variant="inline" className="mb-6" /> 
        <div className="flex justify-end">
          <Dialog
            open={isDialogOpen}
            onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (open) {
                triggerHelp("Add New User");
              }
            }}
          >
            <DialogTrigger asChild>
              <Button
                size="md"
                variant="primary"
                startIcon={<PlusIcon className="size-6" />}
              >
                Add New User
              </Button>
            </DialogTrigger>
            <DialogContent className="w-full rounded-lg bg-white dark:bg-gray-800 p-8 shadow-xl max-h-[90vh] overflow-y-auto custom-scrollbar">
              <DialogHeader className="mb-8">
                <DialogTitle className="text-3xl font-bold text-gray-800 dark:text-white">
                  Add New User
                </DialogTitle>
                <DialogDescription className="text-gray-600 dark:text-gray-400">
                  Fill in the user details below
                </DialogDescription>
              </DialogHeader>

              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="profile_picture" className="text-base">
                    Profile Picture
                  </Label>
                  <div className="flex items-center gap-4">
                    {previewImage ? (
                      <div className="relative">
                        <img
                          src={previewImage}
                          className="w-16 h-16 rounded-full object-cover"
                          alt="Preview"
                        />
                        <button
                          type="button"
                          onClick={() => setPreviewImage(null)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-red-600"
                          aria-label="Remove profile picture"
                        >
                          <XIcon />
                        </button>
                      </div>
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
                      {previewImage ? "Change Photo" : "Upload Photo"}
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

                {formData.role === "district_admin" && (
                  <div className="space-y-2">
                    <Label htmlFor="school_district_id" className="text-base">
                      School District *
                    </Label>
                    <select
                      id="school_district_id"
                      name="school_district_id"
                      value={formData.school_district_id || ""}
                      onChange={handleChange}
                      className="h-11 w-full appearance-none rounded-lg border-2 border-gray-300 bg-transparent px-4 py-2.5 pr-11 text-sm shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                    >
                      <option value="">Select a district</option>
                      {districts.map((district) => (
                        <option
                          key={district.districtId}
                          value={district.districtId}
                        >
                          {district.districtName}
                        </option>
                      ))}
                    </select>
                    {errors.school_district_id && (
                      <p className="text-red-500 text-sm">
                        {errors.school_district_id}
                      </p>
                    )}
                  </div>
                )}

                {(formData.role === "school_head" ||
                  formData.role === "school_admin") && (
                  <SchoolSelect
                    value={
                      formData.school_id ? Number(formData.school_id) : null
                    }
                    onChange={(schoolId) => {
                      setFormData((prev) => ({
                        ...prev,
                        school_id: schoolId !== null ? String(schoolId) : "",
                      }));
                      if (errors.school_id)
                        setErrors((prev) => ({ ...prev, school_id: "" }));
                    }}
                    required
                    error={errors.school_id || undefined}
                  />
                )}


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
                        email: "",
                        role: "school_admin",
                        school_id: "",
                        school_district_id: undefined,
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
          {showConfirmation && (
            <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirm User Creation</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to create this user?
                  </DialogDescription>
                </DialogHeader>
                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowConfirmation(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleConfirmSubmit}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Creating..." : "Confirm"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <UsersTable
          users={allUsers}
          setUsers={setAllUsers}
          showArchived={showArchived}
          setShowArchived={setShowArchived}
          fetchUsers={fetchUsers}
          filterOptions={filterOptions}
          setFilterOptions={setFilterOptions}
          onRequestSort={(key) => {
            let direction: SortDirection = "asc";
            if (sortConfig && sortConfig.key === key) {
              direction = sortConfig.direction === "asc" ? "desc" : null;
            }
            setSortConfig(direction ? { key, direction } : null);
          }}
          currentSort={sortConfig}
          loading={loading}
          error={error}
          schools={schools}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          itemsPerPage={itemsPerPage}
          setItemsPerPage={setItemsPerPage}
          totalUsers={totalUsers}
        />
      </div>
      {/* <InlinePageHelp className="mt-6" /> */}
    </div>
  );
};

export default ManageUsers;
