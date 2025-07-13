/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "react-toastify";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import {
  EyeIcon,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X,
  Search,
  Loader2,
  Archive,
  ArchiveRestore,
  EyeClosedIcon,
  User as UserIcon,
  Filter,
  Loader2Icon,
  XIcon,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { CalenderIcon } from "@/icons";
import {
  FilterOptions,
  School,
  SortableField,
  SortDirection,
  User,
} from "@/lib/types";
import Button from "@/components/ui/button/Button";
import axios from "axios";
import Badge from "@/components/ui/badge/Badge";
import { useAuth } from "@/context/AuthContext";
import {
  calculateAge,
  getAvatarColor,
  getUserInitials,
  validateDateOfBirth,
  validateEmail,
  validatePassword,
  validatePhoneNumber,
} from "@/lib/helpers";
import { useEffect, useMemo, useRef, useState } from "react";
import { roleOptions } from "@/pages/ManageUsers";
import { roleMap, schoolDistrictOptions } from "@/lib/constants";
import SkeletonRow from "@/components/ui/skeleton";
import api from "@/api/axios";
import SchoolSelect from "@/components/form/SchoolSelect";
import PhoneNumberInput from "@/components/form/input/PhoneNumberInput";

interface UsersTableProps {
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<any[]>>;
  showArchived: boolean;
  setShowArchived: React.Dispatch<React.SetStateAction<boolean>>;
  fetchUsers: () => Promise<void>;
  filterOptions: FilterOptions;
  setFilterOptions: React.Dispatch<React.SetStateAction<FilterOptions>>;
  onRequestSort: (key: SortableField) => void;
  currentSort: {
    key: SortableField;
    direction: SortDirection;
  } | null;
  loading?: boolean;
  error?: Error | null;
  schools: School[];
  currentPage: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  itemsPerPage: number;
  setItemsPerPage: React.Dispatch<React.SetStateAction<number>>;
  totalUsers: number;
}

interface FormErrors {
  first_name?: string;
  last_name?: string;
  username?: string;
  email?: string;
  password?: string;
  confirm_password?: string;
  phone_number?: string;
  date_of_birth?: string;
  role?: string;
  school?: string;
}

export default function UsersTable({
  users,
  setUsers,
  showArchived,
  setShowArchived,
  fetchUsers,
  filterOptions,
  setFilterOptions,
  onRequestSort,
  currentSort,
  loading,
  error,
  schools,
  currentPage,
  setCurrentPage,
  itemsPerPage,
  setItemsPerPage,
  totalUsers,
}: UsersTableProps) {
  const { user: currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState(filterOptions.searchTerm || "");
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Form state
  const [profilePictureFile, setProfilePictureFile] = useState<File | null>(
    null
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false);
  const [isBulkArchiveDialogOpen, setIsBulkArchiveDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [userToView, setUserToView] = useState<User | null>(null);
  const [userToArchive, setUserToArchive] = useState<User | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  const requiredFields = ["first_name", "last_name", "email"];

  const isFormValid = useMemo(() => {
    if (!selectedUser) return false;
    const requiredValid = requiredFields.every(
      (field) => selectedUser[field as keyof User]?.toString().trim() !== ""
    );
    const roleValid =
      selectedUser.role === "school_head" ||
      selectedUser.role === "school_admin"
        ? selectedUser.school !== null
        : true;
    const noErrors = Object.keys(formErrors).length === 0;
    return requiredValid && roleValid && noErrors;
  }, [selectedUser, formErrors]);

  // Helper to get school name
  const getSchoolName = (school: any) => {
    if (!school) return "";
    if (typeof school === "object" && school.schoolName)
      return school.schoolName;
    if (typeof school === "number" || typeof school === "string") {
      const found = schools.find(
        (s) =>
          s.schoolId === school || s.schoolId.toString() === school.toString()
      );
      return found ? found.schoolName : "";
    }
    return "";
  };
  console.log(schools);
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    if (!selectedUser) return;
    const { name, value } = e.target;

    setSelectedUser((prev) => ({
      ...prev!,
      [name]: value,
    }));

    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

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
        case "date_of_birth":
          const dateError = validateDateOfBirth(value);
          if (dateError) {
            newErrors.date_of_birth = dateError;
          } else {
            delete newErrors.date_of_birth;
          }
          break;
        case "phone_number":
          if (value && !validatePhoneNumber(value)) {
            newErrors.phone_number = "Please enter a valid phone number";
          } else {
            delete newErrors.phone_number;
          }
          break;
        case "role":
          if (value === "admin" && currentUser?.role !== "admin") {
            newErrors.role = "Only administrators can create admin users";
          } else {
            delete newErrors.role;
          }
          if (
            (value === "school_head" || value === "school_admin") &&
            !selectedUser.school
          ) {
            newErrors.school = "School is required for this role";
          }
          break;
        default:
          if (requiredFields.includes(name) && !value.trim()) {
            newErrors[name as keyof FormErrors] = "This field is required";
          } else {
            delete newErrors[name as keyof FormErrors];
          }
      }

      setFormErrors(newErrors);
    }, 500);
  };

  useEffect(() => {
    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, []);

  useEffect(() => {
    setSelectedUsers([]);
    setSelectAll(false);
  }, [showArchived, users]);

  // Debounce searchTerm -> filterOptions.searchTerm
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setFilterOptions((prev) => ({
        ...prev,
        searchTerm,
      }));
    }, 400);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchTerm, setFilterOptions]);

  const totalPages = Math.ceil(totalUsers / itemsPerPage);

  // Bulk selection handlers
  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.map((user) => user.id));
    }
    setSelectAll(!selectAll);
  };

  const toggleSelectUser = (userId: number) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const isSelected = (userId: number) => selectedUsers.includes(userId);

  // Bulk actions
  const handleBulkArchive = async (archive: boolean) => {
    if (selectedUsers.length === 0) return;
    setIsSubmitting(true);

    try {
      await Promise.all(
        selectedUsers.map((userId) =>
          api.patch(`http://127.0.0.1:8000/api/users/${userId}/`, {
            is_active: !archive,
          })
        )
      );

      toast.success(
        `${selectedUsers.length} user${selectedUsers.length > 1 ? "s" : ""} ${
          archive ? "archived" : "restored"
        } successfully!`
      );

      await fetchUsers();
      setSelectedUsers([]);
      setSelectAll(false);
    } catch (error) {
      toast.error(
        `Failed to ${archive ? "archive" : "restore"} users. Please try again.`
      );
    } finally {
      setIsSubmitting(false);
      setIsBulkArchiveDialogOpen(false);
    }
  };

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleEditUser = (user: User) => {
    setSelectedUser({ ...user, password: "", confirm_password: "" });
    setFormErrors({});
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (user: User) => {
    setUserToDelete(user);
    setIsDeleteDialogOpen(true);
  };

  const handleViewUser = (user: User) => {
    setUserToView(user);
    setIsViewDialogOpen(true);
  };

  const handleArchiveClick = (user: User) => {
    setUserToArchive(user);
    setIsArchiveDialogOpen(true);
  };
  const handleSchoolChange = (schoolId: number | null) => {
    if (!selectedUser) return;
    if (!Array.isArray(schools)) return; // Defensive: only proceed if schools is an array
    console.log(schoolId);
    setSelectedUser((prev) => ({
      ...prev!,
      school:
        schoolId === null
          ? null
          : schools.find((s) => Number(s.schoolId) === Number(schoolId)) ||
            null,
    }));
    console.log("Selected User School:", selectedUser.school);

    // ...rest of your validation logic...
  };
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedUser) return;

    if (!isFormValid) {
      toast.error("Please fix the errors in the form");
      return;
    }

    setIsConfirmDialogOpen(true);
  };

  const handleConfirmedEdit = async () => {
    if (!selectedUser) return;
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      // Basic info
      formData.append("first_name", selectedUser.first_name);
      formData.append("last_name", selectedUser.last_name);
      formData.append("email", selectedUser.email);
      formData.append("date_of_birth", selectedUser.date_of_birth || ""); // Handle null case
      formData.append("school_district", selectedUser.school_district || "");

      // Contact info
      if (selectedUser.phone_number) {
        formData.append("phone_number", selectedUser.phone_number);
      } else {
        formData.append("phone_number", ""); // Clear if removed
      }

      // Account info
      formData.append("role", selectedUser.role);
      formData.append(
        "school_id",
        selectedUser.school && "schoolId" in selectedUser.school
          ? selectedUser.school.schoolId
          : ""
      );
      console.log("Selected User School ID:", selectedUser.school?.schoolId);
      console.log("Selected school district:", selectedUser.school_district);

      // Password (only if changed)
      if (selectedUser.password) {
        formData.append("password", selectedUser.password);
      }

      // Profile picture handling
      if (profilePictureFile) {
        formData.append("profile_picture", profilePictureFile);
      } else if (!selectedUser.profile_picture) {
        formData.append("profile_picture", ""); // Clear existing picture
      }
      // Log all FormData entries before sending
      for (const pair of formData.entries()) {
        console.log(pair[0], pair[1]);
      }
      await api.put(
        `http://127.0.0.1:8000/api/users/${selectedUser.id}/`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      toast.success("User updated successfully!");

      await fetchUsers();
      setIsDialogOpen(false);
      setIsConfirmDialogOpen(false);
    } catch (error) {
      let errorMessage = "Failed to update user. Please try again.";
      if (axios.isAxiosError(error) && error.response) {
        if (error.response.data.email) {
          errorMessage = "Email already exists.";
        } else if (error.response.data.password) {
          errorMessage = "Password doesn't meet requirements.";
        }
      }
      console.error(error);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;
    setIsSubmitting(true);

    try {
      await api.delete(`http://127.0.0.1:8000/api/users/${userToDelete.id}/`);
      toast.success("User deleted successfully!");

      await fetchUsers();
    } catch (error) {
      toast.error("Failed to delete user");
    } finally {
      setIsSubmitting(false);
      setIsDeleteDialogOpen(false);
      setProfilePictureFile(null);
      setUserToDelete(null);
    }
  };

  const handleArchiveConfirm = async () => {
    if (!userToArchive) return;
    setIsSubmitting(true);

    try {
      const newStatus = !userToArchive.is_active;
      await api.patch(`users/${userToArchive.id}/`, {
        is_active: newStatus,
      });

      toast.success(
        `User ${newStatus ? "restored" : "archived"} successfully!`
      );

      await fetchUsers();
    } catch (error) {
      toast.error(
        `Failed to ${userToArchive.is_active ? "archive" : "restore"} user`
      );
    } finally {
      setIsSubmitting(false);
      setIsArchiveDialogOpen(false);
      setUserToArchive(null);
    }
  };

  const handleFilterChange = (name: string, value: string) => {
    setFilterOptions((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleDateRangeChange = (name: string, value: string) => {
    setFilterOptions((prev) => ({
      ...prev,
      dateRange: {
        ...prev.dateRange,
        [name]: value,
      },
    }));
  };

  const resetFilters = () => {
    setFilterOptions({
      role: "",
      dateRange: { start: "", end: "" },
      searchTerm: "",
    });
    setSearchTerm("");
  };

  return (
    <div className="space-y-4">
      {/* Filters and Search */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-1/2">
            <Input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setSearchTerm(e.target.value);
              }}
              className="pl-10"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          </div>

          <div className="flex gap-4 w-full md:w-auto">
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              startIcon={<Filter className="size-4" />}
            >
              Filters
            </Button>

            <Button
              variant={showArchived ? "primary" : "outline"}
              onClick={() => setShowArchived(!showArchived)}
              startIcon={
                showArchived ? (
                  <ArchiveRestore className="size-4" />
                ) : (
                  <Archive className="size-4" />
                )
              }
            >
              {showArchived ? "View Active" : "View Archived"}
            </Button>

            {selectedUsers.length > 0 && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsBulkArchiveDialogOpen(true)}
                  startIcon={
                    isSubmitting ? (
                      <Loader2Icon className="h-4 w-4 animate-spin" />
                    ) : showArchived ? (
                      <ArchiveRestore className="size-4" />
                    ) : (
                      <Archive className="size-4" />
                    )
                  }
                  disabled={isSubmitting}
                >
                  {isSubmitting
                    ? "Processing..."
                    : `${selectedUsers.length} Selected`}
                </Button>
              </div>
            )}

            <select
              value={itemsPerPage.toString()}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setItemsPerPage(Number(e.target.value))
              }
              className="min-w-[100px] px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
            >
              <option value="5">5 per page</option>
              <option value="10">10 per page</option>
              <option value="20">20 per page</option>
              <option value="50">50 per page</option>
            </select>
          </div>
        </div>

        {/* Filter section - visible when showFilters is true */}
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border border-gray-200 rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
            <div className="space-y-2">
              <Label htmlFor="role-filter" className="text-sm font-medium">
                Role
              </Label>
              <select
                id="role-filter"
                value={filterOptions.role || ""}
                onChange={(e) =>
                  setFilterOptions((prev) => ({
                    ...prev,
                    role: e.target.value,
                  }))
                }
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">All Roles</option>
                {Object.entries(roleMap).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date-range-start" className="text-sm font-medium">
                Date Joined Range
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <Input
                    type="date"
                    id="date-range-start"
                    value={filterOptions.dateRange.start}
                    onChange={(e) =>
                      setFilterOptions((prev) => ({
                        ...prev,
                        dateRange: { ...prev.dateRange, start: e.target.value },
                      }))
                    }
                    className="w-full p-2 pr-8"
                  />
                  <CalenderIcon className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
                <div className="relative">
                  <Input
                    type="date"
                    id="date-range-end"
                    value={filterOptions.dateRange.end}
                    onChange={(e) =>
                      setFilterOptions((prev) => ({
                        ...prev,
                        dateRange: { ...prev.dateRange, end: e.target.value },
                      }))
                    }
                    className="w-full p-2 pr-8"
                  />
                  <CalenderIcon className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
              </div>
            </div>

            <div className="md:col-span-3 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFilterOptions({
                    role: "",
                    dateRange: { start: "", end: "" },
                    searchTerm: "",
                  });
                  setSearchTerm("");
                }}
                startIcon={<X className="size-4" />}
              >
                Clear Filters
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto">
          <Table className="divide-y divide-gray-200">
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableCell
                  isHeader
                  className="px-6 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 uppercase"
                >
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                </TableCell>
                <TableCell
                  isHeader
                  className="px-6 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 uppercase"
                >
                  <div
                    className="flex items-center gap-1 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.05]"
                    onClick={() => onRequestSort("id")}
                  >
                    ID
                    <span className="inline-flex flex-col ml-1">
                      <ChevronUp
                        className={`h-3 w-3 transition-colors ${
                          currentSort?.key === "id" &&
                          currentSort.direction === "asc"
                            ? "text-primary-500 dark:text-primary-400"
                            : "text-gray-400 dark:text-gray-500"
                        }`}
                      />
                      <ChevronDown
                        className={`h-3 w-3 -mt-1 transition-colors ${
                          currentSort?.key === "id" &&
                          currentSort.direction === "desc"
                            ? "text-primary-500 dark:text-primary-400"
                            : "text-gray-400 dark:text-gray-500"
                        }`}
                      />
                    </span>
                  </div>
                </TableCell>

                <TableCell
                  isHeader
                  className="px-6 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 uppercase"
                >
                  <div
                    className="flex items-center gap-1 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.05]"
                    onClick={() => onRequestSort("first_name")}
                  >
                    User
                    <span className="inline-flex flex-col ml-1">
                      <ChevronUp
                        className={`h-3 w-3 transition-colors ${
                          currentSort?.key === "first_name" &&
                          currentSort.direction === "asc"
                            ? "text-primary-500 dark:text-primary-400"
                            : "text-gray-400 dark:text-gray-500"
                        }`}
                      />
                      <ChevronDown
                        className={`h-3 w-3 -mt-1 transition-colors ${
                          currentSort?.key === "first_name" &&
                          currentSort.direction === "desc"
                            ? "text-primary-500 dark:text-primary-400"
                            : "text-gray-400 dark:text-gray-500"
                        }`}
                      />
                    </span>
                  </div>
                </TableCell>

                <TableCell
                  isHeader
                  className="px-6 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 uppercase"
                >
                  <div
                    className="flex items-center gap-1 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.05]"
                    onClick={() => onRequestSort("email")}
                  >
                    Email
                    <span className="inline-flex flex-col ml-1">
                      <ChevronUp
                        className={`h-3 w-3 transition-colors ${
                          currentSort?.key === "email" &&
                          currentSort.direction === "asc"
                            ? "text-primary-500 dark:text-primary-400"
                            : "text-gray-400 dark:text-gray-500"
                        }`}
                      />
                      <ChevronDown
                        className={`h-3 w-3 -mt-1 transition-colors ${
                          currentSort?.key === "email" &&
                          currentSort.direction === "desc"
                            ? "text-primary-500 dark:text-primary-400"
                            : "text-gray-400 dark:text-gray-500"
                        }`}
                      />
                    </span>
                  </div>
                </TableCell>

                <TableCell
                  isHeader
                  className="px-6 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 uppercase"
                >
                  Status
                </TableCell>

                <TableCell
                  isHeader
                  className="px-6 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 uppercase"
                >
                  Actions
                </TableCell>
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-gray-200 dark:divide-white/[0.05]">
              {loading ? (
                <>
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                </>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertTriangle className="h-8 w-8 text-red-500" />
                      <span className="text-red-500">
                        Failed to load users: {error.message}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchUsers()}
                        startIcon={<RefreshCw className="h-4 w-4" />}
                      >
                        Retry
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : users.length > 0 ? (
                users.map((user) => (
                  <TableRow
                    key={user.id}
                    className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={() => setUserToView(user)}
                  >
                    <TableCell className="px-6 whitespace-nowrap py-4 sm:px-6 text-start">
                      <input
                        type="checkbox"
                        checked={isSelected(user.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleSelectUser(user.id);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                    </TableCell>
                    <TableCell className="px-6 whitespace-nowrap py-4 sm:px-6 text-start">
                      <div className="flex items-center gap-3">
                        <span className="block font-medium text-gray-800 text-theme-sm dark:text-gray-400">
                          {user.id}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="px-6 whitespace-nowrap py-4 sm:px-6 text-start">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 overflow-hidden rounded-full">
                          {user.profile_picture ? (
                            <img
                              src={`http://127.0.0.1:8000${user.profile_picture}`}
                              alt="Profile"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="bg-gray-200 w-full h-full flex items-center justify-center">
                              <UserIcon className="w-5 h-5 text-gray-500" />
                            </div>
                          )}
                        </div>

                        <div>
                          <span className="block font-medium text-gray-800 text-theme-sm dark:text-gray-400">
                            {user.first_name} {user.last_name}
                          </span>
                          <span className="block text-gray-500 text-theme-xs dark:text-gray-400">
                            {roleMap[user.role] || user.role}
                            {user.school && ` | ${getSchoolName(user.school)}`}
                          </span>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="px-6 whitespace-nowrap py-4 text-gray-800 text-start text-theme-sm dark:text-gray-400">
                      {user.email}
                    </TableCell>
                    <TableCell className="px-6 whitespace-nowrap py-4 text-gray-800 text-start text-theme-sm dark:text-gray-400">
                      <Badge color={user.is_active ? "success" : "error"}>
                        {user.is_active ? "Active" : "Archived"}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-6 whitespace-nowrap py-4 text-gray-800 text-start text-theme-sm dark:text-gray-400 space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditUser(user);
                        }}
                        className="px-4 py-2 bg-blue-light-500 text-white dark:text-white rounded-md hover:bg-blue-light-600 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleArchiveClick(user);
                        }}
                        className={`px-4 py-2 rounded-md transition-colors ${
                          user.is_active
                            ? "bg-error-500 text-white hover:bg-error-600"
                            : "bg-success-500 text-white hover:bg-success-600"
                        }`}
                      >
                        {user.is_active ? "Archive" : "Restore"}
                      </button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    className="py-8 text-center text-gray-500"
                    colSpan={9}
                  >
                    No {showArchived ? "archived" : "active"} users found
                    matching your criteria
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Showing {users.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}{" "}
          to {Math.min(currentPage * itemsPerPage, totalUsers)} of {totalUsers}{" "}
          entries
          {selectedUsers.length > 0 && (
            <span className="ml-2">({selectedUsers.length} selected)</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => goToPage(1)}
            disabled={currentPage === 1}
            variant="outline"
            size="sm"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            variant="outline"
            size="sm"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              return (
                <Button
                  key={pageNum}
                  onClick={() => goToPage(pageNum)}
                  variant={currentPage === pageNum ? "primary" : "outline"}
                  size="sm"
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>
          <Button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages || totalPages === 0}
            variant="outline"
            size="sm"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            onClick={() => goToPage(totalPages)}
            disabled={currentPage === totalPages || totalPages === 0}
            variant="outline"
            size="sm"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Edit User Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="w-full rounded-lg bg-white dark:bg-gray-800 p-8 shadow-xl max-h-[90vh] overflow-y-auto custom-scrollbar [&>button]:hidden">
          <DialogHeader className="mb-8">
            <DialogTitle className="text-3xl font-bold text-gray-800 dark:text-white">
              Edit User
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              Update the user details below
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <form className="space-y-4" onSubmit={handleSubmit}>
              {/* Profile Picture Upload */}
              <div className="space-y-2">
                <Label htmlFor="profile_picture" className="text-base">
                  Profile Picture
                </Label>
                <div className="flex items-center gap-4">
                  {selectedUser.profile_picture_base64 ||
                  selectedUser.profile_picture ? (
                    <div className="relative">
                      <img
                        src={
                          selectedUser.profile_picture_base64 || // Show new upload preview first
                          `http://127.0.0.1:8000${selectedUser.profile_picture}` // Fallback to existing image
                        }
                        className="w-16 h-16 rounded-full object-cover"
                        alt="Preview"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedUser((prev) => ({
                            ...prev!,
                            profile_picture: "",
                            profile_picture_base64: "",
                          }));
                          setProfilePictureFile(null);
                          // Clear the file input value too
                          const fileInput = document.getElementById(
                            "profile_picture"
                          ) as HTMLInputElement;
                          if (fileInput) fileInput.value = "";
                        }}
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
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setProfilePictureFile(file);
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          setSelectedUser((prev) => ({
                            ...prev!,
                            profile_picture_base64: event.target
                              ?.result as string,
                          }));
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="hidden"
                  />
                  <Label
                    htmlFor="profile_picture"
                    className="cursor-pointer px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md"
                  >
                    {selectedUser.profile_picture ||
                    selectedUser.profile_picture_base64
                      ? "Change Photo"
                      : "Upload Photo"}
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
                    value={selectedUser.first_name}
                    onChange={handleChange}
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
                    className="w-full p-3.5 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 text-base"
                    placeholder="Doe"
                    value={selectedUser.last_name}
                    onChange={handleChange}
                  />
                  {formErrors.last_name && (
                    <p className="text-red-500 text-sm">
                      {formErrors.last_name}
                    </p>
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
                  value={selectedUser.email}
                  onChange={handleChange}
                />
                {formErrors.email && (
                  <p className="text-red-500 text-sm">{formErrors.email}</p>
                )}
              </div>
              <PhoneNumberInput
                value={selectedUser.phone_number || ""}
                onChange={(value) =>
                  setSelectedUser((prev) => ({
                    ...prev!,
                    phone_number: value || "",
                  }))
                }
                error={formErrors.phone_number}
                id="phone_number"
                required={false}
                autoComplete="tel"
              />

              <div className="space-y-2">
                <Label htmlFor="role" className="text-base">
                  Role *
                </Label>
                <select
                  id="role"
                  name="role"
                  value={selectedUser.role}
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
                {formErrors.role && (
                  <p className="text-red-500 text-sm">{formErrors.role}</p>
                )}
              </div>

              {/* School District Dropdown for District Admin */}
              {selectedUser.role === "district_admin" && (
                <div className="space-y-2">
                  <Label htmlFor="school_district" className="text-base">
                    School District
                  </Label>
                  <select
                    id="school_district"
                    name="school_district"
                    value={selectedUser.school_district || ""}
                    onChange={handleChange}
                    className="h-11 w-full appearance-none rounded-lg border-2 border-gray-300 bg-transparent px-4 py-2.5 pr-11 text-sm shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                  >
                    <option value="">Select a district</option>
                    {schoolDistrictOptions.map((district) => (
                      <option key={district} value={district}>
                        {district}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {(selectedUser.role === "school_head" ||
                selectedUser.role === "school_admin") && (
                <SchoolSelect
                  value={selectedUser.school}
                  onChange={(schoolId: number | null) => {
                    setSelectedUser((prev) => ({
                      ...prev!,
                      school:
                        schoolId === null
                          ? null
                          : schools.find(
                              (s) => Number(s.schoolId) === Number(schoolId)
                            ) || null,
                    }));
                  }}
                  required
                  error={formErrors.school}
                />
              )}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-base">
                  New Password (leave blank to keep current)
                </Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    name="password"
                    className="w-full p-3.5 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 text-base"
                    placeholder="••••••••"
                    value={selectedUser.password || ""}
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
                {formErrors.password && (
                  <p className="text-red-500 text-sm">{formErrors.password}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm_password" className="text-base">
                  Confirm New Password
                </Label>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    id="confirm_password"
                    name="confirm_password"
                    className="w-full p-3.5 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 text-base"
                    placeholder="••••••••"
                    value={selectedUser.confirm_password || ""}
                    onChange={handleChange}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                    aria-label={
                      showConfirmPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showConfirmPassword ? (
                      <EyeClosedIcon className="h-5 w-5 text-gray-400" />
                    ) : (
                      <EyeIcon className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
                {formErrors.confirm_password && (
                  <p className="text-red-500 text-sm">
                    {formErrors.confirm_password}
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
                    value={selectedUser.date_of_birth || ""}
                    onChange={handleChange}
                    max={new Date().toISOString().split("T")[0]}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                    <CalenderIcon className="size-5" />
                  </span>
                </div>
                {formErrors.date_of_birth && (
                  <p className="text-red-500 text-sm">
                    {formErrors.date_of_birth}
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    setSelectedUser(null);
                    setFormErrors({});
                    setProfilePictureFile(null);
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
      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent className="w-full rounded-lg bg-white dark:bg-gray-800 p-8 shadow-xl">
          <DialogHeader className="mb-8">
            <DialogTitle className="text-3xl font-bold text-gray-800 dark:text-white">
              Confirm Changes
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
              Are you sure you want to update this user's information?
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

      {/* View User Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="w-full rounded-lg bg-white dark:bg-gray-800 p-8 shadow-xl max-w-2xl">
          <DialogHeader className="mb-6">
            <div className="flex items-center gap-4">
              {userToView?.profile_picture ? (
                <img
                  src={`http://127.0.0.1:8000${userToView.profile_picture}`}
                  className="w-16 h-16 rounded-full object-cover border-2 border-gray-200 dark:border-gray-600"
                  alt="Profile"
                />
              ) : (
                <div
                  className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold ${getAvatarColor(
                    userToView?.id || 0,
                    userToView?.first_name || "",
                    userToView?.last_name || ""
                  )}`}
                >
                  {getUserInitials(
                    userToView?.first_name || "",
                    userToView?.last_name || ""
                  )}
                </div>
              )}
              <div>
                <DialogTitle className="text-2xl font-bold text-gray-800 dark:text-white">
                  {userToView?.first_name} {userToView?.last_name}
                </DialogTitle>
                <DialogDescription className="text-gray-600 dark:text-gray-400">
                  {roleMap[userToView?.role || ""]}{" "}
                  {userToView?.school &&
                    `• ${getSchoolName(userToView.school)}`}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {userToView && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white border-b pb-2">
                    Basic Information
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Email
                      </Label>
                      <p className="text-gray-800 dark:text-gray-200 mt-1">
                        {userToView.email}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Phone
                      </Label>
                      <p className="text-gray-800 dark:text-gray-200 mt-1">
                        {userToView.phone_number || "Not provided"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Additional Details */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white border-b pb-2">
                    Additional Details
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Role
                      </Label>
                      <p className="text-gray-800 dark:text-gray-200 mt-1">
                        {roleMap[userToView.role]}
                      </p>
                    </div>
                    {userToView.school && (
                      <div>
                        <Label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          School
                        </Label>
                        <p className="text-gray-800 dark:text-gray-200 mt-1">
                          {getSchoolName(userToView.school)}
                        </p>
                      </div>
                    )}
                    <div>
                      <Label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Date of Birth
                      </Label>
                      <p className="text-gray-800 dark:text-gray-200 mt-1">
                        {userToView.date_of_birth
                          ? new Date(
                              userToView.date_of_birth
                            ).toLocaleDateString()
                          : "Not provided"}
                        {userToView.date_of_birth && (
                          <span className="text-gray-500 dark:text-gray-400 text-sm ml-2">
                            ({calculateAge(userToView.date_of_birth)} years old)
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <Label className="text-sm font-medium text-gray-500 dark:text-gray-400 leading-none">
                        Status
                      </Label>
                      <Badge color={userToView.is_active ? "success" : "error"}>
                        {userToView.is_active ? "Active" : "Archived"}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              {/* Account Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white border-b pb-2">
                  Account Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Date Joined
                    </Label>
                    <p className="text-gray-800 dark:text-gray-200 mt-1">
                      {new Date(userToView.date_joined).toLocaleString()}
                    </p>
                  </div>
                  {/* <div>
                    <Label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Last Login
                    </Label>
                    <p className="text-gray-800 dark:text-gray-200 mt-1">
                      {userToView.last_login
                        ? new Date(userToView.last_login).toLocaleString()
                        : "Never logged in"}
                    </p>
                  </div> */}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsViewDialogOpen(false)}
                >
                  Close
                </Button>
                {/* <Button
                  type="button"
                  variant="primary"
                  onClick={() => {
                    setIsViewDialogOpen(false);
                    handleEditUser(userToView);
                  }}
                >
                  Edit User
                </Button> */}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="w-full rounded-lg bg-white dark:bg-gray-800 p-8 shadow-xl">
          <DialogHeader className="mb-8">
            <DialogTitle className="text-3xl font-bold text-gray-800 dark:text-white">
              Delete User
            </DialogTitle>
          </DialogHeader>

          {userToDelete && (
            <div className="space-y-4">
              <p className="text-gray-600 dark:text-gray-400">
                Are you sure you want to permanently delete user{" "}
                <strong>
                  {userToDelete.first_name} {userToDelete.last_name}
                </strong>
                ? This action cannot be undone.
              </p>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDeleteDialogOpen(false);
                    setUserToDelete(null);
                  }}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="error"
                  onClick={handleDeleteConfirm}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="animate-spin size-4" />
                      Deleting...
                    </span>
                  ) : (
                    "Delete"
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Archive Confirmation Dialog */}
      <Dialog open={isArchiveDialogOpen} onOpenChange={setIsArchiveDialogOpen}>
        <DialogContent className="w-full rounded-lg bg-white dark:bg-gray-800 p-8 shadow-xl">
          <DialogHeader className="mb-8">
            <DialogTitle className="text-3xl font-bold text-gray-800 dark:text-white">
              {userToArchive?.is_active ? "Archive User" : "Restore User"}
            </DialogTitle>
          </DialogHeader>

          {userToArchive && (
            <div className="space-y-4">
              <p className="text-gray-600 dark:text-gray-400">
                Are you sure you want to{" "}
                {userToArchive.is_active ? "archive" : "restore"} user{" "}
                <strong>
                  {userToArchive.first_name} {userToArchive.last_name}
                </strong>
                ?{" "}
                {userToArchive.is_active
                  ? "Archived users will not be able to log in."
                  : "Restored users will regain access to the system."}
              </p>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsArchiveDialogOpen(false);
                    setUserToArchive(null);
                  }}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  color={userToArchive.is_active ? "warning" : "success"}
                  onClick={handleArchiveConfirm}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="animate-spin size-4" />
                      {userToArchive.is_active
                        ? "Archiving..."
                        : "Restoring..."}
                    </span>
                  ) : userToArchive.is_active ? (
                    "Archive"
                  ) : (
                    "Restore"
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk Archive Confirmation Dialog */}
      <Dialog
        open={isBulkArchiveDialogOpen}
        onOpenChange={setIsBulkArchiveDialogOpen}
      >
        <DialogContent className="w-full rounded-lg bg-white dark:bg-gray-800 p-8 shadow-xl">
          <DialogHeader className="mb-8">
            <DialogTitle className="text-3xl font-bold text-gray-800 dark:text-white">
              {showArchived ? "Restore Users" : "Archive Users"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
              Are you sure you want to {showArchived ? "restore" : "archive"}{" "}
              {selectedUsers.length} selected user
              {selectedUsers.length > 1 ? "s" : ""}?{" "}
              {showArchived
                ? "Restored users will regain access to the system."
                : "Archived users will not be able to log in."}
            </p>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsBulkArchiveDialogOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                color={showArchived ? "success" : "warning"}
                onClick={() => handleBulkArchive(!showArchived)}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="animate-spin size-4" />
                    {showArchived ? "Restoring..." : "Archiving..."}
                  </span>
                ) : showArchived ? (
                  "Restore Users"
                ) : (
                  "Archive Users"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
