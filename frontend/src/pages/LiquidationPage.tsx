/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useRef, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Button from "@/components/ui/button/Button";
import {
  UploadIcon,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  AlertCircle,
  Paperclip,
  MessageCircleIcon,
  Clock,
  FileText,
  XCircle,
  RefreshCw,
  Eye,
  Loader2,
  Trash2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "react-toastify";
import api from "@/api/axios";
import { DocumentTextIcon } from "@heroicons/react/outline";
import { Skeleton } from "antd";
import { useNavigate } from "react-router";
import { formatCurrency, formatRequestMonthYear } from "@/lib/helpers";
import LiquidationCompletionModal from "@/components/LiquidationCompletionModal";

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
  versions?: DocumentVersion[];
  is_resubmission?: boolean;
  resubmission_count?: number;
}

interface DocumentVersion {
  id: number;
  document_url: string;
  version_number: number;
  status: string;
  uploaded_at: string;
  reviewer_comment: string | null;
  reviewed_by: {
    first_name: string;
    last_name: string;
  } | null;
  reviewed_at: string | null;
  file_size: number | null;
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
  // Approval information
  reviewed_by_district?: {
    first_name: string;
    last_name: string;
    position?: string;
  } | null;
  reviewed_at_district?: string | null;
  reviewed_by_liquidator?: {
    first_name: string;
    last_name: string;
    position?: string;
  } | null;
  reviewed_at_liquidator?: string | null;
  reviewed_by_division?: {
    first_name: string;
    last_name: string;
    position?: string;
  } | null;
  reviewed_at_division?: string | null;
  date_districtApproved?: string | null;
  date_liquidatorApproved?: string | null;
  date_liquidated?: string | null;
  rejection_comment?: string | null;
}

// Error Boundary for Document Viewer
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
  
  // PDF Preview states
  const [viewDoc, setViewDoc] = useState<UploadedDocument | null>(null);
  const [isLoadingDoc, setIsLoadingDoc] = useState(false);
  const [currentDocIndex, setCurrentDocIndex] = useState(0);
  const [error, setError] = useState<Error | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isRemovingDoc, setIsRemovingDoc] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [showValidationDialog, setShowValidationDialog] = useState(false);
  const [validationMessage, setValidationMessage] = useState("");
  const [validationType, setValidationType] = useState<"missing" | "zero">("missing");
  const [showApprovedDocuments, setShowApprovedDocuments] = useState(false);
  const [recentLiquidations, setRecentLiquidations] = useState<any[]>([]);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [hasShownCompletionModal, setHasShownCompletionModal] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successCountdown, setSuccessCountdown] = useState(4);
  const [lastLiquidationId, setLastLiquidationId] = useState<string | null>(null);
  
  // Check if we should show completion modal on initial load
  useEffect(() => {
    if (request?.status === "liquidated" && request?.id) {
      const modalShownKey = `liquidation-modal-shown-${request.id}`;
      const hasShownInSession = sessionStorage.getItem(modalShownKey);
      
      if (!hasShownInSession) {
        console.log('Initial load: Showing completion modal for liquidated liquidation:', request.id);
        setShowCompletionModal(true);
        setHasShownCompletionModal(true);
        sessionStorage.setItem(modalShownKey, 'true');
      }
    }
  }, [request?.status, request?.id]);

  // Fetch pending liquidation for the current user
  useEffect(() => {
    const fetchPendingLiquidation = async () => {
      setLoading(true);
      setFetchError(null);
      try {
        const res = await api.get("/check-pending-requests/");
        const data = res.data.active_liquidation;

        if (!data) {
          setRequest(null);
          setFetchError(null); // No error - just no active liquidation
          return;
        }
        console.log('Fetched liquidation data:', data);
        console.log('Liquidation status:', data.status);
        
        // Get saved actual amounts from localStorage
        const savedAmounts = localStorage.getItem(`liquidation_${data.LiquidationID}_amounts`);
        const parsedAmounts = savedAmounts ? JSON.parse(savedAmounts) : {};
        
        // In LiquidationPage.tsx, update the data mapping:
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
          expenses: (data.request?.priorities || []).map((priority: any) => {
            const expenseId = priority.id || priority.priority?.LOPID || "";
            return {
              id: expenseId,
              title: priority.priority?.expenseTitle || "",
              amount: Number(priority.amount) || 0,
              // Use saved amount if available, otherwise use server data, otherwise 0
              actualAmount: parsedAmounts[expenseId] || 
                data.actual_amounts?.find(
                  (a: any) => a.expense_id === expenseId
                )?.actual_amount || 0,
              requirements: (priority.priority?.requirements || []).map(
                (req: any) => ({
                  requirementID: req.requirementID,
                  requirementTitle: req.requirementTitle,
                  is_required: req.is_required,
                })
              ),
            };
          }),
          refund: Number(data.refund) || 0,
          uploadedDocuments: data.documents || [],
          remaining_days: data.remaining_days ?? null,
          // Approval information
          reviewed_by_district: data.reviewed_by_district || null,
          reviewed_at_district: data.reviewed_at_district || null,
          reviewed_by_liquidator: data.reviewed_by_liquidator || null,
          reviewed_at_liquidator: data.reviewed_at_liquidator || null,
          reviewed_by_division: data.reviewed_by_division || null,
          reviewed_at_division: data.reviewed_at_division || null,
          date_districtApproved: data.date_districtApproved || null,
          date_liquidatorApproved: data.date_liquidatorApproved || null,
          date_liquidated: data.date_liquidated || null,
          rejection_comment: data.rejection_comment || null,
        });
        console.log('Final request object set:', {
          id: data.LiquidationID || "N/A",
          status: data.status || "N/A",
          date_liquidated: data.date_liquidated || null
        });
      } catch (err) {
        setFetchError(
          "Failed to fetch pending liquidation. Please try again later."
        );
      } finally {
        setLoading(false);
      }
    };

    const fetchRecentLiquidations = async () => {
      try {
        const res = await api.get("/user-requests/");
        const data = Array.isArray(res.data) ? res.data : [];
        
        // Get recent liquidated requests (last 3)
        const liquidatedRequests = data
          .filter((req: any) => req.status === 'liquidated')
          .slice(0, 3);
        
        setRecentLiquidations(liquidatedRequests);
      } catch (err) {
        console.error("Failed to fetch recent liquidations:", err);
      }
    };

    fetchPendingLiquidation();
    fetchRecentLiquidations();
  }, []);

  // Show completion modal when liquidation status becomes "liquidated"
  useEffect(() => {
    console.log('Completion modal effect triggered:', {
      status: request?.status,
      hasShownCompletionModal,
      loading,
      requestId: request?.id,
      dateLiquidated: request?.date_liquidated
    });
    
    if (
      request?.status === "liquidated" && 
      !hasShownCompletionModal && 
      !loading &&
      request?.id
    ) {
      // Check if we've already shown the modal for this liquidation in this session
      const modalShownKey = `liquidation-modal-shown-${request.id}`;
      const hasShownInSession = sessionStorage.getItem(modalShownKey);
      
      console.log('Checking modal session:', { modalShownKey, hasShownInSession });
      
      if (!hasShownInSession) {
        console.log('Showing completion modal for liquidation:', request.id);
        setShowCompletionModal(true);
        setHasShownCompletionModal(true);
        sessionStorage.setItem(modalShownKey, 'true');
      } else {
        console.log('Modal already shown in this session for liquidation:', request.id);
      }
    }
  }, [request?.status, hasShownCompletionModal, loading, request?.id, request?.date_liquidated]);

  // Success dialog countdown timer
  useEffect(() => {
    if (showSuccessDialog) {
      setSuccessCountdown(4);
      const timer = setInterval(() => {
        setSuccessCountdown((prev) => {
          if (prev <= 1) {
            setShowSuccessDialog(false);
            navigate("/dashboard");
            return 4;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [showSuccessDialog, navigate]);

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

  // Filter documents based on approval status and toggle state
  const getFilteredUploadedDocument = (
    expenseId: string | number,
    requirementID: string | number
  ) => {
    const doc = getUploadedDocument(expenseId, requirementID);
    if (!doc) return undefined;
    
    // If status is resubmit and we're not showing approved documents, only show rejected ones
    if (request?.status === "resubmit" && !showApprovedDocuments) {
      return doc.is_approved === false ? doc : undefined;
    }
    
    return doc;
  };

  // Check if there are any approved documents
  const hasApprovedDocuments = useMemo(() => {
    if (!request || request.status !== "resubmit") return false;
    return request.uploadedDocuments.some(doc => doc.is_approved === true);
  }, [request]);

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

      // Refresh data
      const res = await api.get("/check-pending-requests/");
      const data = res.data.active_liquidation;

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


  const triggerFileInput = (expenseId: string, requirementID: string) => {
    const key = `${expenseId}-${requirementID}`;
    fileInputRefs.current[key]?.click();
  };

  const triggerAdditionalFileInput = (expenseId: string, requirementID: string) => {
    const key = `${expenseId}-${requirementID}-additional`;
    fileInputRefs.current[key]?.click();
  };

  // Function to format number with commas
  const formatNumberWithCommas = (value: string) => {
    const num = value.replace(/,/g, "");
    if (num === "") return "";
    if (isNaN(Number(num))) return value;
    return Number(num).toLocaleString();
  };

  // Function to save actual amounts to localStorage
  const saveActualAmounts = (expenses: Expense[]) => {
    if (!request) return;
    
    const amountsToSave: { [key: string]: number } = {};
    expenses.forEach(expense => {
      if (expense.actualAmount !== undefined && expense.actualAmount !== null) {
        amountsToSave[String(expense.id)] = expense.actualAmount;
      }
    });
    
    localStorage.setItem(
      `liquidation_${request.liquidationID}_amounts`, 
      JSON.stringify(amountsToSave)
    );
  };

  // Function to navigate to the first problematic input
  const navigateToProblematicInput = () => {
    if (!request) return;
    
    let targetExpenseId: string | null = null;
    
    if (validationType === "missing") {
      // Find first expense with missing actual amount
      const missingExpense = request.expenses.find(
        (expense) => expense.actualAmount === undefined || isNaN(expense.actualAmount)
      );
      targetExpenseId = missingExpense ? String(missingExpense.id) : null;
    } else if (validationType === "zero") {
      // Find first expense with zero actual amount
      const zeroExpense = request.expenses.find(
        (expense) => expense.actualAmount === 0
      );
      targetExpenseId = zeroExpense ? String(zeroExpense.id) : null;
    }
    
    if (targetExpenseId) {
      // Expand the expense if it's not already expanded
      if (!expandedExpense.includes(targetExpenseId)) {
        setExpandedExpense(prev => [...prev, targetExpenseId!]);
      }
      
      // Close the dialog
      setShowValidationDialog(false);
      
      // Scroll to the input after a short delay to allow expansion
      setTimeout(() => {
        const inputElement = document.querySelector(`input[aria-label="Actual amount spent"][data-expense-id="${targetExpenseId}"]`) as HTMLInputElement;
        const requiredIndicator = document.getElementById(`required-indicator-${targetExpenseId}`);
        
        if (inputElement) {
          inputElement.scrollIntoView({ 
            behavior: "smooth", 
            block: "center" 
          });
          inputElement.focus();
          // Add highlighting class
          inputElement.classList.add('border-red-500', 'bg-red-50', 'dark:bg-red-900/10');
          
          // Show required field indicator
          if (requiredIndicator) {
            requiredIndicator.classList.remove('opacity-0');
            requiredIndicator.classList.add('opacity-100');
          }
          
          // Remove highlighting and hide indicator after 3 seconds
          setTimeout(() => {
            inputElement.classList.remove('border-red-500', 'bg-red-50', 'dark:bg-red-900/10');
            if (requiredIndicator) {
              requiredIndicator.classList.remove('opacity-100');
              requiredIndicator.classList.add('opacity-0');
            }
          }, 3000);
        }
      }, 300);
    }
  };

  // PDF Preview functions
  const handleOpenDoc = async (doc: UploadedDocument) => {
    setIsLoadingDoc(true);
    setError(null);
    setViewDoc(doc);
    
    // Find the index of the current document in the uploaded documents list
    const docIndex = request?.uploadedDocuments.findIndex((d) => d.id === doc.id) || 0;
    setCurrentDocIndex(docIndex);
    setZoomLevel(1); // Reset zoom when opening new document
  };

  const getUploadedDocumentsList = () => {
    if (!request) return [];
    return request.uploadedDocuments.filter(doc => doc.document_url);
  };

  const handleRemoveDocument = async (doc: UploadedDocument) => {
    if (!request) return;
    
    setIsRemovingDoc(true);
    try {
      await api.delete(
        `/liquidations/${request.liquidationID}/documents/${doc.id}/`
      );

      // Refresh data
      const res = await api.get("/check-pending-requests/");
      const data = res.data.active_liquidation;
      if (data) {
        setRequest((prev) =>
          prev ? { ...prev, uploadedDocuments: data.documents || [] } : prev
        );
      }
      
      // Close the preview dialog
      setViewDoc(null);
      toast.success("Document removed successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to remove document. Please try again.");
    } finally {
      setIsRemovingDoc(false);
    }
  };

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
    if (!request) return { uploadedRequired: 0, totalRequired: 0, autoApprovedOptional: 0 };
    let totalRequired = 0;
    let uploadedRequired = 0;
    let autoApprovedOptional = 0;

    request.expenses.forEach((expense) => {
      expense.requirements.forEach((req) => {
        if (req.is_required) {
          totalRequired++;
          if (getUploadedDocument(expense.id, req.requirementID)) {
            uploadedRequired++;
          }
        } else {
          // For optional requirements, check if they're auto-approved
          const doc = getUploadedDocument(expense.id, req.requirementID);
          if (doc && doc.is_approved === true && doc.reviewer_comment?.includes("Auto-approved")) {
            autoApprovedOptional++;
          }
        }
      });
    });

    return { uploadedRequired, totalRequired, autoApprovedOptional };
  };

  const { uploadedRequired, totalRequired, autoApprovedOptional } = calculateProgress();

  const handleSubmit = async () => {
    if (!request) return;

    // Check if any actual amounts are missing or unmodified
    const missingAmounts = request.expenses.some(
      (expense) =>
        expense.actualAmount === undefined || isNaN(expense.actualAmount)
    );

    if (missingAmounts) {
      setValidationMessage("Please enter actual amounts for all expenses before submitting your liquidation.");
      setValidationType("missing");
      setShowValidationDialog(true);
      return;
    }

    // Check for expenses with actual amount = 0
    const zeroAmountExpenses = request.expenses.filter(
      (expense) => expense.actualAmount === 0
    );

    if (zeroAmountExpenses.length > 0) {
      const expenseNames = zeroAmountExpenses.map((e) => e.title).join(", ");
      setValidationMessage(
        `Actual amount spent cannot be 0. Please update the following expenses: ${expenseNames}`
      );
      setValidationType("zero");
      setShowValidationDialog(true);
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

      // Clear saved amounts from localStorage after successful submission
      if (request) {
        localStorage.removeItem(`liquidation_${request.liquidationID}_amounts`);
      }

      // Show success modal instead of toast
      setLastLiquidationId(request.liquidationID);
      setShowSuccessDialog(true);
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
    under_review_district: "Under Review (District)",
    under_review_liquidator: "Under Review (Liquidator)",
    under_review_division: "Under Review (Division)",
    resubmit: "Needs Revision",
    approved_district: "Approved (District)",
    rejected: "Rejected",
    liquidated: "Liquidated",
    cancelled: "Cancelled",
  };

  const statusColors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
    submitted:
      "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    under_review_district:
      "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    under_review_liquidator:
      "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
    under_review_division:
      "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    resubmit:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    approved_district:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    liquidated:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
    cancelled: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
  };

  const statusIcons: Record<string, React.ReactNode> = {
    draft: <FileText className="h-4 w-4" />,
    submitted: <Clock className="h-4 w-4" />,
    under_review_district: <RefreshCw className="h-4 w-4 animate-spin" />,
    under_review_liquidator: <RefreshCw className="h-4 w-4 animate-spin" />,
    under_review_division: <RefreshCw className="h-4 w-4 animate-spin" />,
    resubmit: <AlertCircle className="h-4 w-4" />,
    approved_district: <CheckCircle className="h-4 w-4" />,
    rejected: <XCircle className="h-4 w-4" />,
    liquidated: <CheckCircle className="h-4 w-4" />,
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
    
    // Reset the approved documents toggle when status changes
    if (request?.status !== "resubmit") {
      setShowApprovedDocuments(false);
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
      <div className="container mx-auto px-4 py-6 sm:px-6">
        <PageBreadcrumb pageTitle="Liquidation Request" />

        <div className="max-w-4xl mx-auto mt-6">
          {/* Header Section */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mx-auto mb-4">
              <DocumentTextIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {fetchError ? "Unable to Load Liquidation Report" : "No Active Liquidation"}
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              {fetchError 
                ? "We encountered an issue while loading your liquidation data. Please try again or contact support if the problem persists."
                : "You don't have any ongoing liquidation reports at the moment. This could mean your requests are still being processed or you haven't submitted any fund requests yet."
              }
            </p>
          </div>

          {fetchError ? (
            /* Error State */
            <div className="max-w-2xl mx-auto mb-8">
              <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                    <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">
                      Error Details
                    </h3>
                    <p className="text-red-700 dark:text-red-300">
                      {fetchError}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* No Active Liquidation State */
            <div className="space-y-6">
              {/* Information Cards Grid */}
              <div className="grid lg:grid-cols-2 gap-6">
                {/* What This Means Card */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                      <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      What This Means
                    </h3>
                  </div>
                  <div className="space-y-3">
                    {[
                      "You may not have submitted any fund requests yet",
                      "Your fund requests might still be under review",
                      "All your liquidation reports may have been completed",
                      "You might need to wait for fund approval before liquidation"
                    ].map((item, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                        <p className="text-gray-700 dark:text-gray-300 text-sm">
                          {item}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* What You Can Do Card */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                      <CheckCircle className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      What You Can Do
                    </h3>
                  </div>
                  <div className="space-y-3">
                    {[
                      { title: "View Request History", desc: "Check all your past and completed liquidations", icon: FileText },
                      { title: "Submit New Request", desc: "Create a new fund request if needed", icon: UploadIcon },
                      { title: "Contact Support", desc: "Reach out to your district administrator", icon: MessageCircleIcon },
                      { title: "Wait for Approval", desc: "Your pending requests are being processed", icon: Clock }
                    ].map((item, index) => (
                      <div key={index} className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <item.icon className="h-4 w-4 text-gray-500 dark:text-gray-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white text-sm">
                            {item.title}
                          </p>
                          <p className="text-gray-600 dark:text-gray-300 text-xs">
                            {item.desc}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recent Liquidations */}
              {recentLiquidations.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                      <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Recent Completed Liquidations
                      </h3>
                      <p className="text-gray-600 dark:text-gray-300 text-sm">
                        Your successfully completed liquidation reports
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    {recentLiquidations.map((liquidation, index) => (
                      <div key={index} className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                                Request #{liquidation.request_id}
                              </h4>
                              <p className="text-gray-600 dark:text-gray-300 text-xs">
                                {formatRequestMonthYear(liquidation.request_monthyear)}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                              {formatCurrency(liquidation.priorities?.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0) || 0)}
                            </p>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                              Completed
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600 text-center">
                    <p className="text-gray-600 dark:text-gray-300 text-sm">
                      View all your liquidations in the Request History
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-center gap-4 mt-8">
            <Button
              variant="primary"
              size="lg"
              onClick={() => navigate("/requests-history")}
              startIcon={<FileText className="h-5 w-5" />}
            >
              View Request History
            </Button>
            {!fetchError && (
              <Button
                variant="outline"
                size="lg"
                onClick={() => navigate("/dashboard")}
                startIcon={<RefreshCw className="h-5 w-5" />}
              >
                Go to Dashboard
              </Button>
            )}
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
                    the following issues and resubmit.
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
                    {request.status === "resubmit" && !showApprovedDocuments && hasApprovedDocuments
                      ? "No rejected documents to review. Click 'Show Approved Documents' to view all documents."
                      : "No specific feedback provided by reviewer."}
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
                      ? "Refund Due to the Division Office"
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
                        )} to the Division Office. This is the unspent portion of the requested funds.`
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
                  {uploadedRequired} of {totalRequired} required documents uploaded
                  {autoApprovedOptional > 0 && (
                    <span className="ml-2 text-green-600 dark:text-green-400">
                      • {autoApprovedOptional} optional auto-approved
                    </span>
                  )}
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
                        <>
                          Liquidation period has ended
                          <p className="text-sm mt-1 text-red-600 font-semibold">
                            Overdue! A demand letter has been sent to your
                            email.
                          </p>
                        </>
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
            <div className="flex flex-col items-end gap-3 pt-4">
              <Dialog
                open={isConfirmDialogOpen}
                onOpenChange={setIsConfirmDialogOpen}
              >
                <Button
                  variant="primary"
                  disabled={
                    isSubmitDisabled ||
                    isSubmitting ||
                    (request.status !== "draft" &&
                      request.status !== "resubmit") ||
                    user?.role === "school_admin"
                  }
                  size="md"
                  onClick={() => {
                    if (!request) return;
                    // Check for expenses with actual amount = 0
                    const zeroAmountExpenses = request.expenses.filter(
                      (expense) => Number(expense.actualAmount) === 0
                    );
                    if (zeroAmountExpenses.length > 0) {
                      const expenseNames = zeroAmountExpenses
                        .map((e) => e.title)
                        .join(", ");
                      setValidationMessage(
                        `Actual amount spent cannot be 0. Please update the following expenses: ${expenseNames}`
                      );
                      setValidationType("zero");
                      setShowValidationDialog(true);
                      return;
                    }
                    setIsConfirmDialogOpen(true); // Only open if validation passes
                  }}
                >
                  {request.status === "resubmit" ? "Resubmit Liquidation" : "Submit Liquidation"}
                </Button>
                
                {/* Disabled Button Helper Text */}
                {isSubmitDisabled && (
                  <div className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    <span>
                      {request.status === "resubmit" 
                        ? "Please check rejected documents and upload new files to address reviewer feedback"
                        : request.status === "draft"
                        ? uploadedRequired < totalRequired 
                          ? `Please upload all required documents (${uploadedRequired}/${totalRequired} uploaded)`
                          : "Please complete all required fields before submitting"
                        : "Please complete all required fields before submitting"
                      }
                    </span>
                  </div>
                )}

                <DialogContent className="max-w-lg rounded-2xl bg-white dark:bg-gray-800 p-0 overflow-hidden shadow-2xl border-0">
                  {/* Header Section */}
                  <div className="relative bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 px-8 py-6 border-b border-gray-100 dark:border-gray-600">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
                          {request.status === "resubmit" ? "Confirm Liquidation Resubmission" : "Confirm Liquidation Submission"}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          Review the details before proceeding
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Content Section */}
                  <div className="px-8 py-6 space-y-6">
                    {/* Financial Summary Card */}
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6 border border-gray-200 dark:border-gray-600">
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                          (request.status === "draft" ? dynamicRefund : request.refund) > 0
                            ? "bg-green-100 dark:bg-green-900/30"
                            : (request.status === "draft" ? dynamicRefund : request.refund) < 0
                            ? "bg-red-100 dark:bg-red-900/30"
                            : "bg-blue-100 dark:bg-blue-900/30"
                        }`}>
                          {(request.status === "draft" ? dynamicRefund : request.refund) > 0 ? (
                            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                          ) : (request.status === "draft" ? dynamicRefund : request.refund) < 0 ? (
                            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                          ) : (
                            <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          )}
                        </div>
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                          Financial Summary
                        </h4>
                      </div>
                      
                      <div className={`p-4 rounded-lg border-2 ${
                        (request.status === "draft" ? dynamicRefund : request.refund) > 0
                          ? "border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-800"
                          : (request.status === "draft" ? dynamicRefund : request.refund) < 0
                          ? "border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800"
                          : "border-blue-200 bg-blue-50 dark:bg-blue-900/10 dark:border-blue-800"
                      }`}>
                        <div className="text-center">
                          <div className={`text-2xl font-bold mb-2 ${
                            (request.status === "draft" ? dynamicRefund : request.refund) > 0
                              ? "text-green-700 dark:text-green-300"
                              : (request.status === "draft" ? dynamicRefund : request.refund) < 0
                              ? "text-red-700 dark:text-red-300"
                              : "text-blue-700 dark:text-blue-300"
                          }`}>
                            {formatCurrency(
                              request.status === "draft" ? dynamicRefund : request.refund
                            )}
                          </div>
                          <h5 className={`font-semibold text-sm mb-2 ${
                            (request.status === "draft" ? dynamicRefund : request.refund) > 0
                              ? "text-green-800 dark:text-green-200"
                              : (request.status === "draft" ? dynamicRefund : request.refund) < 0
                              ? "text-red-800 dark:text-red-200"
                              : "text-blue-800 dark:text-blue-200"
                          }`}>
                            {(request.status === "draft" ? dynamicRefund : request.refund) > 0
                              ? "Refund Due to Division Office"
                              : (request.status === "draft" ? dynamicRefund : request.refund) < 0
                              ? "Over-Expenditure (No Refund Due)"
                              : "Fully Liquidated (No Refund Due)"}
                          </h5>
                          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                            {(request.status === "draft" ? dynamicRefund : request.refund) > 0
                              ? "This is the unspent portion of the requested funds that must be returned."
                              : (request.status === "draft" ? dynamicRefund : request.refund) < 0
                              ? "You have spent more than the requested amount. No refund is due."
                              : "All funds have been fully liquidated. No refund is due."}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Action Notice */}
                    <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <h6 className="font-medium text-amber-800 dark:text-amber-200 text-sm mb-1">
                            Important Notice
                          </h6>
                          <p className="text-sm text-amber-700 dark:text-amber-300">
                            {request.status === "resubmit" 
                              ? "Your liquidation will be resubmitted for review. Please ensure all required documents are properly uploaded."
                              : "Once submitted, your liquidation request cannot be edited. Please verify all information is correct."}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Footer Section */}
                  <div className="bg-gray-50 dark:bg-gray-700/50 px-8 py-6 border-t border-gray-200 dark:border-gray-600">
                    <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
                      <Button
                        variant="outline"
                        onClick={() => setIsConfirmDialogOpen(false)}
                        className="w-full sm:w-auto order-2 sm:order-1"
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="primary"
                        loading={isSubmitting}
                        onClick={handleSubmit}
                        className="w-full sm:w-auto order-1 sm:order-2"
                      >
                        {request.status === "resubmit" ? "Confirm & Resubmit" : "Confirm & Submit"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        {/* Approval Progress Section - Only show for submitted liquidations */}
        {(request.status !== "draft" && request.status !== "cancelled") && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-blue-500" />
                Approval Progress
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Track the progress of your liquidation request through the approval process
              </p>
            </div>

            <div className="p-6">
              {/* Approval Steps */}
              <div className="space-y-6">
                {/* District Approval Step */}
                <div className={`flex items-start gap-4 p-4 rounded-lg border ${
                  request.reviewed_by_district 
                    ? "border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-800" 
                    : request.status === "resubmit" 
                    ? "border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800"
                    : "border-gray-200 bg-gray-50 dark:bg-gray-700/30 dark:border-gray-600"
                }`}>
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    request.reviewed_by_district 
                      ? "bg-green-500 text-white" 
                      : request.status === "resubmit"
                      ? "bg-red-500 text-white"
                      : "bg-gray-300 text-gray-600 dark:bg-gray-600 dark:text-gray-300"
                  }`}>
                    {request.reviewed_by_district ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : request.status === "resubmit" ? (
                      <AlertCircle className="h-5 w-5" />
                    ) : (
                      <Clock className="h-4 w-4" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      District Review
                    </h4>
                    {request.reviewed_by_district ? (
                      <div className="mt-2 space-y-1 text-sm">
                        <p className="text-green-700 dark:text-green-300">
                          <span className="font-medium">Approved by:</span>{" "}
                          {request.reviewed_by_district.first_name} {request.reviewed_by_district.last_name}
                          {request.reviewed_by_district.position && (
                            <span className="text-gray-600 dark:text-gray-400">
                              {" "}({request.reviewed_by_district.position})
                            </span>
                          )}
                        </p>
                        <p className="text-green-700 dark:text-green-300">
                          <span className="font-medium">Approved on:</span>{" "}
                          {request.date_districtApproved 
                            ? new Date(request.date_districtApproved).toLocaleDateString()
                            : request.reviewed_at_district 
                            ? new Date(request.reviewed_at_district).toLocaleDateString()
                            : "N/A"
                          }
                        </p>
                      </div>
                    ) : request.status === "resubmit" ? (
                      <div className="mt-2 space-y-1 text-sm">
                        <p className="text-red-700 dark:text-red-300">
                          <span className="font-medium">Status:</span> Needs Revision
                        </p>
                        {request.rejection_comment && (
                          <p className="text-red-700 dark:text-red-300">
                            <span className="font-medium">Comment:</span> {request.rejection_comment}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        Pending district administrator review
                      </p>
                    )}
                  </div>
                </div>

                {/* Liquidator Approval Step */}
                <div className={`flex items-start gap-4 p-4 rounded-lg border ${
                  request.reviewed_by_liquidator 
                    ? "border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-800" 
                    : request.reviewed_by_district && !request.reviewed_by_liquidator
                    ? "border-blue-200 bg-blue-50 dark:bg-blue-900/10 dark:border-blue-800"
                    : "border-gray-200 bg-gray-50 dark:bg-gray-700/30 dark:border-gray-600"
                }`}>
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    request.reviewed_by_liquidator 
                      ? "bg-green-500 text-white" 
                      : request.reviewed_by_district && !request.reviewed_by_liquidator
                      ? "bg-blue-500 text-white"
                      : "bg-gray-300 text-gray-600 dark:bg-gray-600 dark:text-gray-300"
                  }`}>
                    {request.reviewed_by_liquidator ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : request.reviewed_by_district && !request.reviewed_by_liquidator ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Clock className="h-4 w-4" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      Liquidator Review
                    </h4>
                    {request.reviewed_by_liquidator ? (
                      <div className="mt-2 space-y-1 text-sm">
                        <p className="text-green-700 dark:text-green-300">
                          <span className="font-medium">Approved by:</span>{" "}
                          {request.reviewed_by_liquidator.first_name} {request.reviewed_by_liquidator.last_name}
                          {request.reviewed_by_liquidator.position && (
                            <span className="text-gray-600 dark:text-gray-400">
                              {" "}({request.reviewed_by_liquidator.position})
                            </span>
                          )}
                        </p>
                        <p className="text-green-700 dark:text-green-300">
                          <span className="font-medium">Approved on:</span>{" "}
                          {request.date_liquidatorApproved 
                            ? new Date(request.date_liquidatorApproved).toLocaleDateString()
                            : request.reviewed_at_liquidator 
                            ? new Date(request.reviewed_at_liquidator).toLocaleDateString()
                            : "N/A"
                          }
                        </p>
                      </div>
                    ) : request.reviewed_by_district && !request.reviewed_by_liquidator ? (
                      <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
                        Currently under liquidator review
                      </p>
                    ) : (
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        Waiting for district approval
                      </p>
                    )}
                  </div>
                </div>

                {/* Division Approval Step */}
                <div className={`flex items-start gap-4 p-4 rounded-lg border ${
                  request.reviewed_by_division 
                    ? "border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-800" 
                    : request.reviewed_by_liquidator && !request.reviewed_by_division
                    ? "border-blue-200 bg-blue-50 dark:bg-blue-900/10 dark:border-blue-800"
                    : "border-gray-200 bg-gray-50 dark:bg-gray-700/30 dark:border-gray-600"
                }`}>
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    request.reviewed_by_division 
                      ? "bg-green-500 text-white" 
                      : request.reviewed_by_liquidator && !request.reviewed_by_division
                      ? "bg-blue-500 text-white"
                      : "bg-gray-300 text-gray-600 dark:bg-gray-600 dark:text-gray-300"
                  }`}>
                    {request.reviewed_by_division ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : request.reviewed_by_liquidator && !request.reviewed_by_division ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Clock className="h-4 w-4" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      Division Final Review
                    </h4>
                    {request.reviewed_by_division ? (
                      <div className="mt-2 space-y-1 text-sm">
                        <p className="text-green-700 dark:text-green-300">
                          <span className="font-medium">Finalized by:</span>{" "}
                          {request.reviewed_by_division.first_name} {request.reviewed_by_division.last_name}
                          {request.reviewed_by_division.position && (
                            <span className="text-gray-600 dark:text-gray-400">
                              {" "}({request.reviewed_by_division.position})
                            </span>
                          )}
                        </p>
                        <p className="text-green-700 dark:text-green-300">
                          <span className="font-medium">Finalized on:</span>{" "}
                          {request.date_liquidated 
                            ? new Date(request.date_liquidated).toLocaleDateString()
                            : request.reviewed_at_division 
                            ? new Date(request.reviewed_at_division).toLocaleDateString()
                            : "N/A"
                          }
                        </p>
                        <p className="text-green-700 dark:text-green-300 font-medium">
                          🎉 Liquidation Complete!
                        </p>
                      </div>
                    ) : request.reviewed_by_liquidator && !request.reviewed_by_division ? (
                      <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
                        Currently under division accountant review
                      </p>
                    ) : (
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        Waiting for liquidator approval
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Overall Status Summary */}
              <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      Current Status
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {request.status === "liquidated" 
                        ? "Your liquidation has been successfully completed and finalized."
                        : request.status === "resubmit"
                        ? "Your liquidation requires revisions. Please address the feedback and resubmit."
                        : "Your liquidation is currently being reviewed by the appropriate authorities."
                      }
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 ${
                      request.status === "liquidated" 
                        ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                        : request.status === "resubmit"
                        ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                        : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                    }`}>
                      {statusIcons[request.status]}
                      {statusLabels[request.status] || request.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Expenses List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Expenses to Liquidate
            </h3>
            {request.status === "resubmit" && hasApprovedDocuments && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowApprovedDocuments(!showApprovedDocuments)}
                className="text-xs"
              >
                {showApprovedDocuments ? "Hide Approved Documents" : "Show Approved Documents"}
              </Button>
            )}
          </div>

          {request.expenses.map((expense) => {
            const pendingReqs = expense.requirements.filter((req) => {
              const doc = getUploadedDocument(expense.id, req.requirementID);
              // For required docs, they're pending if not uploaded
              // For optional docs, they're pending if not uploaded AND not auto-approved
              if (req.is_required) {
                return !doc;
              } else {
                return !doc || (doc && !(doc.is_approved === true && doc.reviewer_comment?.includes("Auto-approved")));
              }
            });
            const uploadedReqs = expense.requirements.filter((req) => {
              const doc = getFilteredUploadedDocument(expense.id, req.requirementID);
              return doc !== undefined;
            });

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
                            <div className="relative">
                              <input
                                type="text"
                                value={expense.actualAmount ? formatNumberWithCommas(expense.actualAmount.toString()) : ""}
                                disabled={request.status !== "draft"}
                                data-expense-id={expense.id}
                                onChange={(event) => {
                                  const cleanValue = event.target.value.replace(/[^0-9.]/g, "");
                                  const value = parseFloat(cleanValue) || 0;
                                  const updatedExpenses = request?.expenses.map(
                                    (exp) =>
                                      exp.id === expense.id
                                        ? { ...exp, actualAmount: value }
                                        : exp
                                  );
                                  
                                  // Save to localStorage
                                  if (updatedExpenses) {
                                    saveActualAmounts(updatedExpenses);
                                  }
                                  
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
                              {/* Required field indicator */}
                              <div 
                                id={`required-indicator-${expense.id}`}
                                className="absolute -bottom-5 left-0 text-xs text-red-500 whitespace-nowrap opacity-0 transition-opacity duration-300"
                              >
                                This field is required
                              </div>
                            </div>
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
                        {uploadedReqs.length > 0 ? (
                          uploadedReqs.map((req) => {
                            const uploadedDoc = getFilteredUploadedDocument(
                              expense.id,
                              req.requirementID
                            );
                            if (!uploadedDoc) return null;
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
                                    ) : uploadedDoc?.reviewer_comment?.includes("Auto-approved") ? (
                                      <CheckCircle className="h-5 w-5 text-green-500" />
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
                                      {uploadedDoc?.reviewer_comment?.includes("Auto-approved") && (
                                        <span className="text-xs px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300 rounded-full">
                                          Auto-approved
                                        </span>
                                      )}
                                    </div>

                                    {uploadedDoc?.is_approved === false && (
                                      <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/10 rounded">
                                        <div className="flex items-start gap-2">
                                          <div className="flex-1">
                                            <p className="text-sm font-medium text-red-700 dark:text-red-300">
                                              Rejected:{" "}
                                              {uploadedDoc.reviewer_comment}
                                            </p>
                                            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                                              Please re-upload a revised
                                              version.
                                            </p>
                                            {uploadedDoc.is_resubmission && (
                                              <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                                                This is resubmission #{uploadedDoc.resubmission_count}
                                              </p>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    )}

                                    {uploadedDoc?.reviewer_comment?.includes("Auto-approved") && (
                                      <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/10 rounded">
                                        <div className="flex items-start gap-2">
                                          <div className="flex-1">
                                            <p className="text-sm font-medium text-green-700 dark:text-green-300">
                                              Auto-approved: This optional requirement was automatically approved since no document was provided.
                                            </p>
                                            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                                              No action required - this requirement is considered complete.
                                            </p>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="flex gap-2">
                                  {/* Drag and drop area for rejected documents */}
                                  {uploadedDoc?.is_approved === false && (
                                    <>
                                      <input
                                        type="file"
                                        ref={(el) => {
                                          fileInputRefs.current[
                                            `${expense.id}-${req.requirementID}-additional`
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
                                          (request.status !== "draft" &&
                                            request.status !== "resubmit")
                                        }
                                        id={`file-input-additional-${expense.id}-${req.requirementID}`}
                                      />
                                      
                                      <div
                                        className={`w-40 p-2 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                                          dragActive
                                            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/10"
                                            : "border-red-300 hover:border-red-400"
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
                                          triggerAdditionalFileInput(
                                            String(expense.id),
                                            String(req.requirementID)
                                          )
                                        }
                                        title="Upload new file to replace rejected document"
                                      >
                                        <div className="text-center">
                                          <UploadIcon className="mx-auto h-4 w-4 text-red-400 mb-1" />
                                          <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                                            {uploading ===
                                            `${expense.id}-${req.requirementID}`
                                              ? "Uploading..."
                                              : "Upload New File"}
                                          </p>
                                          <p className="text-xs text-red-500 dark:text-red-400 mt-0.5">
                                            Replace Rejected
                                          </p>
                                        </div>
                                      </div>
                                    </>
                                  )}
                                  
                                  
                                  
                                  
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    startIcon={<Eye className="h-4 w-4" />}
                                    onClick={() => {
                                      if (uploadedDoc?.document_url) {
                                        handleOpenDoc(uploadedDoc);
                                      } else {
                                        toast.info(
                                          `No file available for ${req.requirementTitle}`
                                        );
                                      }
                                    }}
                                  >
                                    Preview
                                  </Button>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          request.status === "resubmit" && !showApprovedDocuments && hasApprovedDocuments && (
                            <div className="p-4 text-center text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                              <p className="text-sm">
                                No rejected documents for this expense. Click "Show Approved Documents" to view all documents.
                              </p>
                            </div>
                          )
                        )}
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
              const pendingReqs = expense.requirements.filter((req) => {
                const doc = getUploadedDocument(expense.id, req.requirementID);
                // For required docs, they're pending if not uploaded
                // For optional docs, they're pending if not uploaded AND not auto-approved
                if (req.is_required) {
                  return !doc;
                } else {
                  return !doc || (doc && !(doc.is_approved === true && doc.reviewer_comment?.includes("Auto-approved")));
                }
              });
              const uploadedReqs = expense.requirements.filter((req) => {
                const doc = getFilteredUploadedDocument(expense.id, req.requirementID);
                return doc !== undefined;
              });

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
                    {uploadedReqs.length > 0 ? (
                      uploadedReqs.map((req, idx) => {
                        const doc = getFilteredUploadedDocument(
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
                            ) : doc?.reviewer_comment?.includes("Auto-approved") ? (
                              <span className="text-gray-600 dark:text-gray-400">
                                {req.requirementTitle} (Auto-approved)
                              </span>
                            ) : (
                              req.requirementTitle
                            )}
                            {doc?.is_approved === false && (
                              <span className="ml-auto text-xs bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300 rounded-full px-2 py-0.5">
                                Rejected
                              </span>
                            )}
                            {doc?.reviewer_comment?.includes("Auto-approved") && (
                              <span className="ml-auto text-xs bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300 rounded-full px-2 py-0.5">
                                Auto-approved
                              </span>
                            )}
                          </li>
                        );
                      })
                    ) : (
                      request.status === "resubmit" && !showApprovedDocuments && hasApprovedDocuments && (
                        <li className="text-sm text-gray-500 dark:text-gray-400 italic">
                          No rejected documents for this expense. Click "Show Approved Documents" to view all documents.
                        </li>
                      )
                    )}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Completion Modal */}
      {request && (
        <LiquidationCompletionModal
          visible={showCompletionModal}
          onClose={() => {
            setShowCompletionModal(false);
            // After closing the modal, refresh the data to show the "No Ongoing Liquidation Report" page
            setTimeout(() => {
              window.location.reload();
            }, 100);
          }}
          liquidationData={{
            id: request.id,
            month: request.month,
            totalAmount: request.totalAmount,
            refund: request.refund,
            date_liquidated: request.date_liquidated,
            reviewed_by_division: request.reviewed_by_division,
          }}
          onViewHistory={() => {
            setShowCompletionModal(false);
            navigate("/requests-history");
          }}
          onDownloadReport={() => {
            // You can implement download functionality here
            toast.info("Download functionality will be implemented soon");
            setShowCompletionModal(false);
          }}
        />
      )}

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent showCloseButton={false} className="w-full max-w-lg rounded-2xl bg-white dark:bg-gray-800 p-0 shadow-2xl border-0 overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 bg-gradient-to-br from-green-50/50 via-transparent to-emerald-50/30 dark:from-green-900/10 dark:via-transparent dark:to-emerald-900/5"></div>
          
          {/* Main Content Container */}
          <div className="relative flex flex-col items-center text-center px-10 py-12">
            {/* Success Icon with Enhanced Animation */}
            <div className="relative mb-8">
              {/* Outer Ring Animation */}
              <div className="absolute inset-0 bg-green-100 dark:bg-green-900/30 rounded-full scale-125 animate-ping opacity-20"></div>
              <div className="absolute inset-0 bg-green-200 dark:bg-green-800/40 rounded-full scale-110 animate-pulse"></div>
              
              {/* Main Icon Container */}
              <div className="relative flex items-center justify-center w-24 h-24 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full shadow-xl">
                <CheckCircle className="h-12 w-12 text-white animate-scale-in" />
              </div>
              
              {/* Sparkle Effects */}
              <div className="absolute -top-2 -right-2 w-4 h-4 bg-yellow-400 rounded-full animate-bounce"></div>
              <div className="absolute -bottom-2 -left-2 w-3 h-3 bg-blue-400 rounded-full animate-bounce delay-300"></div>
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-purple-400 rounded-full animate-bounce delay-150"></div>
            </div>

            {/* Header Section with Better Typography */}
            <div className="space-y-4 mb-8">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white leading-tight">
                Liquidation Submitted Successfully
              </h2>
              <div className="w-20 h-1 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full mx-auto"></div>
              <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed max-w-md">
                Your liquidation request was submitted successfully and is now being processed for review.
              </p>
            </div>

            {/* Liquidation ID Section with Enhanced Design */}
            {lastLiquidationId && (
              <div className="bg-green-50 dark:bg-green-900/20 rounded-xl px-6 py-4 border border-green-200 dark:border-green-800 mb-6 w-full max-w-sm">
                <div className="flex items-center justify-center space-x-2">
                  <span className="text-sm font-medium text-green-700 dark:text-green-300">
                    Liquidation ID:
                  </span>
                  <span className="font-mono font-bold text-green-800 dark:text-green-200 bg-green-100 dark:bg-green-800/50 px-3 py-1 rounded-lg text-sm">
                    {lastLiquidationId}
                  </span>
                </div>
              </div>
            )}

            {/* Status Indicator with Enhanced Design */}
            <div className="flex items-center justify-center space-x-3 px-6 py-3 bg-green-50 dark:bg-green-900/20 rounded-full border border-green-200 dark:border-green-800">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-base font-medium text-green-700 dark:text-green-300">
                Redirecting to dashboard in {successCountdown} second{successCountdown !== 1 ? 's' : ''}...
              </span>
            </div>
          </div>

          {/* Enhanced Progress Bar */}
          <div className="relative h-3 bg-gray-100 dark:bg-gray-700 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-green-500 via-emerald-500 to-green-600 h-full rounded-full transform -translate-x-full animate-progress-smooth"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent h-full animate-shimmer"></div>
          </div>
        </DialogContent>
      </Dialog>

      {/* PDF Preview Dialog */}
      <Dialog open={!!viewDoc} onOpenChange={() => setViewDoc(null)}>
        <DialogContent className="w-full max-w-2xl sm:max-w-3xl md:max-w-4xl xl:max-w-5xl h-[90vh] overflow-y-auto custom-scrollbar">
          <DialogHeader>
            <DialogTitle>
              {viewDoc && (() => {
                const expense = request?.expenses.find(
                  (e) => String(e.id) === String(viewDoc.request_priority_id)
                );
                const requirement = expense?.requirements.find(
                  (r) => String(r.requirementID) === String(viewDoc.requirement_id)
                );
                return requirement?.requirementTitle || "Document Preview";
              })()}
            </DialogTitle>
            <DialogDescription>
              Preview and manage your uploaded document.
            </DialogDescription>
          </DialogHeader>
          {viewDoc && (
            <div className="space-y-4">
              {/* File preview */}
              <div className="relative h-[60vh] bg-gray-50 rounded-lg border custom-scrollbar">
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
                    <div className="p-2 bg-gray-100 border-b flex justify-between items-center">
                      <div className="flex gap-2">
                        {/* Document status indicator */}
                        {viewDoc?.is_approved === false && (
                          <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded border">
                            Rejected
                          </span>
                        )}
                        {viewDoc?.is_resubmission && (
                          <span className="px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded border">
                            Resubmission #{viewDoc.resubmission_count}
                          </span>
                        )}
                      </div>
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
                          src={`${viewDoc?.document_url}#view=fitH&toolbar=0&navpanes=0&scrollbar=1`}
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

              {/* Document info and actions */}
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
                    <Button
                      variant="destructive"
                      disabled={isRemovingDoc || request.status !== "draft"}
                      startIcon={
                        isRemovingDoc ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <Trash2 className="h-5 w-5" />
                        )
                      }
                      onClick={() => {
                        if (request.status === "draft") {
                          setShowRemoveConfirm(true);
                        }
                      }}
                    >
                      {isRemovingDoc ? "Removing..." : "Remove"}
                    </Button>
                    {request.status !== "draft" && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Cannot remove after submission
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <Button
                      variant="outline"
                      disabled={currentDocIndex === 0}
                      onClick={() => {
                        const uploadedDocs = getUploadedDocumentsList();
                        const prevDoc = uploadedDocs[currentDocIndex - 1];
                        setCurrentDocIndex(currentDocIndex - 1);
                        setViewDoc(prevDoc);
                        setIsLoadingDoc(true);
                      }}
                    >
                      Previous
                    </Button>
                    <div className="text-sm text-gray-500">
                      {currentDocIndex + 1} of {getUploadedDocumentsList().length}
                    </div>
                    <Button
                      variant="outline"
                      disabled={currentDocIndex === getUploadedDocumentsList().length - 1}
                      onClick={() => {
                        const uploadedDocs = getUploadedDocumentsList();
                        const nextDoc = uploadedDocs[currentDocIndex + 1];
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

              {/* Rejection reason display */}
              {viewDoc?.is_approved === false && viewDoc?.reviewer_comment && (
                <div className="mt-4 space-y-2">
                  <h4 className="text-sm font-medium">Rejection Reason</h4>
                  <div className="bg-red-50 p-3 rounded text-sm">
                    {viewDoc.reviewer_comment}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Remove Confirmation Dialog */}
      <Dialog open={showRemoveConfirm} onOpenChange={setShowRemoveConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Document Removal</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this document? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setShowRemoveConfirm(false)}
              disabled={isRemovingDoc}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (viewDoc) {
                  await handleRemoveDocument(viewDoc);
                  setShowRemoveConfirm(false);
                }
              }}
              disabled={isRemovingDoc}
              startIcon={
                isRemovingDoc ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Trash2 className="h-5 w-5" />
                )
              }
            >
              {isRemovingDoc ? "Removing..." : "Confirm Removal"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Validation Dialog */}
      <Dialog open={showValidationDialog} onOpenChange={setShowValidationDialog}>
        <DialogContent className="w-full max-w-sm rounded-xl bg-white dark:bg-gray-800 p-6 shadow-xl border-0">
          {/* Main Content Container */}
          <div className="flex flex-col items-center text-center space-y-4">
            
            {/* Warning Icon */}
            <div className="relative mb-2">
              <div className="absolute inset-0 bg-amber-100 dark:bg-amber-900/20 rounded-full scale-110 animate-pulse"></div>
              <AlertCircle className="relative h-12 w-12 text-amber-500 dark:text-amber-400" />
            </div>

            {/* Header Section */}
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white leading-tight">
                Validation Required
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                {validationMessage}
              </p>
            </div>

            {/* Action Message */}
            <div className="pt-2">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Click "Review Expense" to navigate to the required field.
              </p>
            </div>
          </div>

          {/* Action Button */}
          <div className="mt-6 flex justify-center">
            <Button
              variant="primary"
              onClick={navigateToProblematicInput}
              startIcon={<AlertCircle className="h-4 w-4" />}
              className="px-6 py-2 bg-amber-600 hover:bg-amber-700 text-white"
            >
              Review Expense
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LiquidationPage;
