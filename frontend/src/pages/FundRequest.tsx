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
} from "lucide-react";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import { ListofPriorityData } from "@/lib/types";
import { toast } from "react-hot-toast"; // or your preferred toast library

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
        // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
      } catch (error: any) {
        setFetchError("Failed to fetch priorities.");
        console.log("Error fetching priorities:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPriorities();
  }, []);

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
    setSelected((prev) => ({ ...prev, [expense]: value }));
  };

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
    setSubmitting(true);
    toast.loading("Submitting fund request...", { id: "fundreq" });
    try {
      // Get JWT token from localStorage or context
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
      toast.success("Fund request submitted successfully!", { id: "fundreq" });
      setSelected({});
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.log("Error:", error);
      if (error.response && error.response.status === 401) {
        toast.error("Unauthorized. Please log in again.", { id: "fundreq" });
      } else {
        toast.error("Failed to submit fund request.", { id: "fundreq" });
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

      <div className="mt-8">
        {/* New: Step-by-step instructions */}
        <div className="mb-6 bg-blue-50 dark:bg-brand-900/10 p-4 rounded-lg border border-blue-100 dark:border-brand-900/20">
          <h3 className="text-lg font-medium text-brand-800 dark:text-blue-200 flex items-center gap-2 mb-2">
            <Info className="h-5 w-5" /> How to request funds
          </h3>
          <ol className="list-decimal list-inside space-y-1 text-brand-700 dark:text-blue-300">
            <li>Select expenses by checking the boxes below</li>
            <li>Enter amounts for each selected expense</li>
            <li>Review your selections above</li>
            <li>Click "Submit Fund Request" when ready</li>
          </ol>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Selected Items with Submit Button - Enhanced */}
          {checkedItems.length > 0 ? (
            <div className="mb-6 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 px-4 py-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 gap-3">
                <h3 className="text-xl font-semibold text-gray-800 dark:text-white/90">
                  Selected Expenses ({checkedItems.length})
                </h3>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    onClick={() => setSelected({})}
                    variant="outline"
                    size="sm"
                    className="whitespace-nowrap"
                  >
                    Clear All
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={Object.keys(selected).length === 0 || submitting}
                  >
                    {submitting ? "Submitting..." : "Submit Fund Request"}
                  </Button>
                </div>
              </div>
              <hr className="border-t border-gray-300 dark:border-gray-600 mb-4" />
              <div className="space-y-3">
                <div className="grid grid-cols-12 gap-2 font-medium text-sm text-gray-500 dark:text-gray-400">
                  <div className="col-span-7">Expense Title</div>
                  <div className="col-span-3">Amount (₱)</div>
                  <div className="col-span-2">Action</div>
                </div>
                {checkedItems.map((priority) => (
                  <div
                    key={priority.LOPID}
                    className="grid grid-cols-12 gap-2 items-center py-2"
                  >
                    <div className="col-span-7 text-gray-700 dark:text-gray-300">
                      {priority.expenseTitle}
                    </div>
                    <div className="col-span-3">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                          ₱
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={selected[priority.expenseTitle] || ""}
                          onChange={(e) =>
                            handleAmountChange(
                              priority.expenseTitle,
                              e.target.value
                            )
                          }
                          className="w-full pl-8 pr-2 py-2 text-sm border border-gray-300 rounded focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                          required
                        />
                      </div>
                    </div>
                    <div className="col-span-2">
                      <Button
                        type="button"
                        onClick={() => handleCheck(priority.expenseTitle)}
                        variant="error"
                        size="sm"
                        className="w-full"
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="mb-6 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50 p-4 text-center text-gray-500 dark:text-gray-400">
              No expenses selected yet. Check items below to add them.
            </div>
          )}

          {/* Search and Pagination Controls - Enhanced */}
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-6">
            <div className="relative w-full">
              <Input
                type="text"
                placeholder="Search expenses..."
                value={filterOptions.searchTerm}
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
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
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

          {/* Expense List - Enhanced */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                const checkboxId = `${priority.expenseTitle}-${priority.LOPID}`;
                return (
                  <div
                    key={priority.LOPID}
                    className={`p-4 rounded-lg border transition-all cursor-pointer ${
                      selected[priority.expenseTitle] !== undefined
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                        : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
                    }`}
                    onClick={() => handleCheck(priority.expenseTitle)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          id={checkboxId}
                          checked={
                            selected[priority.expenseTitle] !== undefined
                          }
                          onChange={() => handleCheck(priority.expenseTitle)}
                          onClick={(e) => e.stopPropagation()}
                          className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                        />
                        <label
                          htmlFor={checkboxId}
                          className="text-gray-700 dark:text-gray-300 font-medium cursor-pointer h-5 flex items-center select-none"
                          style={{ lineHeight: "20px" }}
                        >
                          {priority.expenseTitle}
                        </label>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Pagination with chevrons and page numbers */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Page {currentPage} of {totalPages} • {sortedItems.length} total
              items
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
                      variant={currentPage === pageNum ? "primary" : "outline"}
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
        </form>
      </div>
    </div>
  );
};

export default FundRequestPage;
