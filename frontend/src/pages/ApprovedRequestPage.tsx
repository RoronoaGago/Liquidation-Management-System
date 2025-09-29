/* eslint-disable @typescript-eslint/no-explicit-any */

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Button from "@/components/ui/button/Button";
import PrioritySubmissionsTable from "@/components/tables/BasicTables/PrioritySubmissionsTable";
import Badge from "@/components/ui/badge/Badge";
import { handleExport, handleServerSideExport } from "@/lib/pdfHelpers";
import {
  CheckCircle,
  XCircle,
  Download,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  Clock,
  RefreshCw,
  AlertCircle,
  ArrowDownCircle,
  Filter,
} from "lucide-react";
import Input from "@/components/form/input/InputField";
import api from "@/api/axios";
import { Submission, School } from "@/lib/types";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { toast } from "react-toastify";
import { format } from "date-fns";
import { DatePicker } from "antd";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { formatDateTime } from "@/lib/helpers";

dayjs.extend(customParseFormat);

// Helper function to map role keys to display names
function getRoleDisplayName(roleKey: string): string {
  const roleMap: Record<string, string> = {
    admin: "Administrator",
    school_head: "School Head",
    school_admin: "School Administrative Assistant",
    district_admin: "District Administrative Assistant",
    superintendent: "Division Superintendent",
    liquidator: "Liquidator",
    accountant: "Division Accountant",
  };
  return roleMap[roleKey] || roleKey;
}

const statusLabels: Record<string, string> = {
  approved: "Approved",
  rejected: "Rejected",
  pending: "Pending",
  downloaded: "Downloaded",
  unliquidated: "Unliquidated",
  liquidated: "Liquidated",
  advanced: "Advanced",
};

const statusColors: Record<string, string> = {
  approved:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  pending:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  downloaded:
    "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  unliquidated:
    "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  liquidated:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  advanced:
    "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
};

const statusIcons: Record<string, React.ReactNode> = {
  approved: <CheckCircle className="h-4 w-4" />,
  rejected: <XCircle className="h-4 w-4" />,
  pending: <Clock className="h-4 w-4" />,
  downloaded: <ArrowDownCircle className="h-4 w-4" />,
  unliquidated: <AlertCircle className="h-4 w-4" />,
  liquidated: <CheckCircle className="h-4 w-4" />,
  advanced: <RefreshCw className="h-4 w-4 animate-spin" />,
};

const { RangePicker } = DatePicker;

const ApprovedRequestPage = () => {
  // State for submissions and modal
  const [viewedSubmission, setViewedSubmission] = useState<Submission | null>(
    null
  );
  const [submissionsState, setSubmissionsState] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const location = useLocation();
  const [, setSchools] = useState<School[]>([]);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDownloadDate, setSelectedDownloadDate] =
    useState<dayjs.Dayjs | null>(null);

  // Tabs: Accountant view uses two tabs like superintendent
  const [activeTab, setActiveTab] = useState<"approved" | "history">(
    "approved"
  );

  // Confirmation dialog state
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [submissionToApprove, setSubmissionToApprove] =
    useState<Submission | null>(null);

  // Pagination, search, and sort state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [filterOptions, setFilterOptions] = useState({
    searchTerm: "",
    status: "",
    school: "",
    district: "",
    legislative_district: "",
    municipality: "",
    start_date: "",
    end_date: "",
  });
  const [filterStatus, setFilterStatus] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [legislativeDistricts, setLegislativeDistricts] = useState<{
    [key: string]: string[];
  }>({});
  const [legislativeDistrictOptions, setLegislativeDistrictOptions] = useState<
    string[]
  >([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [filterLegislativeDistrict, setFilterLegislativeDistrict] =
    useState("");
  const [filterMunicipality, setFilterMunicipality] = useState("");
  const [filterDistrict, setFilterDistrict] = useState("");
  const [filterMunicipalityOptions, setFilterMunicipalityOptions] = useState<
    string[]
  >([]);
  const [filterDistrictOptions, setFilterDistrictOptions] = useState<string[]>(
    []
  );
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc";
  } | null>({ key: "created_at", direction: "desc" });
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch submissions and schools from backend
  const fetchSubmissions = async () => {
    setLoading(true);
    setError(null);
    try {
      // Determine statuses per active tab
      let statusParam = "";
      let defaultOrdering = "-created_at";
      if (activeTab === "approved") {
        statusParam = "approved";
      } else {
        // History for accountant: downloaded, unliquidated, liquidated
        statusParam = "downloaded,unliquidated,liquidated";
        defaultOrdering = "-created_at";
      }

      const params: any = {
        status: statusParam,
        ordering: sortConfig
          ? `${sortConfig.direction === "desc" ? "-" : ""}${sortConfig.key}`
          : defaultOrdering,
      };

      if (filterOptions.searchTerm) params.search = filterOptions.searchTerm;
      if (filterOptions.school) params.school_ids = filterOptions.school;
      if (filterOptions.start_date)
        params.start_date = filterOptions.start_date;
      if (filterOptions.end_date) params.end_date = filterOptions.end_date;
      if (filterOptions.legislative_district) {
        params.legislative_district = filterOptions.legislative_district;
      }
      if (filterOptions.municipality) {
        params.municipality = filterOptions.municipality;
      }
      if (filterOptions.district) {
        params.district = filterOptions.district;
      }

      const res = await api.get(`requests/`, { params });

      const submissionsData = res.data.results || res.data || [];
      setSubmissionsState(submissionsData);

      // Fetch schools for filter dropdown
      const schoolRes = await api.get("schools/");
      setSchools(schoolRes.data.results || schoolRes.data || []);
    } catch (err: any) {
      console.error("Failed to fetch submissions:", err);
      setError("Failed to fetch submissions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, [
    activeTab,
    filterOptions.school,
    filterOptions.district,
    filterOptions.start_date,
    filterOptions.end_date,
    filterOptions.legislative_district,
    filterOptions.municipality,
    filterOptions.searchTerm,
    sortConfig?.key,
    sortConfig?.direction,
  ]);

  // Auto-open modal when navigated with a specific requestId
  useEffect(() => {
    const state = (location && (location as any).state) || {};
    const requestedId = state?.requestId as string | undefined;
    if (requestedId && submissionsState.length > 0) {
      const match = submissionsState.find((s) => s.request_id === requestedId);
      if (match) {
        setViewedSubmission(match);
      } else {
        // If not in current page data, try fetch single item and open
        (async () => {
          try {
            const res = await api.get(`requests/${requestedId}/`);
            setViewedSubmission(res.data);
          } catch (e) {
            // Ignore
          }
        })();
      }
    }
  }, [location, submissionsState]);

  // Load legislative districts and districts for filters
  useEffect(() => {
    const fetchLegislativeDistrictsAndDistricts = async () => {
      try {
        const legislativeResponse = await api.get("/school-districts/");
        const legislativeDistrictsData =
          legislativeResponse.data.results || legislativeResponse.data;

        const map: { [key: string]: string[] } = {};
        (legislativeDistrictsData || []).forEach((d: any) => {
          if (d.legislativeDistrict) {
            if (!map[d.legislativeDistrict]) map[d.legislativeDistrict] = [];
            if (
              d.municipality &&
              !map[d.legislativeDistrict].includes(d.municipality)
            ) {
              map[d.legislativeDistrict].push(d.municipality);
            }
          }
        });
        setLegislativeDistricts(map);
        setLegislativeDistrictOptions(Object.keys(map));

        const districtsResponse = await api.get(
          "school-districts/?show_all=true"
        );
        const districtsData =
          districtsResponse.data.results || districtsResponse.data;
        setDistricts(Array.isArray(districtsData) ? districtsData : []);
      } catch (error) {
        console.error(
          "Failed to fetch legislative districts or districts:",
          error
        );
      }
    };
    fetchLegislativeDistrictsAndDistricts();
  }, []);

  // Sync derived filter option selections
  useEffect(() => {
    setFilterOptions((prev: any) => ({
      ...prev,
      legislative_district: filterLegislativeDistrict,
      municipality: filterMunicipality,
      district: filterDistrict,
      status: filterStatus,
    }));
    setCurrentPage(1);
  }, [
    filterLegislativeDistrict,
    filterMunicipality,
    filterDistrict,
    filterStatus,
  ]);

  // Update municipality options when legislative district changes
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
  }, [filterLegislativeDistrict, legislativeDistricts]);

  // Update district options when municipality changes
  useEffect(() => {
    if (filterMunicipality) {
      const districtsForMunicipality = districts
        .filter((d) => d.municipality === filterMunicipality && d.is_active)
        .map((d) => d.districtId);
      setFilterDistrictOptions(districtsForMunicipality);
    } else {
      setFilterDistrictOptions([]);
    }
    setFilterDistrict("");
  }, [filterMunicipality, districts]);

  // Approve handler (should call backend in real app)
  const handleApprove = async (
    submission: Submission,
    downloadDate?: string
  ) => {
    try {
      setDownloadLoading(true);
      const payload = downloadDate ? { download_date: downloadDate } : {};
      
      console.log('Submitting with payload:', payload);
      console.log('Request ID:', submission.request_id);
      
      await api.post(
        `requests/${submission.request_id}/submit-liquidation/`,
        payload
      );
      setViewedSubmission(null);
      toast.success(
        `Fund request #${submission.request_id} from ${submission.user.first_name} ${submission.user.last_name} has been downloaded.`
      );
      fetchSubmissions();
    } catch (err: any) {
      console.error("Failed to submit for liquidation:", err);
      console.error("Error response:", err.response?.data);
      
      // Extract error message from response
      const errorMessage = err.response?.data?.error || 
                          err.response?.data?.message || 
                          "Failed to submit for liquidation. Please try again.";
      
      // Show detailed error for debugging
      const detailedError = `Error: ${errorMessage}\nRequest ID: ${submission.request_id}\nDownload Date: ${downloadDate || 'Not provided'}\nBackend Date: ${err.response?.data?.backend_date || 'Unknown'}`;
      
      toast.error(detailedError);
    } finally {
      setDownloadLoading(false);
      setSelectedDownloadDate(null);
    }
  };

  // Debounce search
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setCurrentPage(1); // Reset to first page on search
    }, 400);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [filterOptions.searchTerm]);

  // Filtering logic
  const filteredSubmissions = useMemo(() => {
    let filtered = submissionsState;
    if (filterOptions.searchTerm) {
      const term = filterOptions.searchTerm.toLowerCase();
      filtered = filtered.filter((submission) => {
        const userName =
          `${submission.user.first_name} ${submission.user.last_name}`.toLowerCase();
        const school = (submission.user.school?.schoolName || "").toLowerCase();
        return (
          userName.includes(term) ||
          school.includes(term) ||
          submission.priorities.some((p) =>
            p.priority.expenseTitle.toLowerCase().includes(term)
          ) ||
          submission.status.toLowerCase().includes(term) ||
          submission.request_id.toLowerCase().includes(term)
        );
      });
    }
    if (filterOptions.status) {
      filtered = filtered.filter((s) => s.status === filterOptions.status);
    }
    if (filterOptions.school) {
      filtered = filtered.filter(
        (s) =>
          s.user.school &&
          String(s.user.school.schoolId) === filterOptions.school
      );
    }
    return filtered;
  }, [submissionsState, filterOptions]);

  // Sorting logic
  const sortedSubmissions = useMemo(() => {
    if (!sortConfig) return filteredSubmissions;
    return [...filteredSubmissions].sort((a, b) => {
      if (sortConfig.key === "created_at") {
        const aDate = new Date(a.created_at).getTime();
        const bDate = new Date(b.created_at).getTime();
        return sortConfig.direction === "asc" ? aDate - bDate : bDate - aDate;
      }
      if (sortConfig.key === "request_id") {
        return sortConfig.direction === "asc"
          ? a.request_id.localeCompare(b.request_id)
          : b.request_id.localeCompare(a.request_id);
      }
      if (sortConfig.key === "status") {
        return sortConfig.direction === "asc"
          ? a.status.localeCompare(b.status)
          : b.status.localeCompare(a.status);
      }
      if (sortConfig.key === "school") {
        const aSchool = a.user.school?.schoolName || "";
        const bSchool = b.user.school?.schoolName || "";
        return sortConfig.direction === "asc"
          ? aSchool.localeCompare(bSchool)
          : bSchool.localeCompare(aSchool);
      }
      if (sortConfig.key === "submitted_by") {
        const aName = `${a.user.first_name} ${a.user.last_name}`;
        const bName = `${b.user.first_name} ${b.user.last_name}`;
        return sortConfig.direction === "asc"
          ? aName.localeCompare(bName)
          : bName.localeCompare(aName);
      }
      return 0;
    });
  }, [filteredSubmissions, sortConfig]);

  const requestSort = (key: string) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key) {
      direction = sortConfig.direction === "asc" ? "desc" : "asc";
    }
    setSortConfig({ key, direction });
  };

  // Pagination
  const totalPages = Math.ceil(sortedSubmissions.length / itemsPerPage);
  const currentItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedSubmissions.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedSubmissions, currentPage, itemsPerPage]);

  // Pagination controls
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <PageBreadcrumb pageTitle="Division Accountant - Requests" />

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          className={`px-4 py-2 font-medium ${
            activeTab === "approved"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-500"
          }`}
          onClick={() => setActiveTab("approved")}
        >
          Approved Requests
        </button>
        <button
          className={`px-4 py-2 font-medium ${
            activeTab === "history"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-500"
          }`}
          onClick={() => setActiveTab("history")}
        >
          Request History
        </button>
      </div>

      {/* Search, Filters, and Items Per Page */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-6">
        <div className="flex flex-col md:flex-row gap-2 w-full">
          <div className="relative w-full">
            <Input
              type="text"
              placeholder="Search submissions..."
              value={filterOptions.searchTerm}
              onChange={(e) =>
                setFilterOptions((prev) => ({
                  ...prev,
                  searchTerm: e.target.value,
                }))
              }
              className="pl-10 "
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          </div>
        </div>
        <div className="flex gap-4 w-full md:w-auto items-center">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            startIcon={<Filter className="size-4" />}
          >
            Filters
          </Button>

          <label className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
            Items per page:
          </label>
          <select
            value={itemsPerPage.toString()}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 h-11"
          >
            {[5, 10, 20, 50].map((num) => (
              <option key={num} value={num}>
                Show {num}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border border-gray-200 rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700 mb-6">
          {/* Status filter only on history tab */}
          {activeTab === "history" && (
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="filter-status">
                Status
              </label>
              <select
                id="filter-status"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="h-11 w-full appearance-none rounded-lg border-2 border-gray-300 bg-transparent px-4 py-2.5 pr-11 text-sm shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
              >
                <option value="">All Statuses</option>
                <option value="downloaded">Downloaded</option>
                <option value="unliquidated">Unliquidated</option>
                <option value="liquidated">Liquidated</option>
              </select>
            </div>
          )}

          {/* Legislative District */}
          <div className="space-y-2">
            <label
              className="text-sm font-medium"
              htmlFor="filter-legislative-district"
            >
              Legislative District
            </label>
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

          {/* Municipality */}
          <div className="space-y-2">
            <label
              className="text-sm font-medium"
              htmlFor="filter-municipality"
            >
              Municipality
            </label>
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

          {/* District */}
          <div className="space-y-2">
            <label
              className="text-sm font-medium"
              htmlFor="filter-school-district"
            >
              School District
            </label>
            <select
              id="filter-school-district"
              value={filterDistrict}
              onChange={(e) => setFilterDistrict(e.target.value)}
              className="h-11 w-full appearance-none rounded-lg border-2 border-gray-300 bg-transparent px-4 py-2.5 pr-11 text-sm shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
              disabled={!filterMunicipality}
            >
              <option value="">All Districts</option>
              {filterDistrictOptions.map((districtId) => {
                const d = districts.find((dd) => dd.districtId === districtId);
                return (
                  <option key={districtId} value={districtId}>
                    {d?.districtName}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Date Range */}
          <div className="space-y-2 md:col-span-3">
            <label className="text-sm font-medium">Date Range</label>
            <div className="flex items-center gap-2">
              <RangePicker
                onChange={(dates: any, dateStrings: [string, string]) => {
                  if (!dates || !dates[0] || !dates[1]) {
                    setFilterOptions((prev) => ({
                      ...prev,
                      start_date: "",
                      end_date: "",
                    }));
                    return;
                  }
                  const [start, end] = dates;
                  if (start.isAfter(end)) {
                    toast.error("End date must be after start date");
                    return;
                  }
                  const maxRange = 365;
                  if (end.diff(start, "days") > maxRange) {
                    toast.error(`Date range cannot exceed ${maxRange} days`);
                    return;
                  }
                  setFilterOptions((prev) => ({
                    ...prev,
                    start_date: dateStrings[0],
                    end_date: dateStrings[1],
                  }));
                }}
                value={
                  filterOptions.start_date && filterOptions.end_date
                    ? [
                        dayjs(filterOptions.start_date),
                        dayjs(filterOptions.end_date),
                      ]
                    : null
                }
                disabledDate={(current) =>
                  current && current > dayjs().endOf("day")
                }
                format="YYYY-MM-DD"
                style={{ width: "100%", maxWidth: "300px" }}
              />
            </div>
          </div>

          <div className="md:col-span-3 flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFilterLegislativeDistrict("");
                setFilterMunicipality("");
                setFilterDistrict("");
                setFilterStatus("");
                setFilterOptions((prev: any) => ({
                  ...prev,
                  district: "",
                  legislative_district: "",
                  municipality: "",
                  start_date: "",
                  end_date: "",
                }));
              }}
            >
              Clear Filters
            </Button>
          </div>
        </div>
      )}
      {/* Table */}
      <PrioritySubmissionsTable
        submissions={currentItems}
        onView={setViewedSubmission}
        loading={loading}
        error={error}
        sortConfig={sortConfig}
        requestSort={requestSort}
        activeTab={activeTab === "approved" ? "pending" : "history"}
        currentUserRole={user?.role}
      />
      {/* Pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Showing{" "}
          {currentItems.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}{" "}
          to {Math.min(currentPage * itemsPerPage, filteredSubmissions.length)}{" "}
          of {filteredSubmissions.length} entries
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
      {/* Modal for viewing priorities and actions */}
      <Dialog
        open={!!viewedSubmission}
        onOpenChange={() => setViewedSubmission(null)}
      >
        <DialogContent className="w-full max-w-[90vw] lg:max-w-5xl rounded-lg bg-white dark:bg-gray-800 p-6 shadow-xl">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-2xl font-bold text-gray-800 dark:text-white">
              Priority Submission Details
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              Review and manage this priority submission
            </DialogDescription>
          </DialogHeader>

          {viewedSubmission && (
            <div className="space-y-6">
              {/* Sender Details Card */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50/50 dark:bg-gray-900/30 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Left section: Request ID, Submitted by, Approved by */}
                  <div className="space-y-3 col-span-2">
                    <div className="flex items-start">
                      <span className="font-medium text-gray-700 dark:text-gray-300 w-32 flex-shrink-0">
                        Request ID:
                      </span>
                      <span className="font-mono text-gray-900 dark:text-white break-all min-w-0">
                        {viewedSubmission.request_id}
                      </span>
                    </div>
                    {/* Submitted by with role */}
                    <div className="flex items-center">
                      <span className="font-medium text-gray-700 dark:text-gray-300 w-32 flex-shrink-0">
                        Submitted by:
                      </span>
                      <span className="text-gray-900 dark:text-white">
                        {viewedSubmission.user.first_name}{" "}
                        {viewedSubmission.user.last_name}
                        <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                          ({getRoleDisplayName(viewedSubmission.user.role)})
                        </span>
                      </span>
                    </div>
                    {/* Approved by with role */}
                    {viewedSubmission.status === "approved" &&
                      viewedSubmission.reviewed_by && (
                        <div className="flex items-center">
                          <span className="font-medium text-gray-700 dark:text-gray-300 w-32 flex-shrink-0">
                            Approved by:
                          </span>
                          <span className="text-gray-900 dark:text-white">
                            {viewedSubmission.reviewed_by.first_name}{" "}
                            {viewedSubmission.reviewed_by.last_name}
                            <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                              (
                              {getRoleDisplayName(
                                viewedSubmission.reviewed_by.role
                              )}
                              )
                            </span>
                          </span>
                        </div>
                      )}
                  </div>
                  {/* Right section: School, Status */}
                  <div className="space-y-1">
                    <div className="flex items-center">
                      <span className="font-medium text-gray-700 dark:text-gray-300 w-28 flex-shrink-0">
                        School:
                      </span>
                      <span className="text-gray-900 dark:text-white">
                        {viewedSubmission.user.school?.schoolName || "N/A"}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <span className="font-medium text-gray-700 dark:text-gray-300 w-28 flex-shrink-0">
                        Status:
                      </span>
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium w-fit min-w-[90px] justify-center ${
                            statusColors[
                              viewedSubmission.status?.toLowerCase?.()
                            ] ||
                            "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                          }`}
                          style={{
                            maxWidth: "140px",
                            whiteSpace: "nowrap",
                            textOverflow: "ellipsis",
                            overflow: "hidden",
                          }}
                        >
                          {
                            statusIcons[
                              viewedSubmission.status?.toLowerCase?.()
                            ]
                          }
                          {statusLabels[
                            viewedSubmission.status?.toLowerCase?.()
                          ] ||
                            viewedSubmission.status.charAt(0).toUpperCase() +
                              viewedSubmission.status.slice(1)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Submitted at: {formatDateTime(viewedSubmission.created_at)}
                  </span>
                  {/* Approved at under Submitted at */}
                  {viewedSubmission.status === "approved" &&
                    viewedSubmission.date_approved && (
                      <span className="block text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Approved at:{" "}
                        {formatDateTime(viewedSubmission.date_approved)}
                      </span>
                    )}
                </div>
              </div>

              {/* Priorities Table */}
              <div className="space-y-2">
                <h3 className="font-semibold text-lg text-gray-800 dark:text-white">
                  List of Priorities
                </h3>
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Expense
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Amount
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {viewedSubmission.priorities.map((priority, idx) => (
                          <tr
                            key={idx}
                            className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                          >
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">
                              {priority.priority.expenseTitle}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-mono text-gray-900 dark:text-white">
                              ₱
                              {Number(priority.amount).toLocaleString(
                                undefined,
                                {
                                  minimumFractionDigits: 2,
                                }
                              )}
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-gray-50/50 dark:bg-gray-700/30 font-semibold">
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">
                            TOTAL
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-mono text-gray-900 dark:text-white">
                            ₱
                            {viewedSubmission.priorities
                              .reduce((sum, p) => sum + Number(p.amount), 0)
                              .toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                              })}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button
                  type="button"
                  variant="outline"
                  onClick={async () => {
                    const result = await handleServerSideExport(
                      viewedSubmission
                    );
                    if (result.success) {
                      toast.success(
                        result.message || "PDF generated successfully!"
                      );
                    } else {
                      toast.error(result.error || "Failed to generate PDF");
                    }
                  }}
                  startIcon={<Download className="w-4 h-4" />}
                  className="order-1 sm:order-none"
                >
                  {viewedSubmission.status === "approved" ||
                  viewedSubmission.status === "unliquidated"
                    ? "Download Official PDF"
                    : "Export PDF"}
                </Button>

                {/* ✅ Fixed logic - show Download Fund button for approved requests in accountant view */}
                {viewedSubmission.status === "approved" && (
                  <div className="flex gap-3 order-0 sm:order-1">
                    <Button
                      type="button"
                      variant="success"
                      onClick={() => {
                        setSubmissionToApprove(viewedSubmission);
                        setShowDatePicker(true);
                        // Set default to today, but ensure it's within valid range
                        const today = dayjs();
                        const approvedDate = viewedSubmission?.date_approved ? dayjs(viewedSubmission.date_approved) : today;
                        const oneYearBeforeApproval = approvedDate.subtract(1, 'year');
                        
                        // Use today if it's valid, otherwise use approval date
                        let defaultDate = today;
                        
                        // Only fall back to approval date if today is before the approval date
                        // or if today is more than 1 year before approval
                        if (today.isBefore(approvedDate, 'day') || today.isBefore(oneYearBeforeApproval, 'day')) {
                          defaultDate = approvedDate;
                        }
                        
                        setSelectedDownloadDate(defaultDate);
                      }}
                      startIcon={<CheckCircle className="w-4 h-4" />}
                      disabled={downloadLoading}
                      loading={downloadLoading}
                    >
                      {viewedSubmission.status === "approved"
                        ? "Download Fund"
                        : "Update Liquidation"}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      {/* Date Picker Confirmation Dialog */}
      <Dialog open={showDatePicker} onOpenChange={setShowDatePicker}>
        <DialogContent className="focus:outline-none">
          <DialogHeader>
            <DialogTitle>Select Download Date</DialogTitle>
            <DialogDescription>
              Please select the date when the funds were downloaded.
              <br />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Valid dates: From 1 year before approval date up to tomorrow (accounts for timezone differences)
              </span>
              <br />
              <span className="text-xs text-blue-600 dark:text-blue-400">
                System date: {dayjs().format('YYYY-MM-DD')} | Selected: {selectedDownloadDate?.format('YYYY-MM-DD') || 'None'}
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 mb-6">
            <DatePicker
              className="w-full p-4"
              value={selectedDownloadDate}
              onChange={(date) => {
                setSelectedDownloadDate(date);
              }}
              placeholder="Select download date"
              allowClear={false}
              disabledDate={(current) => {
                if (!submissionToApprove?.date_approved) return false;
                const approvedDate = dayjs(submissionToApprove.date_approved);
                const today = dayjs();
                
                // Allow dates from approval date up to today (inclusive)
                // Also allow some reasonable past dates (up to 1 year back from approval date)
                const oneYearBeforeApproval = approvedDate.subtract(1, 'year');
                
                // Disable future dates (more than 1 day after today to account for timezone differences)
                if (current && current.isAfter(today.add(1, 'day'), 'day')) {
                  return true;
                }
                
                // Disable dates before 1 year before approval
                if (current && current.isBefore(oneYearBeforeApproval, 'day')) {
                  return true;
                }
                
                return false;
              }}
              format="MMMM D, YYYY"
              style={{
                padding: "8px",
                fontFamily: "Outfit, sans-serif",
              }}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowDatePicker(false);
                setSelectedDownloadDate(null);
              }}
              disabled={downloadLoading}
            >
              Cancel
            </Button>
            <Button
              variant="success"
              onClick={async () => {
                if (submissionToApprove && selectedDownloadDate) {
                  // Validate date before submitting
                  const today = dayjs();
                  const approvedDate = dayjs(submissionToApprove.date_approved);
                  const oneYearBeforeApproval = approvedDate.subtract(1, 'year');
                  
                  if (selectedDownloadDate.isAfter(today.add(1, 'day'), 'day')) {
                    toast.error("Download date cannot be more than 1 day in the future");
                    return;
                  }
                  
                  if (selectedDownloadDate.isBefore(oneYearBeforeApproval, 'day')) {
                    toast.error("Download date cannot be more than 1 year before approval date");
                    return;
                  }
                  
                  await handleApprove(
                    submissionToApprove,
                    selectedDownloadDate.format("YYYY-MM-DD")
                  );
                  setShowDatePicker(false);
                }
              }}
              disabled={downloadLoading || !selectedDownloadDate}
              startIcon={
                downloadLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : null
              }
            >
              {downloadLoading ? "Processing..." : "Confirm Download"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Approve Confirmation Dialog */}
      <Dialog open={showApproveConfirm} onOpenChange={setShowApproveConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Download</DialogTitle>
            <DialogDescription>
              Are you sure you want to download this fund request? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setShowApproveConfirm(false)}
              disabled={downloadLoading}
            >
              Cancel
            </Button>
            <Button
              variant="success"
              onClick={async () => {
                if (submissionToApprove) {
                  await handleApprove(submissionToApprove);
                  setShowApproveConfirm(false);
                }
              }}
              disabled={downloadLoading}
              startIcon={
                downloadLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : null
              }
            >
              {downloadLoading ? "Processing..." : "Confirm Download"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ApprovedRequestPage;
