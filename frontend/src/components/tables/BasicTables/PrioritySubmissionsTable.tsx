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
import { EyeIcon } from "lucide-react";
import { Submission } from "@/lib/types";

interface PrioritySubmissionsTableProps {
  submissions: Submission[];
  onView: (submission: Submission) => void;
  loading?: boolean;
  error?: string | null;
}

const PrioritySubmissionsTable: React.FC<
  PrioritySubmissionsTableProps & {
    sortConfig?: { key: string; direction: "asc" | "desc" } | null;
    requestSort?: (key: string) => void;
  }
> = ({ submissions, onView, loading, error, sortConfig, requestSort }) => {
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
                  {sortConfig?.key === "request_id" && (
                    <span className="ml-1">
                      {sortConfig.direction === "asc" ? "▲" : "▼"}
                    </span>
                  )}
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
                  {sortConfig?.key === "submitted_by" && (
                    <span className="ml-1">
                      {sortConfig.direction === "asc" ? "▲" : "▼"}
                    </span>
                  )}
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
                  {sortConfig?.key === "school" && (
                    <span className="ml-1">
                      {sortConfig.direction === "asc" ? "▲" : "▼"}
                    </span>
                  )}
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
                  {sortConfig?.key === "status" && (
                    <span className="ml-1">
                      {sortConfig.direction === "asc" ? "▲" : "▼"}
                    </span>
                  )}
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
                  {sortConfig?.key === "created_at" && (
                    <span className="ml-1">
                      {sortConfig.direction === "asc" ? "▲" : "▼"}
                    </span>
                  )}
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
            ) : submissions.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-8 text-center text-gray-500"
                >
                  No submissions found.
                </TableCell>
              </TableRow>
            ) : (
              submissions.map((submission) => (
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
                    {new Date(submission.created_at).toLocaleString()}
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
