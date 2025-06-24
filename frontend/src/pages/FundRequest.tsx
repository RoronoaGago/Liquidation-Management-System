import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
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
} from "lucide-react";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import { ListofPriorityData } from "@/lib/types";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Link } from "react-router";
import {
  DialogContent,
  DialogTitle,
  Dialog,
  DialogHeader,
} from "@/components/ui/dialog";

axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);
const FundRequestPage = () => {
  const [priorities, setPriorities] = useState<ListofPriorityData[]>([]);
  const [selected, setSelected] = useState<{ [key: string]: string }>({});
  const [filterOptions, setFilterOptions] = useState<{ searchTerm: string }>({
    searchTerm: "",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
  const [hasPendingRequest, setHasPendingRequest] = useState(true);
  const [pendingRequestData, setPendingRequestData] = useState<any>(null);
  const [hasActiveLiquidation, setHasActiveLiquidation] = useState(false);
  const [activeLiquidationData, setActiveLiquidationData] = useState<any>(null);
  const [showStatusDialog, setShowStatusDialog] = useState(false);

  // Fetch priorities from backend
  // Update your useEffect
  // Update your useEffect
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setFetchError(null);
      try {
        const token = localStorage.getItem("access_token");

        // Fetch priorities
        const prioritiesResponse = await axios.get(
          "http://127.0.0.1:8000/api/priorities/",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        // Check for pending requests/liquidations
        const pendingCheckResponse = await axios.get(
          "http://127.0.0.1:8000/api/check-pending-requests/",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = Array.isArray(prioritiesResponse.data)
          ? prioritiesResponse.data
          : prioritiesResponse.data.results || [];
        setPriorities(data);
        const hasPending = pendingCheckResponse.data.has_pending_request;
        const hasActive = pendingCheckResponse.data.has_active_liquidation;

        setHasPendingRequest(hasPending);
        setHasActiveLiquidation(hasActive);
        setPendingRequestData(pendingCheckResponse.data.pending_request);
        setActiveLiquidationData(pendingCheckResponse.data.active_liquidation);

        // Show dialog if there's a pending request or active liquidation
        if (hasPending || hasActive) {
          setShowStatusDialog(true);
        }
      } catch (error: any) {
        setFetchError("Failed to fetch data.");
        console.log("Error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);
  const isFormDisabled = hasPendingRequest || hasActiveLiquidation;
  const handleCheck = (expense: string) => {
    setSelected((prev) => {
      if (expense in prev) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [expense]: _, ...rest } = prev;
        return rest;
      } else {
        return { ...prev, [expense]: "" };
      }
    });
  };

  const handleAmountChange = (expense: string, value: string) => {
    // Only allow positive numbers
    if (value === "" || (!isNaN(Number(value)) && Number(value) >= 0)) {
      setSelected((prev) => ({ ...prev, [expense]: value }));
    }
  };

  const handleQuickAdd = (expense: string, amount: number) => {
    setSelected((prev) => ({
      ...prev,
      [expense]: prev[expense]
        ? String(Number(prev[expense]) + amount)
        : String(amount),
    }));
  };

  // Calculate total amount
  const totalAmount = Object.values(selected).reduce(
    (sum, amount) => sum + (amount ? Number(amount) : 0),
    0
  );

  // Map selected to [{ LOPID, amount }]
  const selectedPriorities = Object.entries(selected)
    .map(([expenseTitle, amount]) => {
      const priority = priorities.find((p) => p.expenseTitle === expenseTitle);
      return priority ? { LOPID: priority.LOPID, amount } : null;
    })
    .filter(Boolean);

  // Submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedPriorities.length === 0) {
      toast.error("Please select at least one expense.");
      return;
    }

    // Validate all amounts are filled
    const emptyAmounts = selectedPriorities.filter(
      (item) => item && (!item.amount || item.amount === "0")
    );
    if (emptyAmounts.length > 0) {
      toast.error("Please enter amounts for all selected expenses.");
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem("access_token");
      await axios.post(
        "http://127.0.0.1:8000/api/requests/",
        {
          priority_amounts: selectedPriorities,
          request_month: new Date().toLocaleString("default", {
            month: "long",
            year: "numeric",
          }),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      toast.success("Fund request submitted successfully!", {
        autoClose: 3000,
      });
      setSelected({});
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.log("Error:", error);
      if (error.response && error.response.status === 401) {
        toast.error("Unauthorized. Please log in again.", {
          autoClose: 4000,
        });
      } else {
        toast.error("Failed to submit fund request.", {
          autoClose: 4000,
        });
      }
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

  // Separate checked and unchecked items
  const checkedItems = filteredExpenses.filter(
    (priority) => selected[priority.expenseTitle] !== undefined
  );
  const uncheckedItems = filteredExpenses.filter(
    (priority) => selected[priority.expenseTitle] === undefined
  );

  // Combine checked (first) and unchecked items
  const sortedItems = [...checkedItems, ...uncheckedItems];

  // Pagination logic
  const totalPages = Math.ceil(sortedItems.length / itemsPerPage);
  const currentItems = sortedItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <div className="container mx-auto rounded-2xl bg-white px-5 pb-5 pt-5 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
      <PageBreadcrumb pageTitle="List of Priorities" />

      {/* Status Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent className="w-full max-w-md rounded-lg bg-white dark:bg-gray-800 p-6 shadow-xl sm:max-w-lg">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <AlertCircle className="h-6 w-6 text-yellow-500 dark:text-yellow-400" />
              <span>Action Required</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {hasPendingRequest && (
              <div className="p-4 bg-yellow-50/80 dark:bg-yellow-900/10 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5 text-yellow-500 dark:text-yellow-400">
                    ⚠️
                  </div>
                  <div>
                    <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2 text-base">
                      Pending MOOE Request
                    </h4>
                    <div className="text-yellow-700 dark:text-yellow-300 text-sm">
                      <p className="mb-2">
                        You{" "}
                        <span className="font-semibold underline">
                          cannot submit
                        </span>{" "}
                        a new request because you have:
                      </p>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>
                          An active request for{" "}
                          <span className="font-semibold">
                            {pendingRequestData?.request_month}
                          </span>
                        </li>
                        <li>This request must be completed first</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {hasActiveLiquidation && (
              <div className="p-4 bg-orange-50/80 dark:bg-orange-900/10 rounded-lg border border-orange-200 dark:border-orange-800">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5 text-orange-500 dark:text-orange-400">
                    ⚠️
                  </div>
                  <div>
                    <h4 className="font-medium text-orange-800 dark:text-orange-200 mb-2 text-base">
                      Active Liquidation Process
                    </h4>
                    <div className="text-orange-700 dark:text-orange-300 text-sm">
                      <p className="mb-2">
                        You{" "}
                        <span className="font-semibold underline">
                          cannot submit
                        </span>{" "}
                        a new request because:
                      </p>
                      <div className="space-y-1.5 pl-2">
                        <p className="flex gap-1.5">
                          <span>•</span>
                          <span>
                            Request ID:{" "}
                            <span className="font-mono font-semibold">
                              {activeLiquidationData?.request?.request_id}
                            </span>
                          </span>
                        </p>
                        <p className="flex gap-1.5">
                          <span>•</span>
                          <span>
                            Status:{" "}
                            <span className="capitalize font-medium bg-orange-100 dark:bg-orange-900/20 px-2 py-0.5 rounded text-sm">
                              {activeLiquidationData?.status?.replace(
                                /_/g,
                                " "
                              )}
                            </span>
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button variant="primary" className="mt-2">
                <Link
                  to="/liquidation"
                  className="flex items-center gap-1.5 text-white hover:text-white/90"
                >
                  View Liquidation Details
                  <ChevronRight className="h-4 w-4 ml-0.5" />
                </Link>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <div className="mt-8">
        {!isFormDisabled && (
          <div className="mb-6 bg-brand-50 dark:bg-brand-900/10 p-4 rounded-lg border border-brand-100 dark:border-brand-900/20">
            <h3 className="text-lg font-medium text-brand-800 dark:text-brand-200 flex items-center gap-2 mb-2">
              <Info className="h-5 w-5" /> How to request MOOE(Maintenance and
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

        <form onSubmit={handleSubmit}>
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
                    Items per page:
                  </label>
                  <select
                    value={itemsPerPage.toString()}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 h-11"
                  >
                    {[5, 10, 20, 50].map((num) => (
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
                {!loading && !fetchError && currentItems.length === 0 && (
                  <div className="col-span-2 text-gray-500 text-center py-8">
                    No expenses found matching your search.
                  </div>
                )}
                {!loading &&
                  !fetchError &&
                  currentItems.map((priority) => {
                    const isSelected =
                      selected[priority.expenseTitle] !== undefined;
                    return (
                      <div
                        key={priority.LOPID}
                        className={`p-4 rounded-lg border transition-all flex items-center justify-between group ${
                          isSelected
                            ? "border-brand-500 bg-brand-50 dark:bg-brand-900/20"
                            : "border-gray-200 hover:border-brand-400 dark:border-gray-700 dark:hover:border-brand-500"
                        }`}
                      >
                        <div className="flex items-center space-x-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleCheck(priority.expenseTitle)}
                            disabled={isFormDisabled}
                            className={`h-5 w-5 rounded border-gray-300 text-brand-600 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-700 transform group-hover:scale-110 transition-transform cursor-pointer ${
                              isFormDisabled
                                ? "opacity-50 cursor-not-allowed"
                                : ""
                            }`}
                          />
                          <span className="font-medium text-gray-700 dark:text-gray-300">
                            {priority.expenseTitle}
                          </span>
                        </div>

                        {isSelected && (
                          <div className="flex items-center gap-2">
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  handleQuickAdd(priority.expenseTitle, 1000)
                                }
                                className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                              >
                                +1000
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleQuickAdd(priority.expenseTitle, 500)
                                }
                                className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                              >
                                +500
                              </button>
                            </div>
                            <div className="relative w-32">
                              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                                ₱
                              </span>
                              <input
                                type="text"
                                value={selected[priority.expenseTitle] || ""}
                                onChange={(e) =>
                                  handleAmountChange(
                                    priority.expenseTitle,
                                    e.target.value
                                  )
                                }
                                disabled={isFormDisabled}
                                className={`w-full pl-8 pr-2 py-2 text-sm border border-gray-300 rounded focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white ${
                                  isFormDisabled
                                    ? "opacity-50 cursor-not-allowed"
                                    : ""
                                }`}
                                placeholder="0.00"
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>

              {/* Pagination */}
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Page {currentPage} of {totalPages} • {sortedItems.length}{" "}
                  total items
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    onClick={() => goToPage(1)}
                    disabled={currentPage === 1}
                    variant="outline"
                    size="sm"
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    variant="outline"
                    size="sm"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <Button
                          type="button"
                          key={pageNum}
                          onClick={() => goToPage(pageNum)}
                          variant={
                            currentPage === pageNum ? "primary" : "outline"
                          }
                          size="sm"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    type="button"
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages || totalPages === 0}
                    variant="outline"
                    size="sm"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    onClick={() => goToPage(totalPages)}
                    disabled={currentPage === totalPages || totalPages === 0}
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

                {checkedItems.length > 0 ? (
                  <>
                    <div className="p-4">
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-gray-600 dark:text-gray-300">
                          {checkedItems.length} item(s) selected
                        </span>
                        <span className="font-medium text-brand-600 dark:text-brand-400">
                          Total: ₱{totalAmount.toLocaleString()}
                        </span>
                      </div>

                      <div className="space-y-3 max-h-[400px] overflow-y-auto">
                        {checkedItems.map((priority) => (
                          <div
                            key={priority.LOPID}
                            className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg"
                          >
                            <div className="truncate pr-2">
                              {priority.expenseTitle}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                ₱{selected[priority.expenseTitle] || "0"}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  handleCheck(priority.expenseTitle)
                                }
                                className="text-gray-400 hover:text-red-500"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))}
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

export default FundRequestPage;
