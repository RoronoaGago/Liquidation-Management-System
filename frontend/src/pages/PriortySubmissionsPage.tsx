import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Button from "@/components/ui/button/Button";
import PrioritySubmissionsTable from "@/components/tables/BasicTables/PrioritySubmissionsTable";
import Badge from "@/components/ui/badge/Badge";
import { handleExport } from "@/lib/pdfHelpers";
import {
  CheckCircle,
  XCircle,
  Download,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import Input from "@/components/form/input/InputField";
import api from "@/api/axios";
import { Submission, School } from "@/lib/types";
import { useAuth } from "@/context/AuthContext";

const PriortySubmissionsPage = () => {
  // State for submissions and modal
  const [viewedSubmission, setViewedSubmission] = useState<Submission | null>(
    null
  );
  const [submissionsState, setSubmissionsState] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const [, setSchools] = useState<School[]>([]);

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
  const handleApprove = async (submission: Submission) => {
    try {
      await api.put(`requests/${submission.request_id}/`, {
        status: "approved",
      });
      setViewedSubmission(null); // Close the modal
      await fetchSubmissions(); // Refresh the list after approval
    } catch (err) {
      console.error("Failed to approve submission:", err);
    }
  };

  // Reject handler (should call backend in real app)
  const handleReject = async (submission: Submission) => {
    try {
      await api.put(`/api/requests/${submission.request_id}/`, {
        status: "rejected",
      });
      setViewedSubmission(null); // Close the modal
      setSubmissionsState((prev) =>
        prev.map((s) =>
          s.request_id === submission.request_id
            ? { ...s, status: "rejected" }
            : s
        )
      );
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err) {
      // handle error
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
        <DialogContent className="w-full rounded-lg bg-white dark:bg-gray-800 p-8 shadow-xl max-w-lg">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-2xl font-bold text-gray-800 dark:text-white">
              Priority Submission Details
            </DialogTitle>
          </DialogHeader>
          {viewedSubmission && (
            <div>
              <div className="space-y-2">
                {/* Sender Details Card */}
                <div className="border rounded-md p-4 bg-gray-50 dark:bg-gray-900/30">
                  <div className="flex flex-col gap-1">
                    <div>
                      <span className="font-semibold">Request ID:</span>{" "}
                      <span>{viewedSubmission.request_id}</span>
                    </div>
                    <div>
                      <span className="font-semibold">Submitted by:</span>{" "}
                      <span>
                        {viewedSubmission.user.first_name}{" "}
                        {viewedSubmission.user.last_name}
                      </span>
                      <span className="ml-2 text-sm text-gray-500">
                        (School Head)
                      </span>
                    </div>
                    <div className="text-sm text-gray-700 dark:text-gray-300">
                      <span className="font-semibold">School:</span>{" "}
                      {viewedSubmission.user.school?.schoolName || "N/A"}
                    </div>
                    <div>
                      <span className="font-semibold">Status:</span>{" "}
                      <Badge
                        color={
                          viewedSubmission.status === "pending"
                            ? "warning"
                            : viewedSubmission.status === "approved"
                            ? "success"
                            : "error"
                        }
                      >
                        {viewedSubmission.status.charAt(0).toUpperCase() +
                          viewedSubmission.status.slice(1)}
                      </Badge>
                    </div>
                    <div>
                      <span className="font-semibold">Submitted At:</span>{" "}
                      {new Date(viewedSubmission.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-6">
                <span className="font-semibold">List of Priorities:</span>
                <table className="w-full mt-2 border">
                  <thead>
                    <tr>
                      <th className="border px-2 py-1 text-left">Expense</th>
                      <th className="border px-2 py-1 text-center">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewedSubmission.priorities.map((priority, idx) => (
                      <tr key={idx}>
                        <td className="border px-2 py-1">
                          {priority.priority.expenseTitle}
                        </td>
                        <td className="border px-2 py-1 text-center">
                          {Number(priority.amount).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                      </tr>
                    ))}
                    <tr>
                      <td className="border px-2 py-1 font-bold">TOTAL</td>
                      <td className="border px-2 py-1 text-center font-bold">
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
              <div className="flex gap-2 justify-end pt-4">
                {viewedSubmission.status === "pending" && (
                  <>
                    <Button
                      type="button"
                      variant="success"
                      onClick={() => handleApprove(viewedSubmission)}
                      startIcon={<CheckCircle className="w-4 h-4" />}
                    >
                      Approve
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => handleReject(viewedSubmission)}
                      startIcon={<XCircle className="w-4 h-4" />}
                    >
                      Reject
                    </Button>
                  </>
                )}
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
                >
                  Export
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PriortySubmissionsPage;
