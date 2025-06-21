import React, { useState, useRef } from "react";
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

interface Document {
  type: string;
  required: boolean;
  uploaded: boolean;
  file?: File; // Optional file property
}

interface Expense {
  id: string;
  title: string;
  amount: number;
  documents: Document[];
}

interface LiquidationRequest {
  id: string;
  month: string;
  status: string;
  totalAmount: number;
  expenses: Expense[];
}
// Hardcoded data based on your examples
const unliquidatedRequest: LiquidationRequest = {
  id: "REQ-2023-06-001",
  month: "June 2023",
  status: "Pending Liquidation",
  totalAmount: 25000,
  expenses: [
    {
      id: "EXP-001",
      title: "Travelling Expense",
      amount: 8000,
      documents: [
        { type: "Photocopy of check issued", required: true, uploaded: false },
        { type: "Tickets", required: false, uploaded: false },
        {
          type: "Original Copy of Certificate of Appearance (CA)",
          required: true,
          uploaded: false,
        },
        {
          type: "Approved Certificate of Travel Completed",
          required: true,
          uploaded: false,
        },
        {
          type: "Approved Itinerary of Travel",
          required: true,
          uploaded: false,
        },
        {
          type: "Approved Authority to Travel/Locator Slip",
          required: true,
          uploaded: false,
        },
        { type: "Memorandum", required: true, uploaded: false },
      ],
    },
    {
      id: "EXP-002",
      title: "Training Expense",
      amount: 12000,
      documents: [
        { type: "Photocopy of check issued", required: true, uploaded: false },
        {
          type: "Original copy of Original Receipt (OR)",
          required: true,
          uploaded: false,
        },
        { type: "Narrative Report", required: true, uploaded: false },
        { type: "Tickets", required: false, uploaded: false },
        {
          type: "Original Copy of Certificate of Appearance (CA)",
          required: true,
          uploaded: false,
        },
        {
          type: "Approved Certificate of Travel Completed",
          required: true,
          uploaded: false,
        },
        {
          type: "Approved Itinerary of Travel",
          required: true,
          uploaded: false,
        },
        {
          type: "Approved Authority to Travel",
          required: true,
          uploaded: false,
        },
        { type: "Memorandum", required: true, uploaded: false },
      ],
    },
    {
      id: "EXP-003",
      title: "Electricity Expense",
      amount: 5000,
      documents: [
        { type: "Photocopy of check issued", required: true, uploaded: false },
        { type: "Disbursement voucher (DV)", required: false, uploaded: false },
        { type: "BIR FORMS 2306/2307", required: true, uploaded: false },
        { type: "Official Receipt (OR)", required: true, uploaded: false },
        { type: "Statement of Account (SOA)", required: true, uploaded: false },
      ],
    },
  ],
};

const LiquidationPage = () => {
  const { user } = useAuth();
  const [request, setRequest] =
    useState<LiquidationRequest>(unliquidatedRequest);
  const [expandedExpense, setExpandedExpense] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  // Toggle expense expansion
  const toggleExpense = (expenseId: string) => {
    setExpandedExpense(expandedExpense === expenseId ? null : expenseId);
  };

  // Handle file upload
  const handleFileUpload = (
    expenseId: string,
    docType: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const updatedRequest = { ...request };
    const expense = updatedRequest.expenses.find((exp) => exp.id === expenseId);
    if (!expense) return;

    const document = expense.documents.find((doc) => doc.type === docType);
    if (document) {
      document.uploaded = true;
      document.file = files[0]; // Store the File object
    }

    setRequest(updatedRequest);
    toast.success(`${docType} uploaded successfully!`);
  };

  // Remove uploaded file
  const removeFile = (expenseId: string, docType: string) => {
    const updatedRequest = { ...request };
    const expense = updatedRequest.expenses.find((exp) => exp.id === expenseId);
    if (!expense) return;

    const document = expense.documents.find((doc) => doc.type === docType);
    if (document) {
      document.uploaded = false;
      document.file = undefined;
    }

    setRequest(updatedRequest);
    toast.info(`${docType} removed.`);
  };

  // Trigger file input
  const triggerFileInput = (expenseId: string, docType: string) => {
    const key = `${expenseId}-${docType}`;
    if (fileInputRefs.current[key]) {
      fileInputRefs.current[key]?.click();
    }
  };

  // Check if all required documents are uploaded
  const isSubmitDisabled = request.expenses.some((expense) =>
    expense.documents.some((doc) => doc.required && !doc.uploaded)
  );

  // Calculate progress
  const calculateProgress = () => {
    let totalRequired = 0;
    let uploadedRequired = 0;

    request.expenses.forEach((expense) => {
      expense.documents.forEach((doc) => {
        if (doc.required) {
          totalRequired++;
          if (doc.uploaded) uploadedRequired++;
        }
      });
    });

    return { uploadedRequired, totalRequired };
  };

  const { uploadedRequired, totalRequired } = calculateProgress();

  // Submit liquidation
  const handleSubmit = () => {
    setIsSubmitting(true);
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      setIsConfirmDialogOpen(false);
      toast.success("Liquidation submitted successfully!");
      // In a real app, you would redirect or update the state here
    }, 1500);
  };

  // Save as draft
  const handleSaveDraft = () => {
    // Simulate saving draft
    toast.success("Draft saved successfully!");
  };

  return (
    <div className="container mx-auto rounded-2xl bg-white px-5 pb-5 pt-5 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
      <PageBreadcrumb pageTitle="Liquidation Request" />

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
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                {request.status}
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
                  width: `${(uploadedRequired / totalRequired) * 100}%`,
                }}
              ></div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 justify-end">
            <Button
              variant="outline"
              onClick={handleSaveDraft}
              disabled={isSubmitting}
            >
              Save as Draft
            </Button>
            <Dialog
              open={isConfirmDialogOpen}
              onOpenChange={setIsConfirmDialogOpen}
            >
              <DialogTrigger asChild>
                <Button
                  variant="primary"
                  disabled={isSubmitDisabled || isSubmitting}
                >
                  Submit Liquidation
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

          {request.expenses.map((expense) => (
            <div
              key={expense.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden"
            >
              {/* Expense Header */}
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                onClick={() => toggleExpense(expense.id)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-300">
                    {expandedExpense === expense.id ? (
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
                    {expense.documents.filter((d) => d.uploaded).length}/
                    {expense.documents.length} documents
                  </span>
                </div>
              </div>

              {/* Expense Content - Collapsible */}
              {expandedExpense === expense.id && (
                <div className="border-t border-gray-200 dark:border-gray-700 p-4">
                  <div className="space-y-4">
                    {expense.documents.map((document) => (
                      <div
                        key={`${expense.id}-${document.type}`}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0">
                            {document.uploaded ? (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : (
                              <AlertCircle className="h-5 w-5 text-yellow-500" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-800 dark:text-white">
                              {document.type}
                            </p>
                            {document.required ? (
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
                          {document.uploaded ? (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  removeFile(expense.id, document.type)
                                }
                              >
                                Remove
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                startIcon={<DownloadIcon className="h-4 w-4" />}
                                onClick={() => {
                                  // In a real app, this would download the file
                                  toast.info(`Downloading ${document.type}`);
                                }}
                              >
                                View
                              </Button>
                            </>
                          ) : (
                            <>
                              <input
                                type="file"
                                ref={(el) => {
                                  fileInputRefs.current[
                                    `${expense.id}-${document.type}`
                                  ] = el;
                                }}
                                onChange={(e) =>
                                  handleFileUpload(expense.id, document.type, e)
                                }
                                className="hidden"
                                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                startIcon={<UploadIcon className="h-4 w-4" />}
                                onClick={() =>
                                  triggerFileInput(expense.id, document.type)
                                }
                              >
                                Upload
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Summary Section */}
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            Summary of Uploaded Documents
          </h3>

          <div className="space-y-3">
            {request.expenses.map((expense) => (
              <div
                key={expense.id}
                className="border-b border-gray-200 dark:border-gray-700 pb-3 last:border-0 last:pb-0"
              >
                <h4 className="font-medium text-gray-800 dark:text-white mb-2">
                  {expense.title} (₱{expense.amount.toLocaleString()})
                </h4>
                <ul className="space-y-2">
                  {expense.documents
                    .filter((doc) => doc.uploaded)
                    .map((doc) => (
                      <li
                        key={doc.type}
                        className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
                      >
                        <Paperclip className="h-4 w-4 text-gray-500" />
                        {doc.type}
                      </li>
                    ))}
                  {expense.documents.filter((doc) => doc.uploaded).length ===
                    0 && (
                    <li className="text-sm text-gray-500 italic">
                      No documents uploaded yet
                    </li>
                  )}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiquidationPage;
