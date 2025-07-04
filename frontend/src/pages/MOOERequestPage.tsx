/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useRef, useEffect } from "react";
import { Disclosure, Transition } from "@headlessui/react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  Info,
  X,
  Plus,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  FileText,
} from "lucide-react";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import { ListofPriorityData } from "@/lib/types";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useLocation, useNavigate } from "react-router";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import api from "@/api/axios";
import DocumentTextIcon from "@heroicons/react/outline/DocumentTextIcon";

const CATEGORY_LABELS: Record<string, string> = {
  travel: "Travel Expenses",
  training: "Training Expenses",
  scholarship: "Scholarship Grants/Expenses",
  supplies: "Office Supplies & Materials Expenses",
  utilities: "Utilities Expenses",
  communication: "Communication Expenses",
  awards: "Awards/Rewards/Prizes Expenses",
  survey: "Survey, Research, Exploration and Development Expenses",
  confidential: "Confidential & Intelligence Expenses",
  extraordinary: "Extraordinary and Miscellaneous Expenses",
  professional: "Professional Service Expenses",
  services: "General Services",
  maintenance: "Repairs and Maintenance Expenses",
  financial_assistance: "Financial Assistance/Subsidy Expenses",
  taxes: "Taxes, Duties and Licenses Expenses",
  labor: "Labor and Wages Expenses",
  other_maintenance: "Other Maintenance and Operating Expenses",
  financial: "Financial Expenses",
  non_cash: "Non-cash Expenses",
  losses: "Losses",
};

const MOOERequestPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [priorities, setPriorities] = useState<ListofPriorityData[]>([]);
  const [selected, setSelected] = useState<{ [key: string]: string }>({});
  const [filterOptions, setFilterOptions] = useState<{ searchTerm: string }>({
    searchTerm: "",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
  const [hasPendingRequest, setHasPendingRequest] = useState(true);
  const [pendingRequestData, setPendingRequestData] = useState<any>(null);
  const [hasActiveLiquidation, setHasActiveLiquidation] = useState(false);
  const [activeLiquidationData, setActiveLiquidationData] = useState<any>(null);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [categoriesPerPage, setCategoriesPerPage] = useState(5);
  const [showRequirementsDialog, setShowRequirementsDialog] = useState(false);
  const [currentPriorityRequirements, setCurrentPriorityRequirements] =
    useState<string[]>([]);
  const [currentPriorityTitle, setCurrentPriorityTitle] = useState("");
  const [allocatedBudget, setAllocatedBudget] = useState<number>(0);
  const [expenseToRemove, setExpenseToRemove] = useState<string | null>(null);
  const [showClearAllDialog, setShowClearAllDialog] = useState(false);

  // Add a state to store the last submitted request ID
  const [lastRequestId, setLastRequestId] = useState<string | null>(null);

  // Handle pre-filling from a rejected request
  useEffect(() => {
    if (location.state?.rejectedRequestId) {
      const initialSelected = location.state.priorities.reduce(
        (acc: any, priority: any) => {
          acc[priority.priority.expenseTitle] = priority.amount;
          return acc;
        },
        {}
      );
      setSelected(initialSelected);
      toast.info(
        <div>
          <p>You're editing a rejected request.</p>
          <p className="font-medium">
            Reason: {location.state.rejectionComment}
          </p>
        </div>,
        {
          autoClose: 8000,
          closeButton: false,
        }
      );
    }
  }, [location.state]);

  // Fetch priorities and check for pending requests or active liquidations
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setFetchError(null);
      try {
        const [prioritiesResponse, pendingCheckResponse] = await Promise.all([
          api.get("priorities/"),
          api.get("check-pending-requests/"),
        ]);

        const data = Array.isArray(prioritiesResponse.data)
          ? prioritiesResponse.data
          : prioritiesResponse.data.results || [];
        setPriorities(data);

        const hasPending = pendingCheckResponse.data.has_pending_request;
        const activeLiquidation = pendingCheckResponse.data.active_liquidation;
        const hasActive =
          !!activeLiquidation && activeLiquidation.status !== "liquidated";

        setHasPendingRequest(hasPending);
        setHasActiveLiquidation(hasActive);
        setPendingRequestData(pendingCheckResponse.data.pending_request);
        setActiveLiquidationData(activeLiquidation);

        if (hasPending || hasActive) {
          setShowStatusDialog(true);
        } else {
          setShowStatusDialog(false);
        }
      } catch (error: any) {
        setFetchError(
          error.response?.data?.message ||
            "Failed to fetch data. Please try again."
        );
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Fetch school max_budget on mount
  useEffect(() => {
    const fetchSchoolBudget = async () => {
      try {
        // Fetch current user info
        const userRes = await api.get("/users/me/");
        const schoolId = userRes.data.school?.schoolId;
        if (!schoolId) {
          setAllocatedBudget(0);
          return;
        }
        // Fetch school info by ID
        const schoolRes = await api.get(`/schools/${schoolId}/`);
        setAllocatedBudget(Number(schoolRes.data.max_budget) || 0);
      } catch (error) {
        setAllocatedBudget(0);
        console.error("Failed to fetch allocated budget:", error);
      }
    };
    fetchSchoolBudget();
  }, []);

  const isFormDisabled = hasPendingRequest || hasActiveLiquidation;

  // Update handleCheck to show toast notifications
  const handleCheck = (expense: string) => {
    setSelected((prev) => {
      if (expense in prev) {
        const { [expense]: _, ...rest } = prev;
        toast.info(`Removed ${expense} from selection`);
        return rest;
      } else {
        toast.success(`Added ${expense} to selection`);
        return { ...prev, [expense]: "" };
      }
    });
  };

  const formatNumberWithCommas = (value: string) => {
    const num = value.replace(/,/g, "");
    if (num === "") return "";
    if (isNaN(Number(num))) return value;
    return Number(num).toLocaleString();
  };

  const handleAmountChange = (expense: string, value: string) => {
    // Remove all non-digit characters except decimal point
    const cleanValue = value.replace(/[^0-9.]/g, "");

    // If empty string, allow it
    if (cleanValue === "") {
      setSelected((prev) => ({ ...prev, [expense]: "" }));
      return;
    }

    // Check if it's a valid number
    if (!isNaN(Number(cleanValue)) && Number(cleanValue) >= 0) {
      // Calculate new total if this value is set
      const newAmount = Number(cleanValue);
      const currentTotal = Object.entries(selected).reduce(
        (sum, [key, amt]) =>
          key === expense
            ? sum
            : sum + (amt ? Number(amt.replace(/,/g, "")) : 0),
        0
      );
      const newTotal = currentTotal + newAmount;

      if (newTotal > allocatedBudget) {
        toast.error(
          `Total amount cannot exceed allocated budget of ₱${allocatedBudget.toLocaleString()}`
        );
        return;
      }

      // Format with commas
      const formattedValue = formatNumberWithCommas(cleanValue);
      setSelected((prev) => ({ ...prev, [expense]: formattedValue }));
    }
  };

  const handleNavigation = () => {
    if (hasPendingRequest) {
      navigate("/requests-history");
    } else if (hasActiveLiquidation) {
      navigate("/liquidation");
    }
  };

  // Calculate total amount without commas
  const totalAmount = Object.values(selected).reduce(
    (sum, amount) => sum + (amount ? Number(amount.replace(/,/g, "")) : 0),
    0
  );

  // Map selected to [{ LOPID, amount }]
  const selectedPriorities = Object.entries(selected)
    .map(([expenseTitle, amount]) => {
      const priority = priorities.find((p) => p.expenseTitle === expenseTitle);
      return priority
        ? { LOPID: priority.LOPID.toString(), amount: amount.replace(/,/g, "") }
        : null;
    })
    .filter(Boolean) as { LOPID: string; amount: string }[];

  // Submit handler with resubmission logic
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("location.state:", location.state);
    if (selectedPriorities.length < 2) {
      toast.error("Please select at least two expenses.");
      return;
    }

    if (totalAmount > allocatedBudget) {
      toast.error(
        `Total amount cannot exceed allocated budget of ₱${allocatedBudget.toLocaleString()}`
      );
      return;
    }

    const emptyAmounts = selectedPriorities.filter(
      (item) => !item.amount || item.amount === "0"
    );
    if (emptyAmounts.length > 0) {
      toast.error("Please enter amounts for all selected expenses.");
      return;
    }

    setSubmitting(true);
    try {
      let requestId: string | null = null;
      if (location.state?.rejectedRequestId) {
        // Resubmit existing request
        const res = await api.put(
          `requests/${location.state.rejectedRequestId}/resubmit/`,
          {
            priority_amounts: selectedPriorities,
          }
        );
        requestId = res.data?.request_id || location.state.rejectedRequestId;
      } else {
        // Create new request
        const res = await api.post("requests/", {
          priority_amounts: selectedPriorities,
          request_month: new Date().toLocaleString("default", {
            month: "long",
            year: "numeric",
          }),
          notes: location.state?.rejectedRequestId
            ? `Resubmission of rejected request ${location.state.rejectedRequestId}`
            : undefined,
        });
        requestId = res.data?.request_id;
      }

      setSelected({});
      setLastRequestId(requestId || null); // <-- Store the request ID
      setShowSuccessDialog(true);

      setTimeout(() => {
        setShowSuccessDialog(false);
        navigate("/requests-history");
      }, 2500);
    } catch (error: any) {
      console.error("Error:", error);
      const errorMessage =
        error.response?.data?.message ||
        "Failed to submit fund request. Please try again.";
      toast.error(errorMessage, { autoClose: 4000 });
    } finally {
      setSubmitting(false);
    }
  };

  // Debounced search handler
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }
    debounceTimeout.current = setTimeout(() => {
      setFilterOptions((prev) => ({
        ...prev,
        searchTerm: value,
      }));
      setCurrentPage(1);
    }, 10);
  };

  // Filter priorities based on searchTerm
  const filteredExpenses = priorities.filter((priority) =>
    priority.expenseTitle
      .toLowerCase()
      .includes(filterOptions.searchTerm.toLowerCase())
  );

  // Group priorities by category
  const categories = React.useMemo(() => {
    const map: { [cat: string]: ListofPriorityData[] } = {};
    priorities.forEach((p) => {
      if (!map[p.category]) map[p.category] = [];
      map[p.category].push(p);
    });
    return map;
  }, [priorities]);

  // For pagination: get all category keys with unchecked items
  const allCategoryKeys = Object.keys(categories).filter((cat) =>
    categories[cat].some((p) => selected[p.expenseTitle] === undefined)
  );

  // Pagination logic
  const totalPages = Math.ceil(allCategoryKeys.length / categoriesPerPage);
  const paginatedCategoryKeys = allCategoryKeys.slice(
    (currentPage - 1) * categoriesPerPage,
    currentPage * categoriesPerPage
  );

  // For pagination: flatten all unchecked priorities (not categories)

  // For rendering: group paginated items by category

  // Confirmation dialog state for select all and submit
  const [categoryToSelect, setCategoryToSelect] = useState<string | null>(null);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);

  // Handle select all with confirmation
  const handleCategorySelectAll = (cat: string) => {
    const itemsToCheck = categories[cat].filter(
      (p) => selected[p.expenseTitle] === undefined
    );
    if (itemsToCheck.length >= 3) {
      setCategoryToSelect(cat);
    } else {
      doCategorySelectAll(cat);
    }
  };
  const doCategorySelectAll = (cat: string) => {
    setSelected((prev) => {
      const newSel = { ...prev };
      categories[cat].forEach((p) => {
        if (!newSel[p.expenseTitle]) newSel[p.expenseTitle] = "";
      });
      return newSel;
    });
    setCategoryToSelect(null);
  };

  // Show requirements for a priority
  const showRequirements = (expenseTitle: string) => {
    const priority = priorities.find((p) => p.expenseTitle === expenseTitle);

    if (priority && priority.requirements) {
      // Filter out only requirement objects (not ListofPriorityData)
      const requirementTitles = priority.requirements
        .filter(
          (
            req
          ): req is {
            requirementID: number;
            requirementTitle: string;
            is_required: boolean;
          } => "requirementTitle" in req
        )
        .map((req) => req.requirementTitle);

      setCurrentPriorityRequirements(requirementTitles);
      setCurrentPriorityTitle(expenseTitle);
      setShowRequirementsDialog(true);
    } else {
      setCurrentPriorityRequirements([]);
      setCurrentPriorityTitle(expenseTitle);
      setShowRequirementsDialog(true);
    }
  };

  return (
    <div className="container mx-auto rounded-2xl bg-white px-5 pb-5 pt-5 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
      <PageBreadcrumb pageTitle="List of Priorities" />

      {/* Remove Expense Dialog */}
      <Dialog
        open={!!expenseToRemove}
        onOpenChange={() => setExpenseToRemove(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Removal</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this expense from your request?
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-2">
            <p className="font-medium">
              Expense: <span className="text-brand-600">{expenseToRemove}</span>
            </p>
            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => setExpenseToRemove(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (expenseToRemove) handleCheck(expenseToRemove);
                  setExpenseToRemove(null);
                }}
              >
                Remove Expense
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Clear All Dialog */}
      <Dialog open={showClearAllDialog} onOpenChange={setShowClearAllDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear All Selections</DialogTitle>
            <DialogDescription>
              This will remove all selected expenses from your request.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-2">
            <p className="font-medium">
              {Object.keys(selected).length} items will be removed
            </p>
            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => setShowClearAllDialog(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  setSelected({});
                  setShowClearAllDialog(false);
                  toast.success("Cleared all selections");
                }}
              >
                Clear All
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="flex flex-col items-center justify-center">
          <DialogHeader>
            <DialogTitle className="text-center">
              Request Submitted!
            </DialogTitle>
            <DialogDescription className="text-center">
              Your MOOE request was submitted successfully.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center py-4">
            <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
            {lastRequestId && (
              <div className="mb-2 text-center">
                <span className="text-gray-700 dark:text-gray-200 text-sm">
                  Request ID:&nbsp;
                  <span className="font-semibold text-brand-600 dark:text-brand-400">
                    {lastRequestId}
                  </span>
                </span>
              </div>
            )}
            <p className="text-gray-600 dark:text-gray-300 text-center">
              Redirecting to request history...
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Requirements Dialog */}
      <Dialog
        open={showRequirementsDialog}
        onOpenChange={setShowRequirementsDialog}
      >
        <DialogContent className="w-full max-w-[95vw] sm:max-w-md flex flex-col max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Document Requirements</DialogTitle>
            <DialogDescription>For: {currentPriorityTitle}</DialogDescription>
          </DialogHeader>
          <div className="mt-4 max-h-[60vh] overflow-y-auto px-1">
            {currentPriorityRequirements.length > 0 ? (
              <ul className="space-y-3 pr-2">
                {currentPriorityRequirements.map((req, index) => {
                  const isRequired = true; // Default to required
                  return (
                    <li
                      key={index}
                      className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg"
                    >
                      <DocumentTextIcon className="h-5 w-5 text-gray-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-800 dark:text-white">
                            {req}
                          </span>
                          {isRequired ? (
                            <span className="text-xs px-2 py-1 bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300 rounded-full">
                              Required
                            </span>
                          ) : (
                            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300 rounded-full">
                              Optional
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          PDF format required
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">
                No specific requirements for this priority.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Status Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent
          className="[&>button]:hidden w-full max-w-[95vw] rounded-lg bg-white dark:bg-gray-800 p-0 overflow-hidden shadow-2xl sm:max-w-lg border border-gray-200 dark:border-gray-700 flex flex-col max-h-[90vh]"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <div className="bg-gradient-to-r from-brand-50 to-gray-50 dark:from-gray-700 dark:to-gray-800 px-6 py-5 border-b border  -gray-100 dark:border-gray-700">
            <div className="flex items-center gap-4">
              <div className="p-2.5 rounded-lg bg-brand-100/80 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Action Required
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Please review these important notifications
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4 px-6 py-5">
            {hasPendingRequest && (
              <div className="flex gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm">
                <div className="flex-shrink-0 p-2 rounded-md text-brand-600 dark:text-brand-400">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div className="space-y-2.5">
                  <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    Pending MOOE Request
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-brand-100 text-brand-800 dark:text-brand-200">
                      Attention needed
                    </span>
                  </h3>
                  <div className="text-gray-600 dark:text-gray-300 text-sm space-y-2">
                    <p>
                      You{" "}
                      <span className="font-semibold text-gray-900 dark:text-white">
                        cannot submit
                      </span>{" "}
                      a new request because you have an active request for{" "}
                      <span className="font-semibold text-brand-600 dark:text-brand-400">
                        {pendingRequestData?.request_month}
                      </span>
                      , which must be completed first before submitting new
                      requests.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {hasActiveLiquidation && (
              <div className="flex gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm">
                <div className="flex-shrink-0 p-2 rounded-md text-brand-600 dark:text-brand-400">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div className="space-y-2.5">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Active Liquidation Process
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-brand-100 text-brand-800 dark:text-brand-200">
                      Attention needed
                    </span>
                  </h3>
                  <div className="text-gray-600 dark:text-gray-300 text-sm space-y-2">
                    <p>
                      You{" "}
                      <span className="font-semibold text-gray-900 dark:text-white">
                        cannot submit
                      </span>{" "}
                      a new request because there's an ongoing liquidation
                      process for Request ID:{" "}
                      <span className="font-mono font-medium text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                        {activeLiquidationData?.request?.request_id}
                      </span>
                    </p>
                    <div className="space-y-2">
                      <p>
                        Current status:{" "}
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand-100 dark:bg-brand-900/30 text-brand-800 dark:text-brand-200 capitalize">
                          {activeLiquidationData?.status?.replace(/_/g, " ")}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-gray-50 dark:bg-gray-700/50 px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
            <div></div>
            <Button
              variant="primary"
              onClick={handleNavigation}
              className="px-4 py-2 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 dark:from-brand-700 dark:to-brand-600 dark:hover:from-brand-800 dark:hover:to-brand-700 text-white shadow-sm"
            >
              View Full Details
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Select All Confirmation Dialog */}
      <Dialog
        open={!!categoryToSelect}
        onOpenChange={() => setCategoryToSelect(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select All in Category</DialogTitle>
            <DialogDescription>
              This will select all items under this category
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-2">
            <p className="font-medium">
              Category:{" "}
              {CATEGORY_LABELS[categoryToSelect ?? ""] || categoryToSelect}
            </p>
            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => setCategoryToSelect(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  doCategorySelectAll(categoryToSelect!);
                  toast.success(`Selected all items in ${categoryToSelect}`);
                }}
              >
                Select All
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Submit Confirmation Dialog */}
      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent className="w-full max-w-[95vw] sm:max-w-md rounded-lg flex flex-col max-h-[90vh]">
          <div className="p-6 space-y-4 overflow-y-auto">
            {/* Header with icon */}
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
                <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-lg font-bold text-gray-800 dark:text-white">
                Confirm MOOE Request Submission
              </h2>
            </div>

            <div className="max-h-[50vh] overflow-y-auto space-y-4">
              {/* Budget Compliance Check */}
              <div className="p-3 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-100 dark:border-green-900/20">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-green-800 dark:text-green-200">
                    Allocated Budget:
                  </span>
                  <span className="font-bold text-green-800 dark:text-green-200">
                    ₱{allocatedBudget.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-sm font-medium text-green-800 dark:text-green-200">
                    Request Total:
                  </span>
                  <span className="font-bold text-green-800 dark:text-green-200">
                    ₱{totalAmount.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Success checkmark if full budget is used */}
              {totalAmount === allocatedBudget && (
                <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/10 rounded border border-green-100 dark:border-green-900/20">
                  <CheckCircle className="h-4 w-4 text-green-500 dark:text-green-400" />
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Full budget allocated (complies with policy).
                  </p>
                </div>
              )}

              {/* Warning if budget is not fully used */}
              {totalAmount < allocatedBudget && (
                <div className="flex items-start gap-2 p-2 bg-amber-50 dark:bg-amber-900/10 rounded border border-amber-100 dark:border-amber-900/20">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0 text-amber-500 dark:text-amber-400 mt-0.5" />
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    You have{" "}
                    <strong>
                      ₱{(allocatedBudget - totalAmount).toLocaleString()}
                    </strong>{" "}
                    remaining. Ensure the full budget is utilized before
                    submission.
                  </p>
                </div>
              )}

              {/* Selected Items Summary */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Selected Expenses ({Object.keys(selected).length}):
                </h3>
                <div className="max-h-[40vh] overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-md">
                  <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                    {Object.entries(selected).map(([expenseTitle, amount]) => (
                      <li key={expenseTitle} className="px-3 py-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-700 dark:text-gray-300 truncate max-w-[180px]">
                            {expenseTitle}
                          </span>
                          <span className="text-sm font-mono font-medium">
                            ₱{amount || "0"}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="outline"
                onClick={() => setShowSubmitDialog(false)}
                className="px-4 py-2"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={async () => {
                  setShowSubmitDialog(false);
                  await handleSubmit(new Event("submit") as any);
                }}
                disabled={submitting || totalAmount < allocatedBudget}
                className="px-4 py-2"
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Submitting...
                  </span>
                ) : (
                  "Confirm & Submit"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="mt-8">
        {!isFormDisabled && (
          <div className="mb-4 bg-brand-50/80 dark:bg-brand-900/10 rounded-lg border border-brand-100 dark:border-brand-900/20 overflow-hidden transition-colors">
            <Disclosure>
              {({ open }) => (
                <>
                  <Disclosure.Button
                    className="flex w-full items-center justify-between p-3 text-left text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                    aria-label="MOOE request guide"
                  >
                    <div className="flex items-center gap-2">
                      <Info className="h-4 w-4 flex-shrink-0 text-brand-600 dark:text-brand-400" />
                      <span className="font-medium text-brand-800 dark:text-brand-200">
                        How to request MOOE funds
                      </span>
                    </div>
                    <ChevronDown
                      className={`h-4 w-4 text-brand-600 dark:text-brand-400 transition-transform duration-200 ${
                        open ? "rotate-180" : ""
                      }`}
                    />
                  </Disclosure.Button>

                  <Transition
                    enter="transition duration-100 ease-out"
                    enterFrom="transform opacity-0 -translate-y-2"
                    enterTo="transform opacity-100 translate-y-0"
                    leave="transition duration-75 ease-out"
                    leaveFrom="transform opacity-100 translate-y-0"
                    leaveTo="transform opacity-0 -translate-y-2"
                  >
                    <Disclosure.Panel className="px-4 pb-3 pt-1 text-sm text-brand-700 dark:text-brand-300 border-t border-brand-100 dark:border-brand-900/20">
                      <ol className="space-y-2">
                        <li className="flex gap-2">
                          <span className="font-medium">1.</span>
                          <p>
                            Select at least{" "}
                            <span className="font-semibold">
                              2 expense items
                            </span>{" "}
                            from the list
                          </p>
                        </li>
                        <li className="flex gap-2">
                          <span className="font-medium">2.</span>
                          <p>
                            Enter amounts using the{" "}
                            <span className="font-semibold">
                              +500/+1000 buttons
                            </span>{" "}
                            or type manually
                          </p>
                        </li>
                        <li className="flex gap-2">
                          <span className="font-medium">3.</span>
                          <p>
                            Total must not exceed your{" "}
                            <span className="font-semibold">
                              allocated budget (₱
                              {allocatedBudget.toLocaleString()})
                            </span>
                          </p>
                        </li>
                        <li className="flex gap-2">
                          <span className="font-medium">4.</span>
                          <p>
                            Click <FileText className="inline h-3 w-3" /> icons
                            to view{" "}
                            <span className="font-semibold">
                              document requirements
                            </span>
                          </p>
                        </li>
                      </ol>

                      {location.state?.rejectedRequestId && (
                        <div className="mt-3 p-2 bg-amber-50 dark:bg-amber-900/10 rounded border border-amber-100 dark:border-amber-900/20 text-xs">
                          <span className="font-medium">Note:</span> You're
                          editing a rejected request. Please address the
                          rejection reason before resubmitting.
                        </div>
                      )}
                    </Disclosure.Panel>
                  </Transition>
                </>
              )}
            </Disclosure>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            // Only show confirmation dialog if all amounts are filled
            const emptyAmounts = Object.entries(selected).filter(
              ([, amount]) => !amount || amount === "0"
            );
            if (Object.keys(selected).length < 2) {
              toast.error("Please select at least two expenses.");
              return;
            }
            if (totalAmount > allocatedBudget) {
              toast.error(
                `Total amount cannot exceed allocated budget of ₱${allocatedBudget.toLocaleString()}`
              );
              return;
            }
            if (emptyAmounts.length > 0) {
              toast.error("Please enter amounts for all selected expenses.");
              return;
            }
            setShowSubmitDialog(true);
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column - Expense List */}
            <div>
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-6">
                <div className="relative w-full">
                  <Input
                    type="text"
                    placeholder="Search expenses..."
                    value={filterOptions.searchTerm}
                    onChange={handleSearchChange}
                    disabled={isFormDisabled}
                    className={`pl-10 ${
                      isFormDisabled ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  />
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-400">
                    {filteredExpenses.length} items
                  </span>
                </div>

                <div className="flex gap-4 w-full md:w-auto items-center">
                  <label className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                    Categories per page:
                  </label>
                  <select
                    value={categoriesPerPage}
                    onChange={(e) => {
                      setCategoriesPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 h-11"
                  >
                    {[3, 5, 10, 20].map((num) => (
                      <option key={num} value={num}>
                        Show {num}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Improved Expense List with inline editing */}
              <div className="grid grid-cols-1 gap-3">
                {loading && (
                  <div className="col-span-2 text-gray-500 text-center py-8">
                    Loading expenses...
                  </div>
                )}
                {fetchError && (
                  <div className="col-span-2 text-red-500 text-center py-8">
                    {fetchError}
                  </div>
                )}

                {!loading &&
                  !fetchError &&
                  paginatedCategoryKeys.map((cat) => {
                    const items = categories[cat].filter(
                      (p) => selected[p.expenseTitle] === undefined
                    );
                    if (items.length === 0) return null;
                    return (
                      <div
                        key={cat}
                        className="mb-4 border border-gray-300 rounded-lg transition-colors"
                      >
                        {/* Category Header */}
                        <div className="flex items-center mb-2 w-full bg-gray-50 dark:bg-gray-700/40 rounded-t-lg px-3 py-2">
                          <input
                            type="checkbox"
                            checked={items.every(
                              (p) => selected[p.expenseTitle] !== undefined
                            )}
                            onChange={() => handleCategorySelectAll(cat)}
                            disabled={isFormDisabled}
                            className="mr-3 h-5 w-5 rounded-full border-2 border-gray-300 focus:ring-2 focus:ring-brand-500 outline-none transition-colors duration-150 hover:border-brand-500"
                            style={{ cursor: "pointer" }}
                          />
                          <span className="font-semibold text-brand-700 dark:text-brand-200 w-full">
                            {CATEGORY_LABELS[cat] || cat}
                          </span>
                        </div>
                        {/* Items under category, indented */}
                        <div className="pl-8 space-y-2 pb-2">
                          {items.map((priority) => (
                            <div
                              key={priority.LOPID}
                              className="flex items-center py-2 pr-4 rounded-lg transition-colors hover:bg-brand-50/60 dark:hover:bg-brand-900/20"
                            >
                              <input
                                type="checkbox"
                                checked={
                                  selected[priority.expenseTitle] !== undefined
                                }
                                onChange={() =>
                                  handleCheck(priority.expenseTitle)
                                }
                                disabled={isFormDisabled}
                                className="h-5 w-5 rounded-full border-2 border-gray-300 focus:ring-2 focus:ring-brand-500 outline-none transition-colors duration-150 hover:border-brand-500"
                                style={{ cursor: "pointer" }}
                              />
                              <span className="ml-3 text-gray-700 dark:text-gray-300">
                                {priority.expenseTitle}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Pagination */}
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Page {currentPage} of {totalPages} • {allCategoryKeys.length}{" "}
                  total categories
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    variant="outline"
                    size="sm"
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    variant="outline"
                    size="sm"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => (
                      <Button
                        type="button"
                        key={i + 1}
                        onClick={() => setCurrentPage(i + 1)}
                        variant={currentPage === i + 1 ? "primary" : "outline"}
                        size="sm"
                      >
                        {i + 1}
                      </Button>
                    ))}
                  </div>
                  <Button
                    type="button"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    variant="outline"
                    size="sm"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    variant="outline"
                    size="sm"
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Right Column - Summary Panel */}
            <div className="sticky top-4 h-fit">
              <div className="border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 overflow-hidden">
                <div className="bg-gray-50 dark:bg-gray-700/50 px-4 py-3 border-b border-gray-300 dark:border-gray-600">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                    MOOE Request Summary
                  </h3>
                </div>

                {Object.keys(selected).length > 0 ? (
                  <>
                    <div className="p-4">
                      <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-900/20">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                            Allocated Budget:
                          </span>
                          <span className="font-bold text-blue-800 dark:text-blue-200">
                            ₱{allocatedBudget.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                            Remaining Budget:
                          </span>
                          <span className="font-bold text-blue-800 dark:text-blue-200">
                            ₱{(allocatedBudget - totalAmount).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center mb-4">
                        <span className="text-gray-600 dark:text-gray-300">
                          {Object.keys(selected).length} item(s) selected
                        </span>
                        <span className="font-medium text-brand-600 dark:text-brand-400">
                          Total: ₱{totalAmount.toLocaleString()}
                        </span>
                      </div>

                      <div className="space-y-3 max-h-[400px] overflow-y-auto">
                        {Object.entries(selected).map(
                          ([expenseTitle, amount]) => {
                            const priority = priorities.find(
                              (p) => p.expenseTitle === expenseTitle
                            );
                            if (!priority) return null;
                            return (
                              <div
                                key={priority.LOPID}
                                className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg"
                              >
                                {/* Responsive/truncated expense title */}
                                <div className="pr-2 min-w-0 flex-1">
                                  <div
                                    className="truncate font-medium text-gray-900 dark:text-white"
                                    title={expenseTitle}
                                  >
                                    {expenseTitle}
                                  </div>
                                  <div className="flex items-center mt-1">
                                    <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                      {CATEGORY_LABELS[priority.category] ||
                                        priority.category}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        showRequirements(expenseTitle)
                                      }
                                      className="ml-2 text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center"
                                    >
                                      <FileText className="h-3 w-3 mr-1" />
                                      {priority.requirements
                                        ? priority.requirements.length
                                        : 0}{" "}
                                      docs
                                    </button>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  {/* Quick add buttons on the left */}
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-xs font-semibold hover:bg-blue-200 transition"
                                      disabled={isFormDisabled}
                                      onClick={() => {
                                        const current =
                                          Number(amount.replace(/,/g, "")) || 0;
                                        handleAmountChange(
                                          expenseTitle,
                                          (current + 1000).toString()
                                        );
                                      }}
                                      tabIndex={-1}
                                    >
                                      +1000
                                    </button>
                                    <button
                                      type="button"
                                      className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-xs font-semibold hover:bg-blue-200 transition"
                                      disabled={isFormDisabled}
                                      onClick={() => {
                                        const current =
                                          Number(amount.replace(/,/g, "")) || 0;
                                        handleAmountChange(
                                          expenseTitle,
                                          (current + 500).toString()
                                        );
                                      }}
                                      tabIndex={-1}
                                    >
                                      +500
                                    </button>
                                  </div>
                                  {/* Amount input */}
                                  <div className="relative w-24">
                                    <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500">
                                      ₱
                                    </span>
                                    <input
                                      type="text"
                                      value={amount}
                                      onChange={(e) =>
                                        handleAmountChange(
                                          expenseTitle,
                                          e.target.value
                                        )
                                      }
                                      disabled={isFormDisabled}
                                      className={`w-full pl-6 pr-2 py-1 text-sm border border-gray-300 rounded focus:border-brand-500 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white ${
                                        isFormDisabled
                                          ? "opacity-50 cursor-not-allowed"
                                          : ""
                                      }`}
                                      placeholder="0.00"
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                  </div>
                                  {/* Remove button */}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setExpenseToRemove(expenseTitle)
                                    }
                                    className="text-gray-400 hover:text-red-500"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            );
                          }
                        )}
                      </div>
                    </div>
                    <div className="p-4 border-t border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50">
                      <div className="flex justify-between items-center">
                        <Button
                          type="button"
                          onClick={() => setShowClearAllDialog(true)}
                          variant="outline"
                          size="sm"
                        >
                          Clear All
                        </Button>
                        <Button
                          type="submit"
                          variant="primary"
                          disabled={submitting || isFormDisabled}
                          className="min-w-[180px]"
                        >
                          {isFormDisabled ? (
                            hasPendingRequest ? (
                              "Request Pending"
                            ) : (
                              "Liquidation in Progress"
                            )
                          ) : submitting ? (
                            "Submitting..."
                          ) : (
                            <>
                              Submit Request
                              <span className="ml-2 font-normal">
                                (₱{totalAmount.toLocaleString()})
                              </span>
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="p-8 text-center">
                    <div className="mx-auto w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                      <Plus className="h-8 w-8 text-gray-400" />
                    </div>
                    <h4 className="text-gray-500 dark:text-gray-400 font-medium mb-1">
                      No expenses selected
                    </h4>
                    <p className="text-sm text-gray-400 dark:text-gray-500">
                      Select items from the list to begin
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MOOERequestPage;
