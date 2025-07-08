import "@/assets/fonts/oldenglishtextmt-normal.js";
import "@/assets/fonts/arial_black-normal.js";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../ui/table";
import { EyeIcon, ChevronUp, ChevronDown } from "lucide-react";
import { Submission } from "@/lib/types";
import { formatDateTime } from "@/lib/helpers";
import {
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  AlertCircle,
  ArrowDownCircle,
} from "lucide-react";

interface MOOERequestTableProps {
  submissions: Submission[];
  onView: (submission: Submission) => void;
  loading?: boolean;
  error?: string | null;
  currentUserRole?: string; // Add this line
}

const MOOERequestTable: React.FC<
  MOOERequestTableProps & {
    sortConfig?: { key: string; direction: "asc" | "desc" } | null;
    requestSort?: (key: string) => void;
  }
> = ({
  submissions = [], // <-- Default to empty array
  onView,
  loading,
  error,
  sortConfig,
  requestSort,
}) => {
  const safeSubmissions = Array.isArray(submissions) ? submissions : [];

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
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="max-w-full overflow-x-auto">
        <Table className="divide-y divide-gray-200">
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableCell
                isHeader
                className="px-6 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 uppercase"
              >
                <div
                  className="flex items-center gap-1 cursor-pointer"
                  onClick={() => requestSort && requestSort("request_id")}
                >
                  Request ID
                  <span className="inline-flex flex-col ml-1">
                    <ChevronUp
                      className={`h-3 w-3 transition-colors ${
                        sortConfig?.key === "request_id" &&
                        sortConfig.direction === "asc"
                          ? "text-primary-500 dark:text-primary-400"
                          : "text-gray-400 dark:text-gray-500"
                      }`}
                    />
                    <ChevronDown
                      className={`h-3 w-3 -mt-1 transition-colors ${
                        sortConfig?.key === "request_id" &&
                        sortConfig.direction === "desc"
                          ? "text-primary-500 dark:text-primary-400"
                          : "text-gray-400 dark:text-gray-500"
                      }`}
                    />
                  </span>
                </div>
              </TableCell>

              <TableCell
                isHeader
                className="px-6 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 uppercase"
              >
                <div
                  className="flex items-center gap-1 cursor-pointer"
                  onClick={() => requestSort && requestSort("status")}
                >
                  Status
                  <span className="inline-flex flex-col ml-1">
                    <ChevronUp
                      className={`h-3 w-3 transition-colors ${
                        sortConfig?.key === "status" &&
                        sortConfig.direction === "asc"
                          ? "text-primary-500 dark:text-primary-400"
                          : "text-gray-400 dark:text-gray-500"
                      }`}
                    />
                    <ChevronDown
                      className={`h-3 w-3 -mt-1 transition-colors ${
                        sortConfig?.key === "status" &&
                        sortConfig.direction === "desc"
                          ? "text-primary-500 dark:text-primary-400"
                          : "text-gray-400 dark:text-gray-500"
                      }`}
                    />
                  </span>
                </div>
              </TableCell>
              <TableCell
                isHeader
                className="px-6 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 uppercase"
              >
                <div
                  className="flex items-center gap-1 cursor-pointer"
                  onClick={() => requestSort && requestSort("created_at")}
                >
                  Submitted At
                  <span className="inline-flex flex-col ml-1">
                    <ChevronUp
                      className={`h-3 w-3 transition-colors ${
                        sortConfig?.key === "created_at" &&
                        sortConfig.direction === "asc"
                          ? "text-primary-500 dark:text-primary-400"
                          : "text-gray-400 dark:text-gray-500"
                      }`}
                    />
                    <ChevronDown
                      className={`h-3 w-3 -mt-1 transition-colors ${
                        sortConfig?.key === "created_at" &&
                        sortConfig.direction === "desc"
                          ? "text-primary-500 dark:text-primary-400"
                          : "text-gray-400 dark:text-gray-500"
                      }`}
                    />
                  </span>
                </div>
              </TableCell>
              <TableCell
                isHeader
                className="px-6 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 uppercase"
              >
                Actions
              </TableCell>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-200 dark:divide-white/[0.05]">
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-8 text-center text-gray-500"
                >
                  Loading submissions...
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-8 text-center text-red-500"
                >
                  {error}
                </TableCell>
              </TableRow>
            ) : safeSubmissions.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-8 text-center text-gray-500"
                >
                  No submissions found.
                </TableCell>
              </TableRow>
            ) : (
              safeSubmissions.map((submission) => (
                <TableRow
                  key={submission.request_id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-900/20"
                >
                  <TableCell className="px-6 whitespace-nowrap py-4 sm:px-6 text-start">
                    {submission.request_id}
                  </TableCell>

                  <TableCell className="px-6 whitespace-nowrap py-4 sm:px-6 text-start">
                    <span
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium w-fit min-w-[90px] justify-center ${
                        statusColors[submission.status?.toLowerCase?.()] ||
                        "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                      }`}
                      style={{
                        maxWidth: "140px",
                        whiteSpace: "nowrap",
                        textOverflow: "ellipsis",
                        overflow: "hidden",
                      }}
                    >
                      {statusIcons[submission.status?.toLowerCase?.()]}
                      {statusLabels[submission.status?.toLowerCase?.()] ||
                        submission.status.charAt(0).toUpperCase() +
                          submission.status.slice(1)}
                    </span>
                  </TableCell>
                  <TableCell className="px-6 whitespace-nowrap py-4 sm:px-6 text-start">
                    {formatDateTime(submission.created_at)}
                  </TableCell>
                  <TableCell className="px-6 whitespace-nowrap py-4 sm:px-6 text-start">
                    <button
                      className="flex items-center gap-2 text-blue-600 hover:underline"
                      onClick={() => onView(submission)}
                    >
                      View
                      <EyeIcon className="w-4 h-4" />
                    </button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default MOOERequestTable;
