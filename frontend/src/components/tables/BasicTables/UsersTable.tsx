import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../ui/table";
import { Loading } from "@/components/common/Loading";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Bounce, ToastContainer, toast } from "react-toastify";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import { cn } from "@/lib/utils";
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
  ArchiveIcon,
  ArchiveRestoreIcon,
  SquarePenIcon,
  Filter,
  SlidersHorizontal,
  Check,
  EyeClosedIcon,
  User as UserIcon,
} from "lucide-react";
import { CalenderIcon } from "@/icons";
import { User } from "@/lib/types";
import Button from "@/components/ui/button/Button";
import axios from "axios";
import Badge from "@/components/ui/badge/Badge";
import { useAuth } from "@/context/AuthContext";
import { calculateAge } from "@/lib/helpers";
import { useEffect, useMemo, useRef, useState } from "react";

type SortDirection = "asc" | "desc" | null;
type SortableField = keyof Pick<
  User,
  | "id"
  | "first_name"
  | "last_name"
  | "username"
  | "email"
  | "phone_number"
  | "password"
  | "is_active"
  | "date_joined"
>;

interface UsersTableProps {
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<any[]>>;
}

interface FormErrors {
  first_name?: string;
  last_name?: string;
  username?: string;
  email?: string;
  password?: string;
  confirm_password?: string;
  phone_number?: string;
}

interface FilterOptions {
  status: string;
  dateRange: {
    start: string;
    end: string;
  };
  searchTerm: string;
}

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

export default function UsersTable({ users, setUsers }: UsersTableProps) {
  const { user: currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [sortConfig, setSortConfig] = useState<{
    key: SortableField;
    direction: SortDirection;
  } | null>({
    key: "date_joined",
    direction: "desc",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    status: "all",
    dateRange: {
      start: "",
      end: "",
    },
    searchTerm: "",
  });

  // Form state
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

  const requiredFields = ["first_name", "last_name", "username", "email"];

  const isFormValid = useMemo(() => {
    if (!selectedUser) return false;
    return (
      requiredFields.every(
        (field) => selectedUser[field as keyof User]?.toString().trim() !== ""
      ) && Object.keys(formErrors).length === 0
    );
  }, [selectedUser, formErrors]);

  const roleMap: Record<string, string> = {
    admin: "Administrator",
    school_head: "School Head",
    school_admin: "School Admin",
    district_admin: "District Admin",
    superintendent: "Superintendent",
    liquidator: "Liquidator",
    accountant: "Accountant",
  };

  // Fetch users with archive filter
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await axios.get("http://127.0.0.1:8000/api/users/", {
        params: {
          archived: showArchived,
        },
      });
      setUsers(response.data);
      console.log(response.data);
      setFilteredUsers(response.data);
      setSortConfig({ key: "date_joined", direction: "desc" });
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [showArchived]);

  // Apply filters whenever filterOptions or users change
  useEffect(() => {
    const filtered = users.filter((user) => {
      // Exclude current user
      if (user.id === currentUser?.user_id) return false;

      // Apply status filter
      if (filterOptions.status === "active" && !user.is_active) return false;
      if (filterOptions.status === "archived" && user.is_active) return false;

      // Apply date range filter
      if (filterOptions.dateRange.start || filterOptions.dateRange.end) {
        const userDate = new Date(user.date_joined);
        const startDate = filterOptions.dateRange.start
          ? new Date(filterOptions.dateRange.start)
          : null;
        const endDate = filterOptions.dateRange.end
          ? new Date(filterOptions.dateRange.end)
          : null;

        if (startDate && userDate < startDate) return false;
        if (endDate && userDate > endDate) return false;
      }

      // Apply search term filter
      if (filterOptions.searchTerm) {
        const term = filterOptions.searchTerm.toLowerCase();
        return (
          user.first_name.toLowerCase().includes(term) ||
          user.last_name.toLowerCase().includes(term) ||
          user.username.toLowerCase().includes(term) ||
          user.email.toLowerCase().includes(term) ||
          (user.phone_number && user.phone_number.includes(term))
        );
      }

      return true;
    });

    setFilteredUsers(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [users, filterOptions, currentUser?.user_id]);

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
        case "phone_number":
          if (value && !validatePhoneNumber(value)) {
            newErrors.phone_number = "Please enter a valid phone number";
          } else {
            delete newErrors.phone_number;
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
    // Reset selected users when switching between active/archived views
    setSelectedUsers([]);
    setSelectAll(false);
  }, [showArchived]);
  const handlePhoneNumberInput = (e: React.FormEvent<HTMLInputElement>) => {
    const input = e.target as HTMLInputElement;
    input.value = input.value.replace(/[^0-9+]/g, "");
  };

  // Sort users
  const sortedUsers = useMemo(() => {
    if (sortConfig !== null) {
      return [...filteredUsers].sort((a, b) => {
        if (sortConfig.key === "date_joined") {
          const aDate = new Date(a.date_joined).getTime();
          const bDate = new Date(b.date_joined).getTime();
          return sortConfig.direction === "asc" ? aDate - bDate : bDate - aDate;
        }

        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }
    return filteredUsers;
  }, [filteredUsers, sortConfig]);

  const totalPages = Math.ceil(sortedUsers.length / itemsPerPage);
  const currentItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedUsers.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedUsers, currentPage, itemsPerPage]);

  // Bulk selection handlers
  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(currentItems.map((user) => user.id));
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
          axios.patch(`http://127.0.0.1:8000/api/users/${userId}/`, {
            is_active: !archive,
          })
        )
      );

      toast.success(
        `${selectedUsers.length} user${selectedUsers.length > 1 ? "s" : ""} ${
          archive ? "archived" : "restored"
        } successfully!`,
        {
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
        }
      );

      await fetchUsers();
      setSelectedUsers([]);
      setSelectAll(false);
    } catch (error) {
      toast.error(
        `Failed to ${archive ? "archive" : "restore"} users. Please try again.`,
        {
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
        }
      );
    } finally {
      setIsSubmitting(false);
      setIsBulkArchiveDialogOpen(false);
    }
  };

  const requestSort = (key: SortableField) => {
    let direction: SortDirection = "asc";
    if (sortConfig && sortConfig.key === key) {
      direction = sortConfig.direction === "asc" ? "desc" : null;
    }
    setSortConfig(direction ? { key, direction } : null);
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedUser) return;

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

    setIsConfirmDialogOpen(true);
  };

  const handleConfirmedEdit = async () => {
    if (!selectedUser) return;
    setIsSubmitting(true);

    try {
      const payload = {
        ...selectedUser,
        password: selectedUser.password || undefined,
      };

      await axios.put(
        `http://127.0.0.1:8000/api/users/${selectedUser.id}/`,
        payload
      );

      toast.success("User updated successfully!", {
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

      await fetchUsers();
      setIsDialogOpen(false);
      setIsConfirmDialogOpen(false);
    } catch (error) {
      let errorMessage = "Failed to update user. Please try again.";
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

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;
    setIsSubmitting(true);

    try {
      await axios.delete(`http://127.0.0.1:8000/api/users/${userToDelete.id}/`);
      toast.success("User deleted successfully!", {
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

      await fetchUsers();
    } catch (error) {
      toast.error("Failed to delete user", {
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
      setIsDeleteDialogOpen(false);
      setUserToDelete(null);
    }
  };

  const handleArchiveConfirm = async () => {
    if (!userToArchive) return;
    setIsSubmitting(true);

    try {
      const newStatus = !userToArchive.is_active;
      await axios.patch(
        `http://127.0.0.1:8000/api/users/${userToArchive.id}/`,
        {
          is_active: newStatus,
        }
      );

      toast.success(
        `User ${newStatus ? "restored" : "archived"} successfully!`,
        {
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
        }
      );

      await fetchUsers();
    } catch (error) {
      toast.error(
        `Failed to ${userToArchive.is_active ? "archive" : "restore"} user`,
        {
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
        }
      );
    } finally {
      setIsSubmitting(false);
      setIsArchiveDialogOpen(false);
      setUserToArchive(null);
    }
  };
  const getAvatarColor = (
    userId: number,
    first_name: string,
    last_name: string
  ) => {
    if (!userId) return "bg-gray-500";
    const colors = [
      "bg-blue-500",
      "bg-green-500",
      "bg-purple-500",
      "bg-pink-500",
      "bg-orange-500",
      "bg-indigo-500",
    ];
    let stringId = userId.toString();
    const hash =
      stringId && typeof stringId === "string"
        ? stringId.charCodeAt(0) + stringId.charCodeAt(stringId.length - 1)
        : (typeof first_name === "string" ? first_name.charCodeAt(0) : 0) +
          (typeof last_name === "string" ? last_name.charCodeAt(0) : 0);

    return colors[hash % colors.length];
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
  const getUserInitials = (first_name: string, last_name: string) => {
    if (!first_name || !last_name) return "U";
    const firstNameChar = first_name?.charAt(0) || "";
    const lastNameChar = last_name?.charAt(0) || "";
    return `${firstNameChar}${lastNameChar}`.toUpperCase() || "U";
  };
  const resetFilters = () => {
    setFilterOptions({
      status: "all",
      dateRange: {
        start: "",
        end: "",
      },
      searchTerm: "",
    });
    setSearchTerm("");
    setShowFilters(false);
  };

  if (loading) return <Loading />;
  if (error) {
    return <div className="p-4 text-red-500">Error: {error.message}</div>;
  }

  return (
    <div className="space-y-4">
      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-64">
          <Input
            type="text"
            placeholder="Search users..."
            value={filterOptions.searchTerm}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setSearchTerm(e.target.value);
              handleFilterChange("searchTerm", e.target.value);
            }}
            className="pl-10"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        </div>

        <div className="flex gap-4 w-full md:w-auto">
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
                  showArchived ? (
                    <ArchiveRestore className="size-4" />
                  ) : (
                    <Archive className="size-4" />
                  )
                }
              >
                {selectedUsers.length} Selected
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
                    onClick={() => requestSort("id")}
                  >
                    ID
                    <span className="inline-flex flex-col ml-1">
                      <ChevronUp
                        className={`h-3 w-3 transition-colors ${
                          sortConfig?.key === "id" &&
                          sortConfig.direction === "asc"
                            ? "text-primary-500 dark:text-primary-400"
                            : "text-gray-400 dark:text-gray-500"
                        }`}
                      />
                      <ChevronDown
                        className={`h-3 w-3 -mt-1 transition-colors ${
                          sortConfig?.key === "id" &&
                          sortConfig.direction === "desc"
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
                  Profile
                </TableCell>

                <TableCell
                  isHeader
                  className="px-6 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 uppercase"
                >
                  <div
                    className="flex items-center gap-1 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.05]"
                    onClick={() => requestSort("first_name")}
                  >
                    Name
                    <span className="inline-flex flex-col ml-1">
                      <ChevronUp
                        className={`h-3 w-3 transition-colors ${
                          sortConfig?.key === "first_name" &&
                          sortConfig.direction === "asc"
                            ? "text-primary-500 dark:text-primary-400"
                            : "text-gray-400 dark:text-gray-500"
                        }`}
                      />
                      <ChevronDown
                        className={`h-3 w-3 -mt-1 transition-colors ${
                          sortConfig?.key === "first_name" &&
                          sortConfig.direction === "desc"
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
                  Role
                </TableCell>

                <TableCell
                  isHeader
                  className="px-6 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 uppercase"
                >
                  School
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
              {currentItems.length > 0 ? (
                currentItems.map((user) => (
                  <TableRow
                    key={user.id}
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                    onClick={() => handleViewUser(user)}
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
                      <div className="w-10 h-10 rounded-full overflow-hidden">
                        {user.profile_picture ? (
                          <img
                            src={user.profile_picture}
                            alt="Profile"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="bg-gray-200 w-full h-full flex items-center justify-center">
                            <UserIcon className="w-5 h-5 text-gray-500" />
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="px-6 whitespace-nowrap py-4 sm:px-6 text-start">
                      <div>
                        <span className="block font-medium text-gray-800 text-theme-sm dark:text-gray-400">
                          {user.first_name} {user.last_name}
                        </span>
                        <span className="block text-gray-500 text-theme-xs dark:text-gray-400">
                          {user.email}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 whitespace-nowrap py-4 text-gray-800 text-start text-theme-sm dark:text-gray-400">
                      {roleMap[user.role] || user.role}
                    </TableCell>
                    <TableCell className="px-6 whitespace-nowrap py-4 text-gray-800 text-start text-theme-sm dark:text-gray-400">
                      {user.school || "-"}
                    </TableCell>
                    <TableCell className="px-6 whitespace-nowrap py-4 text-gray-800 text-start text-theme-sm dark:text-gray-400">
                      <Badge color={user.is_active ? "success" : "error"}>
                        {user.is_active ? "Active" : "Archived"}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-6 whitespace-nowrap py-4 text-gray-800 text-start text-theme-sm dark:text-gray-400 space-x-2">
                      <div className="flex justify-start space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditUser(user);
                          }}
                          className="text-gray-600 hover:text-gray-900"
                          title="Edit User"
                        >
                          <SquarePenIcon />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleArchiveClick(user);
                          }}
                          className="text-gray-600 hover:text-gray-900"
                          title={
                            user.is_active ? "Archive User" : "Restore User"
                          }
                        >
                          {user.is_active ? (
                            <ArchiveIcon />
                          ) : (
                            <ArchiveRestoreIcon />
                          )}
                        </button>
                      </div>
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
          Showing{" "}
          {currentItems.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}{" "}
          to {Math.min(currentPage * itemsPerPage, sortedUsers.length)} of{" "}
          {sortedUsers.length} entries
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
        <DialogContent className="w-full rounded-lg bg-white dark:bg-gray-800 p-8 shadow-xl">
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name" className="text-base">
                    First Name *
                  </Label>
                  <Input
                    type="text"
                    id="first_name"
                    name="first_name"
                    value={selectedUser.first_name}
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
                    value={selectedUser.last_name}
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
                  value={selectedUser.username}
                  onChange={handleChange}
                  className={formErrors.username ? "border-red-500" : ""}
                />
                {formErrors.username && (
                  <p className="text-red-500 text-sm">{formErrors.username}</p>
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
                  value={selectedUser.email}
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
                    value={selectedUser.password || ""}
                    onChange={handleChange}
                    className={formErrors.password ? "border-red-500" : ""}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                    onClick={() => setShowPassword(!showPassword)}
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
                <Label htmlFor="date_of_birth" className="text-base">
                  Birthdate
                </Label>
                <div className="relative">
                  <Input
                    type="date"
                    id="date_of_birth"
                    name="date_of_birth"
                    className="[&::-webkit-calendar-picker-indicator]:opacity-0 w-full p-3.5 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 text-base"
                    value={selectedUser?.date_of_birth}
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
                  value={selectedUser.phone_number || ""}
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
                    setSelectedUser(null);
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
        <DialogContent className="w-full rounded-lg bg-white dark:bg-gray-800 p-8 shadow-xl">
          <DialogHeader className="mb-8">
            <DialogTitle className="text-3xl font-bold text-gray-800 dark:text-white">
              User Details
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              Detailed information about the user
            </DialogDescription>
          </DialogHeader>

          {userToView && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-base font-medium">First Name</Label>
                  <p className="text-gray-800 dark:text-gray-200">
                    {userToView.first_name}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-base font-medium">Last Name</Label>
                  <p className="text-gray-800 dark:text-gray-200">
                    {userToView.last_name}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-base font-medium">Username</Label>
                <p className="text-gray-800 dark:text-gray-200">
                  {userToView.username}
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-base font-medium">Email</Label>
                <p className="text-gray-800 dark:text-gray-200">
                  {userToView.email}
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-base font-medium">Phone Number</Label>
                <p className="text-gray-800 dark:text-gray-200">
                  {userToView.phone_number || "Not provided"}
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsViewDialogOpen(false)}
                >
                  Close
                </Button>
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
  );
}
