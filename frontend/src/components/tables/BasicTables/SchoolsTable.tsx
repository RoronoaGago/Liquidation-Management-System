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
  AlertTriangle,
  RefreshCw,
  Loader2Icon,
  Filter,
} from "lucide-react";
import Button from "@/components/ui/button/Button";
import { useEffect, useMemo, useRef, useState } from "react";
import api from "@/api/axios";
import SkeletonRow from "@/components/ui/skeleton";
import { District, School } from "@/lib/types";
import Badge from "@/components/ui/badge/Badge";

interface SchoolsTableProps {
  schools: School[];
  setSchools: React.Dispatch<React.SetStateAction<any[]>>;
  filterOptions: any;
  setFilterOptions: React.Dispatch<React.SetStateAction<any>>;
  showArchived: boolean;
  setShowArchived: React.Dispatch<React.SetStateAction<boolean>>;
  onRequestSort: (key: string) => void;
  currentSort: { key: string; direction: "asc" | "desc" } | null;
  fetchSchools: () => Promise<void>;
  loading?: boolean;
  districts: District[]; // Add this line
  error?: Error | null;
  currentPage: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  itemsPerPage: number;
  setItemsPerPage: React.Dispatch<React.SetStateAction<number>>;
  totalSchools: number;
  ITEMS_PER_PAGE_OPTIONS: number[];
}

export default function SchoolsTable({
  schools,
  showArchived,
  setShowArchived,
  fetchSchools,
  filterOptions,
  setFilterOptions,
  onRequestSort,
  currentSort,
  loading,
  error,
  currentPage,
  setCurrentPage,
  itemsPerPage,
  districts,
  setItemsPerPage,
  totalSchools,
  ITEMS_PER_PAGE_OPTIONS,
}: SchoolsTableProps) {
  const [searchTerm] = useState("");
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const [selectedSchools, setSelectedSchools] = useState<number[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [legislativeDistricts, setLegislativeDistricts] = useState<{
    [key: string]: string[];
  }>({});
  const [legislativeDistrictOptions, setLegislativeDistrictOptions] = useState<
    string[]
  >([]);
  const [municipalityOptions, setMunicipalityOptions] = useState<string[]>([]);

  // Dialogs and form state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false);
  const [schoolToArchive, setSchoolToArchive] = useState<School | null>(null);
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
  const [schoolToView, setSchoolToView] = useState<School | null>(null);
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
    const fetchLegislativeDistricts = async () => {
      try {
        const response = await api.get("/school-districts/");
        const districts = response.data.results || response.data;

        const legislativeDistrictsMap: { [key: string]: string[] } = {};

        districts.forEach((district: District) => {
          if (district.legislativeDistrict) {
            if (!legislativeDistrictsMap[district.legislativeDistrict]) {
              legislativeDistrictsMap[district.legislativeDistrict] = [];
            }
            if (
              district.municipality &&
              !legislativeDistrictsMap[district.legislativeDistrict].includes(
                district.municipality
              )
            ) {
              legislativeDistrictsMap[district.legislativeDistrict].push(
                district.municipality
              );
            }
          }
        });

        setLegislativeDistricts(legislativeDistrictsMap);
        setLegislativeDistrictOptions(Object.keys(legislativeDistrictsMap));
      } catch (error) {
        console.error("Failed to fetch legislative districts:", error);
      }
    };

    fetchLegislativeDistricts();
  }, []);

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

  // Remove local pagination and sorting logic
  // Remove currentItems, totalPages, etc. (use backend values)
  const totalPages = Math.ceil(totalSchools / itemsPerPage);

  // Bulk selection handlers
  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedSchools([]);
    } else {
      setSelectedSchools(schools.map((school) => Number(school.schoolId))); // FIXED
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

  // Archive handler
  // Archive/Restore handler
  const handleArchiveConfirm = async (isCurrentlyActive: boolean) => {
    if (!schoolToArchive) return;
    setIsSubmitting(true);

    try {
      await api.patch(
        `http://127.0.0.1:8000/api/schools/${schoolToArchive.schoolId}/`,
        {
          is_active: !isCurrentlyActive, // Toggle the status
        }
      );

      toast.success(
        `School ${isCurrentlyActive ? "archived" : "restored"} successfully!`
      );

      await fetchSchools();
      setSchoolToArchive(null);
      setIsArchiveDialogOpen(false);
    } catch (error) {
      toast.error(
        `Failed to ${
          isCurrentlyActive ? "archive" : "restore"
        } school. Please try again.`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Pagination controls
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleEditSchool = (school: School) => {
    setSelectedSchool({
      ...school,
      districtId: school.district.districtId, // Ensure districtId is set
    });
    setFormErrors({});
    setIsDialogOpen(true);
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
    setSelectedSchool((prev: School | null) => ({
      ...prev!,
      [name]: value,
      // Update district object when districtId changes
      ...(name === "districtId" && {
        district: {
          districtId: value,
          districtName:
            districts.find((d) => d.districtId === value)?.districtName || "",
        },
      }),
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
      await api.put(
        `http://127.0.0.1:8000/api/schools/${selectedSchool.schoolId}/`,
        {
          ...selectedSchool,
          district: selectedSchool.districtId, // Send districtId as district
        },
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

  // Update the filter change handler
  const handleFilterChange = (name: string, value: string) => {
    setFilterOptions((prev: any) => ({
      ...prev,
      [name]: value,
    }));
    setCurrentPage(1);
  };

  const [districtOptions, setDistrictOptions] = useState<string[]>([]);

  const handleViewSchool = (school: School) => {
    setSchoolToView(school);
    setIsViewDialogOpen(true);
  };
  useEffect(() => {
    if (!isDialogOpen || !selectedSchool) return;

    // Set municipality options based on legislative district
    if (
      selectedSchool.legislativeDistrict &&
      legislativeDistricts[selectedSchool.legislativeDistrict]
    ) {
      setMunicipalityOptions(
        legislativeDistricts[selectedSchool.legislativeDistrict]
      );
    } else {
      setMunicipalityOptions([]);
    }

    // Set district options based on municipality
    const mun = selectedSchool.municipality;
    if (mun) {
      const filteredDistricts = districts
        .filter(
          (district) => district.municipality === mun && district.is_active
        )
        .map((d) => d.districtId);
      setDistrictOptions(filteredDistricts);
      // Auto-select if only one district is available
      setSelectedSchool((prev) => ({
        ...prev!,
        districtId:
          filteredDistricts.length === 1
            ? filteredDistricts[0]
            : prev!.districtId,
        district: {
          districtId:
            filteredDistricts.length === 1
              ? filteredDistricts[0]
              : prev!.districtId,
          districtName:
            districts.find(
              (d) =>
                d.districtId ===
                (filteredDistricts.length === 1
                  ? filteredDistricts[0]
                  : prev!.districtId)
            )?.districtName || "",
        },
      }));
    } else {
      setDistrictOptions([]);
      setSelectedSchool((prev) => ({
        ...prev!,
        districtId: "",
        district: { districtId: "", districtName: "" },
      }));
    }
  }, [
    selectedSchool?.municipality,
    selectedSchool?.legislativeDistrict,
    isDialogOpen,
    legislativeDistricts,
    districts,
  ]);

  const [isBulkArchiveDialogOpen, setIsBulkArchiveDialogOpen] = useState(false);
  const handleBulkArchive = async (restore: boolean) => {
    if (selectedSchools.length === 0) return;
    setIsSubmitting(true);

    try {
      await Promise.all(
        selectedSchools.map((schoolId) =>
          api.patch(`http://127.0.0.1:8000/api/schools/${schoolId}/`, {
            is_active: !restore,
          })
        )
      );

      toast.success(
        `${selectedSchools.length} school${
          selectedSchools.length > 1 ? "s" : ""
        } ${restore ? "restored" : "archived"} successfully!`
      );

      await fetchSchools();
      setSelectedSchools([]);
      setSelectAll(false);
      setIsBulkArchiveDialogOpen(false);
    } catch (error) {
      toast.error(
        `Failed to ${
          restore ? "restore" : "archive"
        } schools. Please try again.`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Filter State ---
  const [filterLegislativeDistrict, setFilterLegislativeDistrict] =
    useState<string>("");
  const [filterMunicipality, setFilterMunicipality] = useState<string>("");
  const [filterDistrict, setFilterDistrict] = useState<string>("");

  const [filterMunicipalityOptions, setFilterMunicipalityOptions] = useState<
    string[]
  >([]);
  const [filterDistrictOptions, setFilterDistrictOptions] = useState<string[]>(
    []
  );
  // --- Update filter options dynamically ---
  useEffect(() => {
    // Update municipality options when legislative district changes
    if (
      filterLegislativeDistrict &&
      legislativeDistricts[filterLegislativeDistrict]
    ) {
      setFilterMunicipalityOptions(
        legislativeDistricts[filterLegislativeDistrict]
      );
    } else {
      setFilterMunicipalityOptions([]);
    }
    setFilterMunicipality(""); // Reset municipality when district changes
    setFilterDistrict(""); // Reset district when legislative district changes
  }, [filterLegislativeDistrict, legislativeDistricts]);

  useEffect(() => {
    // Update district options when municipality changes
    if (filterMunicipality) {
      const districtsForMunicipality = districts
        .filter(
          (district) =>
            district.municipality === filterMunicipality && district.is_active
        )
        .map((district) => district.districtId);
      setFilterDistrictOptions(districtsForMunicipality);
    } else {
      setFilterDistrictOptions([]);
    }
    setFilterDistrict(""); // Reset district when municipality changes
  }, [filterMunicipality, districts]);
  useEffect(() => {
    setFilterOptions((prev: any) => ({
      ...prev,
      legislative_district: filterLegislativeDistrict,
      municipality: filterMunicipality,
      district: filterDistrict, // This should now be the district ID
    }));
    setCurrentPage(1);
    // eslint-disable-next-line
  }, [filterLegislativeDistrict, filterMunicipality, filterDistrict]);

  return (
    <div className="space-y-4">
      {/* Filters and Search */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-1/2">
            <Input
              type="text"
              placeholder="Search schools..."
              value={filterOptions.searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setFilterOptions((prev: any) => ({
                  ...prev,
                  searchTerm: e.target.value,
                }));
                setCurrentPage(1);
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
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="min-w-[100px] px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
            >
              {ITEMS_PER_PAGE_OPTIONS.map((num) => (
                <option key={num} value={num}>
                  {num} per page
                </option>
              ))}
            </select>
          </div>
        </div>
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border border-gray-200 rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
            {/* Legislative District Filter */}
            <div className="space-y-2">
              <Label
                htmlFor="filter-legislative-district"
                className="text-sm font-medium"
              >
                Legislative District
              </Label>
              <select
                id="filter-legislative-district"
                value={filterLegislativeDistrict}
                onChange={(e) => setFilterLegislativeDistrict(e.target.value)}
                className="h-11 w-full appearance-none rounded-lg border-2 border-gray-300 bg-transparent px-4 py-2.5 pr-11 text-sm shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
              >
                <option value="">All</option>
                {legislativeDistrictOptions.map((ld) => (
                  <option key={ld} value={ld}>
                    {ld}
                  </option>
                ))}
              </select>
            </div>

            {/* Municipality Filter */}
            <div className="space-y-2">
              <Label
                htmlFor="filter-municipality"
                className="text-sm font-medium"
              >
                Municipality
              </Label>
              <select
                id="filter-municipality"
                value={filterMunicipality}
                onChange={(e) => setFilterMunicipality(e.target.value)}
                className="h-11 w-full appearance-none rounded-lg border-2 border-gray-300 bg-transparent px-4 py-2.5 pr-11 text-sm shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                disabled={!filterLegislativeDistrict}
              >
                <option value="">All</option>
                {filterMunicipalityOptions.map((mun) => (
                  <option key={mun} value={mun}>
                    {mun}
                  </option>
                ))}
              </select>
            </div>

            {/* School District Filter */}
            <div className="space-y-2">
              <Label
                htmlFor="filter-school-district"
                className="text-sm font-medium"
              >
                School District
              </Label>
              <select
                id="filter-school-district"
                value={filterDistrict}
                onChange={(e) => setFilterDistrict(e.target.value)}
                className="h-11 w-full appearance-none rounded-lg border-2 border-gray-300 bg-transparent px-4 py-2.5 pr-11 text-sm shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                disabled={!filterMunicipality}
              >
                <option value="">All Districts</option>
                {filterDistrictOptions.map((districtId) => {
                  const district = districts.find(
                    (d) => d.districtId === districtId
                  );
                  return (
                    <option key={districtId} value={districtId}>
                      {district?.districtName}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="md:col-span-3 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFilterLegislativeDistrict("");
                  setFilterMunicipality("");
                  setFilterDistrict("");
                  setFilterOptions((prev: any) => ({
                    ...prev,
                    district: "",
                    legislative_district: "",
                    municipality: "",
                  }));
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
              ) : schools.length > 0 ? (
                schools.map((school) => (
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
                    <TableCell
                      className={
                        school.district?.is_active === false
                          ? "px-6 whitespace-nowrap py-4 text-gray-400 italic text-start text-theme-sm dark:text-gray-500"
                          : "px-6 whitespace-nowrap py-4 text-gray-800 text-start text-theme-sm dark:text-gray-400"
                      }
                    >
                      {school.district?.districtName}
                      {school.district &&
                        school.district.is_active === false && (
                          <span className="ml-1 text-xs text-red-500">
                            (inactive)
                          </span>
                        )}
                    </TableCell>
                    <TableCell className="px-6 whitespace-nowrap py-4 text-gray-800 text-start text-theme-sm dark:text-gray-400">
                      {school.municipality}
                    </TableCell>
                    <TableCell className="px-6 whitespace-nowrap py-4 text-gray-800 text-start text-theme-sm dark:text-gray-400">
                      {school.legislativeDistrict}
                    </TableCell>
                    <TableCell className="px-6 whitespace-nowrap py-4 text-gray-800 text-start text-theme-sm dark:text-gray-400">
                      <Badge color={school.is_active ? "success" : "error"}>
                        {school.is_active ? "Active" : "Archived"}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-6 whitespace-nowrap py-4 sm:px-6 text-start text-theme-sm">
                      <div className="flex justify-start space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditSchool(school);
                          }}
                          className="px-4 py-2 bg-blue-light-500 text-white dark:text-white rounded-md hover:bg-blue-light-600 transition-colors"
                          title="Edit School"
                        >
                          Edit
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleArchiveClick(school);
                          }}
                          className={`px-4 py-2 rounded-md transition-colors ${
                            school.is_active
                              ? "bg-error-500 text-white hover:bg-error-600"
                              : "bg-success-500 text-white hover:bg-success-600"
                          }`}
                          title={
                            school.is_active
                              ? "Archive School"
                              : "Restore School"
                          }
                        >
                          {school.is_active ? "Archive" : "Restore"}
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
          Page {currentPage} of {totalPages} • {totalSchools} total schools
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
                <Label htmlFor="legislativeDistrict" className="text-base">
                  Legislative District *
                </Label>
                <select
                  id="legislativeDistrict"
                  name="legislativeDistrict"
                  className="h-11 w-full appearance-none rounded-lg border-2 border-gray-300 bg-transparent px-4 py-2.5 pr-11 text-sm shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                  value={selectedSchool.legislativeDistrict}
                  onChange={handleChange}
                >
                  <option value="">Select Legislative District</option>
                  {legislativeDistrictOptions.map((ld) => (
                    <option key={ld} value={ld}>
                      {ld}
                    </option>
                  ))}
                </select>
                {formErrors.legislativeDistrict && (
                  <p className="text-red-500 text-sm">
                    {formErrors.legislativeDistrict}
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
                  disabled={!selectedSchool.legislativeDistrict}
                >
                  <option value="">Select Municipality</option>
                  {municipalityOptions.map((mun) => (
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
                <Label htmlFor="districtId" className="text-base">
                  District *
                </Label>
                <select
                  id="districtId"
                  name="districtId"
                  className="h-11 w-full appearance-none rounded-lg border-2 border-gray-300 bg-transparent px-4 py-2.5 pr-11 text-sm shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                  value={selectedSchool?.districtId || ""}
                  onChange={handleChange}
                  disabled={
                    !selectedSchool?.municipality || districtOptions.length <= 1
                  }
                >
                  <option value="">Select District</option>
                  {districts
                    .filter(
                      (district) =>
                        district.municipality === selectedSchool?.municipality
                    )
                    .map((district) => (
                      <option
                        key={district.districtId}
                        value={district.districtId}
                        disabled={!district.is_active}
                        style={{
                          color: !district.is_active ? "#888" : undefined,
                          backgroundColor: !district.is_active
                            ? "#f3f4f6"
                            : undefined,
                          fontStyle: !district.is_active ? "italic" : undefined,
                        }}
                      >
                        {district.districtName}
                        {!district.is_active ? " (inactive)" : ""}
                      </option>
                    ))}
                </select>
                {formErrors.districtId && (
                  <p className="text-red-500 text-sm">
                    {formErrors.districtId}
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
                  <p
                    className={
                      schoolToView.district?.is_active === false
                        ? " text-gray-400 italic text-start text-theme-sm dark:text-gray-500"
                        : " text-gray-800 text-start text-theme-sm dark:text-gray-400"
                    }
                  >
                    {schoolToView.district?.districtName}
                    {schoolToView.district &&
                      schoolToView.district.is_active === false && (
                        <span className="ml-1 text-xs text-red-500">
                          (inactive)
                        </span>
                      )}
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
                  <Badge color={schoolToView.is_active ? "success" : "error"}>
                    {schoolToView.is_active ? "Active" : "Archived"}
                  </Badge>
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
      {/* Archive Confirmation Dialog */}
      {/* Archive/Restore Confirmation Dialog */}
      <Dialog open={isArchiveDialogOpen} onOpenChange={setIsArchiveDialogOpen}>
        <DialogContent className="w-full rounded-lg bg-white dark:bg-gray-800 p-8 shadow-xl">
          <DialogHeader className="mb-8">
            <DialogTitle className="text-3xl font-bold text-gray-800 dark:text-white">
              {schoolToArchive?.is_active ? "Archive School" : "Restore School"}
            </DialogTitle>
          </DialogHeader>
          {schoolToArchive && (
            <div className="space-y-4">
              <p className="text-gray-600 dark:text-gray-400">
                Are you sure you want to{" "}
                {schoolToArchive.is_active ? "archive" : "restore"} school{" "}
                <strong>{schoolToArchive.schoolName}</strong>?{" "}
                {schoolToArchive.is_active
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
                  color={schoolToArchive.is_active ? "warning" : "success"}
                  onClick={() =>
                    handleArchiveConfirm(schoolToArchive?.is_active)
                  }
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="animate-spin size-4" />
                      {schoolToArchive.is_active
                        ? "Archiving..."
                        : "Restoring..."}
                    </span>
                  ) : schoolToArchive.is_active ? (
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
      {/* Bulk Archive/Restore Confirmation Dialog */}
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
                onClick={() => handleBulkArchive(!showArchived)} // Fix: restore = true when showArchived is true
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
