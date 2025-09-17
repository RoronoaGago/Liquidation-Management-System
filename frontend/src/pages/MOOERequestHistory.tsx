/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { useNavigate } from "react-router";
import { useEffect, useState } from "react";
import PrioritySubmissionsTable from "@/components/tables/BasicTables/PrioritySubmissionsTable";
import { Submission } from "@/lib/types";
import axios from "axios";
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
import {
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  FileText,
  AlertCircle,
  ArrowDownCircle,
  ArrowUpCircle,
} from "lucide-react";
import { handleExport, handleServerSideExport } from "@/lib/pdfHelpers";
import { Download } from "lucide-react";
import { format } from "date-fns";
import Button from "@/components/ui/button/Button";
import MOOERequestTable from "@/components/tables/BasicTables/MOOEREquestTable";
import { useToastState } from "react-stately";
import { toast } from "react-toastify";

type SubmissionStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "downloaded"
  | "liquidated"
  | "advanced"
  | "unliquidated"
  | "approved_district"
  | "approved_division";

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

const MOOERequestHistory = () => {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc";
  } | null>(null);
  const [viewedSubmission, setViewedSubmission] = useState<
    (Submission & { status: SubmissionStatus }) | null
  >(null);
  const { user } = useAuth();

  useEffect(() => {
    const fetchRequests = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get("/user-requests/");
        setSubmissions(Array.isArray(res.data) ? res.data : []);
        console.log(res.data);
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

  return (
    <div className="container mx-auto px-4 py-6">
      <PageBreadcrumb pageTitle="Requests History" />
      <MOOERequestTable
        submissions={submissions}
        onView={setViewedSubmission}
        loading={loading}
        error={error}
        sortConfig={sortConfig}
        requestSort={handleSort}
        currentUserRole={user?.role} // Pass the user's role
      />
      {/* Modal for viewing priorities */}
      <Dialog
        open={!!viewedSubmission}
        onOpenChange={() => setViewedSubmission(null)}
      >
        <DialogContent className="w-full max-w-[90vw] lg:max-w-5xl rounded-lg bg-white dark:bg-gray-800 p-6 shadow-xl">
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
                  </div>
                  <div className="space-y-1">
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
                        >
                          {
                            statusIcons[
                              viewedSubmission.status?.toLowerCase?.()
                            ]
                          }
                          {statusLabels[
                            viewedSubmission.status?.toLowerCase?.()
                          ] || viewedSubmission.status}
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
              {/* Rejection Reason Section */}
              {viewedSubmission?.status === "rejected" && (
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
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Reviewed by
                          </p>
                          <p className="text-red-700 dark:text-red-300">
                            {viewedSubmission.reviewed_by
                              ? `${viewedSubmission.reviewed_by.first_name} ${viewedSubmission.reviewed_by.last_name}`
                              : "Division Superintendent"}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Reason for rejection
                        </p>
                        <p className="text-red-700 dark:text-red-300 mt-1 bg-red-100/50 dark:bg-red-900/30 p-3 rounded-md">
                          {viewedSubmission.rejection_comment ||
                            "No reason provided"}
                        </p>
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={() => {
                      navigate("/prepare-list-of-priorities", {
                        state: {
                          rejectedRequestId: viewedSubmission.request_id,
                          priorities: viewedSubmission.priorities,
                          rejectionComment: viewedSubmission.rejection_comment,
                        },
                      });
                    }}
                    variant="primary"
                    className="mt-4 w-full"
                  >
                    Edit and Resubmit Request
                  </Button>
                </div>
              )}
              {/* Action Buttons - Modified to check for superintendent role */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button
                  type="button"
                  variant="outline"
                  onClick={async () => {
                    // Use server-side PDF generation for approved requests
                    const result = await handleServerSideExport(
                      viewedSubmission
                    );
                    if (result.success) {
                      toast.success("PDF downloaded successfully.");
                      console.log("PDF downloaded");
                    } else {
                      toast.error(
                        "Failed to download PDF. Please try again later."
                      );
                      console.log(result);
                    }
                  }}
                  startIcon={<Download className="w-4 h-4" />}
                >
                  {viewedSubmission.status === "approved"
                    ? "Download Official PDF"
                    : "Export PDF"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MOOERequestHistory;
