import React, { useState, useRef, useEffect } from "react";
// import { toast } from "react-toastify";
import axios from "axios";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import { ListofPriorityData } from "@/lib/types";

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
        // Check if response.data is an array or object
        const data = Array.isArray(response.data)
          ? response.data
          : response.data.results || [];
        setPriorities(data);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
      } catch (error: any) {
        setFetchError("Failed to fetch priorities.");
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Submitted expenses:", selected);
    // toast.success("Fund request submitted successfully!")
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
      setCurrentPage(1); // Reset to first page when searching
    }, 10);
  };

  // Filter priorities based on searchTerm
  const filteredExpenses = priorities.filter((priority) =>
    priority.expenseTitle
      .toLowerCase()
      .includes(filterOptions.searchTerm.toLowerCase())
  );

  // Pagination logic
  const totalPages = Math.ceil(filteredExpenses.length / itemsPerPage);
  const currentItems = filteredExpenses.slice(
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
      <PageBreadcrumb pageTitle="Select List of Priorities" />

      <div className="mt-8">
        <form onSubmit={handleSubmit}>
          {/* Search and Pagination Controls */}
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-6">
            <div className="relative w-full md:w-64">
              <Input
                type="text"
                placeholder="Search expense..."
                value={filterOptions.searchTerm}
                onChange={handleSearchChange}
                className="pl-10"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>

            <div className="flex gap-4 w-full md:w-auto">
              <div className="relative">
                <select
                  value={itemsPerPage.toString()}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="min-w-[100px] px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 h-11"
                >
                  <option value="5">5 per page</option>
                  <option value="10">10 per page</option>
                  <option value="20">20 per page</option>
                  <option value="50">50 per page</option>
                </select>
              </div>
            </div>
          </div>

          {/* Expense List */}
          <div className="space-y-4">
            {loading && (
              <div className="text-gray-500 text-center py-8">
                Loading expenses...
              </div>
            )}
            {fetchError && (
              <div className="text-red-500 text-center py-8">{fetchError}</div>
            )}
            {!loading && !fetchError && currentItems.length === 0 && (
              <div className="text-gray-500 text-center py-8">
                No expenses found matching your criteria.
              </div>
            )}
            {!loading &&
              !fetchError &&
              currentItems.map((priority) => (
                <div
                  key={priority.LOPID}
                  className={`p-4 rounded-lg border transition-all ${
                    selected[priority.expenseTitle] !== undefined
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                      : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id={priority.expenseTitle}
                        checked={selected[priority.expenseTitle] !== undefined}
                        onChange={() => handleCheck(priority.expenseTitle)}
                        className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                      />
                      <label
                        htmlFor={priority.expenseTitle}
                        className="text-gray-700 dark:text-gray-300 font-medium"
                      >
                        {priority.expenseTitle}
                      </label>
                    </div>
                    {selected[priority.expenseTitle] !== undefined && (
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-600 dark:text-gray-400">
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
                          className="w-32 h-5 px-2 py-0 text-sm border border-gray-300 rounded focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                          required
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
          </div>

          {/* Pagination controls */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Showing{" "}
              {currentItems.length > 0
                ? (currentPage - 1) * itemsPerPage + 1
                : 0}{" "}
              to {Math.min(currentPage * itemsPerPage, filteredExpenses.length)}{" "}
              of {filteredExpenses.length} entries
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={() => goToPage(1)}
                disabled={currentPage === 1}
                variant="outline"
                size="sm"
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
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

          {/* Submit Button */}
          <div className="mt-8 flex justify-end">
            <Button
              type="submit"
              variant="primary"
              disabled={Object.keys(selected).length === 0}
            >
              Submit Fund Request
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FundRequestPage;
