/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
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
  Undo2Icon,
} from "lucide-react";
import Button from "@/components/ui/button/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";

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
    <div className="text-center py-8 space-y-2">
      <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
      <h3 className="text-lg font-medium text-red-600">Failed to load PDF</h3>
      <p className="text-gray-600">
        The document could not be loaded. Please try opening it in a new tab or
        contact support if the problem persists.
      </p>
    </div>
  );
}

const LiquidationDetailsPage = () => {
  const { liquidationId } = useParams<{ liquidationId: string }>();
  const navigate = useNavigate();
  const [liquidation, setLiquidation] = useState<Liquidation | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedExpense, setExpandedExpense] = useState<string | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [expenseList, setExpenseList] = useState<Expense[]>([]);
  const [viewDoc, setViewDoc] = useState<Document | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [isEditingComment, setIsEditingComment] = useState(false);
  const [currentComment, setCurrentComment] = useState("");
  const [isLoadingDoc, setIsLoadingDoc] = useState(false);
  const [currentDocIndex, setCurrentDocIndex] = useState(0);
  const [error, setError] = useState<Error | null>(null);
  const [hideApproved, setHideApproved] = useState(() => {
    const savedPreference = localStorage.getItem("hideApprovedDocuments");
    return savedPreference ? JSON.parse(savedPreference) : true;
  });
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [currentAction, setCurrentAction] = useState<
    "approve" | "reject" | null
  >(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rejectionComment, setRejectionComment] = useState("");

  // --- Add these states at the top of your component ---
  const [showApproveReportConfirm, setShowApproveReportConfirm] =
    useState(false);
  const [showRejectReportConfirm, setShowRejectReportConfirm] = useState(false);
  const [currentReportAction, setCurrentReportAction] = useState<
    "approve" | "reject" | null
  >(null);

  const { user } = useAuth();

  // Reset comment editing when changing documents
  useEffect(() => {
    setIsEditingComment(false);
    setCurrentComment("");
  }, [viewDoc]);

  // Filter expenses based on hideApproved state
  const filteredExpenses = useMemo(() => {
    if (!hideApproved) {
      // When showing all, just return all expenses but sort them with pending first
      return [...expenseList].sort((a, b) => {
        const aHasPending = a.requirements.some((req) => {
          const doc = documents.find(
            (d) =>
              d.request_priority_id === a.id &&
              d.requirement_id === req.requirementID
          );
          return !doc?.is_approved;
        });

        const bHasPending = b.requirements.some((req) => {
          const doc = documents.find(
            (d) =>
              d.request_priority_id === b.id &&
              d.requirement_id === req.requirementID
          );
          return !doc?.is_approved;
        });

        if (aHasPending && !bHasPending) return -1;
        if (!aHasPending && bHasPending) return 1;
        return 0;
      });
    }

    // When hiding approved, only show expenses with pending documents
    return expenseList.filter((expense) =>
      expense.requirements.some((req) => {
        const doc = documents.find(
          (d) =>
            d.request_priority_id === expense.id &&
            d.requirement_id === req.requirementID
        );
        return !doc?.is_approved;
      })
    );
  }, [expenseList, documents, hideApproved]);

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
        setDocuments(
          docRes.data.map((doc: any) => ({
            ...doc,
            is_approved: doc.is_approved === null ? null : doc.is_approved,
          }))
        );

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

  // --- Update handlers to show confirmation dialogs ---
  const handleApproveReport = () => {
    setCurrentReportAction("approve");
    setShowApproveReportConfirm(true);
  };

  const handleRejectReport = () => {
    setCurrentReportAction("reject");
    setShowRejectReportConfirm(true);
  };

  // --- Unified performReportAction for both actions ---
  const performReportAction = async () => {
    if (!currentReportAction) return;
    try {
      setActionLoading(true);
      if (currentReportAction === "approve") {
        // Set status based on user role
        let newStatus = "approved_district";
        if (user?.role === "liquidator") {
          newStatus = "liquidated";
        }
        await api.patch(`/liquidations/${liquidationId}/`, {
          status: newStatus,
          reviewed_at_district: new Date().toISOString(),
        });
        // If liquidator, also mark the connected request as liquidated
        if (user?.role === "liquidator" && liquidation?.request?.request_id) {
          await api.patch(
            `/requests/${liquidation.request.request_id}/`,
            {
              status: "liquidated",
            }
          );
        }
        toast.success(
          newStatus === "liquidated"
            ? "Liquidation report finalized!"
            : "Liquidation report approved!"
        );
      } else {
        await api.patch(`/liquidations/${liquidationId}/`, {
          status: "resubmit",
          reviewed_at_district: new Date().toISOString(),
          rejection_comment: rejectionComment,
        });
        toast.error("Liquidation report sent back for revision.");
      }
      // Dynamic navigation after approve/reject
      if (user?.role === "district_admin") {
        navigate("/pre-auditing");
      } else if (user?.role === "liquidator") {
        navigate("/liquidation-finalize");
      }
    } catch (err) {
      toast.error(`Failed to ${currentReportAction} liquidation report`);
    } finally {
      setActionLoading(false);
      setShowApproveReportConfirm(false);
      setShowRejectReportConfirm(false);
      setCurrentReportAction(null);
      setRejectionComment("");
    }
  };

  const handleDocumentAction = async (
    action: "approve" | "reject",
    _doc: Document
  ) => {
    setCurrentAction(action);
    if (action === "approve") {
      setShowApproveConfirm(true);
    } else {
      setRejectionComment("");
      setShowRejectConfirm(true);
    }
  };

  const performDocumentAction = async (
    action: "approve" | "reject",
    doc: Document
  ) => {
    setActionLoading(true);
    const newStatus = action === "approve";
    const comment = action === "reject" ? rejectionComment : "";
    await api.patch(`/liquidations/${liquidationId}/documents/${doc.id}/`, {
      is_approved: newStatus,
      reviewer_comment: comment,
    });
    setDocuments((docs) =>
      docs.map((d) =>
        d.id === doc.id
          ? { ...d, is_approved: newStatus, reviewer_comment: comment }
          : d
      )
    );
    // Update viewDoc so dialog reflects new status
    setViewDoc((prev) =>
      prev && prev.id === doc.id
        ? { ...prev, is_approved: newStatus, reviewer_comment: comment }
        : prev
    );
    toast[action === "approve" ? "success" : "error"](
      `Document ${action === "approve" ? "approved" : "rejected"}!`
    );
    setActionLoading(false);
    setShowApproveConfirm(false);
    setShowRejectConfirm(false);
    setRejectionComment("");
    // Do NOT close the dialog here
  };

  // Always show all expenses
  const handleOpenDoc = async (doc: Document) => {
    setIsLoadingDoc(true);
    setError(null);
    setViewDoc(doc);
    const docIndex = documents.findIndex((d) => d.id === doc.id);
    setCurrentDocIndex(docIndex);
    setZoomLevel(1); // Reset zoom when opening new document
  };

  // Error boundary for document preview

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

  // --- Role/Status logic ---
  const isDistrictAdmin = user?.role === "district_admin";
  const isLiquidator = user?.role === "liquidator";
  const status = liquidation?.status;
  const canDistrictAdminAct =
    isDistrictAdmin && status === "under_review_district";
  const canLiquidatorAct = isLiquidator && status === "approved_district";

  // --- Dynamic back button logic ---
  let backUrl = "/";
  let pageBreadcrumbText = "Liquidation Details";
  if (isDistrictAdmin) {
    backUrl = "/pre-auditing";
    pageBreadcrumbText = "District Liquidation Management";
  } else if (isLiquidator) {
    backUrl = "/liquidation-finalize";
    pageBreadcrumbText = "Finalize Liquidation Report";
  }

  // --- Role-based action logic ---
  const showDistrictAdminActions =
    isDistrictAdmin && status === "under_review_district" && allReviewed;
  // For liquidators, allow reject/finalize as long as status is correct, regardless of allReviewed
  const showLiquidatorActions =
    isLiquidator && status === "under_review_division";

  return (
    <div className="container mx-auto px-5 py-10">
      <div className="mb-4">
        <Button
          variant="outline"
          onClick={() => navigate(backUrl)}
          className="mb-2"
          size="sm"
        >
          <Undo2Icon />
        </Button>
      </div>
      <PageBreadcrumb pageTitle={pageBreadcrumbText} backUrl={backUrl} />
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
        <Dialog open={!!viewDoc} onOpenChange={() => setViewDoc(null)}>
          <DialogContent className="w-full max-w-2xl sm:max-w-3xl md:max-w-4xl xl:max-w-5xl max-h-[90vh] overflow-y-auto custom-scrollbar">
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
                {/* File preview */}
                <div className="relative h-[70vh] bg-gray-50 rounded-lg border custom-scrollbar">
                  {isLoadingDoc && (
                    <div className="absolute inset-0 flex items-center justify-center z-10">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                      <span className="ml-2">Loading PDF...</span>
                    </div>
                  )}

                  {error ? (
                    <ErrorFallback />
                  ) : (
                    <div className="h-full flex flex-col custom-scrollbar">
                      <div className="p-2 bg-gray-100 border-b flex justify-end items-center">
                        <div className="flex gap-2">
                          <button
                            onClick={() =>
                              setZoomLevel((z) => Math.min(2, z + 0.1))
                            }
                            className="px-2 py-1 text-xs bg-white rounded border"
                            disabled={zoomLevel >= 2}
                          >
                            Zoom In (+)
                          </button>
                          <button
                            onClick={() =>
                              setZoomLevel((z) => Math.max(0.5, z - 0.1))
                            }
                            className="px-2 py-1 text-xs bg-white rounded border"
                            disabled={zoomLevel <= 0.5}
                          >
                            Zoom Out (-)
                          </button>
                          <button
                            onClick={() => setZoomLevel(1)}
                            className="px-2 py-1 text-xs bg-white rounded border"
                          >
                            Reset (100%)
                          </button>
                          <a
                            href={viewDoc?.document_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded border"
                          >
                            Open in New Tab
                          </a>
                        </div>
                      </div>
                      <div className="flex-1 overflow-auto custom-scrollbar">
                        <div className="flex items-center justify-center h-full w-full custom-scrollbar">
                          <iframe
                            src={`${viewDoc?.document_url}#view=fitH`}
                            title="PDF Preview"
                            className="border-0 bg-white"
                            style={{
                              width: `${100 * zoomLevel}%`,
                              height: `${100 * zoomLevel}%`,
                              transformOrigin: "0 0",
                            }}
                            onLoad={() => setIsLoadingDoc(false)}
                            onError={() => {
                              setIsLoadingDoc(false);
                              setError(
                                new Error("Failed to load PDF document")
                              );
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Comment and action section */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        viewDoc?.is_approved === true
                          ? "bg-green-100 text-green-800"
                          : viewDoc?.is_approved === false
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {viewDoc?.is_approved === true
                        ? "Approved"
                        : viewDoc?.is_approved === false
                        ? "Rejected"
                        : "Pending Review"}
                    </span>
                    {viewDoc?.uploaded_at && (
                      <span className="text-xs text-gray-500">
                        Uploaded:{" "}
                        {new Date(viewDoc.uploaded_at).toLocaleString()}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2 mt-4 justify-between">
                    <div className="flex gap-2">
                      {/* Only show approve/reject for district admin, hide for liquidator */}
                      {isDistrictAdmin && (
                        <>
                          <Button
                            variant={
                              viewDoc?.is_approved ? "success" : "outline"
                            }
                            disabled={viewDoc?.is_approved || actionLoading}
                            startIcon={
                              actionLoading && currentAction === "approve" ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                              ) : (
                                <CheckCircle className="h-5 w-5" />
                              )
                            }
                            onClick={() =>
                              handleDocumentAction("approve", viewDoc!)
                            }
                          >
                            {actionLoading && currentAction === "approve"
                              ? "Approving..."
                              : viewDoc?.is_approved
                              ? "Approved"
                              : "Approve Document"}
                          </Button>
                          <Button
                            variant={
                              viewDoc?.is_approved === false
                                ? "destructive"
                                : "outline"
                            }
                            disabled={
                              viewDoc?.is_approved === false || actionLoading
                            }
                            startIcon={
                              actionLoading && currentAction === "reject" ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                              ) : (
                                <AlertCircle className="h-5 w-5" />
                              )
                            }
                            onClick={() =>
                              handleDocumentAction("reject", viewDoc!)
                            }
                          >
                            {actionLoading && currentAction === "reject"
                              ? "Rejecting..."
                              : viewDoc?.is_approved === false
                              ? "Rejected"
                              : "Reject Document"}
                          </Button>
                        </>
                      )}
                      {/* If liquidator, show disabled buttons for clarity (optional) */}
                      {isLiquidator && (
                        <>
                          <Button
                            variant={
                              viewDoc?.is_approved ? "success" : "outline"
                            }
                            disabled
                            startIcon={<CheckCircle className="h-5 w-5" />}
                          >
                            Approve Document
                          </Button>
                          <Button
                            variant={
                              viewDoc?.is_approved === false
                                ? "destructive"
                                : "outline"
                            }
                            disabled
                            startIcon={<AlertCircle className="h-5 w-5" />}
                          >
                            Reject Document
                          </Button>
                        </>
                      )}
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
                        }}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Rejection Reason Section - NEW */}
                {viewDoc?.is_approved === false && (
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium">Rejection Reason</h4>
                      {!isEditingComment && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setIsEditingComment(true);
                            setCurrentComment(viewDoc?.reviewer_comment || "");
                          }}
                        >
                          Edit Comment
                        </Button>
                      )}
                    </div>
                    {isEditingComment ? (
                      <div className="space-y-2">
                        <textarea
                          value={currentComment}
                          onChange={(e) => setCurrentComment(e.target.value)}
                          className="w-full border rounded p-2 text-sm"
                          rows={3}
                        />
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsEditingComment(false)}
                            disabled={actionLoading}
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="success"
                            size="sm"
                            onClick={async () => {
                              try {
                                setActionLoading(true);
                                await api.patch(
                                  `/liquidations/${liquidationId}/documents/${viewDoc.id}/`,
                                  { reviewer_comment: currentComment }
                                );
                                setDocuments((docs) =>
                                  docs.map((d) =>
                                    d.id === viewDoc.id
                                      ? {
                                          ...d,
                                          reviewer_comment: currentComment,
                                        }
                                      : d
                                  )
                                );
                                setViewDoc((prev) =>
                                  prev
                                    ? {
                                        ...prev,
                                        reviewer_comment: currentComment,
                                      }
                                    : null
                                );
                                toast.success("Comment updated successfully");
                                setIsEditingComment(false);
                              } catch (err) {
                                toast.error("Failed to update comment");
                              } finally {
                                setActionLoading(false);
                              }
                            }}
                            disabled={!currentComment.trim() || actionLoading}
                          >
                            {actionLoading ? "Saving..." : "Save"}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-gray-50 p-3 rounded text-sm">
                        {viewDoc.reviewer_comment || "No comment provided"}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Expenses and Documents List */}
        <div className="space-y-4 mt-6">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-medium text-gray-700">
              Document Completion
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setHideApproved(!hideApproved)}
            >
              {hideApproved ? "Show All Documents" : "Hide Approved Documents"}
            </Button>
          </div>
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
                      {expense.requirements
                        .map((req) => {
                          const doc = documents.find(
                            (d) =>
                              d.request_priority_id === expense.id &&
                              d.requirement_id === req.requirementID
                          );
                          return { req, doc };
                        })
                        // Sort pending first
                        .sort((a, b) => {
                          if (
                            (a.doc?.is_approved ?? false) ===
                            (b.doc?.is_approved ?? false)
                          )
                            return 0;
                          if (!a.doc?.is_approved) return -1;
                          return 1;
                        })
                        // Filter out approved if hideApproved is true
                        .filter(({ doc }) => !hideApproved || !doc?.is_approved)
                        .map(({ req, doc }) => (
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
                                    {doc?.is_approved === true ? (
                                      <span className="text-green-600">
                                        Approved
                                      </span>
                                    ) : doc?.is_approved === false ? (
                                      <span className="text-red-600">
                                        Rejected
                                      </span>
                                    ) : (
                                      <span className="text-yellow-600">
                                        Pending
                                      </span>
                                    )}
                                    {doc?.reviewer_comment && (
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
                        ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Approve/Reject Report Buttons (District Admin) */}
        {showDistrictAdminActions && (
          <div className="flex gap-4 justify-end mt-8">
            <Button
              onClick={handleRejectReport}
              disabled={
                !rejectionComment.trim() ||
                (actionLoading && currentReportAction === "reject")
              }
              variant="destructive"
              startIcon={
                actionLoading && currentReportAction === "reject" ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <AlertCircle className="h-5 w-5" />
                )
              }
            >
              {actionLoading && currentReportAction === "reject"
                ? "Rejecting..."
                : "Reject Liquidation Report"}
            </Button>
            <Button
              onClick={handleApproveReport}
              disabled={
                !canApprove ||
                (actionLoading && currentReportAction === "approve")
              }
              color="success"
              startIcon={
                actionLoading && currentReportAction === "approve" ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <CheckCircle className="h-5 w-5" />
                )
              }
            >
              {actionLoading && currentReportAction === "approve"
                ? "Approving..."
                : "Approve Liquidation Report"}
            </Button>
          </div>
        )}
        {/* Finalize/Reject Buttons (Liquidator) */}
        {showLiquidatorActions && (
          <div className="flex gap-4 justify-end mt-8">
            <Button
              onClick={handleRejectReport}
              disabled={actionLoading && currentReportAction === "reject"}
              variant="destructive"
              startIcon={
                actionLoading && currentReportAction === "reject" ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <AlertCircle className="h-5 w-5" />
                )
              }
            >
              {actionLoading && currentReportAction === "reject"
                ? "Rejecting..."
                : "Reject Liquidation Report"}
            </Button>
            <Button
              onClick={handleApproveReport}
              disabled={
                !canApprove ||
                (actionLoading && currentReportAction === "approve")
              }
              color="success"
              startIcon={
                actionLoading && currentReportAction === "approve" ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <CheckCircle className="h-5 w-5" />
                )
              }
            >
              {actionLoading && currentReportAction === "approve"
                ? "Finalizing..."
                : "Finalize Liquidation Report"}
            </Button>
          </div>
        )}
      </div>

      {/* --- Add the confirmation dialogs at the bottom of your component --- */}

      {/* Approve Report Confirmation Dialog */}
      <Dialog
        open={showApproveReportConfirm}
        onOpenChange={setShowApproveReportConfirm}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Approval</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve this liquidation report? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setShowApproveReportConfirm(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              variant="success"
              onClick={performReportAction}
              disabled={actionLoading}
              startIcon={
                actionLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : null
              }
            >
              {actionLoading ? "Approving..." : "Confirm Approval"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Reject Report Confirmation Dialog */}
      <Dialog
        open={showRejectReportConfirm}
        onOpenChange={setShowRejectReportConfirm}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Rejection</DialogTitle>
            <DialogDescription>
              Are you sure you want to reject this liquidation report? The
              submitter will need to resubmit with corrections.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <textarea
              value={rejectionComment}
              onChange={(e) => setRejectionComment(e.target.value)}
              placeholder="Enter reason for rejection..."
              className="w-full border rounded p-3 min-h-[100px] text-sm"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowRejectReportConfirm(false)}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={performReportAction}
                disabled={!rejectionComment.trim() || actionLoading}
                startIcon={
                  actionLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : null
                }
              >
                {actionLoading ? "Rejecting..." : "Confirm Rejection"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Document Approve Confirmation Dialog */}
      <Dialog open={showApproveConfirm} onOpenChange={setShowApproveConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Document Approval</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve this document? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setShowApproveConfirm(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              variant="success"
              onClick={async () => {
                await performDocumentAction("approve", viewDoc!);
                setShowApproveConfirm(false);
              }}
              disabled={actionLoading}
              startIcon={
                actionLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : null
              }
            >
              {actionLoading ? "Approving..." : "Confirm Approval"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Document Reject Confirmation Dialog */}
      <Dialog open={showRejectConfirm} onOpenChange={setShowRejectConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Document Rejection</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this document.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <textarea
              value={rejectionComment}
              onChange={(e) => setRejectionComment(e.target.value)}
              placeholder="Enter reason for rejection..."
              className="w-full border rounded p-3 min-h-[100px] text-sm"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowRejectConfirm(false)}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={async () => {
                  if (!rejectionComment.trim()) {
                    toast.error("Please provide a rejection reason");
                    return;
                  }
                  await performDocumentAction("reject", viewDoc!);
                  setShowRejectConfirm(false);
                }}
                disabled={!rejectionComment.trim() || actionLoading}
                startIcon={
                  actionLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : null
                }
              >
                {actionLoading ? "Rejecting..." : "Confirm Rejection"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LiquidationDetailsPage;
