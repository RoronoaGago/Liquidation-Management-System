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

type Priority = {
  expense: string;
  amount: number;
};

type Submission = {
  id: number;
  submitted_by: {
    id: number;
    name: string;
    school: string;
  };
  priorities: Priority[];
  status: "pending" | "approved" | "rejected";
  submitted_at: string;
};

interface PrioritySubmissionsTableProps {
  submissions: Submission[];
  onView: (submission: Submission) => void;
}

const PrioritySubmissionsTable: React.FC<PrioritySubmissionsTableProps> = ({
  submissions,
  onView,
}) => {
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
                Request ID
              </TableCell>
              <TableCell
                isHeader
                className="px-6 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 uppercase"
              >
                Submitted By
              </TableCell>
              <TableCell
                isHeader
                className="px-6 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 uppercase"
              >
                School
              </TableCell>
              <TableCell
                isHeader
                className="px-6 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 uppercase"
              >
                Status
              </TableCell>
              <TableCell
                isHeader
                className="px-6 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 uppercase"
              >
                Submitted At
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
            {submissions.map((submission) => (
              <TableRow
                key={submission.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-900/20"
              >
                <TableCell className="px-6 py-4">{submission.id}</TableCell>
                <TableCell className="px-6 py-4">
                  {submission.submitted_by.name}
                </TableCell>
                <TableCell className="px-6 py-4">
                  {submission.submitted_by.school}
                </TableCell>
                <TableCell className="px-6 py-4">
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
                <TableCell className="px-6 py-4">
                  {new Date(submission.submitted_at).toLocaleString()}
                </TableCell>
                <TableCell className="px-6 py-4">
                  <button
                    className="flex items-center gap-2 text-blue-600 hover:underline"
                    onClick={() => onView(submission)}
                  >
                    View
                    <EyeIcon className="w-4 h-4" />
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default PrioritySubmissionsTable;
