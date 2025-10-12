import React, { useState, useEffect, useMemo } from "react";
import api from "@/api/axios";
import { toast } from "react-toastify";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import { Disclosure, DisclosureButton, Transition } from "@headlessui/react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { municipalityDistricts } from "@/lib/constants";
import {
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Info,
  CheckCircle,
  Filter,
  ChevronDownIcon,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import SchoolLiquidationDatesTable from "@/components/tables/BasicTables/SchoolLiquidationDatesTable";

const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100];
const MIN_SEARCH_LENGTH = 3;
const SEARCH_DEBOUNCE_MS = 500;

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

type School = {
  schoolId: string;
  schoolName: string;
  current_monthly_budget: number;
  current_yearly_budget: number;
  municipality: string;
  district: { districtId: string; districtName: string; is_active?: boolean; legislativeDistrict?: string; municipality?: string; };
  legislativeDistrict: string;
  is_active: boolean;
  hasUnliquidated?: boolean;
  last_liquidated_month: number | null;
  last_liquidated_year: number | null;
  hasAllocation?: boolean;
  districtId: string;
};

const LastLiquidationDatesPage: React.FC = () => {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalSchools, setTotalSchools] = useState(0);
  const [editingLiquidationDates, setEditingLiquidationDates] = useState<{
    [schoolId: string]: { month: number | null; year: number | null };
  }>({});
  const [showFilters, setShowFilters] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showIndividualSuccessDialog, setShowIndividualSuccessDialog] = useState(false);
  const [individualSaveMessage, setIndividualSaveMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);
  const [filterLegislativeDistrict, setFilterLegislativeDistrict] = useState<string>("");
  const [filterMunicipality, setFilterMunicipality] = useState<string>("");
  const [filterDistrict, setFilterDistrict] = useState<string>("");
  const [legislativeDistricts, setLegislativeDistricts] = useState<{
    [key: string]: string[];
  }>({});
  const [legislativeDistrictOptions, setLegislativeDistrictOptions] = useState<string[]>([]);
  const [filterMunicipalityOptions, setFilterMunicipalityOptions] = useState<string[]>([]);
  const [filterDistrictOptions, setFilterDistrictOptions] = useState<string[]>([]);


  const fetchBacklogData = async (schoolIds: string[]) => {
    try {
      const res = await api.get("requests/", {
        params: {
          status: ["approved", "downloaded", "pending", "unliquidated"].join(","),
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

      // Fetch schools and districts in parallel (like ManageSchools.tsx)
      const [schoolsRes, districtsRes] = await Promise.all([
        api.get("schools/", { params }),
        api.get("school-districts/?show_all=true"),
      ]);

      let schoolsData = schoolsRes.data.results || schoolsRes.data;
      const districtsData = districtsRes.data.results || districtsRes.data;
      
      // Create a mapping of district IDs to names with proper typing (like ManageSchools.tsx)
      const districtMap: Record<
        string,
        { districtName: string; is_active: boolean }
      > = districtsData.reduce(
        (
          acc: Record<string, { districtName: string; is_active: boolean }>,
          district: any
        ) => {
          acc[district.districtId] = {
            districtName: district.districtName,
            is_active: district.is_active ?? true,
          };
          return acc;
        },
        {} as Record<string, { districtName: string; is_active: boolean }>
      );

      const schoolIds = schoolsData.map((school: any) => school.schoolId);
      const backlogData = await fetchBacklogData(schoolIds);

      const schoolsWithBacklog = schoolsData.map((school: any) => {
        const hasUnliquidated = backlogData.has(school.schoolId);
        const hasAllocation = school.current_yearly_budget > 0;
        
        // Enhance schools data with district names (like ManageSchools.tsx)
        const enhancedSchool = {
          ...school,
          hasUnliquidated,
          hasAllocation,
          district: school.district
            ? {
                districtId: school.district,
                districtName: districtMap[school.district]?.districtName || "",
                is_active: districtMap[school.district]?.is_active ?? true,
              }
            : { districtId: "", districtName: "", is_active: true },
        };
        
        return enhancedSchool;
      });

      setSchools(schoolsWithBacklog);
      setTotalSchools(schoolsRes.data.count ?? schoolsData.length);
    } catch (error) {
      console.error("Error fetching schools data:", error);
      setError("Failed to fetch schools data");
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
  }, [currentPage, itemsPerPage, debouncedSearch]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(handler);
  }, [searchTerm]);

  const sortedSchools = useMemo(() => {
    return [...schools];
  }, [schools]);

  const totalPages = Math.ceil(totalSchools / itemsPerPage);
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };



  const validateLiquidationDate = (month: number | null, year: number | null): string | null => {
    if (!month || !year) return null;
    
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    
    if (year > currentYear || (year === currentYear && month > currentMonth)) {
      return "Cannot set liquidation date in the future";
    }
    
    return null;
  };

  const isFutureMonth = (monthIndex: number, selectedYear: number | null): boolean => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    
    return selectedYear === currentYear && (monthIndex + 1) > currentMonth;
  };


  // Individual liquidation date save function
  const saveIndividualLiquidationDate = async (schoolId: string, month: number | null, year: number | null) => {
    setIsSaving(true);
    try {
      // Final validation before saving
      const validationError = validateLiquidationDate(month, year);
      if (validationError) {
        toast.error(validationError);
        return;
      }

      await api.patch(`schools/${schoolId}/liquidation-dates/`, {
        last_liquidated_month: month,
        last_liquidated_year: year
      });

      // Update the school in the local state
      setSchools(prev => prev.map(school => 
        school.schoolId === schoolId 
          ? { 
              ...school, 
              last_liquidated_month: month, 
              last_liquidated_year: year 
            }
          : school
      ));

      // Clear the editing state
      setEditingLiquidationDates(prev => {
        const newState = { ...prev };
        delete newState[schoolId];
        return newState;
      });

      // Show success message
      const school = schools.find(s => s.schoolId === schoolId);
      setIndividualSaveMessage(`Liquidation date updated successfully for ${school?.schoolName || schoolId}`);
      setShowIndividualSuccessDialog(true);
      setTimeout(() => setShowIndividualSuccessDialog(false), 3000);

      toast.success("Liquidation dates updated successfully");
    } catch (error: any) {
      console.error("Error updating liquidation dates:", error);
      toast.error(`Failed to update liquidation dates: ${error.response?.data?.error || error.message}`);
    } finally {
      setIsSaving(false);
    }
  };


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
  }, [filterLegislativeDistrict, filterMunicipality, filterDistrict]);

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
      <div className="md:col-span-3 flex justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setFilterLegislativeDistrict("");
            setFilterMunicipality("");
            setFilterDistrict("");
          }}
          startIcon={<X className="size-4" />}
        >
          Clear Filters
        </Button>
      </div>
    </div>
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  return (
    <div className="container mx-auto rounded-2xl bg-white px-5 pb-5 pt-5 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
      <PageBreadcrumb pageTitle="School Liquidation Dates" />

      {/* Individual Success Dialog */}
      <Dialog open={showIndividualSuccessDialog} onOpenChange={setShowIndividualSuccessDialog}>
        <DialogContent className="w-full max-w-md sm:max-w-md rounded-xl bg-white dark:bg-gray-800 p-0 shadow-2xl border-0 overflow-hidden">
          <DialogHeader className="px-6 py-5 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-green-50 to-gray-50 dark:from-green-900/20 dark:to-gray-800 rounded-t-xl">
            <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/40 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              Success
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400 mt-2">
              Liquidation date has been updated successfully
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 py-6 space-y-4">
            {/* Success Message */}
            <div className="text-center">
              <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed">
                {individualSaveMessage}
              </p>
            </div>

            {/* Auto-close Indicator */}
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Closing automatically in 3 seconds</span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
              <div className="bg-green-500 h-1.5 rounded-full animate-progress"></div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="w-full max-w-md sm:max-w-md rounded-xl bg-white dark:bg-gray-800 p-0 shadow-2xl border-0 overflow-hidden">
          <DialogHeader className="px-6 py-5 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-green-50 to-gray-50 dark:from-green-900/20 dark:to-gray-800 rounded-t-xl">
            <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/40 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              Success
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400 mt-2">
              Liquidation dates have been updated successfully
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 py-6 space-y-4">
            {/* Success Message */}
            <div className="text-center">
              <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed">
                School liquidation dates have been updated and saved to the system.
              </p>
            </div>

            {/* Auto-close Indicator */}
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Closing automatically in 3 seconds</span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
              <div className="bg-green-500 h-1.5 rounded-full animate-progress"></div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="mt-8">
        <div className="mb-6 bg-brand-50 dark:bg-brand-900/10 p-4 rounded-lg border border-brand-100 dark:border-brand-900/20">
          <Disclosure>
            {({ open }) => (
              <div>
                <DisclosureButton
                  className="flex w-full items-center justify-between p-3 text-left text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                  aria-label="Liquidation dates guide"
                >
                  <div className="flex items-center gap-2">
                    <Info className="h-5 w-5 flex-shrink-0 text-brand-600 dark:text-brand-400" />
                    <span className="font-medium text-brand-800 dark:text-brand-200">
                      How to manage liquidation dates
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
                    <ol className="list-decimal list-inside space-y-1 text-brand-700 dark:text-brand-300">
                      <li>Click on the "View" button in the Actions column to edit liquidation dates</li>
                      <li>Select the last month and year when the school liquidated their funds</li>
                      <li>Future dates are not allowed - only past liquidation dates can be set</li>
                      <li>Click "Save Changes" to confirm your updates</li>
                      <li>The liquidation status will update automatically based on the dates</li>
                    </ol>
                  </Disclosure.Panel>
                </Transition>
              </div>
            )}
          </Disclosure>
        </div>

        {/* Search and Controls */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
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
            <div className="flex gap-4 items-center">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                startIcon={<Filter className="size-4" />}
              >
                Filters
              </Button>
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
            </div>
          </div>
          {showFilters && renderFiltersPanel()}
        </div>


        {/* School Liquidation Dates Table */}
        <div className="mb-6 mt-8">
          <SchoolLiquidationDatesTable
            schools={sortedSchools}
            selectedSchools={[]}
            editingLiquidationDates={editingLiquidationDates}
            onSaveIndividualLiquidationDate={saveIndividualLiquidationDate}
            onSchoolSelection={() => {}}
            onSelectAll={() => {}}
            isFutureMonth={isFutureMonth}
            monthNames={monthNames}
            loading={loading}
            error={error}
            isSaving={isSaving}
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

export default LastLiquidationDatesPage;
