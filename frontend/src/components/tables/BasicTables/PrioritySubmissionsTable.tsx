import "@/assets/fonts/oldenglishtextmt-normal.js";
import "@/assets/fonts/arial_black-normal.js"; // Add this line
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../ui/table";
import Badge from "@/components/ui/badge/Badge";
import { EyeIcon, CheckCircle2, XCircle } from "lucide-react";
import Button from "@/components/ui/button/Button";
import jsPDF from "jspdf";

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
  onApprove?: (submission: Submission) => void;
  onReject?: (submission: Submission) => void;
}

const PrioritySubmissionsTable: React.FC<PrioritySubmissionsTableProps> = ({
  submissions,
  onView,
  onApprove,
  onReject,
}) => {
  const handleExport = (submission: Submission) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Helper to center text
    const centerText = (
      text: string,
      y: number,
      font: string,
      style: string,
      size: number
    ) => {
      doc.setFont(font, style);
      doc.setFontSize(size);
      const textWidth = doc.getTextWidth(text);
      doc.text(text, (pageWidth - textWidth) / 2, y);
    };

    // Use Old English Text MT for the first two lines
    // Header (tighter vertical spacing)
    centerText(
      "Republic of the Philippines",
      15,
      "oldenglishtextmt",
      "normal",
      12
    );
    centerText("Department of Education", 22, "oldenglishtextmt", "normal", 18);
    centerText("Region 1", 29, "arial_black", "normal", 10);
    centerText("Schools Division of La Union", 35, "arial_black", "normal", 10);
    centerText(
      submission.submitted_by.school.toUpperCase(),
      41,
      "arial_black",
      "normal",
      11
    );
    centerText("TALLAOEN, LUNA, LA UNION", 47, "arial_black", "normal", 10);

    // Move down for details
    doc.setFont("arial_black", "normal");
    doc.setFontSize(14);
    doc.text("Priority Submission Details", 10, 62);

    doc.setFont("arial_black", "normal");
    doc.setFontSize(12);
    doc.text(`Request ID: ${submission.id}`, 10, 85);
    doc.text(`Submitted By: ${submission.submitted_by.name}`, 10, 93);
    doc.text(`Status: ${submission.status}`, 10, 101);
    doc.text(
      `Submitted At: ${new Date(submission.submitted_at).toLocaleString()}`,
      10,
      109
    );
    doc.text("List of Priorities:", 10, 117);

    submission.priorities.forEach((priority, idx) => {
      doc.text(
        `- ${priority.expense}: ₱${priority.amount.toLocaleString()}`,
        15,
        125 + idx * 8
      );
    });

    doc.save(`priority_submission_${submission.id}.pdf`);
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
                Priorities
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
                  <button
                    className="flex items-center gap-2 text-blue-600 hover:underline"
                    onClick={() => onView(submission)}
                  >
                    View
                    <EyeIcon className="w-4 h-4" />
                  </button>
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
                <TableCell className="px-6 py-4 space-x-2">
                  {submission.status === "pending" && (
                    <>
                      <Button
                        size="sm"
                        variant="success"
                        onClick={() => onApprove?.(submission)}
                        className="inline-flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="error"
                        onClick={() => onReject?.(submission)}
                        className="inline-flex items-center gap-1"
                      >
                        <XCircle className="w-4 h-4" />
                        Reject
                      </Button>
                    </>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleExport(submission)}
                    className="inline-flex items-center gap-1"
                  >
                    Export
                  </Button>
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
