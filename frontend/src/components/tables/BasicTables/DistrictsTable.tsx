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
import { PlusIcon } from "@/icons";
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
  Loader2Icon,
  Filter,
  XIcon,
} from "lucide-react";
import Button from "@/components/ui/button/Button";
import {
  useState,
  useEffect,
  useMemo,
  useRef,
  SetStateAction,
  Dispatch,
} from "react";
import api from "@/api/axios";
import SkeletonRow from "@/components/ui/skeleton";
import Badge from "@/components/ui/badge/Badge";

interface District {
  districtId: string;
  districtName: string;
  municipality: string;
  legislativeDistrict: string;
  logo?: string;
  logo_url?: string;
  is_active: boolean;
}

interface DistrictsTableProps {
  districts: District[];
  setDistricts: React.Dispatch<React.SetStateAction<any[]>>;
  filterOptions: any;
  setFilterOptions: React.Dispatch<React.SetStateAction<any>>;
  showArchived: boolean;
  setShowArchived: React.Dispatch<React.SetStateAction<boolean>>;
  onRequestSort: (
    sortConfig: { key: string; direction: "asc" | "desc" } | null
  ) => void;
  currentSort: { key: string; direction: "asc" | "desc" } | null;
  fetchDistricts: () => Promise<void>;
  loading?: boolean;
  error?: Error | null;
  currentPage: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  itemsPerPage: number;
  setItemsPerPage: React.Dispatch<React.SetStateAction<number>>;
  totalDistricts: number;
}

export default function DistrictsTable({
  districts,
  setDistricts,
  showArchived,
  setShowArchived,
  fetchDistricts,
  filterOptions,
  setFilterOptions,
  onRequestSort,
  currentSort,
  loading,
  error,
  currentPage,
  setCurrentPage,
  itemsPerPage,
  setItemsPerPage,
  totalDistricts,
}: DistrictsTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const [selectedDistricts, setSelectedDistricts] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [legislativeDistricts, setLegislativeDistricts] = useState<{
    [key: string]: string[];
  }>({});
  const [legislativeDistrictOptions, setLegislativeDistrictOptions] = useState<
    string[]
  >([]);
  const [municipalityOptions, setMunicipalityOptions] = useState<string[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false);
  const [isBulkArchiveDialogOpen, setIsBulkArchiveDialogOpen] = useState(false);
  const [isConfirmEditDialogOpen, setIsConfirmEditDialogOpen] = useState(false);
  const [districtToArchive, setDistrictToArchive] = useState<District | null>(
    null
  );
  const [selectedDistrict, setSelectedDistrict] = useState<District | null>(
    null
  );
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [districtToView, setDistrictToView] = useState<District | null>(null);

  const requiredFields = [
    "districtId",
    "districtName",
    "municipality",
    "legislativeDistrict",
    "logo",
  ];

  const isFormValid = useMemo(() => {
    if (!selectedDistrict) return false;
    const requiredValid = requiredFields.every((field) =>
      // For logo, check if there's either a new upload (data URL) or existing logo_url
      field === "logo"
        ? (selectedDistrict.logo && selectedDistrict.logo.startsWith('data:')) ||
          selectedDistrict.logo_url?.toString().trim() !== ""
        : selectedDistrict[field as keyof District]?.toString().trim() !== ""
    );
    const noErrors = Object.keys(formErrors).length === 0;
    return requiredValid && noErrors;
  }, [selectedDistrict, formErrors]);

  useEffect(() => {
    api.get("/legislative-districts/").then((res) => {
      setLegislativeDistricts(res.data);
      setLegislativeDistrictOptions(Object.keys(res.data));
    });
  }, []);

  useEffect(() => {
    setSelectedDistricts([]);
    setSelectAll(false);
  }, [showArchived]);

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setFilterOptions((prev: any) => ({
        ...prev,
        searchTerm,
      }));
    }, 400);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchTerm, setFilterOptions]);

  const totalPages = Math.ceil(totalDistricts / itemsPerPage);

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedDistricts([]);
    } else {
      setSelectedDistricts(districts.map((district) => district.districtId));
    }
    setSelectAll(!selectAll);
  };

  const toggleSelectDistrict = (districtId: string) => {
    setSelectedDistricts((prev) =>
      prev.includes(districtId)
        ? prev.filter((id) => id !== districtId)
        : [...prev, districtId]
    );
  };

  const isSelected = (districtId: string) => {
    return selectedDistricts.includes(districtId);
  };

  // Bulk archive/restore function
  const handleBulkArchive = async (archive: boolean) => {
    if (selectedDistricts.length === 0) return;
    setIsSubmitting(true);

    try {
      await Promise.all(
        selectedDistricts.map((districtId) =>
          api.patch(`school-districts/${districtId}/`, {
            is_active: !archive,
          })
        )
      );

      toast.success(
        `${selectedDistricts.length} district${
          selectedDistricts.length > 1 ? "s" : ""
        } ${archive ? "archived" : "restored"} successfully!`
      );

      await fetchDistricts();
      setSelectedDistricts([]);
      setSelectAll(false);
    } catch (error) {
      toast.error(
        `Failed to ${
          archive ? "archive" : "restore"
        } districts. Please try again.`
      );
    } finally {
      setIsSubmitting(false);
      setIsBulkArchiveDialogOpen(false);
    }
  };

  const handleArchiveConfirm = async () => {
    if (!districtToArchive) return;
    setIsSubmitting(true);
    try {
      await api.patch(`school-districts/${districtToArchive.districtId}/`, {
        is_active: !districtToArchive.is_active,
      });
      toast.success(
        districtToArchive.is_active
          ? "School district archived!"
          : "School district restored!"
      );
      await fetchDistricts();
      setDistrictToArchive(null);
      setIsArchiveDialogOpen(false);
    } catch (error) {
      toast.error("Failed to archive/restore school district.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleEditDistrict = (district: District) => {
    setSelectedDistrict({ ...district });
    setFormErrors({});
    setIsDialogOpen(true);
  };

  const handleArchiveClick = (district: District) => {
    setDistrictToArchive(district);
    setIsArchiveDialogOpen(true);
  };

  const handleViewDistrict = (district: District) => {
    setDistrictToView(district);
    setIsViewDialogOpen(true);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    if (!selectedDistrict) return;
    const { name, value } = e.target;

    setSelectedDistrict((prev) => ({
      ...prev!,
      [name]: value,
    }));

    const newErrors = { ...formErrors };
    if (requiredFields.includes(name) && !value.trim()) {
      newErrors[name] = "This field is required";
    } else {
      delete newErrors[name];
    }
    // For logo, check if there's either a new upload (data URL) or existing logo_url
    if (requiredFields.includes("logo")) {
      const hasNewUpload = selectedDistrict.logo && selectedDistrict.logo.startsWith('data:');
      const hasExistingLogo = selectedDistrict.logo_url && selectedDistrict.logo_url.trim() !== "";
      
      if (!hasNewUpload && !hasExistingLogo) {
        newErrors.logo = "This field is required";
      } else {
        delete newErrors.logo;
      }
    }
    setFormErrors(newErrors);
  };

  // Handle logo file upload for edit
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedDistrict) return;
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setSelectedDistrict((prev) => ({
          ...prev!,
          logo: result,
        }));
        
        // Clear logo error when a new file is uploaded
        setFormErrors((prevErrors) => {
          const newErrors = { ...prevErrors };
          delete newErrors.logo;
          return newErrors;
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedDistrict) return;
    if (!isFormValid) {
      toast.error("Please fix the errors in the form");
      return;
    }

    // Show confirmation dialog instead of submitting directly
    setIsConfirmEditDialogOpen(true);
  };

  // Add the confirmed edit function
  const handleConfirmedEdit = async () => {
    if (!selectedDistrict) return;
    setIsSubmitting(true);
    try {
      const submitData: {
        districtName: string;
        municipality: string;
        legislativeDistrict: string;
        logo_base64?: string;
      } = {
        districtName: selectedDistrict.districtName,
        municipality: selectedDistrict.municipality,
        legislativeDistrict: selectedDistrict.legislativeDistrict,
      };

      // Only include logo_base64 if it's a new upload (data URL format)
      if (selectedDistrict.logo && selectedDistrict.logo.startsWith('data:')) {
        submitData.logo_base64 = selectedDistrict.logo;
        
        // Debug logging
        console.log("Logo data length:", selectedDistrict.logo.length);
        console.log("Logo data preview:", selectedDistrict.logo.substring(0, 100));
        console.log("Is data URL:", selectedDistrict.logo.startsWith('data:'));
      }

      await api.put(
        `school-districts/${selectedDistrict.districtId}/`,
        submitData,
        {
          headers: { "Content-Type": "application/json" },
        }
      );
      toast.success("School district updated!");
      await fetchDistricts();
      setIsDialogOpen(false);
      setIsConfirmEditDialogOpen(false);
    } catch (error) {
      console.error("Update error:", error);
      toast.error("Failed to update school district.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filters state
  const [filterLegislativeDistrict, setFilterLegislativeDistrict] =
    useState<string>("");
  const [filterMunicipality, setFilterMunicipality] = useState<string>("");
  const [filterMunicipalityOptions, setFilterMunicipalityOptions] = useState<
    string[]
  >([]);

  useEffect(() => {
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
    setFilterMunicipality("");
  }, [filterLegislativeDistrict, legislativeDistricts]);

  useEffect(() => {
    setFilterOptions((prev: any) => ({
      ...prev,
      legislative_district: filterLegislativeDistrict,
      municipality: filterMunicipality,
    }));
    setCurrentPage(1);
    // eslint-disable-next-line
  }, [filterLegislativeDistrict, filterMunicipality]);

  const editLogoInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-4">
      {/* Filters and Search */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-1/2">
            <Input
              type="text"
              placeholder="Search school districts..."
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

            {selectedDistricts.length > 0 && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsBulkArchiveDialogOpen(true)}
                  startIcon={
                    isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
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
                    : `${selectedDistricts.length} Selected`}
                </Button>
              </div>
            )}

            <select
              value={itemsPerPage.toString()}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="min-w-[100px] px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800"
            >
              {[10, 25, 50, 100].map((num) => (
                <option key={num} value={num}>
                  {num} per page
                </option>
              ))}
            </select>
          </div>
        </div>
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border border-gray-200 rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
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
                className="h-11 w-full appearance-none rounded-lg border-2 border-gray-300 bg-transparent px-4 py-2.5 pr-11 text-sm shadow-theme-xs"
              >
                <option value="">All</option>
                {legislativeDistrictOptions.map((ld) => (
                  <option key={ld} value={ld}>
                    {ld}
                  </option>
                ))}
              </select>
            </div>
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
                className="h-11 w-full appearance-none rounded-lg border-2 border-gray-300 bg-transparent px-4 py-2.5 pr-11 text-sm shadow-theme-xs"
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
            <div className="md:col-span-2 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFilterLegislativeDistrict("");
                  setFilterMunicipality("");
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
                  className="px-6 py-3 font-medium text-gray-500 text-start text-theme-xs uppercase"
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
                  className="px-6 py-3 font-medium text-gray-500 text-start text-theme-xs uppercase"
                >
                  <div
                    className="flex items-center gap-1 cursor-pointer"
                    onClick={() => {
                      const isAsc =
                        currentSort?.key === "districtName" &&
                        currentSort.direction === "asc";
                      onRequestSort({
                        key: "districtName",
                        direction: isAsc ? "desc" : "asc",
                      });
                    }}
                  >
                    District
                    <span className="inline-flex flex-col ml-1">
                      <ChevronUp
                        className={`h-3 w-3 transition-colors ${
                          currentSort?.key === "districtName" &&
                          currentSort.direction === "asc"
                            ? "text-primary-500"
                            : "text-gray-400"
                        }`}
                      />
                      <ChevronDown
                        className={`h-3 w-3 -mt-1 transition-colors ${
                          currentSort?.key === "districtName" &&
                          currentSort.direction === "desc"
                            ? "text-primary-500"
                            : "text-gray-400"
                        }`}
                      />
                    </span>
                  </div>
                </TableCell>
                <TableCell
                  isHeader
                  className="px-6 py-3 font-medium text-gray-500 text-start text-theme-xs uppercase"
                >
                  <div
                    className="flex items-center gap-1 cursor-pointer"
                    onClick={() => {
                      const isAsc =
                        currentSort?.key === "municipality" &&
                        currentSort.direction === "asc";
                      onRequestSort({
                        key: "municipality",
                        direction: isAsc ? "desc" : "asc",
                      });
                    }}
                  >
                    Municipality
                    <span className="inline-flex flex-col ml-1">
                      <ChevronUp
                        className={`h-3 w-3 transition-colors ${
                          currentSort?.key === "municipality" &&
                          currentSort.direction === "asc"
                            ? "text-primary-500"
                            : "text-gray-400"
                        }`}
                      />
                      <ChevronDown
                        className={`h-3 w-3 -mt-1 transition-colors ${
                          currentSort?.key === "municipality" &&
                          currentSort.direction === "desc"
                            ? "text-primary-500"
                            : "text-gray-400"
                        }`}
                      />
                    </span>
                  </div>
                </TableCell>
                <TableCell
                  isHeader
                  className="px-6 py-3 font-medium text-gray-500 text-start text-theme-xs uppercase"
                >
                  <div
                    className="flex items-center gap-1 cursor-pointer"
                    onClick={() => {
                      const isAsc =
                        currentSort?.key === "legislativeDistrict" &&
                        currentSort.direction === "asc";
                      onRequestSort({
                        key: "legislativeDistrict",
                        direction: isAsc ? "desc" : "asc",
                      });
                    }}
                  >
                    Legislative District
                    <span className="inline-flex flex-col ml-1">
                      <ChevronUp
                        className={`h-3 w-3 transition-colors ${
                          currentSort?.key === "legislativeDistrict" &&
                          currentSort.direction === "asc"
                            ? "text-primary-500"
                            : "text-gray-400"
                        }`}
                      />
                      <ChevronDown
                        className={`h-3 w-3 -mt-1 transition-colors ${
                          currentSort?.key === "legislativeDistrict" &&
                          currentSort.direction === "desc"
                            ? "text-primary-500"
                            : "text-gray-400"
                        }`}
                      />
                    </span>
                  </div>
                </TableCell>
                <TableCell
                  isHeader
                  className="px-6 py-3 font-medium text-gray-500 text-start text-theme-xs uppercase"
                >
                  Status
                </TableCell>
                <TableCell
                  isHeader
                  className="px-6 py-3 font-medium text-gray-500 text-start text-theme-xs uppercase"
                >
                  Actions
                </TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-200">
              {loading ? (
                <>
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                </>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center">
                    <span className="text-red-500">{error.message}</span>
                  </TableCell>
                </TableRow>
              ) : districts.length > 0 ? (
                districts.map((district) => (
                  <TableRow
                    key={district.districtId}
                    onClick={() => handleViewDistrict(district)}
                    className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <TableCell className="px-6 py-4 text-start text-theme-sm">
                      <input
                        type="checkbox"
                        checked={isSelected(district.districtId)}
                        onChange={() =>
                          toggleSelectDistrict(district.districtId)
                        }
                        className="h-4 w-4 rounded border-gray-300 text-primary-600"
                      />
                    </TableCell>
                    <TableCell className="px-6 py-4 text-start text-theme-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 overflow-hidden rounded-full">
                          {district.logo_url ? (
                            <img
                              src={district.logo_url}
                              alt={`${district.districtName} logo`}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="bg-gray-200 w-full h-full flex items-center justify-center">
                              <PlusIcon className="w-5 h-5 text-gray-500" />
                            </div>
                          )}
                        </div>
                        <div>
                          <span className="block font-medium text-gray-800 text-theme-sm">
                            {district.districtName}
                          </span>
                          <span className="block text-gray-500 text-theme-xs">
                            ID: {district.districtId}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-start text-theme-sm">
                      {district.municipality}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-start text-theme-sm">
                      {district.legislativeDistrict}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-start text-theme-sm">
                      <Badge color={district.is_active ? "success" : "error"}>
                        {district.is_active ? "Active" : "Archived"}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-start text-theme-sm">
                      <div className="flex gap-2">
                        <button
                          className="px-4 py-2 bg-blue-light-500 text-white dark:text-white rounded-md hover:bg-blue-light-600 transition-colors"
                          title="Edit School District"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditDistrict(district);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          className={`px-4 py-2 rounded-md text-white ${
                            district.is_active
                              ? "bg-red-500 hover:bg-red-600"
                              : "bg-green-500 hover:bg-green-600"
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleArchiveClick(district);
                          }}
                        >
                          {district.is_active ? "Archive" : "Restore"}
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    className="py-8 text-center text-gray-500"
                    colSpan={7}
                  >
                    No {showArchived ? "archived" : "active"} school districts
                    found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      {/* Pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-sm text-gray-600">
          Page {currentPage} of {totalPages} • {totalDistricts} total districts
          {selectedDistricts.length > 0 && (
            <span className="ml-2">({selectedDistricts.length} selected)</span>
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

      {/* Edit Confirmation Dialog */}
      <Dialog
        open={isConfirmEditDialogOpen}
        onOpenChange={setIsConfirmEditDialogOpen}
      >
        <DialogContent className="w-full rounded-lg bg-white dark:bg-gray-800 p-8 shadow-xl">
          <DialogHeader className="mb-8">
            <DialogTitle className="text-3xl font-bold text-gray-800 dark:text-white">
              Confirm Changes
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
              Are you sure you want to update this School District?
            </p>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsConfirmEditDialogOpen(false)}
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
                  "Confirm Update"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit District Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="w-full rounded-lg bg-white dark:bg-gray-800 p-8 shadow-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="mb-8">
            <DialogTitle className="text-3xl font-bold text-gray-800 dark:text-white">
              Edit School District
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              Update the school district details below
            </DialogDescription>
          </DialogHeader>
          {selectedDistrict && (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="districtId" className="text-base">
                  District ID *
                </Label>
                <Input
                  type="text"
                  id="districtId"
                  name="districtId"
                  className="w-full p-3.5 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 text-base"
                  value={selectedDistrict.districtId}
                  onChange={handleChange}
                  disabled
                  error={!!formErrors.districtId}
                  hint={formErrors.districtId}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-logo" className="text-base">
                  District Logo *
                </Label>
                <div className="flex items-center gap-4">
                  {selectedDistrict.logo || selectedDistrict.logo_url ? (
                    <div className="relative">
                      <img
                        src={selectedDistrict.logo || selectedDistrict.logo_url}
                        className="w-16 h-16 rounded-full object-cover"
                        alt="Preview"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDistrict((prev) => ({
                            ...prev!,
                            logo: "",
                            logo_url: "",
                          }));
                          if (editLogoInputRef.current)
                            editLogoInputRef.current.value = "";
                        }}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-red-600"
                        aria-label="Remove district logo"
                      >
                        <XIcon />
                      </button>
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
                      <PlusIcon className="w-8 h-8 text-gray-500" />
                    </div>
                  )}
                  <input
                    type="file"
                    id="edit-logo"
                    name="logo"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="hidden"
                    ref={editLogoInputRef}
                  />
                  <Label
                    htmlFor="edit-logo"
                    className="cursor-pointer px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md"
                  >
                    {selectedDistrict.logo || selectedDistrict.logo_url
                      ? "Change Logo"
                      : "Upload Logo"}
                  </Label>
                </div>
                {formErrors.logo && (
                  <p className="text-red-500 text-sm">{formErrors.logo}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="districtName" className="text-base">
                  School District Name *
                </Label>
                <Input
                  type="text"
                  id="districtName"
                  name="districtName"
                  className="w-full p-3.5 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 text-base"
                  value={selectedDistrict.districtName}
                  onChange={handleChange}
                  error={!!formErrors.districtName}
                  hint={formErrors.districtName}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="legislativeDistrict" className="text-base">
                  Legislative District *
                </Label>
                <select
                  id="legislativeDistrict"
                  name="legislativeDistrict"
                  className="h-11 w-full appearance-none rounded-lg border-2 border-gray-300 bg-transparent px-4 py-2.5 pr-11 text-sm shadow-theme-xs"
                  value={selectedDistrict.legislativeDistrict}
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
                  className="h-11 w-full appearance-none rounded-lg border-2 border-gray-300 bg-transparent px-4 py-2.5 pr-11 text-sm shadow-theme-xs"
                  value={selectedDistrict.municipality}
                  onChange={handleChange}
                  disabled={!selectedDistrict.legislativeDistrict}
                >
                  <option value="">Select Municipality</option>
                  {legislativeDistricts[
                    selectedDistrict.legislativeDistrict
                  ]?.map((mun) => (
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

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    setSelectedDistrict(null);
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
                      Updating...
                    </span>
                  ) : (
                    "Update School District"
                  )}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Archive Confirmation Dialog */}
      <Dialog open={isArchiveDialogOpen} onOpenChange={setIsArchiveDialogOpen}>
        <DialogContent className="w-full rounded-lg bg-white dark:bg-gray-800 p-8 shadow-xl">
          <DialogHeader className="mb-8">
            <DialogTitle className="text-3xl font-bold text-gray-800 dark:text-white">
              {districtToArchive?.is_active
                ? "Archive District"
                : "Restore District"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
              Are you sure you want to{" "}
              {districtToArchive?.is_active ? "archive" : "restore"} the school
              district <strong>{districtToArchive?.districtName}</strong>?
            </p>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsArchiveDialogOpen(false);
                  setDistrictToArchive(null);
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant={districtToArchive?.is_active ? "error" : "success"}
                onClick={handleArchiveConfirm}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="animate-spin size-4" />
                    {districtToArchive?.is_active
                      ? "Archiving..."
                      : "Restoring..."}
                  </span>
                ) : districtToArchive?.is_active ? (
                  "Archive District"
                ) : (
                  "Restore District"
                )}
              </Button>
            </div>
          </div>
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
              {showArchived ? "Bulk Restore" : "Bulk Archive"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
              Are you sure you want to {showArchived ? "restore" : "archive"}{" "}
              <strong>{selectedDistricts.length}</strong> school district
              {selectedDistricts.length > 1 ? "s" : ""}?
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
                variant={showArchived ? "success" : "error"}
                onClick={() => handleBulkArchive(!showArchived)}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="animate-spin size-4" />
                    {showArchived ? "Restoring..." : "Archiving..."}
                  </span>
                ) : showArchived ? (
                  `Restore ${selectedDistricts.length} Districts`
                ) : (
                  `Archive ${selectedDistricts.length} Districts`
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View District Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="w-full rounded-lg bg-white dark:bg-gray-800 p-8 shadow-xl">
          <DialogHeader className="mb-8">
            <DialogTitle className="text-3xl font-bold text-gray-800 dark:text-white">
              School District Details
            </DialogTitle>
          </DialogHeader>

          {districtToView && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                {districtToView.logo_url && (
                  <img
                    src={districtToView.logo_url}
                    alt={`${districtToView.districtName} logo`}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                )}
                <div>
                  <h3 className="text-xl font-semibold">
                    {districtToView.districtName}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    ID: {districtToView.districtId}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Municipality
                  </label>
                  <p className="text-gray-900 dark:text-white">
                    {districtToView.municipality}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Legislative District
                  </label>
                  <p className="text-gray-900 dark:text-white">
                    {districtToView.legislativeDistrict}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Status
                  </label>
                  <Badge color={districtToView.is_active ? "success" : "error"}>
                    {districtToView.is_active ? "Active" : "Archived"}
                  </Badge>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
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
    </div>
  );
}
