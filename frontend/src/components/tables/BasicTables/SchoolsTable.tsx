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
  AlertTriangle,
  RefreshCw,
  Loader2Icon,
} from "lucide-react";
import Button from "@/components/ui/button/Button";
import { useEffect, useMemo, useRef, useState } from "react";
import api from "@/api/axios";
import SkeletonRow from "@/components/ui/skeleton";
import {
  laUnionMunicipalities,
  municipalityDistricts,
  firstDistrictMunicipalities,
} from "@/lib/constants";
import { School } from "@/lib/types";

interface SchoolsTableProps {
  schools: School[];
  setSchools: React.Dispatch<React.SetStateAction<any[]>>;
  sortedSchools: School[];
  filterOptions: any;
  setFilterOptions: React.Dispatch<React.SetStateAction<any>>;
  showArchived: boolean;
  setShowArchived: React.Dispatch<React.SetStateAction<boolean>>;
  onRequestSort: (key: string) => void;
  currentSort: { key: string; direction: "asc" | "desc" } | null;
  fetchSchools: () => Promise<void>;
  loading?: boolean;
  error?: Error | null;
}

export default function SchoolsTable({
  setSchools,
  showArchived,
  setShowArchived,
  fetchSchools,
  sortedSchools,
  filterOptions,
  setFilterOptions,
  onRequestSort,
  currentSort,
  loading,
  error,
}: SchoolsTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const [selectedSchools, setSelectedSchools] = useState<number[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Dialogs and form state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false);
  const [isBulkArchiveDialogOpen, setIsBulkArchiveDialogOpen] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [schoolToDelete, setSchoolToDelete] = useState<School | null>(null);
  const [schoolToView, setSchoolToView] = useState<School | null>(null);
  const [schoolToArchive, setSchoolToArchive] = useState<School | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  const requiredFields = [
    "schoolId",
    "schoolName",
    "district",
    "municipality",
    "legislativeDistrict",
  ];

  const isFormValid = useMemo(() => {
    if (!selectedSchool) return false;
    const requiredValid = requiredFields.every(
      (field) => selectedSchool[field as keyof School]?.toString().trim() !== ""
    );
    const noErrors = Object.keys(formErrors).length === 0;
    return requiredValid && noErrors;
  }, [selectedSchool, formErrors]);

  useEffect(() => {
    setSelectedSchools([]);
    setSelectAll(false);
  }, [showArchived]);
  // Debounce searchTerm -> filterOptions.searchTerm
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setFilterOptions((prev: any) => ({
        ...prev,
        searchTerm,
      }));
    }, 400); // 400ms debounce
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchTerm, setFilterOptions]);

  const totalPages = Math.ceil(sortedSchools.length / itemsPerPage);
  const currentItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedSchools.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedSchools, currentPage, itemsPerPage]);

  // Bulk selection handlers
  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedSchools([]);
    } else {
      setSelectedSchools(currentItems.map((school) => Number(school.schoolId))); // FIXED
    }
    setSelectAll(!selectAll);
  };

  const toggleSelectSchool = (schoolId: string | number) => {
    const idNum = typeof schoolId === "number" ? schoolId : Number(schoolId);
    setSelectedSchools((prev) =>
      prev.includes(idNum)
        ? prev.filter((id) => id !== idNum)
        : [...prev, idNum]
    );
  };

  const isSelected = (schoolId: string | number) => {
    const idNum = typeof schoolId === "number" ? schoolId : Number(schoolId);
    return selectedSchools.includes(idNum);
  };

  // Bulk actions
  const handleBulkArchive = async (archive: boolean) => {
    if (selectedSchools.length === 0) return;
    setIsSubmitting(true);

    try {
      await Promise.all(
        selectedSchools.map((schoolId) =>
          api.patch(`http://127.0.0.1:8000/api/schools/${schoolId}/`, {
            is_active: !archive,
          })
        )
      );

      toast.success(
        `${selectedSchools.length} school${
          selectedSchools.length > 1 ? "s" : ""
        } ${archive ? "archived" : "restored"} successfully!`
      );

      await fetchSchools();
      setSelectedSchools([]);
      setSelectAll(false);
    } catch (error) {
      toast.error(
        `Failed to ${
          archive ? "archive" : "restore"
        } schools. Please try again.`
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

  const handleEditSchool = (school: School) => {
    setSelectedSchool({ ...school });
    setFormErrors({});
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (school: School) => {
    setSchoolToDelete(school);
    setIsDeleteDialogOpen(true);
  };

  const handleViewSchool = (school: School) => {
    setSchoolToView(school);
    setIsViewDialogOpen(true);
  };

  const handleArchiveClick = (school: School) => {
    setSchoolToArchive(school);
    setIsArchiveDialogOpen(true);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    if (!selectedSchool) return;
    const { name, value } = e.target;

    setSelectedSchool((prev) => ({
      ...prev!,
      [name]: value,
    }));

    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    debounceTimeout.current = setTimeout(() => {
      const newErrors = { ...formErrors };
      if (requiredFields.includes(name) && !value.trim()) {
        newErrors[name] = "This field is required";
      } else {
        delete newErrors[name];
      }
      setFormErrors(newErrors);
    }, 300);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedSchool) return;

    if (!isFormValid) {
      toast.error("Please fix the errors in the form");
      return;
    }

    setIsConfirmDialogOpen(true);
  };

  const handleConfirmedEdit = async () => {
    if (!selectedSchool) return;
    setIsSubmitting(true);

    try {
      console.log("Updating school:", selectedSchool);
      await api.put(
        `http://127.0.0.1:8000/api/schools/${selectedSchool.schoolId}/`,
        selectedSchool,
        {
          headers: { "Content-Type": "application/json" },
        }
      );

      toast.success("School updated successfully!");
      await fetchSchools();
      setIsDialogOpen(false);
      setIsConfirmDialogOpen(false);
    } catch (error) {
      let errorMessage = "Failed to update school. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!schoolToDelete) return;
    setIsSubmitting(true);

    try {
      await api.delete(
        `http://127.0.0.1:8000/api/schools/${schoolToDelete.schoolId}/`
      );
      toast.success("School deleted successfully!");
      await fetchSchools();
    } catch (error) {
      toast.error("Failed to delete school");
    } finally {
      setIsSubmitting(false);
      setIsDeleteDialogOpen(false);
      setSchoolToDelete(null);
    }
  };

  const handleArchiveConfirm = async () => {
    if (!schoolToArchive) return;
    setIsSubmitting(true);

    try {
      const newStatus = !schoolToArchive.is_active;
      await api.patch(
        `http://127.0.0.1:8000/api/schools/${schoolToArchive.schoolId}/`,
        {
          is_active: newStatus,
        }
      );

      toast.success(
        `School ${newStatus ? "restored" : "archived"} successfully!`
      );

      await fetchSchools();
    } catch (error) {
      toast.error(
        `Failed to ${schoolToArchive.is_active ? "archive" : "restore"} school`
      );
    } finally {
      setIsSubmitting(false);
      setIsArchiveDialogOpen(false);
      setSchoolToArchive(null);
    }
  };

  const handleFilterChange = (name: string, value: string) => {
    setFilterOptions((prev: any) => ({
      ...prev,
      [name]: value,
    }));
  };

  const resetFilters = () => {
    setFilterOptions({
      searchTerm: "",
      district: "",
      municipality: "",
    });
    setSearchTerm("");
  };

  const [districtOptions, setDistrictOptions] = useState<string[]>([]);
  const [autoLegislativeDistrict, setAutoLegislativeDistrict] = useState("");

  useEffect(() => {
    if (!isDialogOpen || !selectedSchool) return;
    const mun = selectedSchool.municipality;
    if (mun) {
      setDistrictOptions(municipalityDistricts[mun] || []);
      if (firstDistrictMunicipalities.includes(mun)) {
        setAutoLegislativeDistrict("1st District");
      } else {
        setAutoLegislativeDistrict("2nd District");
      }
      // If the current district is not in the new options, reset it
      if (!municipalityDistricts[mun]?.includes(selectedSchool.district)) {
        setSelectedSchool((prev) => prev && { ...prev, district: "" });
      }
      // Always sync legislativeDistrict
      setSelectedSchool((prev) =>
        prev
          ? {
              ...prev,
              legislativeDistrict: firstDistrictMunicipalities.includes(mun)
                ? "1st District"
                : "2nd District",
            }
          : prev
      );
    } else {
      setDistrictOptions([]);
      setAutoLegislativeDistrict("");
      setSelectedSchool((prev) =>
        prev ? { ...prev, district: "", legislativeDistrict: "" } : prev
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSchool?.municipality, isDialogOpen]);

  return (
    <div className="space-y-4">
      {/* Filters and Search */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-64">
            <Input
              type="text"
              placeholder="Search schools..."
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
              startIcon={<Loader2 className="size-4" />}
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
            {selectedSchools.length > 0 && (
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
                    : `${selectedSchools.length} Selected`}
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
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border border-gray-200 rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
            <div className="space-y-2">
              <Label htmlFor="district-filter" className="text-sm font-medium">
                District
              </Label>
              <Input
                id="district-filter"
                value={filterOptions.district || ""}
                onChange={(e) => handleFilterChange("district", e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="municipality-filter"
                className="text-sm font-medium"
              >
                Municipality
              </Label>
              <Input
                id="municipality-filter"
                value={filterOptions.municipality || ""}
                onChange={(e) =>
                  handleFilterChange("municipality", e.target.value)
                }
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            <div className="md:col-span-3 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={resetFilters}
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
                    className="flex items-center gap-1 cursor-pointer"
                    onClick={() => onRequestSort("schoolId")}
                  >
                    School ID
                    <span className="inline-flex flex-col ml-1">
                      <ChevronUp
                        className={`h-3 w-3 transition-colors ${
                          currentSort?.key === "schoolId" &&
                          currentSort.direction === "asc"
                            ? "text-primary-500 dark:text-primary-400"
                            : "text-gray-400 dark:text-gray-500"
                        }`}
                      />
                      <ChevronDown
                        className={`h-3 w-3 -mt-1 transition-colors ${
                          currentSort?.key === "schoolId" &&
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
                    className="flex items-center gap-1 cursor-pointer"
                    onClick={() => onRequestSort("schoolName")}
                  >
                    School Name
                    <span className="inline-flex flex-col ml-1">
                      <ChevronUp
                        className={`h-3 w-3 transition-colors ${
                          currentSort?.key === "schoolName" &&
                          currentSort.direction === "asc"
                            ? "text-primary-500 dark:text-primary-400"
                            : "text-gray-400 dark:text-gray-500"
                        }`}
                      />
                      <ChevronDown
                        className={`h-3 w-3 -mt-1 transition-colors ${
                          currentSort?.key === "schoolName" &&
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
                    className="flex items-center gap-1 cursor-pointer"
                    onClick={() => onRequestSort("district")}
                  >
                    District
                    <span className="inline-flex flex-col ml-1">
                      <ChevronUp
                        className={`h-3 w-3 transition-colors ${
                          currentSort?.key === "district" &&
                          currentSort.direction === "asc"
                            ? "text-primary-500 dark:text-primary-400"
                            : "text-gray-400 dark:text-gray-500"
                        }`}
                      />
                      <ChevronDown
                        className={`h-3 w-3 -mt-1 transition-colors ${
                          currentSort?.key === "district" &&
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
                    className="flex items-center gap-1 cursor-pointer"
                    onClick={() => onRequestSort("municipality")}
                  >
                    Municipality
                    <span className="inline-flex flex-col ml-1">
                      <ChevronUp
                        className={`h-3 w-3 transition-colors ${
                          currentSort?.key === "municipality" &&
                          currentSort.direction === "asc"
                            ? "text-primary-500 dark:text-primary-400"
                            : "text-gray-400 dark:text-gray-500"
                        }`}
                      />
                      <ChevronDown
                        className={`h-3 w-3 -mt-1 transition-colors ${
                          currentSort?.key === "municipality" &&
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
                    className="flex items-center gap-1 cursor-pointer"
                    onClick={() => onRequestSort("legislativeDistrict")}
                  >
                    Legislative District
                    <span className="inline-flex flex-col ml-1">
                      <ChevronUp
                        className={`h-3 w-3 transition-colors ${
                          currentSort?.key === "legislativeDistrict" &&
                          currentSort.direction === "asc"
                            ? "text-primary-500 dark:text-primary-400"
                            : "text-gray-400 dark:text-gray-500"
                        }`}
                      />
                      <ChevronDown
                        className={`h-3 w-3 -mt-1 transition-colors ${
                          currentSort?.key === "legislativeDistrict" &&
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
                  <TableCell colSpan={8} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertTriangle className="h-8 w-8 text-red-500" />
                      <span className="text-red-500">
                        Failed to load schools: {error.message}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchSchools()}
                        startIcon={<RefreshCw className="h-4 w-4" />}
                      >
                        Retry
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : currentItems.length > 0 ? (
                currentItems.map((school) => (
                  <TableRow
                    key={school.schoolId}
                    className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={() => handleViewSchool(school)}
                  >
                    <TableCell className="px-6 whitespace-nowrap py-4 sm:px-6 text-start">
                      <input
                        type="checkbox"
                        checked={isSelected(school.schoolId)}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleSelectSchool(school.schoolId);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                    </TableCell>
                    <TableCell className="px-6 whitespace-nowrap py-4 sm:px-6 text-start">
                      <div className="flex items-center gap-3">
                        <span className="block font-medium text-gray-800 text-theme-sm dark:text-gray-400">
                          {school.schoolId}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 whitespace-nowrap py-4 text-gray-800 text-start text-theme-sm dark:text-gray-400">
                      {school.schoolName}
                    </TableCell>
                    <TableCell className="px-6 whitespace-nowrap py-4 text-gray-800 text-start text-theme-sm dark:text-gray-400">
                      {school.district}
                    </TableCell>
                    <TableCell className="px-6 whitespace-nowrap py-4 text-gray-800 text-start text-theme-sm dark:text-gray-400">
                      {school.municipality}
                    </TableCell>
                    <TableCell className="px-6 whitespace-nowrap py-4 text-gray-800 text-start text-theme-sm dark:text-gray-400">
                      {school.legislativeDistrict}
                    </TableCell>
                    <TableCell className="px-6 whitespace-nowrap py-4 text-gray-800 text-start text-theme-sm dark:text-gray-400">
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                          school.is_active !== false
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {school.is_active !== false ? "Active" : "Archived"}
                      </span>
                    </TableCell>
                    <TableCell className="px-6 whitespace-nowrap py-4 sm:px-6 text-start">
                      <div className="flex justify-start space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditSchool(school);
                          }}
                          className="text-gray-600 hover:text-gray-900"
                          title="Edit School"
                        >
                          <SquarePenIcon />
                        </button>
                        {/* <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleArchiveClick(school);
                          }}
                          className="text-gray-600 hover:text-gray-900"
                          title={
                            school.is_active !== false
                              ? "Archive School"
                              : "Restore School"
                          }
                        >
                          {school.is_active !== false ? (
                            <ArchiveIcon />
                          ) : (
                            <ArchiveRestoreIcon />
                          )}
                        </button> */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(school);
                          }}
                          className="text-gray-600 hover:text-red-600"
                          title="Delete School"
                        >
                          <X />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    className="py-8 text-center text-gray-500"
                    colSpan={8}
                  >
                    No {showArchived ? "archived" : "active"} schools found
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
          to {Math.min(currentPage * itemsPerPage, sortedSchools.length)} of{" "}
          {sortedSchools.length} entries
          {selectedSchools.length > 0 && (
            <span className="ml-2">({selectedSchools.length} selected)</span>
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
      {/* Edit School Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="w-full rounded-lg bg-white dark:bg-gray-800 p-8 shadow-xl max-h-[90vh] overflow-y-auto custom-scrollbar [&>button]:hidden">
          <DialogHeader className="mb-8">
            <DialogTitle className="text-3xl font-bold text-gray-800 dark:text-white">
              Edit School
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              Update the school details below
            </DialogDescription>
          </DialogHeader>
          {selectedSchool && (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="schoolId" className="text-base">
                  School ID *
                </Label>
                <Input
                  type="text"
                  id="schoolId"
                  name="schoolId"
                  className="w-full p-3.5 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 text-base"
                  placeholder="School ID"
                  value={selectedSchool.schoolId}
                  onChange={handleChange}
                  disabled
                />
                {formErrors.schoolId && (
                  <p className="text-red-500 text-sm">{formErrors.schoolId}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="schoolName" className="text-base">
                  School Name *
                </Label>
                <Input
                  type="text"
                  id="schoolName"
                  name="schoolName"
                  className="w-full p-3.5 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 text-base"
                  placeholder="School Name"
                  value={selectedSchool.schoolName}
                  onChange={handleChange}
                />
                {formErrors.schoolName && (
                  <p className="text-red-500 text-sm">
                    {formErrors.schoolName}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="municipality" className="text-base">
                  Municipality *
                </Label>
                <select
                  id="municipality"
                  name="municipality"
                  className="h-11 w-full appearance-none rounded-lg border-2 border-gray-300 bg-transparent px-4 py-2.5 pr-11 text-sm shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                  value={selectedSchool.municipality}
                  onChange={handleChange}
                >
                  <option value="">Select Municipality</option>
                  {laUnionMunicipalities.map((mun) => (
                    <option key={mun} value={mun}>
                      {mun}
                    </option>
                  ))}
                </select>
                {formErrors.municipality && (
                  <p className="text-red-500 text-sm">
                    {formErrors.municipality}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="district" className="text-base">
                  District *
                </Label>
                <select
                  id="district"
                  name="district"
                  className="h-11 w-full appearance-none rounded-lg border-2 border-gray-300 bg-transparent px-4 py-2.5 pr-11 text-sm shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 text-gray-800"
                  value={selectedSchool.district}
                  onChange={handleChange}
                  disabled={!selectedSchool.municipality}
                >
                  <option value="">Select District</option>
                  {districtOptions.map((district) => (
                    <option key={district} value={district}>
                      {district}
                    </option>
                  ))}
                </select>
                {formErrors.district && (
                  <p className="text-red-500 text-sm">{formErrors.district}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="legislativeDistrict" className="text-base">
                  Legislative District *
                </Label>
                <Input
                  type="text"
                  id="legislativeDistrict"
                  name="legislativeDistrict"
                  className="w-full p-3.5 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 text-base"
                  placeholder="Legislative District"
                  value={autoLegislativeDistrict}
                  disabled
                />
                {formErrors.legislativeDistrict && (
                  <p className="text-red-500 text-sm">
                    {formErrors.legislativeDistrict}
                  </p>
                )}
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    setSelectedSchool(null);
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
              Are you sure you want to update this school's information?
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
      {/* View School Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="w-full rounded-lg bg-white dark:bg-gray-800 p-8 shadow-xl max-w-2xl">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-2xl font-bold text-gray-800 dark:text-white">
              {schoolToView?.schoolName}
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              School ID: {schoolToView?.schoolId}
            </DialogDescription>
          </DialogHeader>
          {schoolToView && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    District
                  </Label>
                  <p className="text-gray-800 dark:text-gray-200 mt-1">
                    {schoolToView.district}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Municipality
                  </Label>
                  <p className="text-gray-800 dark:text-gray-200 mt-1">
                    {schoolToView.municipality}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Legislative District
                  </Label>
                  <p className="text-gray-800 dark:text-gray-200 mt-1">
                    {schoolToView.legislativeDistrict}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Status
                  </Label>
                  <span
                    className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                      schoolToView.is_active !== false
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {schoolToView.is_active !== false ? "Active" : "Archived"}
                  </span>
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
              Delete School
            </DialogTitle>
          </DialogHeader>
          {schoolToDelete && (
            <div className="space-y-4">
              <p className="text-gray-600 dark:text-gray-400">
                Are you sure you want to permanently delete school{" "}
                <strong>{schoolToDelete.schoolName}</strong>? This action cannot
                be undone.
              </p>
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDeleteDialogOpen(false);
                    setSchoolToDelete(null);
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
              {schoolToArchive?.is_active !== false
                ? "Archive School"
                : "Restore School"}
            </DialogTitle>
          </DialogHeader>
          {schoolToArchive && (
            <div className="space-y-4">
              <p className="text-gray-600 dark:text-gray-400">
                Are you sure you want to{" "}
                {schoolToArchive.is_active !== false ? "archive" : "restore"}{" "}
                school <strong>{schoolToArchive.schoolName}</strong>?{" "}
                {schoolToArchive.is_active !== false
                  ? "Archived schools will not be available for selection."
                  : "Restored schools will be available for selection."}
              </p>
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsArchiveDialogOpen(false);
                    setSchoolToArchive(null);
                  }}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  color={
                    schoolToArchive.is_active !== false ? "warning" : "success"
                  }
                  onClick={handleArchiveConfirm}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="animate-spin size-4" />
                      {schoolToArchive.is_active !== false
                        ? "Archiving..."
                        : "Restoring..."}
                    </span>
                  ) : schoolToArchive.is_active !== false ? (
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
              {showArchived ? "Restore Schools" : "Archive Schools"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
              Are you sure you want to {showArchived ? "restore" : "archive"}{" "}
              {selectedSchools.length} selected school
              {selectedSchools.length > 1 ? "s" : ""}?{" "}
              {showArchived
                ? "Restored schools will be available for selection."
                : "Archived schools will not be available for selection."}
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
                  "Restore Schools"
                ) : (
                  "Archive Schools"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
