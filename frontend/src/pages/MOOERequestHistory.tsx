/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { useNavigate, useLocation } from "react-router"; // Add useLocation
import { useEffect, useState } from "react";
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
import {
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  FileText,
  AlertCircle,
  ArrowDownCircle,
  ArrowUpCircle,
  Edit,
  UserCheck,
  Calendar,
} from "lucide-react";
import { handleServerSideExport } from "@/lib/pdfHelpers";
import { Download } from "lucide-react";
import { format } from "date-fns";
import Button from "@/components/ui/button/Button";
import MOOERequestTable from "@/components/tables/BasicTables/MOOEREquestTable";
import { toast } from "react-toastify";
import { formatDateTime, formatRequestMonthYear } from "@/lib/helpers";
import Badge from "@/components/ui/badge/Badge";

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
  advanced: <Calendar className="h-4 w-4" />,
};

const MOOERequestHistory = () => {
  const navigate = useNavigate();
  const location = useLocation(); // Add this
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
  const [showProgressTracker, setShowProgressTracker] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const fetchRequests = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get("/user-requests/");
        let data = Array.isArray(res.data) ? res.data : [];

        // Sort by created_at descending (latest first)
        data.sort(
          (a: Submission, b: Submission) =>
            new Date(b.created_at || 0).getTime() -
            new Date(a.created_at || 0).getTime()
        );

        setSubmissions(data);
        console.log(res.data);
      } catch (err: any) {
        setError("Failed to load requests.");
      } finally {
        setLoading(false);
      }
    };
    fetchRequests();
  }, []);

  // New useEffect: Auto-open latest or specific request if coming from dashboard, then clear state
  useEffect(() => {
    if (!submissions || submissions.length === 0 || viewedSubmission) return;

    // 1) Open specific request if requestId is provided
    const requestedId = (location.state as any)?.requestId as string | undefined;
    if (requestedId) {
      const match = submissions.find((s) => s.request_id === requestedId);
      if (match) {
        setViewedSubmission(match as any);
        // Clear navigation state to avoid re-opening after close/refresh
        navigate(location.pathname, { replace: true });
        return;
      }
    }

    // 2) Otherwise, open latest if flagged
    if ((location.state as any)?.openLatest) {
      setViewedSubmission(submissions[0] as any);
      // Clear navigation state to avoid re-opening after close/refresh
      navigate(location.pathname, { replace: true });
    }
  }, [submissions, location.state, viewedSubmission]);

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
        currentUserRole={user?.role}
      />
      {/* Modal for viewing priorities */}
      <Dialog
        open={!!viewedSubmission}
        onOpenChange={(open) => {
          if (!open) {
            setViewedSubmission(null);
            // Ensure we clear any lingering state so the modal doesn't auto-reopen
            navigate(location.pathname, { replace: true });
          }
        }}
      >
        <DialogContent className="w-full max-w-[90vw] lg:max-w-6xl rounded-xl bg-white dark:bg-gray-800 p-0 shadow-2xl border-0">
          <DialogHeader className="px-6 py-5 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-gray-100/50 dark:from-gray-800 dark:to-gray-700/50 rounded-t-xl">
            <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/40 rounded-lg flex items-center justify-center">
                <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              Request Details
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400 mt-2">
              Review and track the progress of this request submission
            </DialogDescription>
          </DialogHeader>
          {viewedSubmission && (
            <div className="px-6 py-6 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
              {/* Sender Details Card */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50/50 dark:bg-gray-900/30 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                   <div className="space-y-1 col-span-2">
                     <div className="flex items-start">
                       <span className="font-medium text-gray-700 dark:text-gray-300 w-36 flex-shrink-0">
                         Request ID:
                       </span>
                       <span className="font-mono text-gray-900 dark:text-white break-all min-w-0">
                         {viewedSubmission.request_id}
                       </span>
                     </div>
                     <div className="flex items-start">
                       <span className="font-medium text-gray-700 dark:text-gray-300 w-36 flex-shrink-0">
                         Requesting Month:
                       </span>
                       <span className="text-gray-900 dark:text-white break-all min-w-0">
                         {formatRequestMonthYear(viewedSubmission.request_monthyear)}
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
                    Submitted at: {formatDateTime(viewedSubmission.created_at)}
                  </span>
                </div>
              </div>

              {/* Request Status Tracker - Toggleable */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg text-gray-800 dark:text-white">
                    Request Progress Tracker
                  </h3>
                  <button
                    onClick={() => setShowProgressTracker(!showProgressTracker)}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors duration-200"
                  >
                    {showProgressTracker ? 'Hide Details' : 'Show Details'}
                    {showProgressTracker ? (
                      <ArrowUpCircle className="h-4 w-4" />
                    ) : (
                      <ArrowDownCircle className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  {showProgressTracker && (
                    <div className="p-6">
                      <div className="space-y-6">
                  {/* Step 1: Request Submitted */}
                  <div className={`flex items-start gap-4 p-4 rounded-lg border ${
                    "border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-800"
                  }`}>
                    <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-green-500 text-white">
                      <CheckCircle className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        Request Submitted
                      </h4>
                      <div className="mt-2 space-y-1 text-sm">
                        <p className="text-green-700 dark:text-green-300">
                          <span className="font-medium">Request ID:</span> {viewedSubmission.request_id}
                        </p>
                        <p className="text-green-700 dark:text-green-300">
                          <span className="font-medium">Submitted on:</span> {formatDateTime(viewedSubmission.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Step 2: Under Review */}
                  <div className={`flex items-start gap-4 p-4 rounded-lg border ${
                    viewedSubmission.status === 'pending' 
                      ? "border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-800" 
                      : viewedSubmission.status === 'rejected'
                      ? "border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800"
                      : "border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-800"
                  }`}>
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      viewedSubmission.status === 'pending' 
                        ? "bg-amber-500 text-white" 
                        : viewedSubmission.status === 'rejected'
                        ? "bg-red-500 text-white"
                        : "bg-green-500 text-white"
                    }`}>
                      {viewedSubmission.status === 'pending' ? (
                        <Clock className="h-5 w-5" />
                      ) : viewedSubmission.status === 'rejected' ? (
                        <XCircle className="h-5 w-5" />
                      ) : (
                        <CheckCircle className="h-5 w-5" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        Division Superintendent Review
                      </h4>
                      {viewedSubmission.status === 'approved' || viewedSubmission.status === 'downloaded' || viewedSubmission.status === 'liquidated' || viewedSubmission.status === 'unliquidated' || viewedSubmission.status === 'advanced' ? (
                        <div className="mt-2 space-y-1 text-sm">
                          <p className="text-green-700 dark:text-green-300">
                            <span className="font-medium">Approved by:</span> Division Superintendent
                          </p>
                          <p className="text-green-700 dark:text-green-300">
                            <span className="font-medium">Approved on:</span> {viewedSubmission.reviewed_at ? formatDateTime(viewedSubmission.reviewed_at) : "N/A"}
                          </p>
                        </div>
                      ) : viewedSubmission.status === 'rejected' ? (
                        <div className="mt-2 space-y-1 text-sm">
                          <p className="text-red-700 dark:text-red-300">
                            <span className="font-medium">Status:</span> Rejected
                          </p>
                          {viewedSubmission.rejection_date && (
                            <p className="text-red-700 dark:text-red-300">
                              <span className="font-medium">Rejected on:</span> {format(new Date(viewedSubmission.rejection_date), "MMM dd, yyyy 'at' hh:mm a")}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="mt-1 text-sm text-amber-600 dark:text-amber-400">
                          Currently under review by Division Superintendent
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Step 3: Download & Cash Advance */}
                  <div className={`flex items-start gap-4 p-4 rounded-lg border ${
                    viewedSubmission.status === 'downloaded' 
                      ? "border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-800"
                      : ['approved', 'liquidated', 'unliquidated', 'advanced'].includes(viewedSubmission.status)
                      ? "border-blue-200 bg-blue-50 dark:bg-blue-900/10 dark:border-blue-800"
                      : "border-gray-200 bg-gray-50 dark:bg-gray-700/30 dark:border-gray-600"
                  }`}>
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      viewedSubmission.status === 'downloaded' 
                        ? "bg-green-500 text-white"
                        : ['approved', 'liquidated', 'unliquidated', 'advanced'].includes(viewedSubmission.status)
                        ? "bg-blue-500 text-white"
                        : "bg-gray-300 text-gray-600 dark:bg-gray-600 dark:text-gray-300"
                    }`}>
                      {viewedSubmission.status === 'downloaded' ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : ['approved', 'liquidated', 'unliquidated', 'advanced'].includes(viewedSubmission.status) ? (
                        <Download className="h-5 w-5" />
                      ) : (
                        <Download className="h-5 w-5" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        Download & Cash Advance
                      </h4>
                      {viewedSubmission.status === 'downloaded' ? (
                        <div className="mt-2 space-y-1 text-sm">
                          <p className="text-green-700 dark:text-green-300">
                            <span className="font-medium">Status:</span> Completed
                          </p>
                          {(viewedSubmission as any).downloaded_at && (
                            <p className="text-green-700 dark:text-green-300">
                              <span className="font-medium">Downloaded on:</span> {formatDateTime((viewedSubmission as any).downloaded_at)}
                            </p>
                          )}
                        </div>
                      ) : ['approved', 'liquidated', 'unliquidated', 'advanced'].includes(viewedSubmission.status) ? (
                        <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
                          Ready for download and cash advance processing
                        </p>
                      ) : (
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                          Available after approval
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Step 4: Liquidation Process */}
                  <div className={`flex items-start gap-4 p-4 rounded-lg border ${
                    viewedSubmission.status === 'liquidated' 
                      ? "border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-800"
                      : ['downloaded', 'unliquidated', 'advanced'].includes(viewedSubmission.status)
                      ? "border-orange-200 bg-orange-50 dark:bg-orange-900/10 dark:border-orange-800"
                      : "border-gray-200 bg-gray-50 dark:bg-gray-700/30 dark:border-gray-600"
                  }`}>
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      viewedSubmission.status === 'liquidated' 
                        ? "bg-green-500 text-white"
                        : ['downloaded', 'unliquidated', 'advanced'].includes(viewedSubmission.status)
                        ? "bg-orange-500 text-white"
                        : "bg-gray-300 text-gray-600 dark:bg-gray-600 dark:text-gray-300"
                    }`}>
                      {viewedSubmission.status === 'liquidated' ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : ['downloaded', 'unliquidated', 'advanced'].includes(viewedSubmission.status) ? (
                        <AlertCircle className="h-5 w-5" />
                      ) : (
                        <AlertCircle className="h-5 w-5" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        Liquidation Process
                      </h4>
                      {viewedSubmission.status === 'liquidated' ? (
                        <div className="mt-2 space-y-1 text-sm">
                          <p className="text-green-700 dark:text-green-300">
                            <span className="font-medium">Status:</span> Completed
                          </p>
                          <p className="text-green-700 dark:text-green-300">
                            <span className="font-medium">Finalized:</span> Liquidation has been submitted and approved
                          </p>
                        </div>
                      ) : ['downloaded', 'unliquidated', 'advanced'].includes(viewedSubmission.status) ? (
                        <p className="mt-1 text-sm text-orange-600 dark:text-orange-400">
                          Submit liquidation with supporting documents within 30 days
                        </p>
                      ) : (
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                          Available after receiving cash advance
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Overall Status Summary */}
                <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        Current Status
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {viewedSubmission.status === 'pending' && 
                          "Your request is currently under review by the Division Superintendent. You will be notified once it has been approved or if any additional information is required."
                        }
                        {viewedSubmission.status === 'approved' && 
                          "Your request has been approved and is ready for download and cash advance processing."
                        }
                        {viewedSubmission.status === 'downloaded' && 
                          "Your request has been downloaded and cash advance received. Please submit liquidation with supporting documents within 30 days."
                        }
                        {viewedSubmission.status === 'liquidated' && 
                          "Your request has been fully processed. Liquidation has been submitted and approved."
                        }
                        {viewedSubmission.status === 'unliquidated' && 
                          "Your request has been downloaded but liquidation is still pending. Please submit liquidation with supporting documents."
                        }
                        {viewedSubmission.status === 'advanced' && 
                          "Your request is in the advanced stage. Please check with the accounting office for current status."
                        }
                        {viewedSubmission.status === 'rejected' && 
                          "Your request was rejected. Please review the feedback and resubmit your request."
                        }
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        viewedSubmission.status === 'liquidated' 
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                          : viewedSubmission.status === 'rejected'
                          ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                          : viewedSubmission.status === 'pending'
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                          : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                      }`}>
                        {statusLabels[viewedSubmission.status?.toLowerCase?.()] || viewedSubmission.status}
                      </span>
                    </div>
                  </div>
                      </div>
                    </div>
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
              {/* Rejection Reason Section */}
              {viewedSubmission?.status === "rejected" && (
                <div className="bg-white dark:bg-gray-800 border border-red-200 dark:border-red-800/50 rounded-xl p-6 shadow-sm">
                  {/* Header Section */}
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 bg-red-100 dark:bg-red-900/40 rounded-lg flex items-center justify-center">
                      <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-red-900 dark:text-red-100">
                        Submission Rejected
                      </h3>
                      <p className="text-red-700/80 dark:text-red-300/80 text-sm mt-1">
                        Please review the rejection details below
                      </p>
                    </div>
                  </div>

                  {/* Content Section */}
                  <div className="space-y-6">
                    {/* Rejection Meta Information */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* Rejection Date */}
                      <div className="bg-red-50/50 dark:bg-red-950/20 p-4 rounded-xl border border-red-200/50 dark:border-red-800/30">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-6 h-6 bg-red-100 dark:bg-red-900/40 rounded-lg flex items-center justify-center">
                            <Calendar className="h-3 w-3 text-red-600 dark:text-red-400" />
                          </div>
                          <span className="text-sm font-semibold text-red-800 dark:text-red-200">
                            Rejected On
                          </span>
                        </div>
                        <p className="text-red-900 dark:text-red-100 font-medium text-sm">
                          {viewedSubmission.rejection_date
                            ? format(
                                new Date(viewedSubmission.rejection_date),
                                "MMM dd, yyyy 'at' hh:mm a"
                              )
                            : "Not specified"}
                        </p>
                      </div>

                      {/* Reviewed By */}
                      <div className="bg-red-50/50 dark:bg-red-950/20 p-4 rounded-xl border border-red-200/50 dark:border-red-800/30">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-6 h-6 bg-red-100 dark:bg-red-900/40 rounded-lg flex items-center justify-center">
                            <UserCheck className="h-3 w-3 text-red-600 dark:text-red-400" />
                          </div>
                          <span className="text-sm font-semibold text-red-800 dark:text-red-200">
                            Reviewed By
                          </span>
                        </div>
                        <p className="text-red-900 dark:text-red-100 font-medium text-sm">
                          {viewedSubmission.reviewed_by
                            ? `${viewedSubmission.reviewed_by.first_name} ${viewedSubmission.reviewed_by.last_name}`
                            : "Division Superintendent"}
                        </p>
                      </div>
                    </div>

                    {/* Rejection Reason */}
                    <div className="bg-red-50/70 dark:bg-red-900/15 p-5 rounded-xl border border-red-200/60 dark:border-red-800/30">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-6 h-6 bg-red-100 dark:bg-red-900/40 rounded-lg flex items-center justify-center">
                          <AlertCircle className="h-3 w-3 text-red-600 dark:text-red-400" />
                        </div>
                        <span className="text-base font-semibold text-red-800 dark:text-red-200">
                          Reason for Rejection
                        </span>
                      </div>
                      <div className="bg-white/80 dark:bg-red-950/20 p-4 rounded-lg border border-red-100/50 dark:border-red-800/20">
                        <p className="text-red-900/90 dark:text-red-100/90 leading-relaxed text-sm">
                          {viewedSubmission.rejection_comment ||
                            "No specific reason provided for the rejection."}
                        </p>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="pt-2">
                      <Button
                        onClick={() => {
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
                        className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md border-0"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit and Resubmit Request
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              {/* Action Buttons */}
              <div className="flex justify-end gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
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
                  className="px-6 py-2.5 rounded-xl font-semibold"
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
