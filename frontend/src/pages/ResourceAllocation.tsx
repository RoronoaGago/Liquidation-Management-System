import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import api from "@/api/axios";
import { School } from "@/lib/types";
import { toast } from "react-toastify";
import Button from "../components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import {
  Search,
  Plus,
  Minus,
  Undo2,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Info,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";

const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100];
const QUICK_ADD_AMOUNT = 1000;

const ResourceAllocation = () => {
  const [schools, setSchools] = useState<School[]>([]);
  const [editingBudgets, setEditingBudgets] = useState<Record<string, number>>(
    {}
  );
  const [selectedSchools, setSelectedSchools] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  // Fetch schools on mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const schoolsRes = await api.get("schools/");
        setSchools(schoolsRes.data);

        // Initialize editing budgets
        const initialBudgets = schoolsRes.data.reduce(
          (acc: Record<string, number>, school: School) => {
            // Ensure we properly handle null/undefined budgets
            acc[school.schoolId] = school.max_budget ?? 0;
            return acc;
          },
          {}
        );
        setEditingBudgets(initialBudgets);
      } catch {
        toast.error("Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Handle search with debounce
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(() => {
      setSearchTerm(value);
      setCurrentPage(1);
    }, 300);
  };

  // Toggle selection
  const toggleSchoolSelection = (schoolId: string) => {
    setSelectedSchools((prev) =>
      prev.includes(schoolId)
        ? prev.filter((id) => id !== schoolId)
        : [...prev, schoolId]
    );
  };

  // Handle budget changes
  const handleBudgetChange = (schoolId: string, amount: number) => {
    setEditingBudgets((prev) => ({
      ...prev,
      [schoolId]: Math.max(0, amount),
    }));
  };

  // Quick adjust budget
  const quickAdjust = (schoolId: string, delta: number) => {
    const current = Number(editingBudgets[schoolId]) || 0; // Force number conversion
    handleBudgetChange(schoolId, current + delta);
  };

  // Apply percentage increase to all selected
  const applyPercentageIncrease = (percent: number) => {
    const updated = { ...editingBudgets };
    selectedSchools.forEach((schoolId) => {
      updated[schoolId] = Math.round(updated[schoolId] * (1 + percent / 100));
    });
    setEditingBudgets(updated);
  };
  const formatDifference = (value: number) =>
    value.toLocaleString("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  // Reset all changes for selected
  const resetBudgets = () => {
    const initialBudgets = schools.reduce(
      (acc: Record<string, number>, school) => {
        acc[school.schoolId] = school.max_budget || 0;
        return acc;
      },
      {}
    );
    const updated = { ...editingBudgets };
    selectedSchools.forEach((schoolId) => {
      updated[schoolId] = initialBudgets[schoolId];
    });
    setEditingBudgets(updated);
    setShowResetConfirm(false);
    toast.info("Selected budgets reset to original values");
  };

  // Save budgets for selected
  const saveBudgets = async () => {
    setIsSaving(true);
    try {
      const updates = selectedSchools.map((schoolId) => {
        const budget = Number(editingBudgets[schoolId]) || 0;
        return {
          schoolId: String(schoolId),
          max_budget: parseFloat(budget.toFixed(2)), // Ensure exactly 2 decimal places
        };
      });

      await api.patch("schools/batch_update/", { updates });
      setShowSuccessDialog(true);
      setTimeout(() => {
        setShowSuccessDialog(false);
      }, 2500);

      // Refresh data after save
      const schoolsRes = await api.get("schools/");
      setSchools(schoolsRes.data);
    } catch (error: any) {
      console.error("Error updating budgets:", error);
      toast.error("Failed to update budgets");
    } finally {
      setIsSaving(false);
      setShowSaveConfirm(false);
    }
  };

  // Filter and sort: checked schools at the top, then unchecked, both filtered by search
  const filteredSchools = useMemo(() => {
    let filtered = [...schools];
    if (searchTerm) {
      filtered = filtered.filter(
        (school) =>
          school.schoolName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          school.schoolId.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    const checked = filtered.filter((s) =>
      selectedSchools.includes(s.schoolId)
    );
    const unchecked = filtered.filter(
      (s) => !selectedSchools.includes(s.schoolId)
    );
    return [...checked, ...unchecked];
  }, [schools, searchTerm, selectedSchools]);

  // Pagination
  const totalPages = Math.ceil(filteredSchools.length / itemsPerPage);
  const paginatedSchools = filteredSchools.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Format currency
  const formatCurrency = (value: number) => {
    // Handle NaN cases
    if (isNaN(value)) return "₱0.00";

    return value.toLocaleString("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Total of selected
  const totalSelected = selectedSchools.reduce(
    (sum: number, id) => sum + (Number(editingBudgets[id]) || 0),
    0 // Initial value is number 0
  );

  // Calculate total difference
  const totalDifference = selectedSchools.reduce((sum, id) => {
    const prev = schools.find((s) => s.schoolId === id)?.max_budget || 0;
    const current = Number(editingBudgets[id]) || 0;
    return sum + (current - Number(prev));
  }, 0);

  // Go to page
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <div className="container mx-auto rounded-2xl bg-white px-5 pb-5 pt-5 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
      <PageBreadcrumb pageTitle="Resource Allocation" />

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="w-full max-w-md rounded-lg bg-white dark:bg-gray-800 p-0 overflow-hidden shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center">
          <div className="flex flex-col items-center py-8">
            <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Budgets Updated!
            </h2>
            <p className="text-gray-600 dark:text-gray-300 text-center mb-2">
              School budgets were updated successfully.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Save Confirmation Dialog */}
      <Dialog open={showSaveConfirm} onOpenChange={setShowSaveConfirm}>
        <DialogContent className="w-full max-w-md rounded-lg bg-white dark:bg-gray-800 p-0 overflow-hidden shadow-2xl border border-gray-200 dark:border-gray-700">
          <div className="bg-gradient-to-r from-brand-50 to-gray-50 dark:from-gray-700 dark:to-gray-800 px-6 py-5 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-4">
              <div className="p-2.5 rounded-lg bg-brand-100/80 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Confirm Budget Changes
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  You're about to update budgets for {selectedSchools.length}{" "}
                  schools
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4 px-6 py-5">
            <div className="text-gray-600 dark:text-gray-300">
              The total change will be {formatCurrency(totalDifference)}.
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700/50 px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
            <Button
              variant="outline"
              onClick={() => setShowSaveConfirm(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={saveBudgets}
              disabled={isSaving}
              className="px-4 py-2 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 dark:from-brand-700 dark:to-brand-600 dark:hover:from-brand-800 dark:hover:to-brand-700 text-white shadow-sm"
            >
              {isSaving ? "Saving..." : "Confirm Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reset Confirmation Dialog */}
      <Dialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <DialogContent className="w-full max-w-md rounded-lg bg-white dark:bg-gray-800 p-0 overflow-hidden shadow-2xl border border-gray-200 dark:border-gray-700">
          <div className="bg-gradient-to-r from-brand-50 to-gray-50 dark:from-gray-700 dark:to-gray-800 px-6 py-5 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-4">
              <div className="p-2.5 rounded-lg bg-brand-100/80 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Reset Budgets
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  This will reset budgets for {selectedSchools.length} selected
                  schools
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4 px-6 py-5">
            <div className="text-gray-600 dark:text-gray-300">
              Budgets will be restored to their original values.
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700/50 px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
            <Button
              variant="outline"
              onClick={() => setShowResetConfirm(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={resetBudgets}
              className="px-4 py-2 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 dark:from-brand-700 dark:to-brand-600 dark:hover:from-brand-800 dark:hover:to-brand-700 text-white shadow-sm"
            >
              Reset Budgets
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="mt-8">
        <div className="mb-6 bg-brand-50 dark:bg-brand-900/10 p-4 rounded-lg border border-brand-100 dark:border-brand-900/20">
          <h3 className="text-lg font-medium text-brand-800 dark:text-brand-200 flex items-center gap-2 mb-2">
            <Info className="h-5 w-5" /> How to allocate resource
          </h3>
          <ol className="list-decimal list-inside space-y-1 text-brand-700 dark:text-brand-300">
            <li>Select schools by checking the boxes</li>
            <li>
              Adjust resource allocations using the input fields or quick
              buttons
            </li>
            <li>Review your changes in the summary panel</li>
            <li>Click "Save Selected" when ready</li>
          </ol>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column - School List */}
          <div>
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-6">
              <div className="relative w-full">
                <Input
                  type="text"
                  placeholder="Search schools..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="pl-10"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-400">
                  {filteredSchools.length} schools
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
                  {ITEMS_PER_PAGE_OPTIONS.map((num) => (
                    <option key={num} value={num}>
                      Show {num}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* School List */}
            <div className="grid grid-cols-1 gap-3">
              {loading && (
                <div className="col-span-2 text-gray-500 text-center py-8">
                  Loading schools...
                </div>
              )}
              {!loading && paginatedSchools.length === 0 && (
                <div className="col-span-2 text-gray-500 text-center py-8">
                  No schools found matching your search.
                </div>
              )}
              {!loading &&
                paginatedSchools.map((school) => {
                  const isSelected = selectedSchools.includes(school.schoolId);
                  const prevBudget = Number(school.max_budget || 0);
                  const currentBudget = editingBudgets[school.schoolId] ?? 0;
                  const difference = currentBudget - prevBudget;

                  return (
                    <div
                      key={school.schoolId}
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
                          onChange={() =>
                            toggleSchoolSelection(school.schoolId)
                          }
                          className={`h-5 w-5 rounded border-gray-300 text-brand-600 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-700 transform group-hover:scale-110 transition-transform cursor-pointer`}
                        />
                        <div>
                          <div className="font-medium text-gray-700 dark:text-gray-300">
                            {school.schoolName}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            ID: {school.schoolId}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              quickAdjust(school.schoolId, -QUICK_ADD_AMOUNT)
                            }
                            className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                            disabled={currentBudget <= 0 || !isSelected}
                          >
                            -{QUICK_ADD_AMOUNT}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              quickAdjust(school.schoolId, QUICK_ADD_AMOUNT)
                            }
                            className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                            disabled={!isSelected}
                          >
                            +{QUICK_ADD_AMOUNT}
                          </button>
                        </div>
                        <div className="relative w-32">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                            ₱
                          </span>
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={currentBudget}
                            onChange={(e) => {
                              const value = parseFloat(e.target.value) || 0;
                              handleBudgetChange(school.schoolId, value);
                            }}
                            disabled={!isSelected}
                            className={`w-full pl-8 pr-2 py-2 text-sm border rounded ${
                              isSelected
                                ? "border-gray-300 focus:border-brand-500 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                : "border-gray-200 bg-gray-100 dark:bg-gray-800 dark:border-gray-700 text-gray-400 dark:text-gray-500"
                            }`}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Pagination */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Page {currentPage} of {totalPages} • {filteredSchools.length}{" "}
                total schools
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
                  Resource Allocation Summary
                </h3>
              </div>

              {selectedSchools.length > 0 ? (
                <>
                  <div className="p-4">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-gray-600 dark:text-gray-300">
                        {selectedSchools.length} school(s) selected
                      </span>
                      <span className="font-medium text-brand-600 dark:text-brand-400">
                        Total: {formatCurrency(totalSelected)}
                      </span>
                    </div>

                    <div className="space-y-3 max-h-[400px] overflow-y-auto">
                      {selectedSchools.map((schoolId) => {
                        const school = schools.find(
                          (s) => s.schoolId === schoolId
                        );
                        if (!school) return null;
                        const prevBudget = school.max_budget || 0;
                        const currentBudget = editingBudgets[schoolId] || 0;
                        const difference = currentBudget - prevBudget;

                        return (
                          <div
                            key={schoolId}
                            className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg"
                          >
                            <div className="truncate pr-2">
                              {school.schoolName}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {formatCurrency(currentBudget)}
                              </span>
                              <span
                                className={`text-xs ${
                                  difference > 0
                                    ? "text-green-600"
                                    : difference < 0
                                    ? "text-red-600"
                                    : "text-gray-500"
                                }`}
                              >
                                {difference === 0
                                  ? ""
                                  : `(${
                                      difference > 0 ? "+" : ""
                                    }${formatDifference(
                                      Math.abs(difference)
                                    )})`}
                              </span>
                              <button
                                type="button"
                                onClick={() => toggleSchoolSelection(schoolId)}
                                className="text-gray-400 hover:text-red-500"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="p-4 border-t border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50">
                    <div className="flex justify-between items-center">
                      <Button
                        type="button"
                        onClick={() => setSelectedSchools([])}
                        variant="outline"
                        size="sm"
                      >
                        Clear All
                      </Button>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          onClick={() => setShowResetConfirm(true)}
                          variant="outline"
                          size="sm"
                        >
                          Reset
                        </Button>
                        <Button
                          type="button"
                          onClick={() => setShowSaveConfirm(true)}
                          variant="primary"
                          disabled={isSaving}
                          className="min-w-[180px]"
                        >
                          {isSaving ? (
                            "Saving..."
                          ) : (
                            <>
                              Save Changes
                              <span className="ml-2 font-normal">
                                ({formatCurrency(totalDifference)})
                              </span>
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-8 text-center">
                  <div className="mx-auto w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                    <Plus className="h-8 w-8 text-gray-400" />
                  </div>
                  <h4 className="text-gray-500 dark:text-gray-400 font-medium mb-1">
                    No schools selected
                  </h4>
                  <p className="text-sm text-gray-400 dark:text-gray-500">
                    Select schools from the list to begin
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResourceAllocation;
