/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo } from "react";
import api from "@/api/axios";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../ui/table";
import Button from "@/components/ui/button/Button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import Input from "@/components/form/input/InputField";
import { toast } from "react-toastify";
import { ChevronDown, ChevronUp } from "lucide-react";
import { CheckCircle, AlertCircle, Eye as LucideEye } from "lucide-react"; // Add lucide icons

const ITEMS_PER_PAGE_OPTIONS = [5, 10, 20, 50];

// Define the Liquidation type (or import it if shared)
type Liquidation = {
  created_at: any;
  LiquidationID: string;
  status: string;
  request?: {
    request_id?: string;
    user?: {
      first_name: string;
      last_name: string;
      school?: {
        schoolName: string;
      };
    };
    priorities?: any[]; // Add this line to include priorities
  };
  // Add other fields as needed
};

interface Requirement {
  requirementID: number;
  requirementTitle: string;
  is_required: boolean;
}

interface Document {
  id: number;
  document_url: string;
  requirement_obj: {
    requirementTitle: string;
  };
  is_approved: boolean;
  reviewer_comment: string | null;
}

interface Expense {
  id: string | number;
  title: string;
  requirements: Requirement[];
  amount: number;
}

interface LiquidationReportTableProps {
  liquidations: Liquidation[];
  loading: boolean;
  refreshList: () => Promise<void>;
}

const LiquidationReportTable: React.FC<LiquidationReportTableProps> = ({
  liquidations,
  refreshList,
}) => {
  const [selected, setSelected] = useState<Liquidation | null>(null);
  const [expandedExpense, setExpandedExpense] = useState<string | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [docLoading, setDocLoading] = useState(false);
  const [expenseList, setExpenseList] = useState<Expense[]>([]);
  const [viewDoc, setViewDoc] = useState<Document | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [isEditingComment, setIsEditingComment] = useState(false); // Add this state

  // Filtered and paginated data
  const filteredLiquidations = useMemo(() => {
    if (!searchTerm) return liquidations;
    return liquidations.filter((liq) => {
      const user = liq.request?.user;
      const school = user?.school?.schoolName || "";
      return (
        liq.LiquidationID.toLowerCase().includes(searchTerm.toLowerCase()) ||
        liq.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
        liq.request?.request_id
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        (user &&
          (`${user.first_name} ${user.last_name}`
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
            school.toLowerCase().includes(searchTerm.toLowerCase())))
      );
    });
  }, [liquidations, searchTerm]);

  const totalPages = Math.ceil(filteredLiquidations.length / itemsPerPage);
  const paginatedLiquidations = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredLiquidations.slice(start, start + itemsPerPage);
  }, [filteredLiquidations, currentPage, itemsPerPage]);

  // Update status to under_review_district on view
  const handleView = async (liq: Liquidation) => {
    try {
      await api.patch(`/liquidations/${liq.LiquidationID}/`, {
        status: "under_review_district",
      });
      // Optionally refresh the list for instant feedback
      await refreshList();
    } catch (err) {
      toast.error("Failed to update status.");
    }
    setSelected(liq);
    setExpandedExpense(null);
    setDocLoading(true);
    // Build expense list from priorities
    const priorities = liq.request?.priorities || [];
    const expenses: Expense[] = priorities.map((p: any) => ({
      id: p.id || p.priority?.LOPID || "",
      title: p.priority?.expenseTitle || "",
      amount: Number(p.amount) || 0,
      requirements: (p.priority?.requirements || []).map((req: any) => ({
        requirementID: req.requirementID,
        requirementTitle: req.requirementTitle,
        is_required: req.is_required,
      })),
    }));
    setExpenseList(expenses);

    // Fetch all documents for this liquidation
    const res = await api.get(`/liquidations/${liq.LiquidationID}/documents/`);
    setDocuments(res.data);
    setDocLoading(false);
  };

  // Find document for a requirement under an expense

  // Approve/Reject document

  // Document completion calculation
  const getCompletion = () => {
    const totalRequired = documents.filter(
      (doc) => doc.requirement_obj && doc.is_approved !== undefined
    ).length;
    const approved = documents.filter((doc) => doc.is_approved).length;
    return { approved, totalRequired };
  };

  // Add this helper to map status to badge color

  // Calculate completion
  const totalRequired = documents.length;
  const approvedCount = documents.filter((doc) => doc.is_approved).length;
  const hasAnyComment = documents.some(
    (doc) => doc.reviewer_comment && doc.reviewer_comment.trim() !== ""
  );

  // Approve enabled only if all required docs are approved
  const canApprove = totalRequired > 0 && approvedCount === totalRequired;

  // Reject enabled only if at least one reviewer comment exists
  const canReject = hasAnyComment;

  // At the bottom of the dialog, after all documents are reviewed:
  const allReviewed = documents.every((doc) => doc.is_approved !== null);

  const handleApproveReport = async () => {
    await api.patch(`/liquidations/${selected?.LiquidationID}/`, {
      status: "approved_district",
      reviewed_at_district: new Date().toISOString(),
    });
    refreshList();
    toast.success("Liquidation report approved!");
  };

  const handleRejectReport = async () => {
    await api.patch(`/liquidations/${selected?.LiquidationID}/`, {
      status: "resubmit",
    });
    refreshList();
    toast.info("Liquidation report sent back for revision.");
  };

  return (
    <div>
      {/* Search and controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
        <div className="flex-1 relative">
          <Input
            type="text"
            placeholder="Search liquidations..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10"
          />
          {/* Optional: Add a search icon inside the input */}
          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            <svg
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
          </span>
        </div>
        <div className="flex gap-2 items-center mt-2 md:mt-0">
          <label className="text-sm text-gray-600 dark:text-gray-400">
            Items per page:
          </label>
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-3 py-2 text-sm border border-gray-300 rounded-md"
          >
            {ITEMS_PER_PAGE_OPTIONS.map((num) => (
              <option key={num} value={num}>
                Show {num}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto">
          <Table className="divide-y divide-gray-200">
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableCell
                  isHeader
                  className="px-6 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 uppercase"
                >
                  Liquidation ID
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
                  Date Submitted
                </TableCell>
                <TableCell
                  isHeader
                  className="px-6 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 uppercase"
                >
                  School Head
                </TableCell>
                <TableCell
                  isHeader
                  className="px-6 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 uppercase"
                >
                  School Name
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
              {paginatedLiquidations.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-8 text-center text-gray-500"
                  >
                    No records found.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedLiquidations.map((liq) => (
                  <TableRow
                    key={liq.LiquidationID}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">
                      {liq.LiquidationID}
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${statusBadgeStyle(
                          liq.status
                        )}`}
                      >
                        {STATUS_LABELS[liq.status] || liq.status}
                      </span>
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">
                      {/* Format created_at as YYYY-MM-DD or your preferred format */}
                      {liq.created_at
                        ? new Date(liq.created_at).toLocaleDateString()
                        : "N/A"}
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">
                      {liq.request?.user
                        ? `${liq.request.user.first_name} ${liq.request.user.last_name}`
                        : "N/A"}
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">
                      {liq.request?.user?.school?.schoolName || "N/A"}
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap text-sm">
                      <a
                        onClick={() => handleView(liq)}
                        className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-300 hover:underline cursor-pointer font-medium"
                        title={
                          liq.status === "resubmit"
                            ? "Cannot review a liquidation that needs revision."
                            : "View"
                        }
                        style={{
                          opacity: liq.status === "resubmit" ? 0.5 : 1,
                          pointerEvents:
                            liq.status === "resubmit" ? "none" : "auto",
                        }}
                        tabIndex={liq.status === "resubmit" ? -1 : 0}
                        role="link"
                      >
                        <LucideEye className="w-4 h-4 mr-1" />
                        View
                      </a>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Showing{" "}
          {paginatedLiquidations.length > 0
            ? (currentPage - 1) * itemsPerPage + 1
            : 0}{" "}
          to {Math.min(currentPage * itemsPerPage, filteredLiquidations.length)}{" "}
          of {filteredLiquidations.length} entries
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            variant="outline"
            size="sm"
          >
            {"<<"}
          </Button>
          <Button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            variant="outline"
            size="sm"
          >
            {"<"}
          </Button>
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <Button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            variant="outline"
            size="sm"
          >
            {">"}
          </Button>
          <Button
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
            variant="outline"
            size="sm"
          >
            {">>"}
          </Button>
        </div>
      </div>

      {/* Main Dialog: Expenses & Requirements */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Documents to Pre-Audit for {selected?.LiquidationID}
            </DialogTitle>
            <DialogDescription>
              Expand an expense to view its requirements and uploaded documents.
            </DialogDescription>
          </DialogHeader>
          {/* Document Completion Progress */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Document Completion
              </h3>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {getCompletion().approved}/{getCompletion().totalRequired}{" "}
                approved
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
              <div
                className="bg-blue-600 h-2.5 rounded-full"
                style={{
                  width: getCompletion().totalRequired
                    ? `${
                        (getCompletion().approved /
                          getCompletion().totalRequired) *
                        100
                      }%`
                    : "0%",
                }}
              ></div>
            </div>
          </div>
          {docLoading ? (
            <div className="py-8 text-center">Loading...</div>
          ) : (
            <div className="space-y-4">
              {expenseList.length === 0 ? (
                <div className="text-gray-500">No expenses found.</div>
              ) : (
                expenseList.map((expense) => (
                  <div
                    key={expense.id}
                    className="bg-gray-50 dark:bg-gray-700/30 rounded-lg"
                  >
                    {/* Expense Header */}
                    <div
                      className="flex items-center justify-between p-3 cursor-pointer"
                      onClick={() =>
                        setExpandedExpense(
                          expandedExpense === String(expense.id)
                            ? null
                            : String(expense.id)
                        )
                      }
                    >
                      <div>
                        <div className="font-semibold text-gray-800 dark:text-white">
                          {expense.title}
                        </div>
                        <div className="text-xs text-gray-500">
                          ₱{expense.amount.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        {expandedExpense === String(expense.id) ? (
                          <ChevronUp className="w-5 h-5" />
                        ) : (
                          <ChevronDown className="w-5 h-5" />
                        )}
                      </div>
                    </div>
                    {/* Requirements/Docs */}
                    {expandedExpense === String(expense.id) && (
                      <div className="p-3 space-y-2">
                        {expense.requirements.map((req) => {
                          const doc = documents.find(
                            (d) =>
                              d.requirement_obj.requirementTitle ===
                              req.requirementTitle
                          );
                          return (
                            <div
                              key={req.requirementID}
                              className="flex items-center justify-between bg-white dark:bg-gray-800 rounded px-3 py-2"
                            >
                              <div className="flex items-center gap-3">
                                <div className="flex-shrink-0">
                                  {doc && doc.is_approved ? (
                                    <CheckCircle className="h-5 w-5 text-green-500" />
                                  ) : (
                                    <AlertCircle className="h-5 w-5 text-yellow-500" />
                                  )}
                                </div>
                                <div>
                                  <div className="font-medium">
                                    {req.requirementTitle}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {req.is_required ? "Required" : "Optional"}
                                  </div>
                                  {doc && (
                                    <div className="text-xs mt-1">
                                      Status:{" "}
                                      {doc.is_approved ? (
                                        <span className="text-green-600">
                                          Approved
                                        </span>
                                      ) : (
                                        <span className="text-yellow-600">
                                          Pending
                                        </span>
                                      )}
                                      {doc.reviewer_comment && (
                                        <span className="ml-2 text-red-500">
                                          {doc.reviewer_comment}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div>
                                {doc ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setViewDoc(doc)}
                                    className="flex items-center gap-2"
                                  >
                                    <LucideEye className="w-4 h-4" />
                                    View
                                  </Button>
                                ) : (
                                  <span className="text-xs text-gray-400">
                                    No document
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
          {/* Approve/Reject Report Buttons */}
          {allReviewed && (
            <div className="flex gap-2 justify-end mt-4">
              <Button
                onClick={handleApproveReport}
                disabled={!canApprove}
                color="success"
                startIcon={<CheckCircle className="h-5 w-5" />}
              >
                Approve Liquidation Report
              </Button>
              <Button
                onClick={handleRejectReport}
                disabled={!canReject}
                variant="destructive"
                startIcon={<AlertCircle className="h-5 w-5" />}
              >
                Reject Liquidation Report
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Document View Dialog */}
      <Dialog open={!!viewDoc} onOpenChange={() => setViewDoc(null)}>
        <DialogContent className="w-full max-w-2xl sm:max-w-3xl md:max-w-4xl xl:max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {viewDoc?.requirement_obj.requirementTitle}
            </DialogTitle>
            <DialogDescription>
              Review the document and take action.
            </DialogDescription>
          </DialogHeader>
          {viewDoc && (
            <div className="space-y-4">
              <div className="flex flex-col gap-2 items-center">
                <a
                  href={viewDoc.document_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline mb-2"
                >
                  View Fullscreen
                </a>
                {/* Image preview */}
                {/\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(
                  viewDoc.document_url
                ) ? (
                  <img
                    src={viewDoc.document_url}
                    alt="Document Preview"
                    className="w-full max-w-3xl max-h-[60vh] rounded border shadow object-contain"
                    style={{ display: "block" }}
                  />
                ) : (
                  // Fallback for non-image files (e.g. PDF)
                  <iframe
                    src={viewDoc.document_url}
                    title="Document Preview"
                    className="w-full h-[60vh] border rounded"
                  />
                )}
              </div>
              {/* Comment and action buttons */}
              <div>
                <textarea
                  value={viewDoc.reviewer_comment || ""}
                  readOnly={!isEditingComment}
                  onClick={() => setIsEditingComment(true)}
                  onChange={(e) =>
                    setViewDoc((prev) => ({
                      ...prev!,
                      reviewer_comment: e.target.value,
                    }))
                  }
                  placeholder="Enter reviewer comment"
                  className={`w-full border rounded p-2 mt-2 ${
                    !isEditingComment ? "bg-gray-100 cursor-pointer" : ""
                  }`}
                  rows={3}
                />
                {!isEditingComment && (
                  <div className="text-xs text-gray-400 mt-1">
                    Click to add or edit comment
                  </div>
                )}
                <div className="flex gap-2 mt-2">
                  <Button
                    variant="success"
                    disabled={actionLoading || viewDoc.is_approved}
                    startIcon={<CheckCircle className="h-5 w-5" />}
                    onClick={async () => {
                      setActionLoading(true);
                      try {
                        await api.patch(
                          `/liquidations/${selected?.LiquidationID}/documents/${viewDoc.id}/`,
                          {
                            is_approved: true,
                            reviewer_comment: viewDoc.reviewer_comment,
                          }
                        );
                        toast.success("Document approved!");
                        // Refresh documents
                        const res = await api.get(
                          `/liquidations/${selected?.LiquidationID}/documents/`
                        );
                        setDocuments(res.data);
                        setViewDoc(null);
                      } catch (err) {
                        toast.error("Failed to update document status.");
                      } finally {
                        setActionLoading(false);
                      }
                    }}
                  >
                    Approve
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={actionLoading}
                    startIcon={<AlertCircle className="h-5 w-5" />}
                    onClick={async () => {
                      if (!viewDoc.reviewer_comment?.trim()) {
                        toast.error("Comment is required to reject.");
                        return;
                      }
                      setActionLoading(true);
                      try {
                        await api.patch(
                          `/liquidations/${selected?.LiquidationID}/documents/${viewDoc.id}/`,
                          {
                            is_approved: false,
                            reviewer_comment: viewDoc.reviewer_comment,
                          }
                        );
                        toast.success("Document rejected!");
                        // Refresh documents
                        const res = await api.get(
                          `/liquidations/${selected?.LiquidationID}/documents/`
                        );
                        setDocuments(res.data);
                        setViewDoc(null);
                      } catch (err) {
                        toast.error("Failed to update document status.");
                      } finally {
                        setActionLoading(false);
                      }
                    }}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LiquidationReportTable;

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  submitted: "Submitted",
  under_review_district: "Under Review (District)",
  under_review_division: "Under Review (Division)",
  resubmit: "Needs Revision",
  approved_district: "Approved by District",
  approved_division: "Approved by Division",
  approved: "Fully Approved",
  rejected: "Rejected",
  completed: "Completed",
  cancelled: "Cancelled",
};

const statusBadgeStyle = (status: string) => {
  switch (status) {
    case "draft":
      return "bg-gray-100 text-gray-800 dark:bg-gray-700/30 dark:text-gray-300";
    case "submitted":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
    case "under_review_district":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
    case "approved_district":
    case "approved_division":
    case "approved":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
    case "resubmit":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
    case "rejected":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
    case "completed":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
    case "cancelled":
      return "bg-gray-200 text-gray-500 dark:bg-gray-700/30 dark:text-gray-400";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-700/30 dark:text-gray-300";
  }
};
