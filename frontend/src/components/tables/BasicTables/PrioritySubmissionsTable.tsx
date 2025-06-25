import "@/assets/fonts/oldenglishtextmt-normal.js";
import "@/assets/fonts/arial_black-normal.js";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../ui/table";
import Badge from "@/components/ui/badge/Badge";
import { EyeIcon, ChevronUp, ChevronDown } from "lucide-react";
import { Submission } from "@/lib/types";
import { formatDateTime } from "@/lib/helpers";

interface PrioritySubmissionsTableProps {
  submissions: Submission[];
  onView: (submission: Submission) => void;
  loading?: boolean;
  error?: string | null;
  currentUserRole?: string; // Add this line
}

const PrioritySubmissionsTable: React.FC<
  PrioritySubmissionsTableProps & {
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
                  onClick={() => requestSort && requestSort("submitted_by")}
                >
                  Submitted By
                  <span className="inline-flex flex-col ml-1">
                    <ChevronUp
                      className={`h-3 w-3 transition-colors ${
                        sortConfig?.key === "submitted_by" &&
                        sortConfig.direction === "asc"
                          ? "text-primary-500 dark:text-primary-400"
                          : "text-gray-400 dark:text-gray-500"
                      }`}
                    />
                    <ChevronDown
                      className={`h-3 w-3 -mt-1 transition-colors ${
                        sortConfig?.key === "submitted_by" &&
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
                  onClick={() => requestSort && requestSort("school")}
                >
                  School
                  <span className="inline-flex flex-col ml-1">
                    <ChevronUp
                      className={`h-3 w-3 transition-colors ${
                        sortConfig?.key === "school" &&
                        sortConfig.direction === "asc"
                          ? "text-primary-500 dark:text-primary-400"
                          : "text-gray-400 dark:text-gray-500"
                      }`}
                    />
                    <ChevronDown
                      className={`h-3 w-3 -mt-1 transition-colors ${
                        sortConfig?.key === "school" &&
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
                    {submission.user.first_name} {submission.user.last_name}
                  </TableCell>
                  <TableCell className="px-6 whitespace-nowrap py-4 sm:px-6 text-start">
                    {submission.user.school?.schoolName}
                  </TableCell>
                  <TableCell className="px-6 whitespace-nowrap py-4 sm:px-6 text-start">
                    <Badge
                      color={
                        submission.status === "pending"
                          ? "warning"
                          : submission.status === "approved"
                          ? "success"
                          : "error"
                      }
                    >
                      {submission.status.charAt(0).toUpperCase() +
                        submission.status.slice(1)}
                    </Badge>
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

export default PrioritySubmissionsTable;
