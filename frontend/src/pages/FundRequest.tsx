import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Search, Info, X, Plus } from "lucide-react";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import { ListofPriorityData } from "@/lib/types";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import PaginationControls from "@/pages/ListofPriorityModule/PaginationControl";

const FundRequestPage = () => {
  const [priorities, setPriorities] = useState<ListofPriorityData[]>([]);
  const [selected, setSelected] = useState<{ [key: string]: string }>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  // Fetch priorities from backend
  useEffect(() => {
    const fetchPriorities = async () => {
      setLoading(true);
      setFetchError(null);
      try {
        const response = await axios.get(
          "http://127.0.0.1:8000/api/priorities/"
        );
        const data = Array.isArray(response.data)
          ? response.data
          : response.data.results || [];
        setPriorities(data);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (error: any) {
        setFetchError("Failed to fetch priorities.");
        console.log("Error fetching priorities:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPriorities();
  }, []);

  // Debounced search handler
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(() => {
      setSearchTerm(value);
      setCurrentPage(1);
    }, 200);
  };

  // Filter priorities based on searchTerm
  const filteredExpenses = priorities.filter((priority) =>
    priority.expenseTitle.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Separate checked and unchecked items
  const checkedItems = filteredExpenses.filter(
    (priority) => selected[priority.expenseTitle] !== undefined
  );
  const uncheckedItems = filteredExpenses.filter(
    (priority) => selected[priority.expenseTitle] === undefined
  );
  const sortedItems = [...checkedItems, ...uncheckedItems];

  // Pagination logic
  const totalPages = Math.ceil(sortedItems.length / itemsPerPage);
  const currentItems = sortedItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  // Selection logic
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

  return (
    <div className="container mx-auto rounded-2xl bg-white px-5 pb-5 pt-5 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
      <ToastContainer />
      <PageBreadcrumb pageTitle="List of Priorities" />

      <div className="mt-8">
        {/* Instructions */}
        <div className="mb-6 bg-blue-50 dark:bg-brand-900/10 p-4 rounded-lg border border-blue-100 dark:border-brand-900/20">
          <h3 className="text-lg font-medium text-brand-800 dark:text-blue-200 flex items-center gap-2 mb-2">
            <Info className="h-5 w-5" /> How to request MOOE (Maintenance and
            Other Operating Expenses)
          </h3>
          <ol className="list-decimal list-inside space-y-1 text-brand-700 dark:text-blue-300">
            <li>Select list of priorities by checking the boxes</li>
            <li>Enter amounts directly in the list</li>
            <li>Review your selections in the summary panel</li>
            <li>Click "Submit MOOE Request" when ready</li>
          </ol>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column - Expense List */}
            <div>
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-6">
                <div className="relative w-full">
                  <Input
                    type="text"
                    placeholder="Search expenses..."
                    value={searchTerm}
                    onChange={handleSearchChange}
                    className="pl-10"
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
                    className="px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 h-11"
                  >
                    {[5, 10, 20, 50].map((num) => (
                      <option key={num} value={num}>
                        Show {num}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Expense List as Cards */}
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
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                            : "border-gray-200 hover:border-blue-400 dark:border-gray-700 dark:hover:border-blue-500"
                        }`}
                      >
                        <div className="flex items-center space-x-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleCheck(priority.expenseTitle)}
                            className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 transform group-hover:scale-110 transition-transform cursor-pointer"
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
                                className="w-full pl-8 pr-2 py-2 text-sm border border-gray-300 rounded focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
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
                <PaginationControls
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={goToPage}
                />
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
                        <span className="font-medium text-blue-600 dark:text-blue-400">
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
                          disabled={submitting}
                          className="min-w-[180px]"
                        >
                          {submitting ? (
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
