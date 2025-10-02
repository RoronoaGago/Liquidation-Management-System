/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import React, { useState, useMemo, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import PrioritySubmissionsTable from "@/components/tables/BasicTables/PrioritySubmissionsTable";
import { handleExport, handleServerSideExport } from "@/lib/pdfHelpers";
import {
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  ArrowDownCircle,
  AlertCircle,
  Download,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  AlertTriangleIcon,
  Loader2Icon,
  ArrowUp,
  ArrowDown,
  PlusCircle,
  MinusCircle,
  BadgeCheck,
  FileDiff,
  Info,
  Eye,
  EyeOff,
  Calendar,
  X,
  Filter,
  Loader2,
} from "lucide-react";
import Input from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import api from "@/api/axios";
import { Submission, School, Priority, Prayoridad } from "@/lib/types";
import { useAuth } from "@/context/AuthContext";
import { toast } from "react-toastify";
import { format } from "date-fns";
import { DatePicker } from "antd";
import dayjs from "dayjs";
import { statusColors, statusLabels } from "@/lib/constants";
import Label from "@/components/form/Label";
import { formatDateTime } from "@/lib/helpers";

const { RangePicker } = DatePicker;

type HistoryItem = {
  priorities: Prayoridad[];
  status: string;
  rejection_comment?: string;
  rejection_date?: string;
  created_at: string;
  user: Submission["user"];
  request_id: string;
  [key: string]: any;
};

type PriorityDiff = {
  LOPID: number;
  expenseTitle: string;
  prevAmount?: number;
  currAmount?: number;
  change: "added" | "removed" | "increased" | "decreased" | "unchanged";
};

const getPriorityDiffs = (
  prev: Prayoridad[] = [],
  curr: Prayoridad[] = []
): PriorityDiff[] => {
  const prevMap = new Map<number, number>();
  prev.forEach((p) => {
    const LOPID = p.LOPID || 0;
    const amount = Number(p.amount != null ? p.amount : 0);
    prevMap.set(LOPID, amount);
  });

  const currMap = new Map<number, number>();
  curr.forEach((p) => {
    const LOPID = p.LOPID || 0;
    const amount = Number(p.amount != null ? p.amount : 0);
    currMap.set(LOPID, amount);
  });

  const allLOPIDs = Array.from(
    new Set([...Array.from(prevMap.keys()), ...Array.from(currMap.keys())])
  );

  return allLOPIDs.map((LOPID) => {
    const prevAmount = prevMap.get(LOPID);
    const currAmount = currMap.get(LOPID);

    const priority = [...prev, ...curr].find((p) => p.LOPID === LOPID);
    const expenseTitle = priority?.expenseTitle || "Unknown";

    let change: PriorityDiff["change"] = "unchanged";

    if (prevAmount == null && currAmount != null) {
      change = "added";
    } else if (prevAmount != null && currAmount == null) {
      change = "removed";
    } else if (prevAmount != null && currAmount != null) {
      if (prevAmount < currAmount) {
        change = "increased";
      } else if (prevAmount > currAmount) {
        change = "decreased";
      } else {
        change = "unchanged";
      }
    }

    return {
      expenseTitle,
      LOPID,
      prevAmount,
      currAmount,
      change,
    };
  });
};

const PriortySubmissionsPage = () => {
  const [activeTab, setActiveTab] = useState<"pending" | "history">("pending");
  const [viewedSubmission, setViewedSubmission] = useState<Submission | null>(
    null
  );
  const location = useLocation();
  const navigate = useNavigate();
  const [submissionHistory, setSubmissionHistory] = useState<
    HistoryItem[] | null
  >(null);
  const [showAllDiffs, setShowAllDiffs] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [submissionsState, setSubmissionsState] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const [schools, setSchools] = useState<School[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [actionLoading, setActionLoading] = useState<
    "approve" | "reject" | null
  >(null);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [submissionToReject, setSubmissionToReject] =
    useState<Submission | null>(null);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [legislativeDistricts, setLegislativeDistricts] = useState<{
    [key: string]: string[];
  }>({});
  const [legislativeDistrictOptions, setLegislativeDistrictOptions] = useState<
    string[]
  >([]);
  const [submissionToApprove, setSubmissionToApprove] =
    useState<Submission | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [filterOptions, setFilterOptions] = useState({
    searchTerm: "",
    status: "",
    school: "",
    district: "",
    legislative_district: "", // Add this
    municipality: "", // Add this
    start_date: "",
    end_date: "",
  });
  const [filterStatus, setFilterStatus] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  // Add these state variables near your other state declarations

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

  const statusIcons: Record<string, React.ReactNode> = {
    approved: <CheckCircle className="h-4 w-4" />,
    rejected: <XCircle className="h-4 w-4" />,
    pending: <Clock className="h-4 w-4" />,
    downloaded: <ArrowDownCircle className="h-4 w-4" />,
    unliquidated: <AlertCircle className="h-4 w-4" />,
    liquidated: <CheckCircle className="h-4 w-4" />,
    advanced: <RefreshCw className="h-4 w-4 animate-spin" />,
  };

  // In PriortySubmissionsPage.tsx - Update the fetchSubmissions function

  const fetchSubmissions = async () => {
    setLoading(true);
    setError(null);
    try {
      let statusParam: string;
      let defaultOrdering = "-created_at"; // Default ordering

      if (activeTab === "pending") {
        statusParam = "pending";
      } else if (activeTab === "history") {
        // For history tab, get approved and later statuses, ordered by date_approved
        statusParam = "approved,downloaded,unliquidated,liquidated";
        // Order by date_approved descending to get latest approved at top
        defaultOrdering = "-date_approved"; // Latest approved first
      } else {
        statusParam = "";
      }

      const params: any = {
        status: statusParam,
        ordering: sortConfig
          ? `${sortConfig.direction === "desc" ? "-" : ""}${sortConfig.key}`
          : defaultOrdering, // Use default ordering for history tab
      };

      // Add filters to params - backend will handle the complex filtering
      if (filterOptions.searchTerm) params.search = filterOptions.searchTerm;
      if (filterOptions.school) params.school_ids = filterOptions.school;
      if (filterOptions.start_date)
        params.start_date = filterOptions.start_date;
      if (filterOptions.end_date) params.end_date = filterOptions.end_date;

      // FIXED: Ensure proper parameter names match your backend
      if (filterOptions.legislative_district) {
        params.legislative_district = filterOptions.legislative_district;
      }
      if (filterOptions.municipality) {
        params.municipality = filterOptions.municipality;
      }
      if (filterOptions.district) {
        params.district = filterOptions.district;
      }

      console.log("API params being sent:", params); // Debug log

      const res = await api.get(`requests/`, { params });

      const submissionsData = res.data.results || res.data || [];
      console.log("API response:", submissionsData); // Debug log

      // For history tab, ensure it's sorted by date_approved descending
      if (activeTab === "history") {
        submissionsData.sort((a: any, b: any) => {
          const aDate = a.date_approved
            ? new Date(a.date_approved)
            : new Date(0);
          const bDate = b.date_approved
            ? new Date(b.date_approved)
            : new Date(0);
          return bDate.getTime() - aDate.getTime(); // Latest first
        });
      }

      setSubmissionsState(submissionsData);

      // Fetch schools for display purposes (not filtering)
      const schoolRes = await api.get("schools/");
      setSchools(schoolRes.data.results || schoolRes.data || []);
    } catch (err: any) {
      console.error("Failed to fetch submissions:", err);
      console.error("Error response:", err.response?.data); // Debug log
      setError("Failed to fetch submissions");
      setSubmissionsState([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    setFilterOptions((prev) => ({
      ...prev,
      status: filterStatus,
    }));
    setCurrentPage(1);
  }, [filterStatus]);
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
    filterOptions.searchTerm, // Add this since it's backend filtered now
  ]);

  // Auto-open a specific request modal when navigated with state { requestId }
  useEffect(() => {
    const requestId = (location.state as any)?.requestId as string | undefined;
    if (!requestId) return;
    const match = submissionsState.find((s) => s.request_id === requestId);
    if (match) {
      setViewedSubmission(match);
      // Clear state so it doesn't reopen on close/back
      navigate(location.pathname, { replace: true });
    }
  }, [location.state, submissionsState, navigate, location.pathname]);
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
  // Add these state variables near your other state declarations
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

  // Fetch request history when viewing a submission
  useEffect(() => {
    const fetchHistory = async () => {
      if (!viewedSubmission) {
        setSubmissionHistory(null);
        setLoadingHistory(false);
        return;
      }
      setLoadingHistory(true);
      try {
        const res = await api.get(
          `/requests/${viewedSubmission.request_id}/history/`
        );
        setSubmissionHistory(res.data as HistoryItem[]);
      } catch (err) {
        setSubmissionHistory(null);
      } finally {
        setLoadingHistory(false);
      }
    };
    fetchHistory();
  }, [viewedSubmission]);

  // Add this useEffect near your other useEffect hooks
  useEffect(() => {
    const fetchLegislativeDistrictsAndDistricts = async () => {
      try {
        // Fetch legislative districts
        const legislativeResponse = await api.get("/school-districts/");
        const legislativeDistrictsData =
          legislativeResponse.data.results || legislativeResponse.data;

        const legislativeDistrictsMap: { [key: string]: string[] } = {};

        legislativeDistrictsData.forEach((district: any) => {
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

        // Fetch districts for filter options
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
  // Debounce search
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setCurrentPage(1);
    }, 400);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [filterOptions.searchTerm]);
  // Replace your current filter options useEffect with this:
  useEffect(() => {
    setFilterOptions((prev: any) => ({
      ...prev,
      legislative_district: filterLegislativeDistrict,
      municipality: filterMunicipality,
      district: filterDistrict,
    }));
    setCurrentPage(1);
  }, [filterLegislativeDistrict, filterMunicipality, filterDistrict]);
  // Update sortConfig when activeTab changes
  useEffect(() => {
    setSortConfig({
      key: activeTab === "history" ? "date_approved" : "created_at",
      direction: "desc",
    });
  }, [activeTab]);
  // Approve handler
  const handleApprove = async (submission: Submission) => {
    setActionLoading("approve");
    try {
      await api.put(`requests/${submission.request_id}/approve/`, {
        status: "approved",
      });
      setViewedSubmission(null);
      toast.success(
        `Fund request #${submission.request_id} from ${submission.user.first_name} ${submission.user.last_name} has been approved.`
      );
      await fetchSubmissions();
    } catch (err) {
      console.error("Failed to approve submission:", err);
      toast.error("Failed to approve submission. Please try again.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (submission: Submission, reason: string) => {
    setActionLoading("reject");
    try {
      await api.put(`requests/${submission.request_id}/reject/`, {
        status: "rejected",
        rejection_comment: reason,
      });
      setViewedSubmission(null);
      setIsRejectDialogOpen(false);
      setRejectionReason("");
      toast.success(`Request #${submission.request_id} has been rejected.`);
      await fetchSubmissions();
    } catch (err) {
      console.error("Failed to reject submission:", err);
      toast.error("Failed to reject submission. Please try again.");
    } finally {
      setActionLoading(null);
    }
  };

  // Reject handler
  const handleRejectClick = (submission: Submission) => {
    setSubmissionToReject(submission);
    setRejectionReason("");
    setIsRejectDialogOpen(true);
  };

  const filteredSubmissions = useMemo(() => {
    let filtered = Array.isArray(submissionsState) ? submissionsState : [];

    // Search term filter - keep this as it's working
    if (filterOptions.searchTerm) {
      const term = filterOptions.searchTerm.toLowerCase();
      filtered = filtered.filter((submission) => {
        const userName =
          `${submission.user.first_name} ${submission.user.last_name}`.toLowerCase();
        const school = (submission.user.school?.schoolName || "").toLowerCase();
        return (
          userName.includes(term) ||
          school.includes(term) ||
          submission.priorities.some((p: Priority) =>
            p.priority.expenseTitle.toLowerCase().includes(term)
          ) ||
          submission.status.toLowerCase().includes(term) ||
          submission.request_id.toLowerCase().includes(term)
        );
      });
    }

    // Status filter - keep this as it's working
    if (filterOptions.status) {
      filtered = filtered.filter((s) => s.status === filterOptions.status);
    }

    // REMOVE ALL OTHER FILTERS since backend handles them
    // The issue is you're double-filtering - backend + frontend

    return filtered;
  }, [submissionsState, filterOptions.searchTerm, filterOptions.status]);

  console.log(filteredSubmissions);
  // Sorting logic - add proper null checks
  const sortedSubmissions = useMemo(() => {
    // Ensure filteredSubmissions is always an array before processing
    const submissions = Array.isArray(filteredSubmissions)
      ? filteredSubmissions
      : [];

    if (!sortConfig || submissions.length === 0) {
      return submissions;
    }

    return [...submissions].sort((a, b) => {
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
    setSortConfig((prev) => {
      if (prev && prev.key === key) {
        return {
          key,
          direction: prev.direction === "asc" ? "desc" : "asc",
        };
      }
      return { key, direction: "desc" };
    });
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

  // Helper: get previous rejected state for a resubmission
  const getPreviousRejected = (
    history: HistoryItem[] | null
  ): HistoryItem | null => {
    if (!history || history.length < 2) return null;
    return (
      history.find((item, idx) => idx !== 0 && item.status === "rejected") ||
      null
    );
  };

  // Helper: get human friendly date
  function formatDateString(dateStr?: string) {
    if (!dateStr) return "N/A";
    try {
      return format(new Date(dateStr), "MMM dd, yyyy hh:mm a");
    } catch {
      return dateStr;
    }
  }

  // UI for the diff table
  function HistoryComparisonTable({
    prev,
    curr,
    showAll = false,
  }: {
    prev: Prayoridad[] | undefined;
    curr: Prayoridad[] | undefined;
    showAll?: boolean;
  }) {
    const diffs = getPriorityDiffs(prev, curr);
    const hasChanged = diffs.some((d) => d.change !== "unchanged");
    const shownDiffs = showAll
      ? diffs
      : diffs.filter((d) => d.change !== "unchanged");
    return (
      <div>
        <div className="flex items-center mb-2 gap-2 ml-2">
          <FileDiff className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <span className="font-semibold text-blue-800 dark:text-blue-200">
            Resubmission Changes
          </span>
          <span
            className={`ml-2 px-2 py-0.5 text-xs rounded-full font-medium ${
              hasChanged
                ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200"
                : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200"
            }`}
          >
            {hasChanged
              ? `${shownDiffs.length} change${
                  shownDiffs.length !== 1 ? "s" : ""
                }`
              : "No changes"}
          </span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowAllDiffs((s) => !s)}
            className="flex items-center gap-1 ml-2"
            startIcon={
              showAll ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )
            }
          >
            {showAll ? "Show Only Changes" : "Show All"}
          </Button>
        </div>
        <div className="overflow-x-auto border rounded-lg custom-scrollbar">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-2 text-left">Expense</th>
                <th className="px-4 py-2 text-right">Previous Amount</th>
                <th className="px-4 py-2 text-right">Current Amount</th>
                <th className="px-4 py-2 text-center">Change</th>
              </tr>
            </thead>
            <tbody>
              {shownDiffs.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-gray-500">
                    No changes detected.
                  </td>
                </tr>
              )}
              {shownDiffs.map((diff) => (
                <tr key={diff.LOPID} className="border-b last:border-b-0">
                  <td className="px-4 py-3 font-medium">{diff.expenseTitle}</td>
                  <td className="px-4 py-3 text-right">
                    {diff.prevAmount != null ? (
                      <span
                        className={
                          diff.change === "removed"
                            ? "line-through text-red-500"
                            : diff.change === "decreased"
                            ? "text-red-700 font-semibold"
                            : diff.change === "increased"
                            ? "text-yellow-700"
                            : undefined
                        }
                      >
                        ₱
                        {diff.prevAmount.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    ) : (
                      <span className="text-gray-400 italic">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {diff.currAmount != null ? (
                      <span
                        className={
                          diff.change === "added"
                            ? "text-green-600 font-semibold"
                            : diff.change === "increased"
                            ? "text-green-700 font-semibold"
                            : diff.change === "decreased"
                            ? "text-yellow-700"
                            : undefined
                        }
                      >
                        ₱
                        {diff.currAmount.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    ) : (
                      <span className="text-gray-400 italic">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {
                      {
                        added: (
                          <span className="inline-flex items-center gap-1 text-green-700 font-semibold">
                            <PlusCircle className="h-4 w-4" /> Added
                          </span>
                        ),
                        removed: (
                          <span className="inline-flex items-center gap-1 text-red-600 font-semibold">
                            <MinusCircle className="h-4 w-4" /> Removed
                          </span>
                        ),
                        increased: (
                          <span className="inline-flex items-center gap-1 text-green-700 font-semibold">
                            <ArrowUp className="h-4 w-4" /> Increased
                          </span>
                        ),
                        decreased: (
                          <span className="inline-flex items-center gap-1 text-amber-700 font-semibold">
                            <ArrowDown className="h-4 w-4" /> Decreased
                          </span>
                        ),
                        unchanged: (
                          <span className="inline-flex items-center gap-1 text-gray-400">
                            <BadgeCheck className="h-4 w-4" /> Unchanged
                          </span>
                        ),
                      }[diff.change]
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Date range handler
  const handleDateRangeChange = (dates: any, dateStrings: [string, string]) => {
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
  };

  // Clear filters
  const clearFilters = () => {
    setFilterOptions({
      searchTerm: "",
      status: "",
      school: "",
      district: "",
      legislative_district: "",
      municipality: "",
      start_date: "",
      end_date: "",
    });
    setFilterLegislativeDistrict("");
    setFilterMunicipality("");
    setFilterDistrict("");
    setFilterStatus(""); // Add this line
    setCurrentPage(1);
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <PageBreadcrumb pageTitle="School Heads' Priority Submissions" />

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          className={`px-4 py-2 font-medium ${
            activeTab === "pending"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-500"
          }`}
          onClick={() => setActiveTab("pending")}
        >
          Pending Requests
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
      <div className="flex flex-col gap-4 mb-6">
        {/* Search and Basic Filters */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-1/2">
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
              className="pl-10"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          </div>

          {/* Items per page */}
          <div className="flex gap-4 w-full md:w-auto">
            {/* Filter Button */}
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              startIcon={<Filter className="size-4" />}
            >
              Filters
            </Button>

            <select
              value={itemsPerPage.toString()}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="min-w-[100px] px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
            >
              {[5, 10, 20, 50].map((num) => (
                <option key={num} value={num}>
                  {num} per page
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* School-based Filters - Similar to ManageSchools */}
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border border-gray-200 rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
            {/* Status Filter - Only show in history tab */}
            {activeTab === "history" && (
              <div className="space-y-2">
                <Label htmlFor="filter-status" className="text-sm font-medium">
                  Status
                </Label>
                <select
                  id="filter-status"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="h-11 w-full appearance-none rounded-lg border-2 border-gray-300 bg-transparent px-4 py-2.5 pr-11 text-sm shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                >
                  <option value="">All Statuses</option>
                  <option value="approved">Approved</option>
                  <option value="downloaded">Downloaded</option>
                  <option value="unliquidated">Unliquidated</option>
                  <option value="liquidated">Liquidated</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            )}
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

            {/* Date Range Filter - Keep this as requested */}
            <div className="space-y-2 md:col-span-3">
              <Label className="text-sm font-medium">Date Range</Label>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <RangePicker
                  onChange={handleDateRangeChange}
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
                  setFilterOptions((prev: any) => ({
                    ...prev,
                    district: "",
                    legislative_district: "",
                    municipality: "",
                    start_date: "",
                    end_date: "",
                  }));
                  setFilterStatus(""); // Add this line
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
      <PrioritySubmissionsTable
        submissions={currentItems}
        onView={setViewedSubmission}
        loading={loading}
        error={error}
        sortConfig={sortConfig}
        activeTab={activeTab}
        requestSort={requestSort}
        currentUserRole={user?.role}
      />

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Showing{" "}
          {currentItems.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}{" "}
          to {Math.min(currentPage * itemsPerPage, filteredSubmissions.length)}{" "}
          of {(filteredSubmissions || []).length} entries
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            variant="outline"
            size="sm"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
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
                  onClick={() => setCurrentPage(pageNum)}
                  variant={currentPage === pageNum ? "primary" : "outline"}
                  size="sm"
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>
          <Button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages || totalPages === 0}
            variant="outline"
            size="sm"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            onClick={() => setCurrentPage(totalPages)}
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
        <DialogContent className="w-full max-w-[95vw] xl:max-w-6xl rounded-lg bg-white dark:bg-gray-800 p-6 shadow-xl">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-2xl font-bold text-gray-800 dark:text-white">
              Priority Submission Details
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              Review and manage this priority submission
            </DialogDescription>
          </DialogHeader>
          {viewedSubmission && (
            <div className="space-y-6 max-h-[80vh] overflow-y-auto pr-2 custom-scrollbar">
              {/* Sender Details Card */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50/50 dark:bg-gray-900/30 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1 col-span-2">
                    <div className="flex items-start">
                      <span className="font-medium text-gray-700 dark:text-gray-300 w-32 flex-shrink-0">
                        Request ID:
                      </span>
                      <span className="font-mono text-gray-900 dark:text-white break-all min-w-0">
                        {viewedSubmission.request_id}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <span className="font-medium text-gray-700 dark:text-gray-300 w-32 flex-shrink-0">
                        Submitted by:
                      </span>
                      <span className="text-gray-900 dark:text-white">
                        {viewedSubmission.user.first_name}{" "}
                        {viewedSubmission.user.last_name}
                        <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                          (School Head)
                        </span>
                      </span>
                    </div>
                  </div>
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
                          className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 ${
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
                </div>
              </div>

              {/* Enhanced: Resubmission comparison */}
              {loadingHistory ? (
                <div className="flex items-center gap-2 text-gray-500 pl-2">
                  <Loader2Icon className="h-4 w-4 animate-spin" />
                  Loading submission history...
                </div>
              ) : (
                submissionHistory &&
                submissionHistory.length > 1 &&
                getPreviousRejected(submissionHistory) && (
                  <div className="border border-blue-200/80 dark:border-blue-800 rounded-xl p-5 bg-gradient-to-br from-blue-50/80 to-blue-100/30 dark:from-blue-950/20 dark:to-blue-900/10 shadow-sm backdrop-blur-sm">
                    {/* Header Section */}
                    <div className="flex items-start gap-3 mb-4 p-3 bg-white/50 dark:bg-blue-950/20 rounded-lg border border-blue-100 dark:border-blue-800/50">
                      <div className="flex-shrink-0 w-5 h-5 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center">
                        <Info className="h-3 w-3 text-blue-600 dark:text-blue-300" />
                      </div>
                      <div>
                        <span className="font-semibold text-blue-900 dark:text-blue-100 text-sm">
                          Resubmission Notice
                        </span>
                        <p className="text-blue-700 dark:text-blue-300 text-sm mt-1">
                          This is a resubmission. Below is a comparison with the
                          previous version.
                        </p>
                      </div>
                    </div>

                    {/* Rejection Summary Card */}
                    <div className="mb-5 bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex-shrink-0 w-6 h-6 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
                          <AlertTriangleIcon className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <span className="font-semibold text-amber-900 dark:text-amber-200 text-sm uppercase tracking-wide">
                          Previous Rejection Summary
                        </span>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-amber-800 dark:text-amber-300 bg-amber-100/50 dark:bg-amber-900/30 px-2 py-1 rounded">
                              Date Rejected
                            </span>
                            <span className="text-sm text-amber-900 dark:text-amber-200 font-medium">
                              {formatDateString(
                                getPreviousRejected(submissionHistory)
                                  ?.rejection_date
                              )}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-start gap-2">
                            <span className="text-xs font-medium text-amber-800 dark:text-amber-300 bg-amber-100/50 dark:bg-amber-900/30 px-2 py-1 rounded flex-shrink-0">
                              Reason
                            </span>
                            <span className="text-sm text-amber-900 dark:text-amber-200 leading-relaxed">
                              {
                                getPreviousRejected(submissionHistory)
                                  ?.rejection_comment
                              }
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Comparison Section */}
                    <div className="bg-white/30 dark:bg-blue-950/10 border border-blue-100 dark:border-blue-800/30 rounded-lg p-1">
                      <div className="flex items-center justify-between p-3 border-b border-blue-100 dark:border-blue-800/30">
                        <span className="font-semibold text-blue-900 dark:text-blue-100 text-sm">
                          Version Comparison
                        </span>
                        {/* Optional: Add a toggle button here if needed */}
                      </div>
                      <HistoryComparisonTable
                        prev={
                          getPreviousRejected(submissionHistory)?.priorities
                        }
                        curr={submissionHistory[0]?.priorities}
                        showAll={showAllDiffs}
                      />
                    </div>
                  </div>
                )
              )}

              {/* Priorities Table - updated */}
              <div className="space-y-2">
                <h3 className="font-semibold text-lg text-gray-800 dark:text-white">
                  List of Priorities
                </h3>
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider min-w-[200px] w-2/3">
                            Expense
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider min-w-[120px]">
                            Amount
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {viewedSubmission.priorities?.map(
                          (priority: Priority, idx: number) => (
                            <tr
                              key={idx}
                              className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                            >
                              <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200 max-w-[400px]">
                                <div className="line-clamp-2">
                                  {priority.priority.expenseTitle}
                                </div>
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
                          )
                        )}
                        <tr className="bg-gray-50/50 dark:bg-gray-700/30 font-semibold">
                          <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">
                            TOTAL
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-mono text-gray-900 dark:text-white">
                            ₱
                            {viewedSubmission.priorities
                              ?.reduce(
                                (sum, p: Priority) => sum + Number(p.amount),
                                0
                              )
                              ?.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                              }) || "0.00"}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Rejection details */}
              {viewedSubmission?.status === "rejected" &&
                viewedSubmission.rejection_comment && (
                  <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-900/30">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 pt-0.5">
                        <XCircle className="h-5 w-5 text-red-500 dark:text-red-400" />
                      </div>
                      <div>
                        <h4 className="font-medium text-red-800 dark:text-red-200">
                          Rejection Details
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Rejected on
                            </p>
                            <p className="text-red-700 dark:text-red-300">
                              {viewedSubmission.rejection_date
                                ? format(
                                    new Date(viewedSubmission.rejection_date),
                                    "MMM dd, yyyy hh:mm a"
                                  )
                                : "N/A"}
                            </p>
                          </div>
                        </div>
                        <div className="mt-3">
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Reason for rejection
                          </p>
                          <p className="text-red-700 dark:text-red-300 mt-1 bg-red-100/50 dark:bg-red-900/30 p-3 rounded-md">
                            {viewedSubmission.rejection_comment}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button
                  type="button"
                  variant="outline"
                  onClick={async () => {
                    // Use server-side PDF generation for approved requests
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
                  {viewedSubmission.status === "pending"
                    ? "Export PDF"
                    : "Download Official PDF"}
                </Button>

                {viewedSubmission.status === "pending" && (
                  <div className="flex gap-3 order-0 sm:order-1">
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => handleRejectClick(viewedSubmission)}
                      startIcon={<XCircle className="w-4 h-4" />}
                      disabled={
                        actionLoading === "approve" ||
                        actionLoading === "reject"
                      }
                      loading={actionLoading === "reject"}
                    >
                      Reject
                    </Button>
                    <Button
                      type="button"
                      variant="success"
                      onClick={() => {
                        setSubmissionToApprove(viewedSubmission);
                        setShowApproveConfirm(true);
                      }}
                      disabled={!!actionLoading}
                      startIcon={
                        actionLoading ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <CheckCircle className="h-5 w-5" />
                        )
                      }
                    >
                      {actionLoading ? "Approving..." : "Approve"}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Confirmation Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent className="w-full rounded-lg bg-white dark:bg-gray-800 p-6 shadow-xl">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-2xl font-bold text-gray-800 dark:text-white">
              Reject Submission
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              Please provide a reason for rejection
            </DialogDescription>
          </DialogHeader>
          {submissionToReject && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label
                  htmlFor="rejection-reason"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Rejection Reason
                </label>
                <textarea
                  id="rejection-reason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-800 dark:text-white"
                  rows={4}
                  placeholder="Explain why this request is being rejected..."
                  required
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsRejectDialogOpen(false);
                    setRejectionReason("");
                  }}
                  disabled={actionLoading === "reject"}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => {
                    if (rejectionReason.trim()) {
                      handleReject(submissionToReject, rejectionReason);
                    } else {
                      toast.error("Please provide a rejection reason");
                    }
                  }}
                  disabled={
                    !rejectionReason.trim() || actionLoading === "reject"
                  }
                  loading={actionLoading === "reject"}
                >
                  Confirm Rejection
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Approve Confirmation Dialog */}
      <Dialog open={showApproveConfirm} onOpenChange={setShowApproveConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Approval</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve this submission? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setShowApproveConfirm(false)}
              disabled={!!actionLoading}
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
              disabled={!!actionLoading}
              startIcon={
                actionLoading ? (
                  <Loader2Icon className="h-5 w-5 animate-spin" />
                ) : null
              }
            >
              {actionLoading === "approve"
                ? "Approving..."
                : "Confirm Approval"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PriortySubmissionsPage;
