import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import api from "@/api/axios";
import { toast } from "react-toastify";
import Button from "../components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import {
  Search,
  Undo2,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Info,
  AlertCircle,
  CheckCircle,
  Filter,
  ChevronDownIcon,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { municipalityDistricts } from "@/lib/constants";
import Label from "@/components/form/Label";
import { Disclosure, DisclosureButton, Transition } from "@headlessui/react";
import SchoolBudgetAllocationTable from "@/components/tables/BasicTables/SchoolBudgetAllocationTable";

const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100];
const MIN_SEARCH_LENGTH = 3;
const SEARCH_DEBOUNCE_MS = 500;


type School = {
  schoolId: string;
  schoolName: string;
  current_monthly_budget: number;
  current_yearly_budget: number;
  municipality: string;
  district: { districtId: string; districtName: string; is_active?: boolean; legislativeDistrict?: string; municipality?: string; }; // Match District type
  legislativeDistrict: string;
  is_active: boolean;
  hasUnliquidated?: boolean;
  last_liquidated_month: number | null; // Make required to match interface
  last_liquidated_year: number | null; // Make required to match interface
  hasAllocation?: boolean; // New field to track if school has budget allocation
  districtId: string; // Make required to match the expected interface
};

const ResourceAllocation = () => {
  const [schools, setSchools] = useState<School[]>([]);
  const [editingBudgets, setEditingBudgets] = useState<Record<string, number>>(
    {}
  );
  const [currentYear] = useState<number>(new Date().getFullYear());
  const [selectedSchools, setSelectedSchools] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalSchools, setTotalSchools] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showIndividualSuccessDialog, setShowIndividualSuccessDialog] = useState(false);
  const [individualSaveMessage, setIndividualSaveMessage] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);
  const [filterLegislativeDistrict, setFilterLegislativeDistrict] =
    useState<string>("");
  const [filterMunicipality, setFilterMunicipality] = useState<string>("");
  const [filterDistrict, setFilterDistrict] = useState<string>("");
  const [filterCanRequest, setFilterCanRequest] = useState<boolean | null>(
    null
  );
  const [legislativeDistricts, setLegislativeDistricts] = useState<{
    [key: string]: string[];
  }>({});
  const [legislativeDistrictOptions, setLegislativeDistrictOptions] = useState<
    string[]
  >([]);
  const [filterMunicipalityOptions, setFilterMunicipalityOptions] = useState<
    string[]
  >([]);
  const [filterDistrictOptions, setFilterDistrictOptions] = useState<string[]>(
    []
  );
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc";
  } | null>(null);

  const canRequestNextMonth = useCallback((school: any) => {
    if (!school.is_active) return false;
    if (school.hasUnliquidated) return false;
    return true;
  }, []);

  // Sorting logic
  const requestSort = (key: string) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key) {
      direction = sortConfig.direction === "asc" ? "desc" : "asc";
    }
    setSortConfig({ key, direction });
  };

  const fetchBacklogData = async (schoolIds: string[]) => {
    try {
      const res = await api.get("requests/", {
        params: {
          status: ["approved", "downloaded", "pending", "unliquidated"].join(
            ","
          ),
          school_ids: schoolIds.join(","),
        },
      });
      const requests = res.data.results || res.data;
      const schoolsWithUnliquidated = new Set<string>();
      requests.forEach((request: any) => {
        const schoolId = request.user.school.schoolId;
        schoolsWithUnliquidated.add(schoolId);
      });
      return schoolsWithUnliquidated;
    } catch (error) {
      console.error("Error fetching backlog data:", error);
      return new Set<string>();
    }
  };


  // Fetch schools with backlog info
  const fetchData = async () => {
    setLoading(true);
    try {
      const params: any = {
        page: currentPage,
        page_size: itemsPerPage,
      };
      if (debouncedSearch.length >= MIN_SEARCH_LENGTH) {
        params.search = debouncedSearch;
      }
      if (filterLegislativeDistrict)
        params.legislative_district = filterLegislativeDistrict;
      if (filterMunicipality) params.municipality = filterMunicipality;
      if (filterDistrict) params.district = filterDistrict;

      const schoolsRes = await api.get("schools/", { params });
      console.log(schoolsRes.data.results);
      let schoolsData = schoolsRes.data.results || schoolsRes.data;

      if (filterCanRequest !== null) {
        schoolsData = schoolsData.filter((school: any) =>
          filterCanRequest
            ? canRequestNextMonth(school)
            : !canRequestNextMonth(school)
        );
      }

      const schoolIds = schoolsData.map((school: any) => school.schoolId);
      const backlogData = await fetchBacklogData(schoolIds);

      const schoolsWithBacklog = schoolsData.map((school: any) => {
        const hasUnliquidated = backlogData.has(school.schoolId);
        // hasAllocation should be true if there's an actual budget allocation record in the database
        // We'll check this by looking at the current_yearly_budget from the database
        const hasAllocation = school.current_yearly_budget > 0;
        return {
          ...school,
          hasUnliquidated,
          hasAllocation,
        };
      });
      const initialBudgets = schoolsWithBacklog.reduce(
        (acc: Record<string, number>, school: School) => {
          acc[school.schoolId] = school.current_yearly_budget || 0;
          return acc;
        },
        {} as Record<string, number>
      );

      setEditingBudgets(initialBudgets);
      setSchools(schoolsWithBacklog);
      setTotalSchools(schoolsRes.data.count ?? schoolsData.length);
    } catch (error) {
      console.error("Error fetching schools data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    api.get("/legislative-districts/").then((res) => {
      setLegislativeDistricts(res.data);
      setLegislativeDistrictOptions(Object.keys(res.data));
    });
  }, []);

  useEffect(() => {
    if (
      debouncedSearch.length === 0 ||
      debouncedSearch.length >= MIN_SEARCH_LENGTH
    ) {
      fetchData();
    } else {
      setSchools([]);
      setTotalSchools(0);
    }
  }, [currentPage, itemsPerPage, debouncedSearch, filterCanRequest]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(handler);
  }, [searchTerm]);



  const sortedSchools = useMemo(() => {
    let sorted = [...schools];
    
    // First sort by selection status (selected schools first)
    sorted.sort((a, b) => {
      const aSelected = selectedSchools.includes(a.schoolId);
      const bSelected = selectedSchools.includes(b.schoolId);
      return aSelected === bSelected ? 0 : aSelected ? -1 : 1;
    });

    // Then apply column sorting if configured
    if (sortConfig) {
      sorted.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        switch (sortConfig.key) {
          case "schoolName":
            aValue = a.schoolName.toLowerCase();
            bValue = b.schoolName.toLowerCase();
            break;
          case "status":
            // Sort by allocation status: allocated > unallocated > inactive
            const getStatusPriority = (school: any) => {
              if (!school.is_active) return 0;
              if (school.hasAllocation) return 2;
              return 1;
            };
            aValue = getStatusPriority(a);
            bValue = getStatusPriority(b);
            break;
          case "yearlyBudget":
            aValue = editingBudgets[a.schoolId] || 0;
            bValue = editingBudgets[b.schoolId] || 0;
            break;
          case "monthlyBudget":
            aValue = (editingBudgets[a.schoolId] || 0) / 12;
            bValue = (editingBudgets[b.schoolId] || 0) / 12;
            break;
          case "liquidationStatus":
            aValue = canRequestNextMonth(a) ? 1 : 0;
            bValue = canRequestNextMonth(b) ? 1 : 0;
            break;
          default:
            return 0;
        }

        if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return sorted;
  }, [schools, selectedSchools, sortConfig, editingBudgets, canRequestNextMonth]);


  const totalPages = Math.ceil(totalSchools / itemsPerPage);
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  const formatCurrency = (value: number) => {
    if (isNaN(value)) return "₱0.00";
    return value.toLocaleString("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const totalDifference = useMemo(
    () =>
      selectedSchools.reduce((sum, id) => {
        const prev = schools.find((s) => s.schoolId === id)?.current_yearly_budget || 0;
        const current = Number(editingBudgets[id]) || 0;
        return sum + (current - Number(prev));
      }, 0),
    [selectedSchools, schools, editingBudgets]
  );

  // const resetBudgets = () => {
  //   const initialBudgets = schools.reduce(
  //     (acc: Record<string, number>, school) => {
  //       acc[school.schoolId] = school.current_yearly_budget || 0;
  //       return acc;
  //     },
  //     {}
  //   );
  //   const updated = { ...editingBudgets };
  //   selectedSchools.forEach((schoolId) => {
  //     updated[schoolId] = initialBudgets[schoolId];
  //   });
  //   setEditingBudgets(updated);
  //   setShowResetConfirm(false);
  //   toast.info("Selected budgets reset to original values");
  // };

  const totalSelected = useMemo(
    () =>
      selectedSchools.reduce(
        (sum: number, id) => sum + (Number(editingBudgets[id]) || 0),
        0
      ),
    [selectedSchools, editingBudgets]
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const resetAllChanges = () => {
    const initialBudgets = schools.reduce(
      (acc, school) => ({
        ...acc,
        [school.schoolId]: school.current_yearly_budget || 0,
      }),
      {}
    );
    setEditingBudgets(initialBudgets);
    toast.info("All budget changes reset");
  };

  const clearSelection = () => {
    setSelectedSchools([]);
  };

  // Individual budget save function
  const saveIndividualBudget = async (schoolId: string, yearlyBudget: number) => {
    setIsSaving(true);
    try {
      const allocation = {
        school_id: String(schoolId),
        yearly_budget: parseFloat(yearlyBudget.toFixed(2)),
      };

      // Create or update budget allocation for the current year
      await api.post("/budget-allocations/batch-create/", { 
        year: currentYear,
        allocations: [allocation]
      });

      // Update local state
      setEditingBudgets(prev => ({
        ...prev,
        [schoolId]: yearlyBudget
      }));

      // Show success message
      const school = schools.find(s => s.schoolId === schoolId);
      setIndividualSaveMessage(`Budget allocation updated successfully for ${school?.schoolName || schoolId}`);
      setShowIndividualSuccessDialog(true);
      setTimeout(() => setShowIndividualSuccessDialog(false), 3000);

      // Refresh data to get updated allocation status
      await fetchData();
    } catch (error: any) {
      console.error("Error updating individual budget:", error);
      toast.error(
        `Failed to update budget: ${
          error.response?.data?.message || error.message
        }`
      );
    } finally {
      setIsSaving(false);
    }
  };

  // 4. Enhance saveBudgets with validation
  const saveBudgets = async () => {
    if (selectedSchools.length === 0) {
      toast.error("Please select at least one school to save");
      return;
    }

    setIsSaving(true);
    try {
      const allocations = selectedSchools.map((schoolId) => {
        const yearlyBudget = Number(editingBudgets[schoolId]) || 0;

        return {
          school_id: String(schoolId),
          yearly_budget: parseFloat(yearlyBudget.toFixed(2)),
        };
      });

      // Create or update budget allocations for the current year
      await api.post("/budget-allocations/batch-create/", { 
        year: currentYear,
        allocations 
      });
      setShowSuccessDialog(true);
      setTimeout(() => setShowSuccessDialog(false), 3000);

      // Refresh data
      await fetchData();
      setSelectedSchools([]);
    } catch (error: any) {
      console.error("Error updating budgets:", error);
      toast.error(
        `Failed to update budgets: ${
          error.response?.data?.message || error.message
        }`
      );
    } finally {
      setIsSaving(false);
      setShowSaveConfirm(false);
    }
  };


  // Save confirmation dialog
  const SaveConfirmationDialog = () => (
    <Dialog open={showSaveConfirm} onOpenChange={setShowSaveConfirm}>
      <DialogContent className="w-full max-w-md rounded-lg bg-white dark:bg-gray-800 p-0 overflow-hidden shadow-2xl border border-gray-200 dark:border-gray-700">
        <div className="bg-gradient-to-r from-brand-50 to-gray-50 dark:from-gray-700 dark:to-gray-800 px-6 py-5 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-2.5 rounded-lg bg-brand-100/80 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Confirm Yearly Budget Changes
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                You're about to update yearly budgets for {selectedSchools.length}{" "}
                schools
              </p>
            </div>
          </div>
        </div>
        <div className="space-y-4 px-6 py-5">
          <div className="text-gray-600 dark:text-gray-300">
            The total change will be {formatCurrency(totalDifference)}.
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700/50 px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
          <Button
            variant="outline"
            onClick={() => setShowSaveConfirm(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={saveBudgets}
            disabled={isSaving || totalDifference === 0}
            className="px-4 py-2 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 dark:from-brand-700 dark:to-brand-600 dark:hover:from-brand-800 dark:hover:to-brand-700 text-white shadow-sm"
          >
            {isSaving ? "Saving..." : "Confirm Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

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
    setFilterDistrict("");
    setFilterDistrictOptions([]);
  }, [filterLegislativeDistrict, legislativeDistricts]);

  useEffect(() => {
    if (filterMunicipality && municipalityDistricts[filterMunicipality]) {
      setFilterDistrictOptions(municipalityDistricts[filterMunicipality]);
    } else {
      setFilterDistrictOptions([]);
    }
    setFilterDistrict("");
  }, [filterMunicipality]);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line
  }, [filterLegislativeDistrict, filterMunicipality, filterDistrict]);
  // Modify the filters panel to include the new toggle and filter
  const renderFiltersPanel = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border border-gray-200 rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
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
      <div className="space-y-2">
        <Label htmlFor="filter-municipality" className="text-sm font-medium">
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
      <div className="space-y-2">
        <Label htmlFor="filter-district" className="text-sm font-medium">
          District
        </Label>
        <select
          id="filter-district"
          value={filterDistrict}
          onChange={(e) => setFilterDistrict(e.target.value)}
          className="h-11 w-full appearance-none rounded-lg border-2 border-gray-300 bg-transparent px-4 py-2.5 pr-11 text-sm shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
          disabled={!filterMunicipality}
        >
          <option value="">All</option>
          {filterDistrictOptions.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>
      {/* New filter for can request next month */}
      {/* <div className="space-y-2">
        <Label className="text-sm font-medium">Request Status</Label>
        <div className="flex gap-2 items-center">
          <select
            value={
              filterCanRequest === null
                ? ""
                : filterCanRequest
                ? "true"
                : "false"
            }
            onChange={(e) =>
              setFilterCanRequest(
                e.target.value === "" ? null : e.target.value === "true"
              )
            }
            className="h-11 w-full appearance-none rounded-lg border-2 border-gray-300 bg-transparent px-4 py-2.5 pr-11 text-sm shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
          >
            <option value="">All Schools</option>
            <option value="true">Can Request Next Month</option>
            <option value="false">Cannot Request Yet</option>
          </select>
        </div>
      </div> */}
      <div className="md:col-span-3 flex justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setFilterLegislativeDistrict("");
            setFilterMunicipality("");
            setFilterDistrict("");
            setFilterCanRequest(null);
          }}
          startIcon={<X className="size-4" />}
        >
          Clear Filters
        </Button>
      </div>
    </div>
  );
  return (
    <div className="container mx-auto rounded-2xl bg-white px-5 pb-5 pt-5 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
      <PageBreadcrumb pageTitle="Yearly Budget Allocation" />

      {/* Individual Success Dialog */}
      <Dialog open={showIndividualSuccessDialog} onOpenChange={setShowIndividualSuccessDialog}>
        <DialogContent className="w-full max-w-sm rounded-xl bg-white dark:bg-gray-800 p-6 shadow-xl border-0">
          {/* Main Content Container */}
          <div className="flex flex-col items-center text-center space-y-4">
            {/* Animated Checkmark Icon */}
            <div className="relative mb-2">
              <div className="absolute inset-0 bg-green-100 dark:bg-green-900/20 rounded-full scale-110 animate-pulse"></div>
              <CheckCircle className="relative h-12 w-12 text-green-500 dark:text-green-400 animate-scale-in" />
            </div>

            {/* Header Section */}
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white leading-tight">
                Budget Updated Successfully
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                {individualSaveMessage}
              </p>
            </div>

            {/* Action Indicator */}
            <div className="pt-2">
              <div className="flex items-center justify-center space-x-1 text-xs text-gray-500 dark:text-gray-400">
                <span className="animate-pulse">•</span>
                <span>Closing automatically</span>
              </div>
            </div>
          </div>

          {/* Animated Progress Bar */}
          <div className="mt-4 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
            <div className="bg-green-500 h-1.5 rounded-full animate-progress"></div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="w-full max-w-sm rounded-xl bg-white dark:bg-gray-800 p-6 shadow-xl border-0">
          {/* Main Content Container */}
          <div className="flex flex-col items-center text-center space-y-4">
            {/* Animated Checkmark Icon */}
            <div className="relative mb-2">
              <div className="absolute inset-0 bg-green-100 dark:bg-green-900/20 rounded-full scale-110 animate-pulse"></div>
              <CheckCircle className="relative h-12 w-12 text-green-500 dark:text-green-400 animate-scale-in" />
            </div>

            {/* Header Section */}
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white leading-tight">
                Yearly Budgets Updated Successfully
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                School yearly budgets have been updated and saved to the system.
              </p>
            </div>

            {/* Action Indicator */}
            <div className="pt-2">
              <div className="flex items-center justify-center space-x-1 text-xs text-gray-500 dark:text-gray-400">
                <span className="animate-pulse">•</span>
                <span>Closing automatically</span>
              </div>
            </div>
          </div>

          {/* Animated Progress Bar */}
          <div className="mt-4 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
            <div className="bg-green-500 h-1.5 rounded-full animate-progress"></div>
          </div>
        </DialogContent>
      </Dialog>

      <SaveConfirmationDialog />

      <div className="mt-8">
        <div className="mb-6 bg-brand-50 dark:bg-brand-900/10 p-4 rounded-lg border border-brand-100 dark:border-brand-900/20">
          <Disclosure>
            {({ open }) => (
              <div>
                <DisclosureButton
                  className="flex w-full items-center justify-between p-3 text-left text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                  aria-label="Resource allocation guide"
                >
                  <div className="flex items-center gap-2">
                    <Info className="h-5 w-5 flex-shrink-0 text-brand-600 dark:text-brand-400" />
                    <span className="font-medium text-brand-800 dark:text-brand-200">
                      How to allocate yearly budgets
                    </span>
                  </div>
                  <ChevronDownIcon
                    className={`h-4 w-4 text-brand-600 dark:text-brand-400 transition-transform duration-200 ${
                      open ? "rotate-180" : ""
                    }`}
                  />
                </DisclosureButton>
                <Transition
                  enter="transition duration-100 ease-out"
                  enterFrom="transform opacity-0 -translate-y-2"
                  enterTo="transform opacity-100 translate-y-0"
                  leave="transition duration-75 ease-out"
                  leaveFrom="transform opacity-100 translate-y-0"
                  leaveTo="transform opacity-0 -translate-y-2"
                >
                  <Disclosure.Panel className="px-4 pb-3 pt-1 text-sm text-brand-700 dark:text-brand-300 border-t border-brand-100 dark:border-brand-900/20">
                    <ol className="list-decimal list-inside space-y-2 text-brand-700 dark:text-brand-300">
                      <li>
                        <strong>Individual Allocation:</strong> Click the "View" button on any school row to open the budget allocation dialog
                      </li>
                      <li>
                        <strong>Budget Entry:</strong> Enter the yearly budget amount in the dialog or use quick adjustment buttons (+₱10K, +₱50K, etc.)
                      </li>
                      <li>
                        <strong>Review Changes:</strong> The system shows current vs. new budget amounts and calculates monthly budgets automatically
                      </li>
                      <li>
                        <strong>Save Changes:</strong> Click "Add Budget Allocation" for new schools or "Update Budget Allocation" for existing ones
                      </li>
                      <li>
                        <strong>Filters & Search:</strong> Use the search bar and filters to find specific schools by name, district, or municipality
                      </li>
                    </ol>
                  </Disclosure.Panel>
                </Transition>
              </div>
            )}
          </Disclosure>
        </div>


        {/* Search and Controls */}
        <div className="flex flex-col gap-4">
          {/* Top controls row */}
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Search */}
            <div className="relative w-full md:flex-1">
              <Input
                type="text"
                placeholder={`Search schools (min ${MIN_SEARCH_LENGTH} chars)...`}
                value={searchTerm}
                onChange={handleSearchChange}
                className="pl-10"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-400">
                {searchTerm.length > 0 &&
                searchTerm.length < MIN_SEARCH_LENGTH ? (
                  <span className="text-yellow-600 dark:text-yellow-400">
                    Type {MIN_SEARCH_LENGTH - searchTerm.length} more
                  </span>
                ) : (
                  `${totalSchools} schools`
                )}
              </span>
            </div>
            {/* Filters button */}
            <div className="flex gap-4 items-center">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                startIcon={<Filter className="size-4" />}
              >
                Filters
              </Button>
              {/* Items per page */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                  Items per page:
                </label>
                <select
                  value={itemsPerPage.toString()}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 h-11"
                >
                  {ITEMS_PER_PAGE_OPTIONS.map((num) => (
                    <option key={num} value={num}>
                      Show {num}
                    </option>
                  ))}
                </select>
              </div>
              {/* Add this new Reset All Changes button */}
            </div>
          </div>
          {/* Filters panel */}
          {showFilters && renderFiltersPanel()}
        </div>

        {/* Summary Bar */}
        {selectedSchools.length > 0 && (
          <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 mb-6 py-3 px-4 shadow-sm">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {selectedSchools.length} school(s) selected • Total:{" "}
                {formatCurrency(totalSelected)} • Change:{" "}
                <span
                  className={
                    totalDifference > 0
                      ? "text-green-600"
                      : totalDifference < 0
                      ? "text-red-600"
                      : "text-gray-500"
                  }
                >
                  {formatCurrency(Math.abs(totalDifference))}
                  {totalDifference !== 0 && (totalDifference > 0 ? "↑" : "↓")}
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={clearSelection}
                  variant="outline"
                  size="sm"
                  startIcon={<X className="size-4" />}
                >
                  Clear Selection
                </Button>
                <Button
                  variant="outline"
                  onClick={resetAllChanges}
                  startIcon={<Undo2 className="size-4" />}
                >
                  Reset All
                </Button>
                <Button
                  type="button"
                  onClick={() => setShowSaveConfirm(true)}
                  variant="primary"
                  disabled={isSaving || totalDifference === 0}
                  className="min-w-[120px]"
                >
                  {isSaving ? "Saving..." : "Save Selected"}
                </Button>
              </div>
            </div>
          </div>
        )}
        {/* School Budget Allocation Table */}
        <div className="mb-6 mt-8">
          <SchoolBudgetAllocationTable
            schools={sortedSchools}
            selectedSchools={selectedSchools}
            editingBudgets={editingBudgets}
            onSaveIndividualBudget={saveIndividualBudget}
            formatCurrency={formatCurrency}
            loading={loading}
            error={null}
            isSaving={isSaving}
            sortConfig={sortConfig}
            requestSort={requestSort}
          />
        </div>
        {/* Pagination */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Page {currentPage} of {totalPages} • {totalSchools} total schools
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={() => goToPage(1)}
              disabled={currentPage === 1}
              variant="outline"
              size="sm"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              variant="outline"
              size="sm"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-1">
              {Array.from(
                {
                  length: Math.min(5, totalPages),
                },
                (_, i) => {
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
                      type="button"
                      key={pageNum}
                      onClick={() => goToPage(pageNum)}
                      variant={currentPage === pageNum ? "primary" : "outline"}
                      size="sm"
                    >
                      {pageNum}
                    </Button>
                  );
                }
              )}
            </div>
            <Button
              type="button"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages || totalPages === 0}
              variant="outline"
              size="sm"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              onClick={() => goToPage(totalPages)}
              disabled={currentPage === totalPages || totalPages === 0}
              variant="outline"
              size="sm"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResourceAllocation;
