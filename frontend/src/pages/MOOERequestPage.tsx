/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { useNavigate } from "react-router";
import { useEffect, useState, useRef } from "react";
import PrioritySubmissionsTable from "@/components/tables/BasicTables/PrioritySubmissionsTable";
import { Submission } from "@/lib/types";
import { useAuth } from "@/context/AuthContext";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import api from "@/api/axios";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Badge from "@/components/ui/badge/Badge";
import { handleExport } from "@/lib/pdfHelpers";
import {
  Download,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import Button from "@/components/ui/button/Button";

const MOOERequestPage = () => {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pagination & search state
  const [searchTerm, setSearchTerm] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc";
  } | null>(null);
  const [viewedSubmission, setViewedSubmission] = useState<Submission | null>(
    null
  );
  const { user } = useAuth();

  // Debounced search handler
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(() => {
      setSearchTerm(value);
      setCurrentPage(1);
    }, 200);
  };

  // Filtered and paginated submissions
  const filteredSubmissions = submissions.filter(
    (sub) =>
      sub.request_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (sub.user?.first_name + " " + sub.user?.last_name)
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (sub.user?.school?.schoolName || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
  );
  const totalPages = Math.ceil(filteredSubmissions.length / itemsPerPage);
  const paginatedSubmissions = filteredSubmissions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  useEffect(() => {
    const fetchRequests = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get("/user-requests/");
        setSubmissions(Array.isArray(res.data) ? res.data : []);
      } catch (err: any) {
        setError("Failed to load requests.");
      } finally {
        setLoading(false);
      }
    };
    fetchRequests();
  }, []);

  // Sorting logic (client-side)
  const handleSort = (key: string) => {
    let direction: "asc" | "desc" = "asc";
    if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === "asc"
    ) {
      direction = "desc";
    }
    setSortConfig({ key, direction });
    setSubmissions((prev) =>
      [...prev].sort((a, b) => {
        if ((a as any)[key] < (b as any)[key])
          return direction === "asc" ? -1 : 1;
        if ((a as any)[key] > (b as any)[key])
          return direction === "asc" ? 1 : -1;
        return 0;
      })
    );
  };

  // Calculate display range for "showing X to Y of Z entries"
  const startEntry =
    filteredSubmissions.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endEntry = Math.min(
    currentPage * itemsPerPage,
    filteredSubmissions.length
  );
  const totalEntries = filteredSubmissions.length;

  return (
    <div className="container mx-auto px-4 py-6">
      <PageBreadcrumb pageTitle="Requests History" />

      {/* Top Controls: Search Bar and Items Per Page (match PrioritySubmissionsPage style) */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-6">
        <div className="flex flex-col md:flex-row gap-2 w-full">
          <div className="relative w-full">
            <input
              type="text"
              placeholder="Search requests..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="pl-10 pr-3 py-2 w-full border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          </div>
        </div>
        <div className="flex gap-4 w-full md:w-auto items-center">
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
        submissions={paginatedSubmissions}
        onView={setViewedSubmission}
        loading={loading}
        error={error}
        sortConfig={sortConfig}
        requestSort={handleSort}
        currentUserRole={user?.role}
      />

      {/* Pagination and Showing X to Y of Z entries BELOW the table */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Showing {startEntry} to {endEntry} of {totalEntries} entries
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
                  type="button"
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

      {/* Modal for viewing priorities */}
      <Dialog
        open={!!viewedSubmission}
        onOpenChange={() => setViewedSubmission(null)}
      >
        <DialogContent className="w-full max-w-[90vw] lg:max-w-3xl rounded-lg bg-white dark:bg-gray-800 p-6 shadow-xl">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-2xl font-bold text-gray-800 dark:text-white">
              Request Details
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              Review this request submission
            </DialogDescription>
          </DialogHeader>

          {viewedSubmission && (
            <div className="space-y-6">
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
                      <Badge
                        color={
                          viewedSubmission.status === "pending"
                            ? "warning"
                            : viewedSubmission.status === "approved"
                            ? "error"
                            : "success"
                        }
                      >
                        {viewedSubmission.status}
                      </Badge>
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
              {/* Rejection Reason Section */}
              {viewedSubmission?.status === "rejected" &&
                viewedSubmission.rejection_comment && (
                  <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-900/30">
                    <h4 className="font-medium text-red-800 dark:text-red-200">
                      Rejection Reason:
                    </h4>
                    <p className="text-red-700 dark:text-red-300 mt-1">
                      {viewedSubmission.rejection_comment}
                    </p>
                    <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                      Rejected on:{" "}
                      {new Date(
                        viewedSubmission.rejection_date
                      ).toLocaleDateString()}
                    </p>

                    <Button
                      onClick={() => {
                        // Navigate to fund request page with previous data pre-filled
                        navigate("/prepare-list-of-priorities", {
                          state: {
                            rejectedRequestId: viewedSubmission.request_id,
                            priorities: viewedSubmission.priorities,
                            rejectionComment:
                              viewedSubmission.rejection_comment,
                          },
                        });
                      }}
                      variant="primary"
                      className="mt-3"
                    >
                      Edit and Resubmit
                    </Button>
                  </div>
                )}
              {/* Action Buttons - Modified to check for superintendent role */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                {user?.role === "superintendent" && (
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
                    Export PDF
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MOOERequestPage;
