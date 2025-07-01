/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "@/api/axios";
import { Liquidation } from "@/components/tables/BasicTables/LiquidationReportTable";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import {
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Eye,
  Loader2,
  Minus,
  Plus,
} from "lucide-react";
import Button from "@/components/ui/button/Button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "react-toastify";

// --- Type Safety Improvements ---
interface Document {
  id: number;
  document_url: string;
  requirement_obj: {
    requirementTitle: string;
  };
  is_approved: boolean | null;
  reviewer_comment: string | null;
  requirement_id: number;
  request_priority_id: number;
  uploaded_at: string;
}

interface Expense {
  id: string | number;
  title: string;
  requirements: Requirement[];
  amount: number;
}

interface Requirement {
  requirementID: number;
  requirementTitle: string;
  is_required: boolean;
}

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  submitted: "Submitted",
  under_review_district: "Under Review (District)",
  under_review_division: "Under Review (Division)",
  resubmit: "Needs Revision",
  approved_district: "Approved by District",
  liquidated: "Liquidated",
};

const statusBadgeStyle = (status: string) => {
  switch (status) {
    case "draft":
      return "bg-gray-100 text-gray-800";
    case "submitted":
      return "bg-blue-100 text-blue-800";
    case "under_review_district":
    case "under_review_division":
      return "bg-yellow-100 text-yellow-800";
    case "approved_district":
      return "bg-green-100 text-green-800";
    case "resubmit":
      return "bg-red-100 text-red-800";
    case "liquidated":
      return "bg-purple-100 text-purple-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

// --- Error Boundary for Document Viewer ---
function ErrorFallback() {
  return (
    <div className="text-red-500 text-center py-8">
      Failed to load document preview.
    </div>
  );
}

const LiquidationDetailsPage = () => {
  const { liquidationId } = useParams<{ liquidationId: string }>();
  const [liquidation, setLiquidation] = useState<Liquidation | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedExpense, setExpandedExpense] = useState<string | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [expenseList, setExpenseList] = useState<Expense[]>([]);
  const [viewDoc, setViewDoc] = useState<Document | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [isEditingComment, setIsEditingComment] = useState(false);
  const [currentComment, setCurrentComment] = useState("");
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isLoadingDoc, setIsLoadingDoc] = useState(false);
  const [currentDocIndex, setCurrentDocIndex] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchLiquidationDetails = async () => {
      try {
        setLoading(true);
        // Fetch liquidation details
        const liqRes = await api.get(`/liquidations/${liquidationId}/`);
        setLiquidation(liqRes.data);

        // Build expense list from priorities
        const priorities = liqRes.data.request?.priorities || [];
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

        // Fetch documents
        const docRes = await api.get(
          `/liquidations/${liquidationId}/documents/`
        );
        setDocuments(docRes.data);

        // Auto-expand first expense with unapproved documents
        if (expenses.length > 0) {
          const firstUnapprovedExpense = expenses.find((expense) =>
            expense.requirements.some(
              (req) =>
                !docRes.data.some(
                  (doc: {
                    request_priority_id: string | number;
                    requirement_id: number;
                    is_approved: any;
                  }) =>
                    doc.request_priority_id === expense.id &&
                    doc.requirement_id === req.requirementID &&
                    doc.is_approved
                )
            )
          );
          if (firstUnapprovedExpense) {
            setExpandedExpense(String(firstUnapprovedExpense.id));
          }
        }
      } catch (err) {
        console.error("Failed to fetch liquidation details", err);
        toast.error("Failed to load liquidation details");
      } finally {
        setLoading(false);
      }
    };

    fetchLiquidationDetails();
  }, [liquidationId]);

  // Reset comment when changing viewed document
  useEffect(() => {
    if (viewDoc) {
      setCurrentComment(viewDoc.reviewer_comment || "");
    } else {
      setCurrentComment("");
    }
  }, [viewDoc]);

  // Document completion calculation
  const getCompletion = () => {
    const totalRequired = documents.filter(
      (doc) => doc.requirement_obj && doc.is_approved !== undefined
    ).length;
    const approved = documents.filter((doc) => doc.is_approved).length;
    return { approved, totalRequired };
  };

  const { approved, totalRequired } = getCompletion();
  const hasAnyComment = documents.some(
    (doc) => doc.reviewer_comment && doc.reviewer_comment.trim() !== ""
  );

  // Approve enabled only if all required docs are approved
  const canApprove = totalRequired > 0 && approved === totalRequired;

  // Reject enabled only if at least one reviewer comment exists
  const canReject = hasAnyComment;

  // At the bottom of the dialog, after all documents are reviewed:
  const allReviewed = documents.every((doc) => doc.is_approved !== null);

  const handleApproveReport = async () => {
    try {
      setActionLoading(true);
      await api.patch(`/liquidations/${liquidationId}/`, {
        status: "approved_district",
        reviewed_at_district: new Date().toISOString(),
      });
      toast.success("Liquidation report approved!");
      // Refresh data
      const res = await api.get(`/liquidations/${liquidationId}/`);
      setLiquidation(res.data);
    } catch (err) {
      toast.error("Failed to approve liquidation report");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectReport = async () => {
    try {
      setActionLoading(true);
      await api.patch(`/liquidations/${liquidationId}/`, {
        status: "resubmit",
      });
      toast.info("Liquidation report sent back for revision.");
      // Refresh data
      const res = await api.get(`/liquidations/${liquidationId}/`);
      setLiquidation(res.data);
    } catch (err) {
      toast.error("Failed to reject liquidation report");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDocumentAction = async (
    action: "approve" | "reject",
    doc: Document
  ) => {
    try {
      setActionLoading(true);
      await api.patch(`/liquidations/${liquidationId}/documents/${doc.id}/`, {
        is_approved: action === "approve",
        reviewer_comment: currentComment,
      });
      toast.success(
        `Document ${action === "approve" ? "approved" : "rejected"}!`
      );
      // Refresh documents
      const res = await api.get(`/liquidations/${liquidationId}/documents/`);
      setDocuments(res.data);
      setViewDoc(null);
    } catch (err) {
      toast.error(`Failed to ${action} document`);
    } finally {
      setActionLoading(false);
    }
  };

  // Always show all expenses
  const filteredExpenses = expenseList;

  // Only load documents when needed
  const handleOpenDoc = async (doc: Document) => {
    setIsLoadingDoc(true);
    setError(null);
    setViewDoc(doc);
    const docIndex = documents.findIndex((d) => d.id === doc.id);
    setCurrentDocIndex(docIndex);
    setZoomLevel(1);
  };

  // Error boundary for document preview
  const DocumentPreview = () => {
    if (!viewDoc) return null;
    try {
      if (/\.pdf$/i.test(viewDoc.document_url)) {
        return (
          <div className="w-full h-[60vh] border rounded relative">
            <iframe
              src={`https://docs.google.com/viewer?url=${encodeURIComponent(
                viewDoc.document_url
              )}&embedded=true`}
              className="w-full h-full"
              frameBorder="0"
              onLoad={() => setIsLoadingDoc(false)}
              onError={() => {
                setIsLoadingDoc(false);
                setError(new Error("Failed to load PDF preview"));
              }}
            />
          </div>
        );
      }
      // Image preview with zoom
      return (
        <div className="relative">
          <img
            src={viewDoc.document_url}
            alt="Document Preview"
            className="w-full max-w-3xl max-h-[60vh] rounded border shadow object-contain transition-transform duration-200"
            style={{ transform: `scale(${zoomLevel})` }}
            onLoad={() => setIsLoadingDoc(false)}
            onError={() => {
              setIsLoadingDoc(false);
              setError(new Error("Failed to load image"));
            }}
          />
          <div className="absolute bottom-4 right-4 bg-white rounded-full shadow flex">
            <button
              onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.1))}
              className="p-2 hover:bg-gray-100 rounded-l-full"
            >
              <Minus className="h-4 w-4" />
            </button>
            <button
              onClick={() => setZoomLevel(Math.min(2, zoomLevel + 0.1))}
              className="p-2 hover:bg-gray-100 rounded-r-full"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      );
    } catch (err) {
      return <ErrorFallback />;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-5 py-10">
        <PageBreadcrumb pageTitle="Loading Liquidation Details..." />
        <div className="bg-white rounded-lg shadow p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!liquidation) {
    return (
      <div className="container mx-auto px-5 py-10">
        <PageBreadcrumb pageTitle="Liquidation Not Found" />
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <h2 className="text-xl font-semibold text-gray-800">
            Liquidation not found
          </h2>
          <p className="text-gray-600 mt-2">
            The liquidation you're looking for doesn't exist or you don't have
            permission to view it.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-5 py-10">
      <PageBreadcrumb
        pageTitle={`Liquidation Details: ${liquidation.LiquidationID}`}
      />

      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <h2 className="text-lg font-semibold mb-2">Basic Information</h2>
            <div className="space-y-2">
              <p>
                <span className="font-medium">Liquidation ID:</span>{" "}
                {liquidation.LiquidationID}
              </p>
              <p>
                <span className="font-medium">Status:</span>{" "}
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${statusBadgeStyle(
                    liquidation.status
                  )}`}
                >
                  {STATUS_LABELS[liquidation.status] || liquidation.status}
                </span>
              </p>
              <p>
                <span className="font-medium">Created At:</span>{" "}
                {liquidation.created_at
                  ? new Date(liquidation.created_at).toLocaleString()
                  : "N/A"}
              </p>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">Request Details</h2>
            {liquidation.request && (
              <div className="space-y-2">
                <p>
                  <span className="font-medium">Request ID:</span>{" "}
                  {liquidation.request.request_id || "N/A"}
                </p>
                <p>
                  <span className="font-medium">School Head:</span>{" "}
                  {liquidation.request.user
                    ? `${liquidation.request.user.first_name} ${liquidation.request.user.last_name}`
                    : "N/A"}
                </p>
                <p>
                  <span className="font-medium">School:</span>{" "}
                  {liquidation.request.user?.school?.schoolName || "N/A"}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Document Completion Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-700">
              Document Completion
            </h3>
            <span className="text-sm font-medium text-gray-700">
              {approved}/{totalRequired} approved
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full"
              style={{
                width: totalRequired
                  ? `${(approved / totalRequired) * 100}%`
                  : "0%",
              }}
            ></div>
          </div>
        </div>

        {/* Expenses and Documents */}
        <div className="space-y-4">
          {filteredExpenses.length === 0 ? (
            <div className="text-gray-500">
              All documents have been approved.
            </div>
          ) : (
            filteredExpenses.map((expense) => {
              const hasUnapprovedDocs = expense.requirements.some((req) => {
                const doc = documents.find(
                  (d) =>
                    d.request_priority_id === expense.id &&
                    d.requirement_id === req.requirementID
                );
                return !doc || !doc.is_approved;
              });

              return (
                <div key={expense.id} className="bg-gray-50 rounded-lg">
                  {/* Expense Header */}
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer"
                    onClick={() =>
                      setExpandedExpense(
                        expandedExpense === String(expense.id)
                          ? null
                          : String(expense.id)
                      )
                    }
                  >
                    <div>
                      <div className="font-semibold text-gray-800">
                        {expense.title}
                      </div>
                      <div className="text-xs text-gray-500">
                        ₱{expense.amount.toLocaleString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {hasUnapprovedDocs && (
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                          Pending
                        </span>
                      )}
                      {expandedExpense === String(expense.id) ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </div>
                  </div>

                  {/* Requirements/Docs */}
                  {expandedExpense === String(expense.id) && (
                    <div className="p-4 space-y-2">
                      {expense.requirements.map((req) => {
                        const doc = documents.find(
                          (d) =>
                            d.request_priority_id === expense.id &&
                            d.requirement_id === req.requirementID
                        );
                        return (
                          <div
                            key={req.requirementID}
                            className="flex items-center justify-between bg-white rounded px-3 py-2"
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
                                  onClick={() => handleOpenDoc(doc)}
                                  className="flex items-center gap-2"
                                >
                                  <Eye className="w-4 h-4" />
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
              );
            })
          )}
        </div>

        {/* Approve/Reject Report Buttons */}
        {allReviewed && (
          <div className="flex gap-4 justify-end mt-8">
            <Button
              onClick={handleRejectReport}
              disabled={!canReject || actionLoading}
              variant="destructive"
              startIcon={<AlertCircle className="h-5 w-5" />}
            >
              Reject Liquidation Report
            </Button>
            <Button
              onClick={handleApproveReport}
              disabled={!canApprove || actionLoading}
              color="success"
              startIcon={<CheckCircle className="h-5 w-5" />}
            >
              Approve Liquidation Report
            </Button>
          </div>
        )}
      </div>

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
              {/* Document Info Section */}
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Requirement
                    </p>
                    <p>{viewDoc.requirement_obj.requirementTitle}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Status</p>
                    <p
                      className={
                        viewDoc.is_approved
                          ? "text-green-600"
                          : "text-yellow-600"
                      }
                    >
                      {viewDoc.is_approved ? "Approved" : "Pending"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Uploaded At
                    </p>
                    <p>
                      {viewDoc.uploaded_at
                        ? new Date(viewDoc.uploaded_at).toLocaleString()
                        : "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      File Type
                    </p>
                    <p>
                      {viewDoc.document_url.split(".").pop()?.toUpperCase()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Error Boundary and Loading State */}
              <div className="relative">
                {isLoadingDoc && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-50/50 z-10">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                    <span className="ml-2">Loading document...</span>
                  </div>
                )}
                {error && <ErrorFallback />}
                {!error && <DocumentPreview />}
              </div>

              {/* Comment and Action Section */}
              <div>
                <textarea
                  value={currentComment}
                  readOnly={!isEditingComment}
                  onClick={() => setIsEditingComment(true)}
                  onChange={(e) => setCurrentComment(e.target.value)}
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
                <div className="flex gap-2 mt-4 justify-between">
                  <div className="flex gap-2">
                    <Button
                      variant="success"
                      disabled={actionLoading || !!viewDoc.is_approved}
                      startIcon={<CheckCircle className="h-5 w-5" />}
                      onClick={() => handleDocumentAction("approve", viewDoc)}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="destructive"
                      disabled={actionLoading}
                      startIcon={<AlertCircle className="h-5 w-5" />}
                      onClick={() => {
                        if (!currentComment.trim()) {
                          toast.error("Comment is required to reject.");
                          return;
                        }
                        handleDocumentAction("reject", viewDoc);
                      }}
                    >
                      Reject
                    </Button>
                  </div>
                  <div className="flex items-center gap-4">
                    <Button
                      variant="outline"
                      disabled={currentDocIndex === 0}
                      onClick={() => {
                        const prevDoc = documents[currentDocIndex - 1];
                        setCurrentDocIndex(currentDocIndex - 1);
                        setViewDoc(prevDoc);
                        setIsLoadingDoc(true);
                        setZoomLevel(1);
                      }}
                    >
                      Previous
                    </Button>
                    <div className="text-sm text-gray-500">
                      {currentDocIndex + 1} of {documents.length}
                    </div>
                    <Button
                      variant="outline"
                      disabled={currentDocIndex === documents.length - 1}
                      onClick={() => {
                        const nextDoc = documents[currentDocIndex + 1];
                        setCurrentDocIndex(currentDocIndex + 1);
                        setViewDoc(nextDoc);
                        setIsLoadingDoc(true);
                        setZoomLevel(1);
                      }}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LiquidationDetailsPage;
