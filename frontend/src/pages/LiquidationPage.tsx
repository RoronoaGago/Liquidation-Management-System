/* eslint-disable react-hooks/exhaustive-deps */
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
  Info,
  Clock,
  FileText,
  XCircle,
  RefreshCw,
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
import { Progress, Skeleton } from "antd";
import { useNavigate } from "react-router";
import { formatCurrency } from "@/lib/helpers";

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
  is_approved?: boolean | null;
}

interface Expense {
  id: string | number;
  title: string;
  amount: number;
  actualAmount?: number;
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
  refund: number;
  uploadedDocuments: UploadedDocument[];
  remaining_days: number | null;
}

const LiquidationPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [request, setRequest] = useState<LiquidationRequest | null>(null);
  const [expandedExpense, setExpandedExpense] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  // Fetch pending liquidation for the current user
  useEffect(() => {
    const fetchPendingLiquidation = async () => {
      setLoading(true);
      setFetchError(null);
      try {
        const res = await api.get("/liquidation/");
        const data = Array.isArray(res.data) ? res.data[0] : null;

        if (!data) {
          setRequest(null);
          setFetchError("No pending liquidation found.");
          return;
        }
        console.log(data);
        setRequest({
          id: data.LiquidationID || "N/A",
          liquidationID: data.LiquidationID,
          month: data.request?.request_monthyear || "N/A",
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
            actualAmount:
              priority.actualAmount !== undefined
                ? Number(priority.actualAmount)
                : 0, // Ensure actualAmount is always a number
            requirements: (priority.priority?.requirements || []).map(
              (req: any) => ({
                requirementID: req.requirementID,
                requirementTitle: req.requirementTitle,
                is_required: req.is_required,
              })
            ),
          })),
          refund: Number(data.refund) || 0, // Always parse refund as number
          uploadedDocuments: data.documents || [],
          remaining_days: data.remaining_days || null,
        });
        console.log(request);
      } catch (err) {
        setFetchError(
          "Failed to fetch pending liquidation. Please try again later."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchPendingLiquidation();
  }, []);

  const toggleExpense = (expenseId: string) => {
    setExpandedExpense((prev) =>
      prev.includes(expenseId)
        ? prev.filter((id) => id !== expenseId)
        : [...prev, expenseId]
    );
  };

  const uploadedDocMap = useMemo(() => {
    if (!request) return {};
    const map: { [key: string]: UploadedDocument } = {};
    request.uploadedDocuments.forEach((doc) => {
      map[`${doc.request_priority_id}-${doc.requirement_id}`] = doc;
    });
    return map;
  }, [request]);

  const getUploadedDocument = (
    expenseId: string | number,
    requirementID: string | number
  ) => {
    if (!request) return undefined;
    return uploadedDocMap[`${expenseId}-${requirementID}`];
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (
    e: React.DragEvent,
    expenseId: string,
    requirementID: string
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const fakeEvent = {
        target: { files: e.dataTransfer.files },
      } as React.ChangeEvent<HTMLInputElement>;
      handleFileUpload(expenseId, requirementID, fakeEvent);
    }
  };

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
      toast.success("Document uploaded successfully!");

      // Refresh data
      const res = await api.get("/liquidation/");
      const data = Array.isArray(res.data) ? res.data[0] : null;

      if (data) {
        setRequest((prev) =>
          prev ? { ...prev, uploadedDocuments: data.documents || [] } : prev
        );

        if (request.status === "draft") {
          const updatedExpense = data.request?.priorities?.find(
            (p: any) => String(p.id || p.priority?.LOPID) === String(expenseId)
          );
          const requiredReqs =
            updatedExpense?.priority?.requirements?.filter(
              (r: any) => r.is_required
            ) || [];

          const allUploaded = requiredReqs.every((req: any) =>
            (data.documents || []).some(
              (doc: any) =>
                String(doc.request_priority_id) === String(expenseId) &&
                String(doc.requirement_id) === String(req.requirementID)
            )
          );

          setExpandedExpense((prev) => {
            if (allUploaded) {
              return prev.filter((id) => id !== String(expenseId));
            } else {
              return prev.includes(String(expenseId))
                ? prev
                : [...prev, String(expenseId)];
            }
          });
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to upload document. Please try again.");
    } finally {
      setUploading(null);
      if (fileInputRefs.current[`${expenseId}-${requirementID}`]) {
        fileInputRefs.current[`${expenseId}-${requirementID}`]!.value = "";
      }
    }
  };

  const totalActual = useMemo(() => {
    if (!request) return 0;
    return request.expenses.reduce(
      (sum, expense) => sum + (expense.actualAmount || 0),
      0
    );
  }, [request]);

  // Calculate dynamic refund: refund = totalAmount - totalActual
  const dynamicRefund = useMemo(() => {
    if (!request) return 0;
    return request.totalAmount - totalActual;
  }, [request, totalActual]);

  const removeFile = async (expenseId: string, requirementID: string) => {
    if (!request) return;
    const doc = getUploadedDocument(expenseId, requirementID);
    const docId = doc?.id;

    if (!doc || !docId) {
      toast.error("No document found to remove.");
      return;
    }

    try {
      await api.delete(
        `/liquidations/${request.liquidationID}/documents/${docId}/`
      );
      toast.success("File removed successfully");

      // Refresh data
      const res = await api.get("/liquidation/");
      const data = Array.isArray(res.data) ? res.data[0] : null;
      if (data) {
        setRequest((prev) =>
          prev ? { ...prev, uploadedDocuments: data.documents || [] } : prev
        );
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to remove file. Please try again.");
    }
  };

  const triggerFileInput = (expenseId: string, requirementID: string) => {
    const key = `${expenseId}-${requirementID}`;
    fileInputRefs.current[key]?.click();
  };

  const allRejectedRevised = useMemo(() => {
    if (!request || request.status !== "resubmit") return true;
    const rejectedDocs = request.uploadedDocuments.filter(
      (doc) => doc.is_approved === false
    );
    if (rejectedDocs.length === 0) return true;
    return rejectedDocs.every(
      (doc) =>
        doc.reviewer_comment && doc.reviewer_comment.startsWith("[REVISED]")
    );
  }, [request]);

  const isSubmitDisabled =
    !request ||
    request.expenses.some((expense) =>
      expense.requirements.some(
        (req) =>
          req.is_required && !getUploadedDocument(expense.id, req.requirementID)
      )
    ) ||
    (request.status === "resubmit" &&
      request.uploadedDocuments.some(
        (doc) =>
          doc.is_approved === false &&
          !doc.reviewer_comment?.startsWith("[REVISED]")
      ));

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

  const handleSubmit = async () => {
    if (!request) return;

    const missingAmounts = request.expenses.some(
      (expense) =>
        expense.actualAmount === undefined || isNaN(expense.actualAmount)
    );

    if (missingAmounts) {
      toast.error("Please enter actual amounts for all expenses");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await api.post(
        `/liquidations/${request.liquidationID}/submit/`,
        {
          actual_amounts: request.expenses.map((e) => ({
            expense_id: e.id,
            actual_amount: e.actualAmount,
          })),
          total_actual: totalActual,
        }
      );

      setRequest((prev) =>
        prev
          ? {
              ...prev,
              status: response.data.status,
              refund: response.data.refund,
            }
          : null
      );

      toast.success("Liquidation submitted successfully!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to submit liquidation. Please try again.");
    } finally {
      setIsSubmitting(false);
      setIsConfirmDialogOpen(false);
    }
  };

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

  const statusColors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
    submitted:
      "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    under_review:
      "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    resubmit:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    approved:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    completed:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
    cancelled: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
  };

  const statusIcons: Record<string, React.ReactNode> = {
    draft: <FileText className="h-4 w-4" />,
    submitted: <Clock className="h-4 w-4" />,
    under_review: <RefreshCw className="h-4 w-4 animate-spin" />,
    resubmit: <AlertCircle className="h-4 w-4" />,
    approved: <CheckCircle className="h-4 w-4" />,
    rejected: <XCircle className="h-4 w-4" />,
    completed: <CheckCircle className="h-4 w-4" />,
    cancelled: <XCircle className="h-4 w-4" />,
  };

  useEffect(() => {
    if (
      (request?.status === "resubmit" || request?.status === "draft") &&
      request.expenses.length > 0
    ) {
      setExpandedExpense((prev) =>
        prev.length === 0
          ? request.expenses.map((expense) => String(expense.id))
          : prev
      );
    }
  }, [request?.status]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 sm:px-6">
        <PageBreadcrumb pageTitle="Liquidation Request" />

        <div className="space-y-6">
          {/* Header Skeleton */}
          <div className="flex flex-col gap-4">
            <Skeleton active paragraph={{ rows: 0 }} />
            <div className="flex gap-4">
              <Skeleton.Button active size="large" shape="round" />
              <Skeleton.Button active size="large" shape="round" />
            </div>
          </div>

          {/* Main Card Skeleton */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="space-y-4">
              <Skeleton active paragraph={{ rows: 2 }} />
              <div className="space-y-2">
                <Skeleton active paragraph={{ rows: 0 }} />
                <Skeleton active paragraph={{ rows: 0 }} />
              </div>
            </div>
          </div>

          {/* Expenses List Skeleton */}
          <div className="space-y-4">
            <Skeleton active paragraph={{ rows: 0 }} />
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
              >
                <Skeleton active avatar paragraph={{ rows: 2 }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (fetchError || !request) {
    return (
      <div className="container mx-auto px-4 py-8 sm:px-6">
        <PageBreadcrumb pageTitle="Liquidation Request" />

        <div className="max-w-3xl mx-auto mt-12">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-8 text-center">
              <div className="mx-auto w-20 h-20 bg-red-50 dark:bg-red-900/10 rounded-full flex items-center justify-center mb-6">
                <DocumentTextIcon className="h-10 w-10 text-red-500" />
              </div>

              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {fetchError ? "Error Loading Request" : "No Active Liquidation"}
              </h3>

              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {fetchError ||
                  "You don't have any pending liquidation requests at this time."}
              </p>

              <div className="flex flex-col sm:flex-row justify-center gap-3">
                {fetchError && (
                  <Button
                    variant="outline"
                    onClick={() => window.location.reload()}
                    startIcon={<RefreshCw className="h-4 w-4" />}
                  >
                    Retry
                  </Button>
                )}
                <Button
                  variant="primary"
                  onClick={() => navigate("/requests-history")}
                  startIcon={<FileText className="h-4 w-4" />}
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
    <div className="container mx-auto px-4 py-6 sm:px-6">
      <PageBreadcrumb pageTitle="Liquidation Request" />

      {/* Feedback Section */}
      <div className="mb-8">
        {request.status === "resubmit" && (
          <>
            <div className="mb-6 bg-red-50 dark:bg-red-900/10 border-l-4 border-red-500 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-red-800 dark:text-red-200 mb-1">
                    Action Required
                  </h4>
                  <p className="text-red-700 dark:text-red-300">
                    Your liquidation request requires revisions. Please address
                    the reviewer feedback below and resubmit.
                  </p>
                </div>
              </div>
            </div>

            {/* Feedback Panel */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <MessageCircleIcon className="h-5 w-5 text-gray-500" />
                    Reviewer Feedback
                  </h3>
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                    Action Required
                  </span>
                </div>
              </div>

              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {request.uploadedDocuments
                  .filter(
                    (doc) =>
                      doc.reviewer_comment &&
                      doc.reviewer_comment.trim() !== "" &&
                      doc.is_approved === false
                  )
                  .map((doc, idx) => {
                    const expense = request.expenses.find(
                      (e) => String(e.id) === String(doc.request_priority_id)
                    );
                    const requirement = expense?.requirements.find(
                      (r) =>
                        String(r.requirementID) === String(doc.requirement_id)
                    );

                    return (
                      <div
                        key={doc.id || idx}
                        className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
                        onClick={() => {
                          const expenseId = String(expense?.id);
                          if (!expandedExpense.includes(expenseId)) {
                            toggleExpense(expenseId);
                          }
                          setTimeout(() => {
                            const element = document.getElementById(
                              `requirement-${expenseId}-${doc.requirement_id}`
                            );
                            if (element) {
                              element.scrollIntoView({
                                behavior: "smooth",
                                block: "center",
                              });
                            }
                          }, 100); // Small delay to allow expansion to complete
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 pt-0.5">
                            <DocumentTextIcon className="h-5 w-5 text-gray-500" />
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-white">
                              {requirement?.requirementTitle || "Document"}
                            </h4>
                            <p className="mt-1 text-gray-700 dark:text-gray-300">
                              {doc.reviewer_comment}
                            </p>
                            <p className="mt-2 text-sm text-blue-600 dark:text-blue-400 flex items-center gap-1">
                              <ChevronDown className="h-4 w-4" />
                              Click to view and update this document
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                {request.uploadedDocuments.filter(
                  (doc) =>
                    doc.reviewer_comment &&
                    doc.reviewer_comment.trim() !== "" &&
                    doc.is_approved === false
                ).length === 0 && (
                  <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                    No specific feedback provided by reviewer.
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Main Content */}
      <div className="space-y-6">
        {/* Request Summary Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Liquidation Request #{request.id}
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  For {request.month}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 ${
                    statusColors[request.status]
                  }`}
                >
                  {statusIcons[request.status]}
                  {statusLabels[request.status] || request.status}
                </span>
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                  {formatCurrency(request.totalAmount)}
                </span>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-4">
            {/* Refund Notice */}

            <div
              className={`p-4 rounded-lg border ${
                (request.status === "draft" ? dynamicRefund : request.refund) >
                0
                  ? "border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-800"
                  : (request.status === "draft"
                      ? dynamicRefund
                      : request.refund) < 0
                  ? "border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800"
                  : "border-blue-200 bg-blue-50 dark:bg-blue-900/10 dark:border-blue-800"
              }`}
            >
              <div className="flex items-start gap-3">
                {(request.status === "draft" ? dynamicRefund : request.refund) >
                0 ? (
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                ) : (request.status === "draft"
                    ? dynamicRefund
                    : request.refund) < 0 ? (
                  <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                ) : (
                  <CheckCircle className="h-5 w-5 text-blue-500 flex-shrink-0" />
                )}
                <div>
                  <h4 className="font-semibold mb-1">
                    {(request.status === "draft"
                      ? dynamicRefund
                      : request.refund) > 0
                      ? "Refund Due to requestee"
                      : (request.status === "draft"
                          ? dynamicRefund
                          : request.refund) < 0
                      ? "Over-Expenditure (No Refund Due)"
                      : "Fully Liquidated (No Refund Due)"}
                  </h4>
                  <p className="text-gray-700 dark:text-gray-300">
                    {(request.status === "draft"
                      ? dynamicRefund
                      : request.refund) > 0
                      ? `You must return ${formatCurrency(
                          request.status === "draft"
                            ? dynamicRefund
                            : request.refund
                        )} to the requestee. This is the unspent portion of the requested funds.`
                      : (request.status === "draft"
                          ? dynamicRefund
                          : request.refund) < 0
                      ? `You have spent ${formatCurrency(
                          Math.abs(
                            request.status === "draft"
                              ? dynamicRefund
                              : request.refund
                          )
                        )} more than the requested amount. No refund is due.`
                      : "All funds have been fully liquidated. No refund is due."}
                  </p>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Document Completion
                </h3>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {uploadedRequired} of {totalRequired} required documents
                  uploaded
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

            {/* Deadline Warning */}
            {request.remaining_days !== null && (
              <div
                className={`p-4 rounded-lg border ${
                  request.remaining_days > 7
                    ? "border-blue-200 bg-blue-50 dark:bg-blue-900/10 dark:border-blue-800"
                    : request.remaining_days > 3
                    ? "border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-800"
                    : "border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800"
                }`}
              >
                <div className="flex items-start gap-3">
                  <AlertCircle
                    className={`h-5 w-5 flex-shrink-0 ${
                      request.remaining_days > 7
                        ? "text-blue-500"
                        : request.remaining_days > 3
                        ? "text-amber-500"
                        : "text-red-500"
                    }`}
                  />
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {request.remaining_days > 0 ? (
                        <>
                          <span className="font-bold">
                            {request.remaining_days}
                          </span>{" "}
                          days remaining
                        </>
                      ) : (
                        "Liquidation period has ended"
                      )}
                    </h4>
                    {request.remaining_days > 0 &&
                      request.remaining_days <= 15 && (
                        <p className="text-sm mt-1 text-gray-600 dark:text-gray-400">
                          Please complete your liquidation before the deadline
                          to avoid penalties.
                        </p>
                      )}
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap justify-end gap-3 pt-4">
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
                    size="md"
                  >
                    Submit Liquidation
                  </Button>
                </DialogTrigger>

                <DialogContent className="max-w-md rounded-xl bg-white dark:bg-gray-800 p-0 overflow-hidden shadow-xl border border-gray-200 dark:border-gray-700">
                  <DialogHeader className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Confirm Liquidation Submission
                    </h3>
                  </DialogHeader>

                  <div className="p-6 space-y-4">
                    <div
                      className={`p-4 rounded-lg border ${
                        (request.status === "draft"
                          ? dynamicRefund
                          : request.refund) > 0
                          ? "border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-800"
                          : (request.status === "draft"
                              ? dynamicRefund
                              : request.refund) < 0
                          ? "border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800"
                          : "border-blue-200 bg-blue-50 dark:bg-blue-900/10 dark:border-blue-800"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {(request.status === "draft"
                          ? dynamicRefund
                          : request.refund) > 0 ? (
                          <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                        ) : (request.status === "draft"
                            ? dynamicRefund
                            : request.refund) < 0 ? (
                          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                        ) : (
                          <CheckCircle className="h-5 w-5 text-blue-500 flex-shrink-0" />
                        )}
                        <div>
                          <h4 className="font-semibold mb-1">
                            {(request.status === "draft"
                              ? dynamicRefund
                              : request.refund) > 0
                              ? "Refund Due to requestee"
                              : (request.status === "draft"
                                  ? dynamicRefund
                                  : request.refund) < 0
                              ? "Over-Expenditure (No Refund Due)"
                              : "Fully Liquidated (No Refund Due)"}
                          </h4>
                          <p className="text-gray-700 dark:text-gray-300">
                            {(request.status === "draft"
                              ? dynamicRefund
                              : request.refund) > 0
                              ? `You must return ${formatCurrency(
                                  request.status === "draft"
                                    ? dynamicRefund
                                    : request.refund
                                )} to the requestee. This is the unspent portion of the requested funds.`
                              : (request.status === "draft"
                                  ? dynamicRefund
                                  : request.refund) < 0
                              ? `You have spent ${formatCurrency(
                                  Math.abs(
                                    request.status === "draft"
                                      ? dynamicRefund
                                      : request.refund
                                  )
                                )} more than the requested amount. No refund is due.`
                              : "All funds have been fully liquidated. No refund is due."}
                          </p>
                        </div>
                      </div>
                    </div>
                    {/* ...other confirmation details... */}
                  </div>

                  <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setIsConfirmDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      loading={isSubmitting}
                      onClick={handleSubmit}
                    >
                      Confirm & Submit
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        {/* Expenses List */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Expenses to Liquidate
          </h3>

          {request.expenses.map((expense) => {
            const pendingReqs = expense.requirements.filter(
              (req) => !getUploadedDocument(expense.id, req.requirementID)
            );
            const uploadedReqs = expense.requirements.filter((req) =>
              getUploadedDocument(expense.id, req.requirementID)
            );

            return (
              <div
                key={expense.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
              >
                {/* Expense Header */}
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  onClick={() => toggleExpense(String(expense.id))}
                  aria-expanded={expandedExpense.includes(String(expense.id))}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-300">
                      {expandedExpense.includes(String(expense.id)) ? (
                        <ChevronUp className="h-5 w-5" />
                      ) : (
                        <ChevronDown className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {expense.title}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {formatCurrency(expense.amount)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {uploadedReqs.length}/{expense.requirements.length}{" "}
                      documents
                    </span>
                  </div>
                </div>

                {/* Expense Content - Collapsible */}
                {expandedExpense.includes(String(expense.id)) && (
                  <div className="border-t border-gray-200 dark:border-gray-700 p-4">
                    <div className="space-y-4">
                      {/* Amount Fields */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Requested Amount
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                              <span className="text-gray-500">₱</span>
                            </div>
                            <input
                              type="text"
                              value={expense.amount}
                              readOnly
                              className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-md bg-gray-100 dark:bg-gray-700 dark:border-gray-600"
                              aria-label="Requested amount"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 disabled:bg-gray-100">
                            Actual Amount Spent *
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                              <span className="text-gray-500">₱</span>
                            </div>
                            <input
                              type="number"
                              value={expense.actualAmount || ""}
                              disabled={request.status !== "draft"}
                              onChange={(event) => {
                                const value =
                                  parseFloat(event.target.value) || 0;
                                const updatedExpenses = request?.expenses.map(
                                  (exp) =>
                                    exp.id === expense.id
                                      ? { ...exp, actualAmount: value }
                                      : exp
                                );
                                setRequest((prev) =>
                                  prev
                                    ? {
                                        ...prev,
                                        expenses: updatedExpenses || [],
                                        refund:
                                          prev.totalAmount -
                                          (updatedExpenses?.reduce(
                                            (sum, e) =>
                                              sum + (e.actualAmount || 0),
                                            0
                                          ) || 0),
                                      }
                                    : null
                                );
                              }}
                              placeholder="Enter actual amount"
                              className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:focus:ring-blue-500"
                              onFocus={(e) => e.stopPropagation()}
                              aria-label="Actual amount spent"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Document Requirements */}
                      <div className="space-y-3">
                        {/* Pending Requirements */}
                        {pendingReqs.length > 0 &&
                          pendingReqs.map((req) => (
                            <div
                              key={`pending-${expense.id}-${req.requirementID}`}
                              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-yellow-50 dark:bg-yellow-900/10 border-l-4 border-yellow-400 rounded-lg"
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
                                      `${expense.id}-${req.requirementID}` ||
                                    !!getUploadedDocument(
                                      expense.id,
                                      req.requirementID
                                    ) ||
                                    (request.status !== "draft" &&
                                      request.status !== "resubmit")
                                  }
                                  id={`file-input-${expense.id}-${req.requirementID}`}
                                />

                                {/* Drag and Drop Area */}
                                <div
                                  className={`w-full p-4 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                                    dragActive
                                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/10"
                                      : "border-gray-300 hover:border-gray-400"
                                  }`}
                                  onDragEnter={handleDrag}
                                  onDragLeave={handleDrag}
                                  onDragOver={handleDrag}
                                  onDrop={(e) =>
                                    handleDrop(
                                      e,
                                      String(expense.id),
                                      String(req.requirementID)
                                    )
                                  }
                                  onClick={() =>
                                    triggerFileInput(
                                      String(expense.id),
                                      String(req.requirementID)
                                    )
                                  }
                                >
                                  <div className="text-center">
                                    <UploadIcon className="mx-auto h-6 w-6 text-gray-400 mb-2" />
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                      {uploading ===
                                      `${expense.id}-${req.requirementID}`
                                        ? "Uploading..."
                                        : "Click or drag file to upload"}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                      PDF files only (max 5MB)
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}

                        {/* Uploaded Requirements */}
                        {uploadedReqs.length > 0 &&
                          uploadedReqs
                            .filter((req) => {
                              const doc = getUploadedDocument(
                                expense.id,
                                req.requirementID
                              );
                              return (
                                doc &&
                                (request.status !== "resubmit" ||
                                  doc.is_approved === false)
                              );
                            })
                            .map((req) => {
                              const uploadedDoc = getUploadedDocument(
                                expense.id,
                                req.requirementID
                              );
                              return (
                                <div
                                  key={`uploaded-${expense.id}-${req.requirementID}`}
                                  id={`requirement-${expense.id}-${req.requirementID}`}
                                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg ${
                                    uploadedDoc?.is_approved === false
                                      ? "bg-red-50 dark:bg-red-900/10 border-l-4 border-red-400"
                                      : "bg-gray-50 dark:bg-gray-700/30"
                                  }`}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="flex-shrink-0">
                                      {uploadedDoc?.is_approved === false ? (
                                        <AlertCircle className="h-5 w-5 text-red-500" />
                                      ) : (
                                        <CheckCircle className="h-5 w-5 text-green-500" />
                                      )}
                                    </div>
                                    <div>
                                      <p className="font-medium text-gray-900 dark:text-white">
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
                                      </div>

                                      {uploadedDoc?.is_approved === false && (
                                        <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/10 rounded">
                                          <div className="flex items-start gap-2">
                                            <div>
                                              <p className="text-sm font-medium text-red-700 dark:text-red-300">
                                                Rejected:{" "}
                                                {uploadedDoc.reviewer_comment}
                                              </p>
                                              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                                                Please re-upload a revised
                                                version.
                                              </p>
                                            </div>
                                          </div>
                                        </div>
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
                                      disabled={
                                        request.status !== "draft" &&
                                        request.status !== "resubmit"
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
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Documents Summary */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Summary of Uploaded Documents
            </h3>
          </div>

          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {request.expenses.map((expense) => {
              const pendingReqs = expense.requirements.filter(
                (req) => !getUploadedDocument(expense.id, req.requirementID)
              );
              const uploadedReqs = expense.requirements.filter((req) =>
                getUploadedDocument(expense.id, req.requirementID)
              );

              return (
                <div key={expense.id} className="p-6">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                    {expense.title} ({formatCurrency(expense.amount)})
                  </h4>

                  <ul className="space-y-3">
                    {/* Pending Requirements */}
                    {pendingReqs.length > 0 &&
                      pendingReqs.map((req) => (
                        <li
                          key={`pending-summary-${req.requirementID}`}
                          className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300"
                        >
                          <Paperclip className="h-4 w-4 text-gray-400" />
                          <span>{req.requirementTitle}</span>
                          <span className="ml-auto text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300 rounded-full px-2 py-0.5">
                            Pending
                          </span>
                        </li>
                      ))}

                    {/* Uploaded Requirements */}
                    {uploadedReqs.length > 0 &&
                      uploadedReqs.map((req, idx) => {
                        const doc = getUploadedDocument(
                          expense.id,
                          req.requirementID
                        );
                        return (
                          <li
                            key={`uploaded-summary-${doc?.id || idx}`}
                            className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300"
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
                                className="underline hover:text-blue-600 dark:hover:text-blue-400"
                              >
                                {doc.document_url.split("/").pop()}
                              </a>
                            ) : (
                              req.requirementTitle
                            )}
                            {doc?.is_approved === false && (
                              <span className="ml-auto text-xs bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300 rounded-full px-2 py-0.5">
                                Rejected
                              </span>
                            )}
                          </li>
                        );
                      })}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiquidationPage;
