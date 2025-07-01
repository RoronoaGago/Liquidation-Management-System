/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useRef, useEffect } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
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
import { Dialog, DialogContent } from "@/components/ui/dialog";
import api from "@/api/axios";

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

  const handleCheck = (expense: string) => {
    setSelected((prev) => {
      if (expense in prev) {
        const { [expense]: _, ...rest } = prev;
        return rest;
      } else {
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
      if (location.state?.rejectedRequestId) {
        // Resubmit existing request
        await api.put(
          `requests/${location.state.rejectedRequestId}/resubmit/`,
          {
            priority_amounts: selectedPriorities,
          }
        );
        toast.success("Resubmitted successfully!");
      } else {
        // Create new request
        await api.post("requests/", {
          priority_amounts: selectedPriorities,
          request_month: new Date().toLocaleString("default", {
            month: "long",
            year: "numeric",
          }),
          notes: location.state?.rejectedRequestId
            ? `Resubmission of rejected request ${location.state.rejectedRequestId}`
            : undefined,
        });
        toast.success("Fund request submitted successfully!");
      }

      setSelected({});
      // setShowSuccessDialog(true);

      // setTimeout(() => {
      //   setShowSuccessDialog(false);
      //   navigate("/requests-history");
      // }, 2500);
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
    if (itemsToCheck.length > 3) {
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

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="w-full max-w-md rounded-lg bg-white dark:bg-gray-800 p-0 overflow-hidden shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center">
          <div className="flex flex-col items-center py-8">
            <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Request Submitted!
            </h2>
            <p className="text-gray-600 dark:text-gray-300 text-center mb-2">
              Your MOOE request was submitted successfully.
              <br />
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
        <DialogContent className="max-w-md">
          <div className="p-6">
            <h2 className="text-lg font-bold mb-4">
              Required Documents for {currentPriorityTitle}
            </h2>
            {currentPriorityRequirements.length > 0 ? (
              <ul className="list-disc pl-5 space-y-2">
                {currentPriorityRequirements.map((req, index) => (
                  <li key={index} className="text-gray-700 dark:text-gray-300">
                    {req}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">
                No specific requirements for this priority.
              </p>
            )}
            <div className="flex justify-end mt-6">
              <Button
                variant="primary"
                onClick={() => setShowRequirementsDialog(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Status Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent
          className="[&>button]:hidden w-full max-w-md rounded-lg bg-white dark:bg-gray-800 p-0 overflow-hidden shadow-2xl sm:max-w-lg border border-gray-200 dark:border-gray-700"
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
        <DialogContent className="max-w-md">
          <div className="p-6">
            <h2 className="text-lg font-bold mb-2">Select All in Category</h2>
            <p>
              Are you sure you want to select all items under{" "}
              <span className="font-semibold">
                {CATEGORY_LABELS[categoryToSelect ?? ""] || categoryToSelect}
              </span>
              ?
            </p>
            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => setCategoryToSelect(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => doCategorySelectAll(categoryToSelect!)}
              >
                Yes, Select All
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Submit Confirmation Dialog */}
      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent className="max-w-md">
          <div className="p-6">
            <h2 className="text-lg font-bold mb-2">Confirm Submission</h2>
            <p className="mb-4">
              Are you sure you want to submit this MOOE request?
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowSubmitDialog(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={async () => {
                  setShowSubmitDialog(false);
                  await handleSubmit(new Event("submit") as any);
                }}
              >
                Confirm & Submit
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="mt-8">
        {!isFormDisabled && (
          <div className="mb-6 bg-brand-50 dark:bg-brand-900/10 p-4 rounded-lg border border-brand-100 dark:border-brand-900/20">
            <h3 className="text-lg font-medium text-brand-800 dark:text-brand-200 flex items-center gap-2 mb-2">
              <Info className="h-5 w-5" /> How to request MOOE (Maintenance and
              Other Operating Expenses)
            </h3>
            <ol className="list-decimal list-inside space-y-1 text-brand-700 dark:text-brand-300">
              <li>Select list of priorities by checking the boxes</li>
              <li>Enter amounts directly in the list</li>
              <li>Review your selections in the summary panel</li>
              <li>Click "Submit MOOE Request" when ready</li>
            </ol>
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
                                <div className="pr-2">
                                  <div className="truncate">{expenseTitle}</div>
                                  <div className="flex items-center mt-1">
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
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
                                <div className="flex items-center gap-2">
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
                                  <button
                                    type="button"
                                    onClick={() => handleCheck(expenseTitle)}
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
                          onClick={() => setSelected({})}
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
