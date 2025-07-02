/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useRef, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Button from "@/components/ui/button/Button";
import {
  UploadIcon,
  DownloadIcon,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  AlertCircle,
  Paperclip,
  MessageCircleIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "react-toastify";
import api from "@/api/axios";
import { DocumentTextIcon } from "@heroicons/react/outline";
import { Skeleton } from "antd";
import { useNavigate } from "react-router";

interface Requirement {
  requirementID: number | string;
  requirementTitle: string;
  is_required: boolean;
}

interface UploadedDocument {
  id: number | string;
  request_priority_id: number | string;
  requirement_id: number | string;
  document_url?: string;
  uploaded_at?: string;
  reviewer_comment?: string;
  // Add other fields as needed
}

interface Expense {
  id: string | number;
  title: string;
  amount: number;
  requirements: Requirement[];
}

interface LiquidationRequest {
  id: string;
  liquidationID: string;
  month: string;
  status: string;
  created_at?: Date;
  totalAmount: number;
  expenses: Expense[];
  uploadedDocuments: UploadedDocument[];
}

const LiquidationPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [request, setRequest] = useState<LiquidationRequest | null>(null);
  const [expandedExpense, setExpandedExpense] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  // Fetch pending liquidation for the current user
  useEffect(() => {
    const fetchPendingLiquidation = async () => {
      setLoading(true);
      setFetchError(null);
      console.log("Fetching pending liquidation for user:", user?.user_id);
      try {
        const res = await api.get("/liquidation/");
        const data = Array.isArray(res.data) ? res.data[0] : null;
        if (!data) {
          setRequest(null);
          setFetchError("No pending liquidation found.");
          return;
        }
        setRequest({
          id: data.request?.request_id || data.LiquidationID || "N/A",
          liquidationID: data.LiquidationID,
          month: data.request?.request_month || "N/A",
          status: data.status || "N/A",
          totalAmount: data.request?.priorities
            ? data.request.priorities.reduce(
                (sum: number, p: any) => sum + Number(p.amount || 0),
                0
              )
            : 0,
          expenses: (data.request?.priorities || []).map((priority: any) => ({
            id: priority.id || priority.priority?.LOPID || "",
            title: priority.priority?.expenseTitle || "",
            amount: Number(priority.amount) || 0,
            requirements: (priority.priority?.requirements || []).map(
              (req: any) => ({
                requirementID: req.requirementID,
                requirementTitle: req.requirementTitle,
                is_required: req.is_required,
              })
            ),
          })),
          uploadedDocuments: data.documents || [],
        });
      } catch (err) {
        setFetchError("Failed to fetch pending liquidation.");
      } finally {
        setLoading(false);
      }
    };
    fetchPendingLiquidation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Toggle expense expansion
  const toggleExpense = (expenseId: string) => {
    setExpandedExpense(expandedExpense === expenseId ? null : expenseId);
  };

  // Build a lookup map for uploaded documents: { "expenseId-requirementID": doc }
  const uploadedDocMap = useMemo(() => {
    if (!request) return {};
    const map: { [key: string]: UploadedDocument } = {};
    request.uploadedDocuments.forEach((doc) => {
      // Use the correct keys from your backend response
      map[`${doc.request_priority_id}-${doc.requirement_id}`] = doc;
    });
    return map;
  }, [request]);

  // Find uploaded document for a requirement (O(1) lookup)
  const getUploadedDocument = (
    expenseId: string | number,
    requirementID: string | number
  ) => {
    if (!request) return undefined;
    return uploadedDocMap[`${expenseId}-${requirementID}`];
  };

  // Handle file upload
  const handleFileUpload = async (
    expenseId: string,
    requirementID: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!e.target.files || !request) return;
    const file = e.target.files[0];
    if (!file) return;

    // Check if file is PDF
    if (
      file.type !== "application/pdf" &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      toast.error("Only PDF files are allowed");
      if (fileInputRefs.current[`${expenseId}-${requirementID}`]) {
        fileInputRefs.current[`${expenseId}-${requirementID}`]!.value = "";
      }
      return;
    }

    setUploading(`${expenseId}-${requirementID}`);
    const formData = new FormData();
    formData.append("request_priority", expenseId);
    formData.append("requirement", requirementID);
    formData.append("document", file);

    try {
      await api.post(
        `/liquidations/${request.liquidationID}/documents/`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      toast.success("PDF file uploaded successfully!");
      // Refresh data
      const res = await api.get("/liquidation/");
      const data = Array.isArray(res.data) ? res.data[0] : null;
      if (data) {
        setRequest((prev) =>
          prev
            ? {
                ...prev,
                uploadedDocuments: data.documents || [],
              }
            : prev
        );
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to upload PDF file.");
    } finally {
      setUploading(null);
      if (fileInputRefs.current[`${expenseId}-${requirementID}`]) {
        fileInputRefs.current[`${expenseId}-${requirementID}`]!.value = "";
      }
    }
  };

  // Remove uploaded file
  const removeFile = async (expenseId: string, requirementID: string) => {
    if (!request) return;
    const doc = getUploadedDocument(expenseId, requirementID);
    const docId = doc?.id;
    console.log("Removing file:", doc);
    if (!doc || !docId) {
      toast.error("No document found to remove.");
      return;
    }
    try {
      await api.delete(
        `/liquidations/${request.liquidationID}/documents/${docId}/`
      );
      toast.success("File removed!");
      // Refresh data
      const res = await api.get("/liquidation/");
      const data = Array.isArray(res.data) ? res.data[0] : null;
      if (data) {
        setRequest((prev) =>
          prev
            ? {
                ...prev,
                uploadedDocuments: data.documents || [],
              }
            : prev
        );
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to remove file.");
    }
  };

  // Trigger file input
  const triggerFileInput = (expenseId: string, requirementID: string) => {
    const key = `${expenseId}-${requirementID}`;
    if (fileInputRefs.current[key]) {
      fileInputRefs.current[key]?.click();
    }
  };

  // Check if all required documents are uploaded
  const isSubmitDisabled =
    !request ||
    request.expenses.some((expense) =>
      expense.requirements.some(
        (req) =>
          req.is_required && !getUploadedDocument(expense.id, req.requirementID)
      )
    );

  // Calculate progress
  const calculateProgress = () => {
    if (!request) return { uploadedRequired: 0, totalRequired: 0 };
    let totalRequired = 0;
    let uploadedRequired = 0;
    request.expenses.forEach((expense) => {
      expense.requirements.forEach((req) => {
        if (req.is_required) {
          totalRequired++;
          if (getUploadedDocument(expense.id, req.requirementID)) {
            uploadedRequired++;
          }
        }
      });
    });
    return { uploadedRequired, totalRequired };
  };

  const { uploadedRequired, totalRequired } = calculateProgress();

  // Submit liquidation (stub, needs API integration)
  const handleSubmit = async () => {
    if (!request) return;

    setIsSubmitting(true);
    try {
      const response = await api.post(
        `/liquidations/${request.liquidationID}/submit/`
      );

      // Update the request state with the new status
      setRequest((prev) =>
        prev
          ? {
              ...prev,
              status: response.data.status || "submitted",
            }
          : prev
      );

      toast.success("Liquidation submitted successfully!");
    } catch (error: any) {
      console.error(error);
      const errorMessage =
        error.response?.data?.error || "Failed to submit liquidation";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
      setIsConfirmDialogOpen(false);
    }
  };

  // Save as draft (stub)

  const statusLabels: Record<string, string> = {
    draft: "Draft",
    submitted: "Submitted",
    under_review: "Under Review",
    resubmit: "Needs Revision",
    approved: "Approved",
    rejected: "Rejected",
    completed: "Completed",
    cancelled: "Cancelled",
  };

  if (loading) {
    return (
      <div className="container mx-auto px-5 py-10">
        <PageBreadcrumb pageTitle="Liquidation Request" />
        {/* Feedback skeleton placeholder at top */}
        <div className="mb-6">
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
        <div className="mt-8 space-y-6">
          {/* Loading Skeleton for Summary Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
              <div className="space-y-2">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-5 w-48" />
              </div>
              <div className="flex gap-3">
                <Skeleton className="h-8 w-24 rounded-full" />
                <Skeleton className="h-8 w-28 rounded-full" />
              </div>
            </div>

            {/* Progress Bar Skeleton */}
            <div className="mb-6">
              <div className="flex justify-between mb-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-2.5 w-full rounded-full" />
            </div>

            <div className="flex justify-end">
              <Skeleton className="h-10 w-40" />
            </div>
          </div>

          {/* Loading Skeleton for Expenses */}
          <div className="space-y-4">
            <Skeleton className="h-6 w-48 mb-4" />

            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden"
              >
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (fetchError || !request) {
    return (
      <div className="container mx-auto px-5 py-10">
        <PageBreadcrumb pageTitle="Liquidation Request" />
        {/* Feedback placeholder at top for error state */}
        <div className="mb-6">
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg px-4 py-3 flex items-center gap-3">
            <AlertCircle className="h-6 w-6 text-red-500" />
            <span>
              {fetchError
                ? "Failed to load liquidation data. Please try again later."
                : "You don't have any pending liquidation requests at this time."}
            </span>
          </div>
        </div>
        <div className="mt-24 flex items-center justify-center">
          <div className="mt-6 bg-white  p-6">
            <div className="text-center py-8">
              <div className="mx-auto w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                <DocumentTextIcon className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                No Active Liquidation Request
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                {fetchError
                  ? "Failed to load liquidation data. Please try again later."
                  : "You don't have any pending liquidation requests at this time."}
              </p>
              <div className="flex justify-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => window.location.reload()}
                >
                  Retry
                </Button>
                <Button
                  variant="primary"
                  onClick={() => navigate("/requests-history")}
                >
                  View Request History
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`container mx-auto rounded-2xl px-5 pb-5 pt-5 sm:px-6 sm:pt-6 ${
        request.status === "submitted"
          ? "bg-blue-50/30 border border-blue-200 dark:bg-blue-900/5 dark:border-blue-800/30"
          : "bg-white dark:bg-white/[0.03]"
      }`}
    >
      <PageBreadcrumb pageTitle="Liquidation Request" />

      {/* --- FEEDBACK SECTION AT TOP --- */}
      <div className="mb-8">
        {/* Action Required Banner */}
        {request.status === "resubmit" && (
          <>
            <div className="mb-4 flex items-center gap-3 bg-red-50 border border-red-200 text-red-800 rounded-lg px-4 py-3">
              <AlertCircle className="h-6 w-6 text-red-500" />
              <span className="font-semibold">Action Required:</span>
              <span>
                This request requires your attention. Please address the
                feedback below.
              </span>
            </div>
            {/* Feedback Panel */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                  <MessageCircleIcon className="h-5 w-5 text-gray-500" />
                  Reviewer Feedback
                </h3>
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                  Action Required
                </span>
              </div>
              <div className="space-y-4">
                {request.uploadedDocuments
                  .filter(
                    (doc) =>
                      doc.reviewer_comment && doc.reviewer_comment.trim() !== ""
                  )
                  .map((doc, idx) => (
                    <div
                      key={doc.id || idx}
                      className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0">
                          <DocumentTextIcon className="h-5 w-5 text-gray-500" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-800 dark:text-white">
                            {/* Show the requirement/document name if available */}
                            {(() => {
                              // Try to find the requirement title from the expense requirements
                              let reqTitle = "Document";
                              for (const expense of request.expenses) {
                                const req = expense.requirements.find(
                                  (r) =>
                                    String(r.requirementID) ===
                                    String(doc.requirement_id)
                                );
                                if (req) {
                                  reqTitle = req.requirementTitle;
                                  break;
                                }
                              }
                              return reqTitle;
                            })()}
                          </h4>
                          <p className="mt-1 text-gray-700 dark:text-gray-300">
                            {doc.reviewer_comment}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                {/* If no feedback, show a message */}
                {request.uploadedDocuments.filter(
                  (doc) =>
                    doc.reviewer_comment && doc.reviewer_comment.trim() !== ""
                ).length === 0 && (
                  <div className="text-gray-500 dark:text-gray-400 italic">
                    No reviewer feedback yet.
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="mt-8">
        {/* Request Summary Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm mb-6 p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                Liquidation Request: {request.id}
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                For the month of {request.month}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-brand-800 dark:bg-blue-900/30 dark:text-blue-300">
                {statusLabels[request.status] || request.status}
              </span>
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                ₱{request.totalAmount.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Document Completion
              </h3>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {uploadedRequired}/{totalRequired} required documents uploaded
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
              <div
                className="bg-blue-600 h-2.5 rounded-full"
                style={{
                  width: totalRequired
                    ? `${(uploadedRequired / totalRequired) * 100}%`
                    : "0%",
                }}
              ></div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 justify-end">
            {/* <Button
              variant="outline"
              onClick={handleSaveDraft}
              disabled={isSubmitting}
            >
              Save as Draft
            </Button> */}
            <Dialog
              open={isConfirmDialogOpen}
              onOpenChange={setIsConfirmDialogOpen}
            >
              <DialogTrigger asChild>
                <Button
                  variant="primary"
                  disabled={
                    isSubmitDisabled ||
                    isSubmitting ||
                    (request.status !== "draft" &&
                      request.status !== "resubmit")
                  }
                >
                  {request.status === "submitted"
                    ? "Already Submitted"
                    : isSubmitting
                    ? "Submitting..."
                    : "Submit Liquidation"}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-xl">
                    Confirm Submission
                  </DialogTitle>
                  <DialogDescription>
                    Are you sure you want to submit this liquidation request?
                    Please ensure all required documents are uploaded.
                  </DialogDescription>
                </DialogHeader>
                <div className="mt-4 flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setIsConfirmDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Submitting..." : "Confirm Submission"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Expenses List */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            Expenses to Liquidate
          </h3>

          {request.expenses.map((expense) => {
            // Split requirements into pending and uploaded
            const pendingReqs = expense.requirements.filter(
              (req) => !getUploadedDocument(expense.id, req.requirementID)
            );
            const uploadedReqs = expense.requirements.filter((req) =>
              getUploadedDocument(expense.id, req.requirementID)
            );
            return (
              <div
                key={expense.id}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden"
              >
                {/* Expense Header */}
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  onClick={() => toggleExpense(String(expense.id))}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-300">
                      {expandedExpense === String(expense.id) ? (
                        <ChevronUp className="h-5 w-5" />
                      ) : (
                        <ChevronDown className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-800 dark:text-white">
                        {expense.title}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        ₱{expense.amount.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {
                        expense.requirements.filter((req) =>
                          getUploadedDocument(expense.id, req.requirementID)
                        ).length
                      }
                      /{expense.requirements.length} documents
                    </span>
                  </div>
                </div>

                {/* Expense Content - Collapsible */}
                {expandedExpense === String(expense.id) && (
                  <div className="border-t border-gray-200 dark:border-gray-700 p-4">
                    <div className="space-y-4">
                      {/* Pending requirements first */}
                      {pendingReqs.length > 0 &&
                        pendingReqs.map((req) => {
                          return (
                            <div
                              key={`pending-${expense.id}-${req.requirementID}`}
                              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 bg-yellow-50 dark:bg-yellow-900/10 border-l-4 border-yellow-400 rounded-lg animate-pulse"
                            >
                              <div className="flex items-center gap-3">
                                <div className="flex-shrink-0">
                                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                                </div>
                                <div>
                                  <p className="font-medium text-yellow-900 dark:text-yellow-200">
                                    {req.requirementTitle}
                                  </p>
                                  <div className="flex gap-2 mt-1">
                                    {req.is_required ? (
                                      <span className="text-xs px-2 py-1 bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300 rounded-full">
                                        Required
                                      </span>
                                    ) : (
                                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300 rounded-full">
                                        Optional
                                      </span>
                                    )}
                                    <span className="text-xs px-2 py-1 bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 rounded-full">
                                      PDF only
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <input
                                  type="file"
                                  ref={(el) => {
                                    fileInputRefs.current[
                                      `${expense.id}-${req.requirementID}`
                                    ] = el;
                                  }}
                                  onChange={(e) =>
                                    handleFileUpload(
                                      String(expense.id),
                                      String(req.requirementID),
                                      e
                                    )
                                  }
                                  className="hidden"
                                  accept=".pdf,application/pdf"
                                  disabled={
                                    uploading ===
                                    `${expense.id}-${req.requirementID}`
                                  }
                                />
                                <Button
                                  variant="primary"
                                  size="sm"
                                  startIcon={<UploadIcon className="h-4 w-4" />}
                                  onClick={() =>
                                    triggerFileInput(
                                      String(expense.id),
                                      String(req.requirementID)
                                    )
                                  }
                                  disabled={
                                    uploading ===
                                      `${expense.id}-${req.requirementID}` ||
                                    !!getUploadedDocument(
                                      expense.id,
                                      req.requirementID
                                    ) ||
                                    (request.status !== "draft" &&
                                      request.status !== "resubmit")
                                  }
                                >
                                  {uploading ===
                                  `${expense.id}-${req.requirementID}`
                                    ? "Uploading..."
                                    : "Upload"}
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      {/* Uploaded requirements after */}
                      {uploadedReqs.length > 0 &&
                        uploadedReqs.map((req) => {
                          const uploadedDoc = getUploadedDocument(
                            expense.id,
                            req.requirementID
                          );
                          return (
                            <div
                              key={`uploaded-${expense.id}-${req.requirementID}`}
                              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg"
                            >
                              <div className="flex items-center gap-3">
                                <div className="flex-shrink-0">
                                  <CheckCircle className="h-5 w-5 text-green-500" />
                                </div>
                                <div>
                                  <p className="font-medium text-gray-800 dark:text-white">
                                    {req.requirementTitle}
                                  </p>
                                  {req.is_required ? (
                                    <span className="text-xs px-2 py-1 bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300 rounded-full">
                                      Required
                                    </span>
                                  ) : (
                                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300 rounded-full">
                                      Optional
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    removeFile(
                                      String(expense.id),
                                      String(req.requirementID)
                                    )
                                  }
                                >
                                  Remove
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  startIcon={
                                    <DownloadIcon className="h-4 w-4" />
                                  }
                                  onClick={() => {
                                    if (uploadedDoc?.document_url) {
                                      window.open(
                                        uploadedDoc.document_url,
                                        "_blank"
                                      );
                                    } else {
                                      toast.info(
                                        `No file available for ${req.requirementTitle}`
                                      );
                                    }
                                  }}
                                >
                                  View
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      {/* If no requirements at all */}
                      {expense.requirements.length === 0 && (
                        <div className="text-sm text-gray-500 italic">
                          No documents uploaded yet
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Summary Section */}
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            Summary of Uploaded Documents
          </h3>

          <div className="space-y-3">
            {request.expenses.map((expense) => {
              // Split requirements into pending and uploaded
              const pendingReqs = expense.requirements.filter(
                (req) => !getUploadedDocument(expense.id, req.requirementID)
              );
              const uploadedReqs = expense.requirements.filter((req) =>
                getUploadedDocument(expense.id, req.requirementID)
              );
              return (
                <div
                  key={expense.id}
                  className="border-b border-gray-200 dark:border-gray-700 pb-3 last:border-0 last:pb-0"
                >
                  <h4 className="font-medium text-gray-800 dark:text-white mb-2">
                    {expense.title} (₱{expense.amount.toLocaleString()})
                  </h4>
                  <ul className="space-y-2">
                    {/* Pending requirements first */}
                    {pendingReqs.length > 0 &&
                      pendingReqs.map((req) => (
                        <li
                          key={`pending-${req.requirementID}`}
                          className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 font-semibold"
                        >
                          <Paperclip className="h-4 w-4 text-gray-400" />
                          <span>{req.requirementTitle}</span>
                          <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300 rounded-full px-2 py-0.5">
                            Not uploaded
                          </span>
                        </li>
                      ))}
                    {/* Uploaded requirements after */}
                    {uploadedReqs.length > 0 &&
                      uploadedReqs.map((req, idx) => {
                        const doc = getUploadedDocument(
                          expense.id,
                          req.requirementID
                        );
                        return (
                          <li
                            key={`uploaded-${doc?.id || idx}`}
                            className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
                          >
                            <Paperclip className="h-4 w-4 text-gray-500" />
                            <span className="text-xs px-1 py-0.5 bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 rounded mr-1">
                              PDF
                            </span>
                            {doc?.document_url ? (
                              <a
                                href={doc.document_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline"
                              >
                                {doc.document_url.split("/").pop()}
                              </a>
                            ) : (
                              req.requirementTitle
                            )}
                            {doc && doc.reviewer_comment && (
                              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                Reviewer Comment: {doc.reviewer_comment}
                              </div>
                            )}
                          </li>
                        );
                      })}
                    {/* If no requirements at all */}
                    {expense.requirements.length === 0 && (
                      <li className="text-sm text-gray-500 italic">
                        No documents uploaded yet
                      </li>
                    )}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {/* Status History Timeline - Add right here */}
      {/* ...existing code... */}
    </div>
  );
};

export default LiquidationPage;
