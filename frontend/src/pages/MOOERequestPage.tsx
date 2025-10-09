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
import { Skeleton } from "antd";

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

// Utility function to format date from YYYY-MM format to "Month YYYY"
const formatDateToMonthYear = (dateString: string): string => {
  if (!dateString || dateString === "Unknown Period") return dateString;
  
  try {
    // Handle different possible formats
    let year: string, month: string;
    
    if (dateString.includes('-')) {
      // Format: YYYY-MM or MM-YYYY
      const parts = dateString.split('-');
      if (parts[0].length === 4) {
        // YYYY-MM format
        [year, month] = parts;
      } else {
        // MM-YYYY format
        [month, year] = parts;
      }
    } else if (dateString.length === 6) {
      // Format: YYYYMM or MMYYYY
      if (dateString.startsWith('20')) {
        // YYYYMM format
        year = dateString.substring(0, 4);
        month = dateString.substring(4, 6);
      } else {
        // MMYYYY format
        month = dateString.substring(0, 2);
        year = dateString.substring(2, 6);
      }
    } else if (dateString.length === 4) {
      // Handle YYYY format (assume current month)
      year = dateString;
      const currentMonth = new Date().getMonth() + 1;
      month = currentMonth.toString().padStart(2, '0');
    } else {
      return dateString; // Return as-is if format is not recognized
    }
    
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    
    const monthIndex = parseInt(month) - 1;
    if (monthIndex >= 0 && monthIndex < 12) {
      return `${monthNames[monthIndex]} ${year}`;
    }
    
    return dateString; // Return as-is if month is invalid
  } catch (error) {
    console.warn("Error formatting date:", dateString, error);
    return dateString; // Return as-is if parsing fails
  }
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
  const [budgetLoading, setBudgetLoading] = useState(true);
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
  const [successCountdown, setSuccessCountdown] = useState(4);
  const [showRequirementsDialog, setShowRequirementsDialog] = useState(false);
  const [currentPriorityRequirements, setCurrentPriorityRequirements] =
    useState<{requirementTitle: string; is_required: boolean}[]>([]);
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

  // State for budget exceed dialog
  const [showBudgetExceedDialog, setShowBudgetExceedDialog] = useState(false);

  // State for unused budget dialog
  const [showUnusedBudgetDialog, setShowUnusedBudgetDialog] = useState(false);

  // State for tracking empty inputs during submission
  const [emptyInputs, setEmptyInputs] = useState<Set<string>>(new Set());

  // State for minimum selection dialog
  const [showMinSelectionDialog, setShowMinSelectionDialog] = useState(false);

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

        // Debug: Log the pending request data structure
        if (pendingCheckResponse.data.pending_request) {
          console.log("Pending Request Data:", pendingCheckResponse.data.pending_request);
        }

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
      setBudgetLoading(true);
      try {
        const userRes = await api.get("/users/me/");
        const schoolId = userRes.data.school?.schoolId;
        if (!schoolId) {
          setAllocatedBudget(0);
          return;
        }
        const schoolRes = await api.get(`/schools/${schoolId}/`);
        const monthlyBudget = Number(schoolRes.data.current_monthly_budget) || 0;
        setAllocatedBudget(monthlyBudget);
        
        // Log budget information for debugging
        console.log("School budget info:", {
          schoolId,
          schoolName: schoolRes.data.schoolName,
          current_monthly_budget: schoolRes.data.current_monthly_budget,
          current_yearly_budget: schoolRes.data.current_yearly_budget,
          monthlyBudget
        });
        
        // Show warning if budget is 0
        if (monthlyBudget === 0) {
          toast.warning(
            "No budget allocation found for your school. Please contact the Division Accountant to set up your school's budget allocation.",
            { autoClose: 8000 }
          );
        }
      } catch (error) {
        setAllocatedBudget(0);
        console.error("Failed to fetch allocated budget:", error);
        toast.error("Failed to fetch school budget information. Please try again later.");
      } finally {
        setBudgetLoading(false);
      }
    };
    fetchSchoolBudget();
  }, []);

  const isFormDisabled = hasPendingRequest || hasActiveLiquidation || (budgetLoading ? false : allocatedBudget === 0);
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

  // Success dialog countdown timer
  useEffect(() => {
    if (showSuccessDialog) {
      setSuccessCountdown(4);
      const timer = setInterval(() => {
        setSuccessCountdown((prev) => {
          if (prev <= 1) {
            setShowSuccessDialog(false);
            navigate("/"); // Redirect to dashboard
            return 4;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [showSuccessDialog, navigate]);

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
    
    // Handle decimal values properly
    const number = Number(num);
    
    // If it's a valid number, format it with commas but preserve decimals
    if (number >= 0) {
      // Use toLocaleString to add commas, preserving decimal places
      return number.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
      });
    }
    
    return num;
  };

  const handleAmountChange = (expense: string, value: string) => {
    console.log("Input value:", value); // Debug log
    
    // Allow decimal values by keeping dots and numbers
    const cleanValue = value.replace(/[^0-9.]/g, "");
    console.log("Clean value:", cleanValue); // Debug log

    if (cleanValue === "") {
      setSelected((prev) => ({ ...prev, [expense]: "" }));
      return;
    }

    // Prevent multiple decimal points
    const parts = cleanValue.split(".");
    if (parts.length > 2) {
      console.log("Multiple decimal points detected"); // Debug log
      return; // Don't update if more than one decimal point
    }

    // Allow up to 2 decimal places
    if (parts.length === 2 && parts[1].length > 2) {
      console.log("Too many decimal places"); // Debug log
      return; // Don't update if more than 2 decimal places
    }

    // Allow decimal values - be more permissive
    if (cleanValue === "." || cleanValue.endsWith(".")) {
      console.log("Allowing decimal point"); // Debug log
      // Allow typing decimal point
      setSelected((prev) => ({ ...prev, [expense]: cleanValue }));
      return;
    }

    if (!isNaN(Number(cleanValue)) && Number(cleanValue) >= 0) {
      console.log("Valid number:", Number(cleanValue)); // Debug log
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
        setShowBudgetExceedDialog(true);
        return;
      }

      // Format with commas but preserve decimal places
      const formattedValue = formatNumberWithCommas(cleanValue);
      console.log("Formatted value:", formattedValue); // Debug log
      setSelected((prev) => ({ ...prev, [expense]: formattedValue }));
    } else {
      console.log("Invalid number or negative value"); // Debug log
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
          `Advance request submitted for ${formatDateToMonthYear(next_available_month)}. It will become pending when the month arrives.`,
          { autoClose: 6000 }
        );
      } else {
        console.log("request submitted successfully");
      }

      setSelected({});
      setSelectedOrder([]);
      setLastRequestId(requestId || null);
      setShowSuccessDialog(true);
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
      const requirementData = priority.requirements
        .filter(
          (
            req
          ): req is {
            requirementID: number;
            requirementTitle: string;
            is_required: boolean;
          } => "requirementTitle" in req
        )
        .map((req) => ({
          requirementTitle: req.requirementTitle,
          is_required: req.is_required
        }));

      setCurrentPriorityRequirements(requirementData);
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

  // Show skeleton loading when either priorities or budget is loading
  if (loading || budgetLoading) {
    return (
      <div className="container mx-auto rounded-2xl bg-white px-5 pb-5 pt-5 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
        {/* Page Header Skeleton */}
        <div className="mb-8">
          <Skeleton active paragraph={{ rows: 1 }} />
        </div>

        {/* Guide Section Skeleton */}
        <div className="mb-6">
          <Skeleton active paragraph={{ rows: 2 }} />
        </div>

        {/* Main Content Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column - Expense List Skeleton */}
          <div>
            {/* Search and Copy Button Skeleton */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-6">
              <div className="relative w-full flex-5/8">
                <Skeleton.Input active style={{ width: '100%', height: 40 }} />
              </div>
              <div className="w-full flex-3/8">
                <Skeleton.Button active style={{ width: '100%', height: 40 }} />
              </div>
            </div>

            {/* Expense Categories Skeleton */}
            <div className="space-y-3">
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                {[1, 2, 3, 4].map((item) => (
                  <div key={item} className="border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Skeleton.Avatar active size="small" />
                          <div className="ml-3">
                            <Skeleton active paragraph={{ rows: 1 }} />
                          </div>
                        </div>
                        <Skeleton.Button active size="small" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Summary Panel Skeleton */}
          <div className="sticky top-4 h-fit">
            <div className="border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 overflow-hidden">
              {/* Header Skeleton */}
              <div className="bg-gray-50 dark:bg-gray-700/50 px-4 py-3 border-b border-gray-300 dark:border-gray-600">
                <Skeleton active paragraph={{ rows: 1 }} />
              </div>

              {/* Budget Info Skeleton */}
              <div className="p-4 pb-0">
                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-900/20">
                  <Skeleton active paragraph={{ rows: 2 }} />
                </div>
              </div>

              {/* Summary Content Skeleton */}
              <div className="p-8 text-center">
                <div className="mx-auto w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                  <Skeleton.Avatar active size="large" />
                </div>
                <Skeleton active paragraph={{ rows: 2 }} />
              </div>

              {/* Action Buttons Skeleton */}
              <div className="p-4 border-t border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50">
                <div className="flex justify-between items-center">
                  <Skeleton.Button active size="small" />
                  <Skeleton.Button active size="default" style={{ minWidth: 180 }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
                MOOE Request Submitted Successfully
              </h2>
              <div className="w-20 h-1 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full mx-auto"></div>
              <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed max-w-md">
                Your MOOE request was submitted successfully and is now being processed.
              </p>
            </div>

            {/* Request ID Section with Enhanced Design */}
            {lastRequestId && (
              <div className="bg-green-50 dark:bg-green-900/20 rounded-xl px-6 py-4 border border-green-200 dark:border-green-800 mb-6 w-full max-w-sm">
                <div className="flex items-center justify-center space-x-2">
                  <span className="text-sm font-medium text-green-700 dark:text-green-300">
                    Request ID:
                  </span>
                  <span className="font-mono font-bold text-green-800 dark:text-green-200 bg-green-100 dark:bg-green-800/50 px-3 py-1 rounded-lg text-sm">
                    {lastRequestId}
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

      {/* Requirements Dialog */}
      <Dialog
        open={showRequirementsDialog}
        onOpenChange={setShowRequirementsDialog}
      >
        <DialogContent className="w-full max-w-[95vw] sm:max-w-lg lg:max-w-xl flex flex-col max-h-[90vh]">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-white">
              Document Requirements
            </DialogTitle>
            <DialogDescription className="text-base text-gray-600 dark:text-gray-300 mt-1">
              For: <span className="font-medium text-gray-800 dark:text-gray-200">{currentPriorityTitle}</span>
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden">
            {currentPriorityRequirements.length > 0 ? (
              <div className="relative">
                {/* Scrollable content with gradient fade indicators */}
                <div className="max-h-[50vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
                  <div className="space-y-4">
                    {currentPriorityRequirements.map((req, index) => {
                      const isRequired = req.is_required;
                      return (
                        <div
                          key={index}
                          className="group relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600"
                        >
                          <div className="flex items-start gap-4">
                            {/* Icon with better styling */}
                            <div className="flex-shrink-0 p-2 rounded-lg bg-gray-100 dark:bg-gray-700 group-hover:bg-gray-200 dark:group-hover:bg-gray-600 transition-colors">
                              <DocumentTextIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                            </div>
                            
                            {/* Content area */}
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-base font-medium text-gray-900 dark:text-white leading-relaxed break-words">
                                    {req.requirementTitle}
                                  </h4>
                                  <div className="mt-2 flex items-center gap-2">
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                                      </svg>
                                      PDF format
                                    </span>
                                  </div>
                                </div>
                                
                                {/* Status badge */}
                                <div className="flex-shrink-0">
                                  {isRequired ? (
                                    <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200 border border-red-200 dark:border-red-800">
                                      <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                      </svg>
                                      Required
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200 border border-blue-200 dark:border-blue-800">
                                      <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                      </svg>
                                      Optional
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                {/* Bottom gradient fade for scroll indication */}
                <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-white dark:from-gray-800 to-transparent pointer-events-none"></div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                  <DocumentTextIcon className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No Requirements
                </h3>
                <p className="text-gray-500 dark:text-gray-400 text-center max-w-sm">
                  This expense item doesn't have any specific document requirements.
                </p>
              </div>
            )}
          </div>
          
          {/* Footer with close button */}
          <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700 mt-4">
            <Button
              variant="outline"
              onClick={() => setShowRequirementsDialog(false)}
              className="px-6 py-2"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Status Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent
          className="[&>button]:hidden w-full max-w-[95vw] rounded-lg bg-white dark:bg-gray-800 p-0 overflow-hidden shadow-2xl sm:max-w-2xl border border-gray-200 dark:border-gray-700 flex flex-col max-h-[90vh]"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <div className="bg-gradient-to-r from-blue-50 to-gray-50 dark:from-gray-700 dark:to-gray-800 px-6 py-6 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-100/80 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                <Info className="h-7 w-7" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Request Status Information
                </h2>
                <p className="text-base text-gray-600 dark:text-gray-300 mt-1">
                  Current request status and next steps
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6 px-6 py-6">
            {hasPendingRequest && (
              <div className="bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-200 dark:border-blue-900/20 shadow-sm overflow-hidden">
                {/* Header Section */}
                <div className="flex items-center gap-4 p-5 bg-blue-100/50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-900/30">
                  <div className="flex-shrink-0 p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                    <Info className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 dark:text-white text-lg">
                      Active MOOE Request
                    </h3>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-blue-200 text-blue-800 dark:bg-blue-800/50 dark:text-blue-200 mt-1">
                      Currently processing
                    </span>
                  </div>
                </div>
                
                {/* Content Section */}
                <div className="p-5">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
                      <p className="text-gray-700 dark:text-gray-300 text-base leading-relaxed">
                        You currently have an active MOOE request that needs to be{" "}
                        <span className="font-bold text-blue-600 dark:text-blue-400">
                          liquidated first
                        </span>{" "}
                        before submitting a new request.
                      </p>
                    </div>
                    
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          Current Request Details:
                        </span>
                      </div>
                      <div className="ml-4 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-400 min-w-[80px]">
                            Request ID:
                          </span>
                          <span className="font-mono font-bold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded border text-sm">
                            {pendingRequestData?.request_id || "N/A"}
                          </span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-400 min-w-[80px]">
                            Period:
                          </span>
                          <span className="font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-md text-sm">
                            {formatDateToMonthYear(
                              pendingRequestData?.request_month || 
                              pendingRequestData?.request_monthyear || 
                              pendingRequestData?.month || 
                              pendingRequestData?.period || 
                              "Unknown Period"
                            )}
                          </span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-400 min-w-[80px]">
                            Status:
                          </span>
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 capitalize">
                            {pendingRequestData?.status?.replace(/_/g, " ") || "Pending"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-amber-50 dark:bg-amber-900/10 rounded-lg p-4 border border-amber-200 dark:border-amber-900/20">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <h4 className="font-semibold text-amber-800 dark:text-amber-200 text-sm mb-1">
                            Next Steps Required:
                          </h4>
                          <p className="text-amber-700 dark:text-amber-300 text-sm leading-relaxed">
                            To submit a new MOOE request, you must first complete the liquidation process for your current request. 
                  
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {hasPendingRequest && pendingRequestData?.status === "advanced" && (
              <div className="flex gap-5 p-5 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-200 dark:border-green-900/20 shadow-sm">
                <div className="flex-shrink-0 p-3 rounded-lg bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400">
                  <Info className="h-6 w-6" />
                </div>
                <div className="space-y-3">
                  <h3 className="font-bold text-gray-900 dark:text-white text-lg">
                    Advance Request Scheduled
                  </h3>
                  <div className="text-gray-700 dark:text-gray-300 text-base leading-relaxed">
                    <p>
                      You have an advance request scheduled for{" "}
                      <span className="font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded">
                        {formatDateToMonthYear(pendingRequestData?.request_monthyear || "")}
                      </span>
                      . It will become active when the month arrives.
                    </p>
                  </div>
                </div>
              </div>
            )}
            {hasActiveLiquidation && (
              <div className="flex gap-5 p-5 bg-amber-50 dark:bg-amber-900/10 rounded-lg border border-amber-200 dark:border-amber-900/20 shadow-sm">
                <div className="flex-shrink-0 p-3 rounded-lg bg-amber-100 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <div className="space-y-3">
                  <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-3 text-lg">
                    Liquidation in Progress
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                      Processing
                    </span>
                  </h3>
                  <div className="text-gray-700 dark:text-gray-300 text-base space-y-3 leading-relaxed">
                    <p>
                      Your liquidation process is currently being reviewed. Request ID:{" "}
                      <span className="font-mono font-bold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded border">
                        {activeLiquidationData?.request?.request_id}
                      </span>
                    </p>
                    <div className="space-y-2">
                      <p>
                        Current status:{" "}
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-brand-100 dark:bg-brand-900/30 text-brand-800 dark:text-brand-200 capitalize">
                          {activeLiquidationData?.status?.replace(/_/g, " ")}
                        </span>
                      </p>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/10 rounded-lg p-3 border border-blue-200 dark:border-blue-900/20">
                      <p className="text-blue-700 dark:text-blue-300 text-sm">
                        Once the liquidation is finalized by the Division Accountant, you'll be able to submit new requests.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-gray-50 dark:bg-gray-700/50 px-6 py-5 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
            <div></div>
            <Button
              variant="primary"
              onClick={handleNavigation}
              className="px-6 py-3 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 dark:from-brand-700 dark:to-brand-600 dark:hover:from-brand-800 dark:hover:to-brand-700 text-white shadow-sm text-base font-semibold"
            >
              View Full Details
              <ArrowRight className="h-5 w-5 ml-2" />
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
  <DialogContent className="w-full max-w-[95vw] sm:max-w-4xl rounded-lg flex flex-col overflow-y-auto max-h-[90vh]">
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

      {/* Request Information & Budget Summary */}
      <div className="p-3 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-100 dark:border-green-900/20">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-green-800 dark:text-green-200">
            Requesting for:
          </span>
          <span className="font-bold text-green-800 dark:text-green-200">
            {formatDateToMonthYear(targetMonth)}
          </span>
        </div>
        {isAdvanceRequest && (
          <div className="flex justify-between items-center mt-1">
            <span className="text-sm font-medium text-green-800 dark:text-green-200">
              Request Type:
            </span>
            <span className="font-bold text-green-800 dark:text-green-200">
              Advance Request
            </span>
          </div>
        )}
        <div className="flex justify-between items-center mt-1">
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

      {/* Selected Items Summary */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Selected Expenses ({Object.keys(selected).length}):
        </h3>
        <div className="max-h-[50vh] overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-md">
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {Object.entries(selected).map(([expenseTitle, amount]) => (
              <li key={expenseTitle} className="px-4 py-3">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-gray-700 dark:text-gray-300 block leading-relaxed">
                      {expenseTitle}
                    </span>
                  </div>
                  <div className="flex-shrink-0">
                    <span className="text-sm font-mono font-medium text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                      ₱{amount || "0"}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
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
  <DialogContent className="w-full max-w-[95vw] sm:max-w-4xl lg:max-w-5xl rounded-lg flex flex-col max-h-[95vh]">
    <DialogHeader>
      <DialogTitle className="text-2xl font-bold">MOOE Request Terms of Service</DialogTitle>
      <DialogDescription className="text-lg">
        Please read and understand the following terms and conditions regarding the MOOE request process.
      </DialogDescription>
    </DialogHeader>
    <div className="mt-6 max-h-[70vh] overflow-y-auto px-2">
      <div className="space-y-6 text-lg text-gray-700 dark:text-gray-300 leading-relaxed">
        <p className="text-xl font-medium">
          By submitting this MOOE request, you acknowledge and consent to the following procedures:
        </p>
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-200 dark:border-blue-900/20">
            <h4 className="font-bold text-blue-800 dark:text-blue-200 mb-3 text-xl">Approval Process:</h4>
            <p className="text-lg leading-relaxed">
              This request will be forwarded to the Division Superintendent for approval. Once approved, the Division Accountant will facilitate the release of funds, initiating a 30-day liquidation period.
            </p>
          </div>
          <div className="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-lg border border-amber-200 dark:border-amber-900/20">
            <h4 className="font-bold text-amber-800 dark:text-amber-200 mb-3 text-xl">Liquidation Timeline:</h4>
            <p className="text-lg leading-relaxed">
              Failure to submit the required liquidation documents within 30 days from the date of fund release will result in the issuance of a demand letter, requiring immediate compliance.
            </p>
          </div>
          <div className="p-4 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-200 dark:border-green-900/20">
            <h4 className="font-bold text-green-800 dark:text-green-200 mb-3 text-xl">Liquidation Review Process:</h4>
            <p className="text-lg leading-relaxed">
              Once the liquidation report is prepared, it will undergo pre-audit by the District Administrative Assistant, followed by a review and approval process by the Division Liquidator. The finalization of liquidation will then be completed by the Division Accountant. Please note that no new MOOE requests may be submitted until this process is fully completed.
            </p>
          </div>
        </div>
        <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-gray-200 dark:border-gray-600">
          <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
            <strong className="text-gray-800 dark:text-gray-200">Note:</strong> By checking the agreement checkbox, you confirm that you have read, understood, and agreed to comply with these terms and conditions.
          </p>
        </div>
      </div>
    </div>
    <div className="mt-6 flex justify-end">
      <Button
        variant="primary"
        onClick={() => {
          setShowTermsDialog(false);
          setAgreed(true); // Check the agreement checkbox
        }}
        className="px-6 py-3 text-lg"
      >
        I Understand
      </Button>
    </div>
  </DialogContent>
</Dialog>

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

      {/* Budget Exceed Dialog */}
      <Dialog open={showBudgetExceedDialog} onOpenChange={setShowBudgetExceedDialog}>
        <DialogContent className="w-full max-w-sm rounded-xl bg-white dark:bg-gray-800 p-6 shadow-xl border-0">
          {/* Main Content Container */}
          <div className="flex flex-col items-center text-center space-y-4">
            
            {/* Warning Icon */}
            <div className="relative mb-2">
              <div className="absolute inset-0 bg-red-100 dark:bg-red-900/20 rounded-full scale-110 animate-pulse"></div>
              <AlertTriangle className="relative h-12 w-12 text-red-500 dark:text-red-400" />
            </div>

            {/* Header Section */}
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white leading-tight">
                Budget Exceeded
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                The total amount cannot exceed your allocated budget.
              </p>
            </div>

            {/* Budget Information */}
            <div className="bg-red-50 dark:bg-red-900/10 rounded-lg px-4 py-3 border border-red-200 dark:border-red-900/20 w-full">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-red-800 dark:text-red-200">
                    Allocated Budget:
                  </span>
                  <span className="font-bold text-red-800 dark:text-red-200">
                    ₱{allocatedBudget.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-red-800 dark:text-red-200">
                    Current Total:
                  </span>
                  <span className="font-bold text-red-800 dark:text-red-200">
                    ₱{totalAmount.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Message */}
            <div className="pt-2">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Please reduce the amount to stay within your budget limit.
              </p>
            </div>
          </div>

          {/* Action Button */}
          <div className="mt-6 flex justify-center">
            <Button
              variant="primary"
              onClick={() => setShowBudgetExceedDialog(false)}
              className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white"
            >
              I Understand
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Unused Budget Dialog */}
      <Dialog open={showUnusedBudgetDialog} onOpenChange={setShowUnusedBudgetDialog}>
        <DialogContent className="w-full max-w-sm rounded-xl bg-white dark:bg-gray-800 p-6 shadow-xl border-0">
          {/* Main Content Container */}
          <div className="flex flex-col items-center text-center space-y-4">
            
            {/* Info Icon */}
            <div className="relative mb-2">
              <div className="absolute inset-0 bg-blue-100 dark:bg-blue-900/20 rounded-full scale-110 animate-pulse"></div>
              <Info className="relative h-12 w-12 text-blue-500 dark:text-blue-400" />
            </div>

            {/* Header Section */}
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white leading-tight">
                Unused Budget Available
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                You have unused budget remaining. Are you sure you want to submit with this amount?
              </p>
            </div>

            {/* Budget Information */}
            <div className="bg-blue-50 dark:bg-blue-900/10 rounded-lg px-4 py-3 border border-blue-200 dark:border-blue-900/20 w-full">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                    Allocated Budget:
                  </span>
                  <span className="font-bold text-blue-800 dark:text-blue-200">
                    ₱{allocatedBudget.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                    Request Total:
                  </span>
                  <span className="font-bold text-blue-800 dark:text-blue-200">
                    ₱{totalAmount.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center border-t border-blue-200 dark:border-blue-800 pt-2">
                  <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                    Unused Budget:
                  </span>
                  <span className="font-bold text-blue-800 dark:text-blue-200">
                    ₱{(allocatedBudget - totalAmount).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Message */}
            <div className="pt-2">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                You can add more expenses or increase amounts to utilize your full budget.
              </p>
            </div>
          </div>

          {/* Action Button */}
          <div className="mt-6 flex justify-center">
            <Button
              variant="primary"
              onClick={() => setShowUnusedBudgetDialog(false)}
              className="px-6 py-2"
            >
              Go Back
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Minimum Selection Dialog */}
      <Dialog open={showMinSelectionDialog} onOpenChange={setShowMinSelectionDialog}>
        <DialogContent className="w-full max-w-sm rounded-xl bg-white dark:bg-gray-800 p-6 shadow-xl border-0">
          {/* Main Content Container */}
          <div className="flex flex-col items-center text-center space-y-4">
            
            {/* Warning Icon */}
            <div className="relative mb-2">
              <div className="absolute inset-0 bg-amber-100 dark:bg-amber-900/20 rounded-full scale-110 animate-pulse"></div>
              <AlertTriangle className="relative h-12 w-12 text-amber-500 dark:text-amber-400" />
            </div>

            {/* Header Section */}
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white leading-tight">
                Minimum Selection Required
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                You must select at least 2 expense items to submit a MOOE request.
              </p>
            </div>

            {/* Current Selection Info */}
            <div className="bg-amber-50 dark:bg-amber-900/10 rounded-lg px-4 py-3 border border-amber-200 dark:border-amber-900/20 w-full">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    Currently Selected:
                  </span>
                  <span className="font-bold text-amber-800 dark:text-amber-200">
                    {Object.keys(selected).length} item(s)
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    Required Minimum:
                  </span>
                  <span className="font-bold text-amber-800 dark:text-amber-200">
                    2 items
                  </span>
                </div>
              </div>
            </div>

            {/* Action Message */}
            <div className="pt-2">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Please select at least one more expense item from the list to continue.
              </p>
            </div>
          </div>

          {/* Action Button */}
          <div className="mt-6 flex justify-center">
            <Button
              variant="primary"
              onClick={() => setShowMinSelectionDialog(false)}
              className="px-6 py-2 bg-amber-600 hover:bg-amber-700 text-white"
            >
              I Understand
            </Button>
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
                              +5k/+10k buttons
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
                    <strong>{formatDateToMonthYear(targetMonth)}</strong>
                  </>
                ) : (
                  <>
                    Requesting for <strong>{formatDateToMonthYear(targetMonth)}</strong>
                  </>
                )}
              </span>
            </div>
            {isAdvanceRequest && (
              <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                This request will become pending when {formatDateToMonthYear(targetMonth)} arrives.
              </p>
            )}
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            // Clear previous empty input tracking
            setEmptyInputs(new Set());
            
            // Check minimum selection requirement
            if (Object.keys(selected).length < 2) {
              setShowMinSelectionDialog(true);
              return;
            }
            
            // Check for empty amounts and track them
            const emptyAmounts = Object.entries(selected).filter(
              ([, amount]) => !amount || amount === "0"
            );
            
            if (emptyAmounts.length > 0) {
              // Track empty inputs for visual validation
              const emptyInputSet = new Set(emptyAmounts.map(([expense]) => expense));
              setEmptyInputs(emptyInputSet);
              
              // Show toast for empty inputs
              toast.error("Please enter amounts for all selected expenses.");
              return;
            }
            
            // Check budget exceed
            if (totalAmount > allocatedBudget) {
              toast.error(
                `Total amount cannot exceed allocated budget of ₱${allocatedBudget.toLocaleString()}`
              );
              return;
            }
            
            // Check for unused budget (show modal if there's significant unused budget)
            const unusedBudget = allocatedBudget - totalAmount;
            const unusedPercentage = (unusedBudget / allocatedBudget) * 100;
            
            if (unusedPercentage > 10) { // Show modal if more than 10% of budget is unused
              setShowUnusedBudgetDialog(true);
            } else {
              setShowSubmitDialog(true);
            }
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
                  {budgetLoading ? (
                    <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-900/20">
                      <Skeleton active paragraph={{ rows: 2 }} />
                    </div>
                  ) : allocatedBudget === 0 ? (
                    <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-100 dark:border-red-900/20">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                        <span className="text-sm font-medium text-red-800 dark:text-red-200">
                          No Budget Allocation
                        </span>
                      </div>
                      <div className="text-xs text-red-700 dark:text-red-300">
                        Your school doesn't have a budget allocation for the current year. 
                        Please contact the Division Superintendent to set up your school's budget.
                      </div>
                    </div>
                  ) : (
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
                  )}
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
                                          (current + 10000).toString()
                                        );
                                      }}
                                      tabIndex={-1}
                                    >
                                      +10k
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
                                          (current + 5000).toString()
                                        );
                                      }}
                                      tabIndex={-1}
                                    >
                                      +5k
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
                                      onChange={(e) => {
                                        handleAmountChange(
                                          expenseTitle,
                                          e.target.value
                                        );
                                        // Clear empty input validation when user starts typing
                                        if (emptyInputs.has(expenseTitle)) {
                                          setEmptyInputs(prev => {
                                            const newSet = new Set(prev);
                                            newSet.delete(expenseTitle);
                                            return newSet;
                                          });
                                        }
                                      }}
                                      disabled={isFormDisabled}
                                      className={`w-full pl-6 pr-2 py-1 text-sm border rounded focus:border-brand-500 focus:ring-brand-500 dark:bg-gray-700 dark:text-white ${
                                        emptyInputs.has(expenseTitle)
                                          ? "border-red-500 bg-red-50 dark:bg-red-900/10"
                                          : "border-gray-300 dark:border-gray-600"
                                      } ${
                                        isFormDisabled
                                          ? "opacity-50 cursor-not-allowed"
                                          : ""
                                      }`}
                                      placeholder={emptyInputs.has(expenseTitle) ? "Required" : "0.00"}
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                    {emptyInputs.has(expenseTitle) && (
                                      <div className="absolute -bottom-5 left-0 text-xs text-red-500 whitespace-nowrap">
                                        Cannot be empty
                                      </div>
                                    )}
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
                            ) : hasActiveLiquidation ? (
                              "Liquidation in Progress"
                            ) : allocatedBudget === 0 ? (
                              "No Budget Allocation"
                            ) : (
                              "Form Disabled"
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
