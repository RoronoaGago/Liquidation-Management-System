import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import React, { useState } from "react";
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

const submissions: Submission[] = [
  {
    id: 1,
    submitted_by: {
      id: 10,
      name: "Jane Doe",
      school: "Sample Elementary School",
    },
    priorities: [
      { expense: "Internet Expense", amount: 1500 },
      { expense: "Office Supplies", amount: 2000 },
    ],
    status: "pending",
    submitted_at: "2025-06-17T10:00:00Z",
  },
  {
    id: 2,
    submitted_by: { id: 11, name: "John Smith", school: "Central High School" },
    priorities: [{ expense: "Electricity Expense", amount: 3000 }],
    status: "pending",
    submitted_at: "2025-06-16T14:30:00Z",
  },
];

const PriortySubmissionsPage = () => {
  const [viewedSubmission, setViewedSubmission] = useState<Submission | null>(
    null
  );

  return (
    <div className="container mx-auto px-4 py-6">
      <PageBreadcrumb pageTitle="School Heads' Priority Submissions" />
      <div className="mt-8">
        <PrioritySubmissionsTable
          submissions={submissions}
          onView={setViewedSubmission}
        />
      </div>

      {/* Modal for viewing priorities */}
      <Dialog
        open={!!viewedSubmission}
        onOpenChange={() => setViewedSubmission(null)}
      >
        <DialogContent className="w-full rounded-lg bg-white dark:bg-gray-800 p-8 shadow-xl max-w-lg">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-2xl font-bold text-gray-800 dark:text-white">
              Priority Submission Details
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              Submitted by {viewedSubmission?.submitted_by.name} (
              {viewedSubmission?.submitted_by.school})
            </DialogDescription>
          </DialogHeader>
          {viewedSubmission && (
            <div className="space-y-4">
              <div>
                <span className="font-semibold">Request ID:</span>{" "}
                {viewedSubmission.id}
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
                {new Date(viewedSubmission.submitted_at).toLocaleString()}
              </div>
              <div>
                <span className="font-semibold">List of Priorities:</span>
                <ul className="list-disc ml-6 mt-2">
                  {viewedSubmission.priorities.map((priority, idx) => (
                    <li key={idx} className="mb-1">
                      <span className="font-medium">{priority.expense}</span>: ₱
                      {priority.amount.toLocaleString()}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex justify-end pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setViewedSubmission(null)}
                >
                  Close
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
