/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useRef, useEffect } from "react";
import { Disclosure, Transition } from "@headlessui/react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import {
  Search,
  ChevronDown,
  Info,
  X,
  Plus,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  FileText,
  Copy,
  BadgeCheck,
} from "lucide-react";

import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import { ListOfPriority, ListofPriorityData } from "@/lib/types";
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
  const [agreed, setAgreed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [priorities, setPriorities] = useState<ListofPriorityData[]>([]);
  const [selected, setSelected] = useState<{ [key: string]: string }>({});
  const [selectedOrder, setSelectedOrder] = useState<string[]>([]); // Track selection order
  const [filterOptions, setFilterOptions] = useState<{ searchTerm: string }>({
    searchTerm: "",
  });
  const [, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
  const [hasPendingRequest, setHasPendingRequest] = useState(true);
  const [pendingRequestData, setPendingRequestData] = useState<any>(null);
  const [hasActiveLiquidation, setHasActiveLiquidation] = useState(false);
  const [activeLiquidationData, setActiveLiquidationData] = useState<any>(null);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showRequirementsDialog, setShowRequirementsDialog] = useState(false);
  const [currentPriorityRequirements, setCurrentPriorityRequirements] =
    useState<string[]>([]);
  const [currentPriorityTitle, setCurrentPriorityTitle] = useState("");
  const [allocatedBudget, setAllocatedBudget] = useState<number>(0);
  const [hasPastLiquidation, setHasPastLiquidation] = useState(false);
  const [expenseToRemove, setExpenseToRemove] = useState<string | null>(null);
  const [showClearAllDialog, setShowClearAllDialog] = useState(false);
  const [lastRequestId, setLastRequestId] = useState<string | null>(null);
  const [isAdvanceRequest, setIsAdvanceRequest] = useState(false);
  const [targetMonth, setTargetMonth] = useState("");
  const [showTermsDialog, setShowTermsDialog] = useState(false);

  // State for submit confirmation dialog
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);

  // State for selecting all in a category
  const [categoryToSelect, setCategoryToSelect] = useState<string | null>(null);

  // Function to select all items in a category
  const doCategorySelectAll = (category: string) => {
    if (!category) return;
    const items = categories[category]?.filter(
      (p) => selected[p.expenseTitle] === undefined
    );
    if (items && items.length > 0) {
      setSelected((prev) => {
        const updated = { ...prev };
        items.forEach((p) => {
          updated[p.expenseTitle] = "";
        });
        return updated;
      });
      setSelectedOrder((prevOrder) => [
        ...items.map((p) => p.expenseTitle),
        ...prevOrder,
      ]);
    }
    setCategoryToSelect(null);
  };

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
      setSelectedOrder(
        location.state.priorities.map((p: any) => p.priority.expenseTitle)
      );
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
        const activeLOPs = data.filter((p: ListOfPriority) => p.is_active); // Only active LOPs
        setPriorities(activeLOPs);

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

  // Fetch school monthly budget on mount
  useEffect(() => {
    const fetchSchoolBudget = async () => {
      try {
        const userRes = await api.get("/users/me/");
        const schoolId = userRes.data.school?.schoolId;
        if (!schoolId) {
          setAllocatedBudget(0);
          return;
        }
        const schoolRes = await api.get(`/schools/${schoolId}/`);
        setAllocatedBudget(Number(schoolRes.data.current_monthly_budget) || 0);
      } catch (error) {
        setAllocatedBudget(0);
        console.error("Failed to fetch allocated budget:", error);
      }
    };
    fetchSchoolBudget();
  }, []);

  const isFormDisabled = hasPendingRequest || hasActiveLiquidation;
  useEffect(() => {
    const fetchNextMonth = async () => {
      try {
        const response = await api.get("requests/next-available-month/");
        setTargetMonth(response.data.next_available_month);
        setIsAdvanceRequest(response.data.is_advance_request);
      } catch (error) {
        console.error("Failed to fetch next available month:", error);
      }
    };

    if (!isFormDisabled) {
      fetchNextMonth();
    }
  }, [isFormDisabled]);
  // Update handleCheck to track selection order
  const handleCheck = (expense: string) => {
    setSelected((prev) => {
      if (expense in prev) {
        setSelectedOrder((prevOrder) =>
          prevOrder.filter((item) => item !== expense)
        );
        const { [expense]: _, ...rest } = prev;
        return rest;
      } else {
        setSelectedOrder((prevOrder) => [expense, ...prevOrder]);
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
    const cleanValue = value.replace(/[^0-9.]/g, "");

    if (cleanValue === "") {
      setSelected((prev) => ({ ...prev, [expense]: "" }));
      return;
    }

    if (!isNaN(Number(cleanValue)) && Number(cleanValue) >= 0) {
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

  const totalAmount = Object.values(selected).reduce(
    (sum, amount) => sum + (amount ? Number(amount.replace(/,/g, "")) : 0),
    0
  );

  const selectedPriorities = Object.entries(selected)
    .map(([expenseTitle, amount]) => {
      const priority = priorities.find((p) => p.expenseTitle === expenseTitle);
      return priority
        ? { LOPID: priority.LOPID.toString(), amount: amount.replace(/,/g, "") }
        : null;
    })
    .filter(Boolean) as { LOPID: string; amount: string }[];

  const [copyLoading, setCopyLoading] = useState(false);

  const handleCopyPrevious = async () => {
    setCopyLoading(true);
    try {
      const res = await api.get("last-liquidated-request/");
      if (res.data && res.data.priorities) {
        // Pre-fill selected expenses
        const initialSelected = {} as { [key: string]: string };
        res.data.priorities.forEach(
          (p: { expenseTitle: string; amount: string }) => {
            initialSelected[p.expenseTitle] = p.amount;
          }
        );
        setSelected(initialSelected);
        setSelectedOrder(
          res.data.priorities.map(
            (p: { expenseTitle: string; amount: string }) => p.expenseTitle
          )
        );
        setHasPastLiquidation(true); // Set to true since we found a past liquidation
        toast.success("Previous liquidated request copied!");
      }
    } catch (err) {
      setHasPastLiquidation(false); // Set to false if no past liquidation found
      toast.error("No previous liquidated request found!");
    } finally {
      setCopyLoading(false);
    }
  };
  const checkEligibility = async () => {
    try {
      const response = await api.get(
        `requests/check-eligibility/?month=${targetMonth}`
      );
      return response.data.can_submit_request;
    } catch (error) {
      console.error("Eligibility check failed:", error);
      return false;
    }
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setSubmitting(true);
    // Check eligibility first
    const canSubmit = await checkEligibility();
    if (!canSubmit) {
      toast.error("You are not eligible to submit a request at this time.");
      return;
    }
    try {
      // Get the next available month from the backend
      const nextMonthResponse = await api.get("requests/next-available-month/");
      const { next_available_month, is_advance_request } =
        nextMonthResponse.data;

      let requestId: string | null = null;
      if (location.state?.rejectedRequestId) {
        const res = await api.put(
          `requests/${location.state.rejectedRequestId}/resubmit/`,
          {
            priority_amounts: selectedPriorities,
            request_monthyear: next_available_month, // Add this
          }
        );
        requestId = res.data?.request_id || location.state.rejectedRequestId;
      } else {
        const res = await api.post("requests/", {
          priority_amounts: selectedPriorities,
          request_monthyear: next_available_month, // Use the backend-provided month
          notes: location.state?.rejectedRequestId
            ? `Resubmission of rejected request ${location.state.rejectedRequestId}`
            : undefined,
        });
        requestId = res.data?.request_id;
      }
      // Show appropriate message based on whether it's an advance request
      if (is_advance_request) {
        toast.success(
          `Advance request submitted for ${next_available_month}. It will become pending when the month arrives.`,
          { autoClose: 6000 }
        );
      } else {
        console.log("request submitted successfully");
      }

      setSelected({});
      setSelectedOrder([]);
      setLastRequestId(requestId || null);
      setShowSuccessDialog(true);

      setTimeout(() => {
        setShowSuccessDialog(false);
        navigate("/"); // Redirect to dashboard instead of history
      }, 4000);
    } catch (error: any) {
      console.error("Error:", error);
      const errorMessage =
        error.response?.data?.message ||
        "Failed to submit fund request. Please try again.";
      toast.error(errorMessage, { autoClose: 4000 });
    } finally {
      setSubmitting(false);
      setActionLoading(false);
    }
  };
  useEffect(() => {
    const checkPastLiquidation = async () => {
      try {
        console.log("Making request to:", api.defaults.baseURL + "last-liquidated-request/");
        const res = await api.get("last-liquidated-request/");
        console.log("Response received:", res);
        if (res.data && res.data.priorities) {
          setHasPastLiquidation(true);
        }
      } catch (err) {
        console.error("Error in checkPastLiquidation:", err);
        setHasPastLiquidation(false);
      }
    };
    checkPastLiquidation();
  }, []);
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

  const filteredExpenses = priorities.filter((priority) =>
    priority.expenseTitle
      .toLowerCase()
      .includes(filterOptions.searchTerm.toLowerCase())
  );

  // Group and sort priorities by category
  const categories = React.useMemo(() => {
    const map: { [cat: string]: ListofPriorityData[] } = {};
    priorities.forEach((p) => {
      if (!map[p.category]) map[p.category] = [];
      map[p.category].push(p);
    });

    // Sort each category's priorities alphabetically
    Object.keys(map).forEach((cat) => {
      map[cat].sort((a, b) => a.expenseTitle.localeCompare(b.expenseTitle));
    });

    return map;
  }, [priorities]);

  // Get sorted category keys
  const sortedCategoryKeys = Object.keys(categories).sort((a, b) =>
    (CATEGORY_LABELS[a] || a).localeCompare(CATEGORY_LABELS[b] || b)
  );

  // For pagination: get all category keys with unchecked items

  // Pagination logic

  // Show requirements for a priority
  const showRequirements = (expenseTitle: string) => {
    const priority = priorities.find((p) => p.expenseTitle === expenseTitle);

    if (priority && priority.requirements) {
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

  // Get selected items in the order they were selected
  const orderedSelectedItems = selectedOrder
    .filter((expense) => selected[expense] !== undefined)
    .map((expense) => ({
      expenseTitle: expense,
      amount: selected[expense],
    }));

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
  <DialogContent className="w-full max-w-sm rounded-xl bg-white dark:bg-gray-800 p-6 shadow-xl border-0">
    {/* Main Content Container */}
    <div className="flex flex-col items-center text-center space-y-4">
      
      {/* Animated Checkmark Icon */}
      <div className="relative mb-2">
        <div className="absolute inset-0 bg-green-100 dark:bg-green-900/20 rounded-full scale-110 animate-pulse"></div>
        <CheckCircle className="relative h-12 w-12 text-green-500 dark:text-green-400" />
      </div>

      {/* Header Section */}
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white leading-tight">
          Request Submitted!
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
          Your MOOE request was submitted successfully.
        </p>
      </div>

      {/* Request ID Section */}
      {lastRequestId && (
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg px-4 py-3 border border-gray-200 dark:border-gray-600">
          <span className="text-gray-700 dark:text-gray-200 text-sm">
            Request ID:&nbsp;
            <span className="font-mono font-semibold text-brand-600 dark:text-brand-400">
              {lastRequestId}
            </span>
          </span>
        </div>
      )}

      {/* Action Indicator */}
      <div className="pt-2">
        <div className="flex items-center justify-center space-x-1 text-xs text-gray-500 dark:text-gray-400">
          <span className="animate-pulse">•</span>
          <span>Redirecting to dashboard...</span>
        </div>
      </div>
    </div>

    {/* Animated Progress Bar */}
    <div className="mt-4 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
      <div 
        className="bg-green-500 h-1.5 rounded-full animate-[shrink_3s_linear_forwards]"
      ></div>
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
            {hasPendingRequest && pendingRequestData?.status === "advanced" && (
              <div className="flex gap-4 p-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-900/20">
                <div className="flex-shrink-0 p-2 rounded-md text-blue-600 dark:text-blue-400">
                  <Info className="h-5 w-5" />
                </div>
                <div className="space-y-2.5">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Advance Request Pending
                  </h3>
                  <div className="text-gray-600 dark:text-gray-300 text-sm">
                    <p>
                      You have an advance request for{" "}
                      <span className="font-semibold text-blue-600 dark:text-blue-400">
                        {pendingRequestData?.request_monthyear}
                      </span>
                      . It will become active when the month arrives.
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
  <DialogContent className="w-full sm:max-w-md xl:max-w-2xl rounded-lg flex flex-col overflow-y-auto">
    <div className="p-6 space-y-4">
      {/* Header with icon */}
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
          <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
        <h2 className="text-lg font-bold text-gray-800 dark:text-white">
          Confirm MOOE Request Submission
        </h2>
      </div>

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

{/* Agreement Section - Checkbox with Link */}
<div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/10 rounded-lg border border-amber-200 dark:border-amber-900/20">
  <input
    type="checkbox"
    id="mooe-agreement"
    checked={agreed}
    onChange={(e) => setAgreed(e.target.checked)}
    className="h-4 w-4 mt-1 text-brand-600 focus:ring-brand-500 border-gray-300 rounded"
  />
  <div className="flex-1">
    <label htmlFor="mooe-agreement" className="text-sm font-medium text-amber-800 dark:text-amber-200 cursor-pointer">
      I agree to the liquidation {" "}
      <button
        type="button"
        onClick={() => setShowTermsDialog(true)}
        className="text-brand-600 dark:text-brand-400 hover:underline font-medium"
      >
        Terms of Service
      </button>
    </label>
  </div>
</div>

{/* Terms of Service Dialog */}
<Dialog open={showTermsDialog} onOpenChange={setShowTermsDialog}>
  <DialogContent className="w-full max-w-[95vw] sm:max-w-2xl rounded-lg flex flex-col max-h-[90vh]">
    <DialogHeader>
      <DialogTitle className="text-xl">MOOE Request Terms of Service</DialogTitle>
      <DialogDescription className="text-base">
        Please read and understand the following terms and conditions regarding the MOOE request process.
      </DialogDescription>
    </DialogHeader>
    <div className="mt-4 max-h-[60vh] overflow-y-auto px-1">
      <div className="space-y-4 text-[1.1rem] text-gray-700 dark:text-gray-300">
        <p>
          By submitting this MOOE request, you acknowledge and consent to the following procedures:
        </p>
        <div className="space-y-3">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg">
            <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2 text-lg">Approval Process:</h4>
            <p>
              This request will be forwarded to the Division Superintendent for approval. Once approved, the Division Accountant will facilitate the release of funds, initiating a 30-day liquidation period.
            </p>
          </div>
          <div className="p-3 bg-amber-50 dark:bg-amber-900/10 rounded-lg">
            <h4 className="font-semibold text-amber-800 dark:text-amber-200 mb-2 text-lg">Liquidation Timeline:</h4>
            <p>
              Failure to submit the required liquidation documents within 30 days from the date of fund release will result in the issuance of a demand letter, requiring immediate compliance.
            </p>
          </div>
          <div className="p-3 bg-green-50 dark:bg-green-900/10 rounded-lg">
            <h4 className="font-semibold text-green-800 dark:text-green-200 mb-2 text-lg">Liquidation Review Process:</h4>
            <p>
              Once the liquidation report is prepared, it will undergo pre-audit by the District Administrative Assistant, followed by a review and approval process by the Division Liquidator. The finalization of liquidation will then be completed by the Division Accountant. Please note that no new MOOE requests may be submitted until this process is fully completed.
            </p>
          </div>
        </div>
        <div className="p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg mt-4">
          <p className="text-base text-gray-600 dark:text-gray-400">
            <strong>Note:</strong> By checking the agreement checkbox, you confirm that you have read, understood, and agreed to comply with these terms and conditions.
          </p>
        </div>
      </div>
    </div>
    <div className="mt-4 flex justify-end">
      <Button
        variant="primary"
        onClick={() => {
          setShowTermsDialog(false);
          setAgreed(true); // Check the agreement checkbox
        }}
      >
        I Understand
      </Button>
    </div>
  </DialogContent>
</Dialog>
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

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <Button
          variant="outline"
          onClick={() => {
            setShowSubmitDialog(false);
            setAgreed(false);
          }}
          className="px-4 py-2"
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={async () => {
            setShowSubmitDialog(false);
            await handleSubmit(new Event("submit") as any);
            setAgreed(false);
          }}
          disabled={
            actionLoading || submitting || totalAmount < allocatedBudget || !agreed
          }
          className="px-4 py-2"
        >
          {actionLoading || submitting ? (
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
        {!isFormDisabled && targetMonth && (
          <div className="mb-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-900/20 p-3">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm text-blue-800 dark:text-blue-200">
                {isAdvanceRequest ? (
                  <>
                    This will be an <strong>advance request</strong> for{" "}
                    <strong>{targetMonth}</strong>
                  </>
                ) : (
                  <>
                    Requesting for <strong>{targetMonth}</strong>
                  </>
                )}
              </span>
            </div>
            {isAdvanceRequest && (
              <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                This request will become pending when {targetMonth} arrives.
              </p>
            )}
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
                <div className="relative w-full flex-5/8">
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
                {!isFormDisabled && hasPastLiquidation && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleCopyPrevious}
                    className="w-full flex-3/8"
                    startIcon={<Copy className="h-4 w-4" />}
                    disabled={isFormDisabled || copyLoading}
                  >
                    {copyLoading ? "Loading..." : "Copy Previous Request"}
                  </Button>
                )}
              </div>

              {/* Enhanced Dropdown List */}
              <div className="space-y-3">
                {loading && (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-500 mb-3"></div>
                    <span className="text-gray-500">Loading expenses...</span>
                  </div>
                )}

                {fetchError && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-100 dark:border-red-900/20 text-red-600 dark:text-red-300 text-center">
                    <AlertTriangle className="h-5 w-5 mx-auto mb-2" />
                    {fetchError}
                  </div>
                )}

                {!loading && !fetchError && (
                  <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                    {sortedCategoryKeys.map((cat) => {
                      // Filter by search term as well as selection
                      const items = categories[cat].filter(
                        (p) =>
                          selected[p.expenseTitle] === undefined &&
                          p.expenseTitle
                            .toLowerCase()
                            .includes(filterOptions.searchTerm.toLowerCase())
                      );
                      if (items.length === 0) return null;

                      const allSelected = items.every(
                        (p) => selected[p.expenseTitle] !== undefined
                      );

                      return (
                        <Disclosure key={cat}>
                          {({ open }) => (
                            <div className="border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                              <Disclosure.Button className="flex items-center justify-between w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                <div className="flex items-center">
                                  <input
                                    type="checkbox"
                                    checked={allSelected}
                                    onChange={() => setCategoryToSelect(cat)}
                                    disabled={isFormDisabled}
                                    className={`h-5 w-5 rounded-full border-2 ${
                                      allSelected
                                        ? "border-brand-500 bg-brand-500"
                                        : "border-gray-300 dark:border-gray-600"
                                    } focus:ring-2 focus:ring-brand-500 outline-none transition-colors duration-150 ${
                                      isFormDisabled
                                        ? "cursor-not-allowed"
                                        : "cursor-pointer hover:border-brand-500"
                                    }`}
                                    style={{ position: "relative" }}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                  {allSelected && (
                                    <CheckCircle className="h-5 w-5 absolute left-0 top-0 text-white pointer-events-none" />
                                  )}
                                  <span className="ml-3 font-medium text-gray-800 dark:text-gray-200">
                                    {CATEGORY_LABELS[cat] || cat}
                                  </span>
                                </div>
                                <div className="flex items-center">
                                  <span className="text-xs text-gray-500 dark:text-gray-400 mr-2">
                                    {allSelected
                                      ? "All selected"
                                      : `${items.length} available`}
                                  </span>
                                  <ChevronDown
                                    className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${
                                      open ? "rotate-180 text-brand-500" : ""
                                    }`}
                                  />
                                </div>
                              </Disclosure.Button>
                              <Transition
                                enter="transition duration-100 ease-out"
                                enterFrom="transform opacity-0 -translate-y-2"
                                enterTo="transform opacity-100 translate-y-0"
                                leave="transition duration-75 ease-out"
                                leaveFrom="transform opacity-100 translate-y-0"
                                leaveTo="transform opacity-0 -translate-y-2"
                              >
                                <Disclosure.Panel className="px-4 pb-3">
                                  <div className="space-y-2 pl-8">
                                    {items.map((priority) => (
                                      <div
                                        key={priority.LOPID}
                                        className="flex items-center py-2 px-3 rounded-lg transition-colors hover:bg-brand-50/60 dark:hover:bg-brand-900/20 group"
                                      >
                                        <input
                                          type="checkbox"
                                          checked={
                                            selected[priority.expenseTitle] !==
                                            undefined
                                          }
                                          onChange={() =>
                                            handleCheck(priority.expenseTitle)
                                          }
                                          disabled={isFormDisabled}
                                          className={`h-5 w-5 rounded-full border-2 ${
                                            selected[priority.expenseTitle] !==
                                            undefined
                                              ? "border-brand-500 bg-brand-500"
                                              : "border-gray-300 dark:border-gray-600"
                                          } focus:ring-2 focus:ring-brand-500 outline-none transition-colors duration-150 ${
                                            isFormDisabled
                                              ? "cursor-not-allowed"
                                              : "cursor-pointer hover:border-brand-500"
                                          }`}
                                          style={{ position: "relative" }}
                                        />
                                        {selected[priority.expenseTitle] !==
                                          undefined && (
                                          <CheckCircle className="h-5 w-5 absolute left-0 top-0 text-white pointer-events-none" />
                                        )}
                                        <span className="ml-3 text-gray-700 dark:text-gray-300 flex-1">
                                          {priority.expenseTitle}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            showRequirements(
                                              priority.expenseTitle
                                            )
                                          }
                                          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-brand-500 transition-opacity"
                                          disabled={isFormDisabled}
                                        >
                                          <FileText className="h-4 w-4" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                </Disclosure.Panel>
                              </Transition>
                            </div>
                          )}
                        </Disclosure>
                      );
                    })}
                  </div>
                )}
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

                {/* Always show budget info at the top for consistent position/dimension */}
                <div className="p-4 pb-0">
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
                </div>

                {Object.keys(selected).length > 0 ? (
                  <>
                    <div className="p-4 pt-0">
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-gray-600 dark:text-gray-300">
                          {Object.keys(selected).length} item(s) selected
                        </span>
                        <span className="font-medium text-brand-600 dark:text-brand-400">
                          Total: ₱{totalAmount.toLocaleString()}
                        </span>
                      </div>
                      <div className="space-y-3 max-h-[400px] overflow-y-auto">
                        {orderedSelectedItems.map(
                          ({ expenseTitle, amount }) => {
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
                  <div className="p-8 text-center pt-0">
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
