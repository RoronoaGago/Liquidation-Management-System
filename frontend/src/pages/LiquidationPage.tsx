// import React, { useState, useRef, useEffect } from "react";
// import PageBreadcrumb from "../components/common/PageBreadCrumb";
// import Button from "../components/ui/button/Button";
// import {
//   Dialog,
//   DialogContent,
//   DialogHeader,
//   DialogTitle,
//   DialogDescription,
// } from "@/components/ui/dialog";
// import {
//   BadgeCheck,
//   BadgeX,
//   FileText,
//   Upload,
//   Trash2,
//   Eye,
//   Save,
//   Send,
// } from "lucide-react";

// // Hardcoded data for one unliquidated request
// const unliquidatedRequest = {
//   requestMonth: "June 2025",
//   amount: 25000,
//   priorities: [
//     {
//       id: 1,
//       title: "Travelling Expense",
//       documents: [
//         { name: "Photocopy of check issued", required: true },
//         { name: "Tickets", required: false },
//         {
//           name: "Original Copy of Certificate of Appearance (CA)",
//           required: true,
//         },
//         { name: "Approved Certificate of Travel Completed", required: true },
//         { name: "Approved Itinerary of Travel", required: true },
//         { name: "Approved Authority to Travel/Locator Slip", required: true },
//         { name: "Memorandum", required: true },
//       ],
//     },
//     {
//       id: 2,
//       title: "Training Expense",
//       documents: [
//         { name: "Photocopy of check issued", required: true },
//         { name: "Original copy of Original Receipt (OR)", required: true },
//         { name: "Narrative Report", required: true },
//         { name: "Tickets", required: false },
//         {
//           name: "Original Copy of Certificate of Appearance (CA)",
//           required: true,
//         },
//         { name: "Approved Certificate of Travel Completed", required: true },
//         { name: "Approved Itinerary of Travel", required: true },
//         { name: "Approved Authority to Travel", required: true },
//         { name: "Memorandum", required: true },
//       ],
//     },
//     {
//       id: 3,
//       title: "Electricity Expense",
//       documents: [
//         { name: "Photocopy of check issued", required: true },
//         { name: "Disbursement voucher (DV)", required: false },
//         { name: "BIR FORMS 2306/2307", required: true },
//         { name: "Official Receipt (OR)", required: true },
//         { name: "Statement of Account (SOA) provide xerox", required: true },
//       ],
//     },
//   ],
// };

// function getTotalRequiredDocs(priorities: any[]) {
//   return priorities.reduce(
//     (sum, p) => sum + p.documents.filter((d: any) => d.required).length,
//     0
//   );
// }

// const LiquidationPage: React.FC = () => {
//   const [uploads, setUploads] = useState<{
//     [priorityId: number]: { [doc: string]: File[] };
//   }>({});
//   const [expanded, setExpanded] = useState<number | null>(null);
//   const [showSummary, setShowSummary] = useState(false);
//   const [showConfirm, setShowConfirm] = useState(false);
//   const [isDraft, setIsDraft] = useState(false);
//   const [uploadTarget, setUploadTarget] = useState<{
//     priorityId: number;
//     docName: string;
//   } | null>(null);
//   const uploadTargetRef = useRef<{
//     priorityId: number;
//     docName: string;
//   } | null>(null);
//   const fileInputRef = useRef<HTMLInputElement>(null);

//   // useEffect to trigger file input when uploadTarget changes
//   useEffect(() => {
//     if (uploadTarget && fileInputRef.current) {
//       uploadTargetRef.current = uploadTarget; // always keep latest
//       fileInputRef.current.value = ""; // reset input
//       fileInputRef.current.click();
//     }
//   }, [uploadTarget]);

//   // Count uploaded required docs
//   const totalRequired = getTotalRequiredDocs(unliquidatedRequest.priorities);
//   const uploadedRequired = unliquidatedRequest.priorities.reduce((sum, p) => {
//     return (
//       sum +
//       p.documents.filter(
//         (d) => d.required && uploads[p.id]?.[d.name]?.length > 0
//       ).length
//     );
//   }, 0);
//   const progress = Math.round((uploadedRequired / totalRequired) * 100);
//   const canSubmit = uploadedRequired === totalRequired;

//   // Handlers
//   const handleFileChange = (
//     priorityId: number,
//     docName: string,
//     files: FileList | null
//   ) => {
//     if (!files) return;
//     setUploads((prev) => {
//       const prevDocs = prev[priorityId]?.[docName] || [];
//       return {
//         ...prev,
//         [priorityId]: {
//           ...prev[priorityId],
//           [docName]: [...prevDocs, ...Array.from(files)],
//         },
//       };
//     });
//   };
//   const handleRemoveFile = (
//     priorityId: number,
//     docName: string,
//     idx: number
//   ) => {
//     setUploads((prev) => {
//       const newFiles = [...(prev[priorityId]?.[docName] || [])];
//       newFiles.splice(idx, 1);
//       return {
//         ...prev,
//         [priorityId]: {
//           ...prev[priorityId],
//           [docName]: newFiles,
//         },
//       };
//     });
//   };
//   const handleDownload = (file: File) => {
//     const url = URL.createObjectURL(file);
//     window.open(url, "_blank");
//     setTimeout(() => URL.revokeObjectURL(url), 1000);
//   };
//   const handleUploadClick = (priorityId: number, docName: string) => {
//     setUploadTarget({ priorityId, docName });
//   };
//   const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const target = uploadTargetRef.current;
//     if (!target) return;
//     handleFileChange(target.priorityId, target.docName, e.target.files);
//     setUploadTarget(null);
//     uploadTargetRef.current = null;
//     if (fileInputRef.current) fileInputRef.current.value = "";
//   };

//   // UI
//   return (
//     <div className="container mx-auto px-4 py-6">
//       <PageBreadcrumb pageTitle="Liquidation" />
//       <div className="mb-6">
//         <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
//           <div>
//             <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-1">
//               Liquidate Request for {unliquidatedRequest.requestMonth}
//             </h2>
//             <p className="text-gray-600 dark:text-gray-300">
//               Amount:{" "}
//               <span className="font-semibold">
//                 ₱{unliquidatedRequest.amount.toLocaleString()}
//               </span>
//             </p>
//           </div>
//           <div className="flex flex-col gap-2 md:items-end">
//             <span className="text-sm text-gray-500 dark:text-gray-400">
//               Progress: {uploadedRequired}/{totalRequired} required documents
//             </span>
//             <div className="w-64 h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
//               <div
//                 className="h-full bg-blue-500 transition-all duration-300"
//                 style={{ width: `${progress}%` }}
//               ></div>
//             </div>
//           </div>
//         </div>
//       </div>
//       <div className="space-y-6">
//         {unliquidatedRequest.priorities.map((priority) => (
//           <div
//             key={priority.id}
//             className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm"
//           >
//             <button
//               className="w-full flex justify-between items-center px-6 py-4 focus:outline-none"
//               onClick={() =>
//                 setExpanded(expanded === priority.id ? null : priority.id)
//               }
//               type="button"
//             >
//               <span className="text-lg font-semibold text-gray-800 dark:text-white">
//                 {priority.title}
//               </span>
//               <span className="text-sm text-gray-500">
//                 {expanded === priority.id ? "▲" : "▼"}
//               </span>
//             </button>
//             {expanded === priority.id && (
//               <div className="px-6 pb-6">
//                 <div className="space-y-4">
//                   {priority.documents.map((doc) => {
//                     const files = uploads[priority.id]?.[doc.name] || [];
//                     return (
//                       <div
//                         key={doc.name}
//                         className="flex flex-col md:flex-row md:items-center md:gap-4 border-b border-gray-100 dark:border-gray-800 pb-4 mb-4 last:mb-0 last:pb-0 last:border-b-0"
//                       >
//                         <div className="flex items-center gap-2 min-w-[220px]">
//                           <FileText className="text-blue-500" />
//                           <span className="font-medium text-gray-800 dark:text-white">
//                             {doc.name}
//                           </span>
//                           {doc.required ? (
//                             <span className="ml-2 px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-xs font-semibold">
//                               Required
//                             </span>
//                           ) : (
//                             <span className="ml-2 px-2 py-0.5 rounded bg-gray-100 text-gray-500 text-xs">
//                               Optional
//                             </span>
//                           )}
//                         </div>
//                         <div className="flex-1 flex flex-wrap gap-2 mt-2 md:mt-0">
//                           {files.map((file, idx) => (
//                             <div
//                               key={idx}
//                               className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded shadow-sm"
//                             >
//                               <span className="truncate max-w-[120px] text-sm text-gray-700 dark:text-gray-200">
//                                 {file.name}
//                               </span>
//                               <Button
//                                 size="md"
//                                 variant="ghost"
//                                 onClick={() => handleDownload(file)}
//                                 title="View/Download"
//                               >
//                                 <Eye className="w-4 h-4" />
//                               </Button>
//                               <Button
//                                 size="md"
//                                 variant="ghost"
//                                 color="error"
//                                 onClick={() =>
//                                   handleRemoveFile(priority.id, doc.name, idx)
//                                 }
//                                 title="Remove"
//                               >
//                                 <Trash2 className="w-4 h-4" />
//                               </Button>
//                             </div>
//                           ))}
//                           {/* Upload Button triggers single file input */}
//                           <Button
//                             size="sm"
//                             variant="outline"
//                             startIcon={<Upload className="w-4 h-4" />}
//                             onClick={() =>
//                               handleUploadClick(priority.id, doc.name)
//                             }
//                           >
//                             Upload
//                           </Button>
//                         </div>
//                       </div>
//                     );
//                   })}
//                 </div>
//               </div>
//             )}
//           </div>
//         ))}
//         {/* Single file input for all uploads, hidden */}
//         <input
//           type="file"
//           multiple
//           className="hidden"
//           ref={fileInputRef}
//           onChange={handleFileInputChange}
//         />
//       </div>
//       {/* Summary and Actions */}
//       <div className="mt-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
//         <Button
//           variant="outline"
//           startIcon={<Save className="w-5 h-5" />}
//           onClick={() => {
//             setIsDraft(true);
//             setShowSummary(true);
//           }}
//         >
//           Save as Draft
//         </Button>
//         <Button
//           variant="primary"
//           startIcon={<Send className="w-5 h-5" />}
//           disabled={!canSubmit}
//           onClick={() => {
//             setIsDraft(false);
//             setShowSummary(true);
//           }}
//         >
//           Submit Liquidation
//         </Button>
//       </div>
//       {/* Summary Dialog */}
//       <Dialog open={showSummary} onOpenChange={setShowSummary}>
//         <DialogContent className="max-w-2xl">
//           <DialogHeader>
//             <DialogTitle>Review Liquidation Submission</DialogTitle>
//             <DialogDescription>
//               Please review your uploaded documents before{" "}
//               {isDraft ? "saving as draft" : "submitting"}.
//             </DialogDescription>
//           </DialogHeader>
//           <div className="space-y-6 max-h-[60vh] overflow-y-auto">
//             {unliquidatedRequest.priorities.map((priority) => (
//               <div key={priority.id}>
//                 <h4 className="font-semibold text-lg text-gray-800 dark:text-white mb-2">
//                   {priority.title}
//                 </h4>
//                 <ul className="space-y-1">
//                   {priority.documents.map((doc) => {
//                     const files = uploads[priority.id]?.[doc.name] || [];
//                     return (
//                       <li
//                         key={doc.name}
//                         className="flex items-center gap-2 text-sm"
//                       >
//                         <FileText className="w-4 h-4 text-blue-500" />
//                         <span>{doc.name}</span>
//                         {doc.required ? (
//                           <span className="ml-2 px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-xs font-semibold">
//                             Required
//                           </span>
//                         ) : (
//                           <span className="ml-2 px-2 py-0.5 rounded bg-gray-100 text-gray-500 text-xs">
//                             Optional
//                           </span>
//                         )}
//                         {files.length > 0 ? (
//                           <BadgeCheck
//                             className="w-4 h-4 text-green-500 ml-2"
//                             // title="Uploaded"
//                           />
//                         ) : doc.required ? (
//                           <BadgeX
//                             className="w-4 h-4 text-red-500 ml-2"
//                             // title="Missing"
//                           />
//                         ) : null}
//                         <div className="flex gap-1 ml-4">
//                           {files.map((file, idx) => (
//                             <Button
//                               key={idx}
//                               size="md"
//                               variant="ghost"
//                               onClick={() => handleDownload(file)}
//                               title="View/Download"
//                             >
//                               <Eye className="w-4 h-4" />
//                             </Button>
//                           ))}
//                         </div>
//                       </li>
//                     );
//                   })}
//                 </ul>
//               </div>
//             ))}
//           </div>
//           <div className="flex justify-end gap-3 mt-6">
//             <Button variant="outline" onClick={() => setShowSummary(false)}>
//               Cancel
//             </Button>
//             <Button
//               variant="primary"
//               disabled={!canSubmit && !isDraft}
//               onClick={() => {
//                 setShowSummary(false);
//                 setShowConfirm(true);
//               }}
//             >
//               {isDraft ? "Save as Draft" : "Submit"}
//             </Button>
//           </div>
//         </DialogContent>
//       </Dialog>
//       {/* Confirmation Dialog */}
//       <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
//         <DialogContent>
//           <DialogHeader>
//             <DialogTitle>
//               {isDraft ? "Save as Draft" : "Submit Liquidation"}
//             </DialogTitle>
//             <DialogDescription>
//               Are you sure you want to{" "}
//               {isDraft ? "save this as a draft" : "submit this liquidation"}?
//             </DialogDescription>
//           </DialogHeader>
//           <div className="flex justify-end gap-3 mt-6">
//             <Button variant="outline" onClick={() => setShowConfirm(false)}>
//               Cancel
//             </Button>
//             <Button
//               variant="primary"
//               onClick={() => {
//                 setShowConfirm(false);
//                 // TODO: Integrate with backend
//                 alert(isDraft ? "Draft saved!" : "Liquidation submitted!");
//               }}
//             >
//               Confirm
//             </Button>
//           </div>
//         </DialogContent>
//       </Dialog>
//     </div>
//   );
// };

// export default LiquidationPage;
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
