import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import axios from "axios";
import api from "@/api/axios";
import { Submission } from "@/lib/types";

const PriortySubmissionsPage = () => {
  // State for submissions and modal
  const [viewedSubmission, setViewedSubmission] = useState<Submission | null>(
    null
  );
  const [submissionsState, setSubmissionsState] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination and search state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [searchTerm, setSearchTerm] = useState("");
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch submissions from backend
  useEffect(() => {
    const fetchSubmissions = async () => {
      setLoading(true);
      setError(null);
      try {
        // You may want to use /api/requests/ or /api/user-requests/ depending on your backend
        const res = await api.get("requests/");
        setSubmissionsState(res.data);
      } catch (err: any) {
        console.error("Failed to fetch submissions:", err);
        setError("Failed to fetch submissions");
      } finally {
        setLoading(false);
      }
    };
    fetchSubmissions();
  }, []);

  // Approve handler (should call backend in real app)
  const handleApprove = async (submission: Submission) => {
    try {
      await api.put(`/api/requests/${submission.request_id}/`, {
        status: "approved",
      });
      setSubmissionsState((prev) =>
        prev.map((s) =>
          s.request_id === submission.request_id
            ? { ...s, status: "approved" }
            : s
        )
      );
      setViewedSubmission((prev) =>
        prev ? { ...prev, status: "approved" } : prev
      );
    } catch (err) {
      // handle error
    }
  };

  // Reject handler (should call backend in real app)
  const handleReject = async (submission: Submission) => {
    try {
      await api.put(`/api/requests/${submission.request_id}/`, {
        status: "rejected",
      });
      setSubmissionsState((prev) =>
        prev.map((s) =>
          s.request_id === submission.request_id
            ? { ...s, status: "rejected" }
            : s
        )
      );
      setViewedSubmission((prev) =>
        prev ? { ...prev, status: "rejected" } : prev
      );
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
  }, [searchTerm]);

  // Filtered submissions
  const filteredSubmissions = useMemo(() => {
    if (!searchTerm) return submissionsState;
    const term = searchTerm.toLowerCase();
    return submissionsState.filter((submission) => {
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
  }, [submissionsState, searchTerm]);

  // Pagination
  const totalPages = Math.ceil(filteredSubmissions.length / itemsPerPage);
  const currentItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredSubmissions.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredSubmissions, currentPage, itemsPerPage]);

  // Pagination controls
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <PageBreadcrumb pageTitle="School Heads' Priority Submissions" />
      {/* Search and Items Per Page */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-6">
        <div className="relative w-full">
          <Input
            type="text"
            placeholder="Search submissions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 "
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        </div>
        <select
          value={itemsPerPage.toString()}
          onChange={(e) => setItemsPerPage(Number(e.target.value))}
          className="min-w-[100px] px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
        >
          <option value="5">5 per page</option>
          <option value="10">10 per page</option>
          <option value="20">20 per page</option>
          <option value="50">50 per page</option>
        </select>
      </div>
      {/* Table */}
      <PrioritySubmissionsTable
        submissions={currentItems}
        onView={setViewedSubmission}
        loading={loading}
        error={error}
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
                  onClick={() => handleExport(viewedSubmission)}
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
