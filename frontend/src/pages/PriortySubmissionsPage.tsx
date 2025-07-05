import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import PrioritySubmissionsTable from "@/components/tables/BasicTables/PrioritySubmissionsTable";
import { handleExport } from "@/lib/pdfHelpers";
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
} from "lucide-react";
import Input from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import api from "@/api/axios";
import { Submission, School } from "@/lib/types";
import { useAuth } from "@/context/AuthContext";
import { toast } from "react-toastify";
import { format } from "date-fns";

const PriortySubmissionsPage = () => {
  // State for submissions and modal
  const [viewedSubmission, setViewedSubmission] = useState<Submission | null>(
    null
  );
  const [rejectionReason, setRejectionReason] = useState("");
  const [submissionsState, setSubmissionsState] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const [, setSchools] = useState<School[]>([]);
  const [actionLoading, setActionLoading] = useState<
    "approve" | "reject" | null
  >(null);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [submissionToReject, setSubmissionToReject] =
    useState<Submission | null>(null);
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
  });
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
      const res = await api.get("requests/?status=pending");
      setSubmissionsState(res.data);
      // Fetch schools for filter dropdown
      console.log(res.data);
      const schoolRes = await api.get("schools/");
      setSchools(schoolRes.data);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error("Failed to fetch submissions:", err);
      setError("Failed to fetch submissions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, []);

  // Approve handler (should call backend in real app)
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

  // Reject handler (should call backend in real app)
  const handleRejectClick = (submission: Submission) => {
    setSubmissionToReject(submission);
    setRejectionReason(""); // Clear any previous reason
    setIsRejectDialogOpen(true);
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

  // Status badge mappings (shared with tables)
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

  return (
    <div className="container mx-auto px-4 py-6">
      <PageBreadcrumb pageTitle="School Heads' Priority Submissions" />
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
          {/* <select
            value={filterOptions.status}
            onChange={(e) =>
              setFilterOptions((prev) => ({ ...prev, status: e.target.value }))
            }
            className="min-w-[120px] px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <select
            value={filterOptions.school}
            onChange={(e) =>
              setFilterOptions((prev) => ({ ...prev, school: e.target.value }))
            }
            className="min-w-[120px] px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
          >
            <option value="">All Schools</option>
            {schools.map((school) => (
              <option key={school.schoolId} value={school.schoolId}>
                {school.schoolName}
              </option>
            ))}
          </select> */}
        </div>
        <div className="flex gap-4 w-full md:w-auto items-center">
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
      {/* Table */}
      <PrioritySubmissionsTable
        submissions={currentItems}
        onView={setViewedSubmission}
        loading={loading}
        error={error}
        sortConfig={sortConfig}
        requestSort={requestSort}
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
        <DialogContent className="w-full max-w-[90vw] lg:max-w-4xl rounded-lg bg-white dark:bg-gray-800 p-6 shadow-xl">
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
              {/* Sender Details Card - Improved for long IDs */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50/50 dark:bg-gray-900/30 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {" "}
                  {/* Changed to 3 columns */}
                  <div className="space-y-1 col-span-2">
                    {" "}
                    {/* Takes more space */}
                    <div className="flex items-start">
                      {" "}
                      {/* Changed to items-start */}
                      <span className="font-medium text-gray-700 dark:text-gray-300 w-32 flex-shrink-0">
                        Request ID:
                      </span>
                      <span className="font-mono text-gray-900 dark:text-white break-all min-w-0">
                        {" "}
                        {/* Added min-w-0 */}
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
                    Submitted at:{" "}
                    {new Date(viewedSubmission.created_at).toLocaleString()}
                  </span>
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
              {/* Add this block right here */}
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

              {viewedSubmission?.status === "pending" &&
                viewedSubmission.rejection_comment && (
                  <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-900/30">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 pt-0.5">
                        <AlertTriangleIcon className="h-5 w-5 text-yellow-500 dark:text-yellow-400" />
                      </div>
                      <div>
                        <h4 className="font-medium text-yellow-800 dark:text-yellow-200">
                          Previously Rejected
                        </h4>

                        <div className="mt-2">
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Previous rejection reason
                          </p>
                          <p className="text-yellow-700 dark:text-yellow-300 mt-1 bg-yellow-100/50 dark:bg-yellow-900/30 p-3 rounded-md">
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
                  onClick={() =>
                    handleExport(
                      viewedSubmission,
                      user?.first_name || "user",
                      user?.last_name || "name"
                    )
                  }
                  startIcon={<Download className="w-4 h-4" />}
                  className="order-1 sm:order-none"
                >
                  Export PDF
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
                      {loading ? "Processing..." : "Reject"}
                    </Button>
                    <Button
                      type="button"
                      variant="success"
                      onClick={() => {
                        setSubmissionToApprove(viewedSubmission);
                        setShowApproveConfirm(true);
                      }}
                      disabled={!!actionLoading}
                    >
                      Approve
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      {/* Reject Confirmation Dialog */}
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-700 dark:text-white"
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
                  disabled={!rejectionReason.trim()}
                >
                  Confirm Rejection
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Reason Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent className="w-full rounded-lg bg-white dark:bg-gray-800 p-6 shadow-xl">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-2xl font-bold text-gray-800 dark:text-white">
              Reject Submission
            </DialogTitle>
          </DialogHeader>
          {submissionToReject && (
            <div className="space-y-4">
              <p className="text-gray-600 dark:text-gray-400">
                Are you sure you want to reject the submission from{" "}
                <strong>
                  {submissionToReject.user.first_name}{" "}
                  {submissionToReject.user.last_name}
                </strong>
                ? This action cannot be undone.
              </p>
              <div className="flex flex-col">
                <label
                  htmlFor="rejection-reason"
                  className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Reason for Rejection
                </label>
                <textarea
                  id="rejection-reason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="border border-gray-300 dark:border-gray-700 rounded-lg p-2"
                  rows={4}
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsRejectDialogOpen(false);
                    setSubmissionToReject(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => {
                    handleReject(submissionToReject, rejectionReason);
                    setIsRejectDialogOpen(false);
                  }}
                >
                  Confirm Reject
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
              {actionLoading ? "Approving..." : "Confirm Approval"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PriortySubmissionsPage;
