import React, { useState, useEffect, useCallback, useMemo } from "react";
import api from "@/api/axios";
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
import { Skeleton } from "antd";

const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100];
const QUICK_ADD_AMOUNTS = [1000, 5000, 10000];
const MIN_SEARCH_LENGTH = 3;
const SEARCH_DEBOUNCE_MS = 500;

// Update School type to include backlog info
type School = {
  schoolId: string;
  schoolName: string;
  max_budget: number;
  municipality?: string;
  district?: string;
  legislativeDistrict?: string;
  is_active?: boolean;
  hasBacklog?: boolean;
  pendingAmount?: number;
};

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
  const [totalSchools, setTotalSchools] = useState(0);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [adjustmentAmount, setAdjustmentAmount] = useState(1000);
  const [expandedCards, setExpandedCards] = useState<string[]>([]);
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);

  // Fetch backlog data for schools
  const fetchBacklogData = async (schoolIds: string[]) => {
    try {
      const res = await api.get("requests/", {
        params: {
          status: ["approved", "downloaded"].join(","),
          school_ids: schoolIds.join(","),
        },
      });
      return res.data.results || res.data;
    } catch (error) {
      console.error("Error fetching backlog data:", error);
      return [];
    }
  };

  // Fetch schools with backlog info
  const fetchData = async () => {
    setLoading(true);
    try {
      const params: any = {
        page: currentPage,
        page_size: itemsPerPage,
      };
      if (debouncedSearch.length >= MIN_SEARCH_LENGTH) {
        params.search = debouncedSearch;
      }

      // Fetch schools
      const schoolsRes = await api.get("schools/", { params });
      const schoolsData = schoolsRes.data.results || schoolsRes.data;
      const schoolIds = schoolsData.map((s: School) => s.schoolId);

      // Fetch backlog data in parallel
      const [backlogData] = await Promise.all([fetchBacklogData(schoolIds)]);

      // Map backlog info to schools
      const schoolsWithBacklog = schoolsData.map((school: School) => {
        const schoolRequests = backlogData.filter(
          (req: any) => req.user?.school?.schoolId === school.schoolId
        );

        const pendingAmount = schoolRequests.reduce(
          (sum: number, req: any) =>
            sum +
            (req.priorities?.reduce(
              (pSum: number, p: any) => pSum + (p.amount || 0),
              0
            ) || 0,
            0),
          0
        );

        return {
          ...school,
          hasBacklog: schoolRequests.length > 0,
          pendingAmount,
        };
      });

      setSchools(schoolsWithBacklog);
      setTotalSchools(schoolsRes.data.count ?? schoolsRes.data.length);

      // Set initial budgets
      const initialBudgets = schoolsWithBacklog.reduce(
        (acc: Record<string, number>, school: School) => {
          acc[school.schoolId] = school.max_budget ?? 0;
          return acc;
        },
        {}
      );
      setEditingBudgets(initialBudgets);
    } catch (error) {
      toast.error("Failed to load data");
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (
      debouncedSearch.length === 0 ||
      debouncedSearch.length >= MIN_SEARCH_LENGTH
    ) {
      fetchData();
    } else {
      setSchools([]);
      setTotalSchools(0);
    }
  }, [currentPage, itemsPerPage, debouncedSearch]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(handler);
  }, [searchTerm]);

  const getBorderColor = (
    difference: number,
    isSelected: boolean,
    isExpanded: boolean
  ) => {
    if (!isSelected || !isExpanded)
      return "border-gray-200 dark:border-gray-700";
    if (difference > 0) return "border-green-500";
    if (difference < 0) return "border-red-500";
    return "border-gray-200 dark:border-gray-700";
  };
  // Toggle selection
  const toggleSchoolSelection = (schoolId: string) => {
    setSelectedSchools((prev) =>
      prev.includes(schoolId)
        ? prev.filter((id) => id !== schoolId)
        : [...prev, schoolId]
    );

    // Toggle expanded state
    setExpandedCards((prev) =>
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
  const sortedSchools = useMemo(() => {
    return [...schools].sort((a, b) => {
      const aSelected = selectedSchools.includes(a.schoolId);
      const bSelected = selectedSchools.includes(b.schoolId);
      return aSelected === bSelected ? 0 : aSelected ? -1 : 1;
    });
  }, [schools, selectedSchools]);

  // Adjust budget by the selected amount
  const adjustBudget = (schoolId: string, isIncrease: boolean) => {
    const current = Number(editingBudgets[schoolId]) || 0;
    const adjustment = isIncrease ? adjustmentAmount : -adjustmentAmount;
    handleBudgetChange(schoolId, current + adjustment);
  };

  const totalPages = Math.ceil(totalSchools / itemsPerPage);
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  // Format currency
  const formatCurrency = (value: number) => {
    if (isNaN(value)) return "₱0.00";
    return value.toLocaleString("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };
  // Get badge color based on difference
  const getBadgeColor = (difference: number) => {
    if (difference > 0)
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    if (difference < 0)
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
  };
  // Calculate total difference
  const totalDifference = useMemo(
    () =>
      selectedSchools.reduce((sum, id) => {
        const prev = schools.find((s) => s.schoolId === id)?.max_budget || 0;
        const current = Number(editingBudgets[id]) || 0;
        return sum + (current - Number(prev));
      }, 0),
    [selectedSchools, schools, editingBudgets]
  );
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
  // Total of selected
  const totalSelected = useMemo(
    () =>
      selectedSchools.reduce(
        (sum: number, id) => sum + (Number(editingBudgets[id]) || 0),
        0
      ),
    [selectedSchools, editingBudgets]
  );
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };
  // Save budgets for selected
  const saveBudgets = async () => {
    setIsSaving(true);
    try {
      const updates = selectedSchools.map((schoolId) => {
        const budget = Number(editingBudgets[schoolId]) || 0;
        return {
          schoolId: String(schoolId),
          max_budget: parseFloat(budget.toFixed(2)),
        };
      });

      await api.patch("schools/batch_update/", { updates });
      setShowSuccessDialog(true);
      setTimeout(() => {
        setShowSuccessDialog(false);
      }, 2500);

      // Refresh data after save with current params
      const params: any = {
        page: currentPage,
        page_size: itemsPerPage,
      };
      if (searchTerm.length >= MIN_SEARCH_LENGTH) {
        params.search = searchTerm;
      }
      const schoolsRes = await api.get("schools/", { params });
      setSchools(schoolsRes.data.results || schoolsRes.data);
      setTotalSchools(schoolsRes.data.count ?? schoolsRes.data.length);

      // Clear selected schools after successful save
      setSelectedSchools([]);
      setExpandedCards([]);
    } catch (error: any) {
      console.error("Error updating budgets:", error);
      toast.error("Failed to update budgets");
    } finally {
      setIsSaving(false);
      setShowSaveConfirm(false);
    }
  };

  // Update the school card rendering to show backlog info
  const renderSchoolCards = () => {
    if (loading) {
      return Array.from({ length: itemsPerPage }).map((_, idx) => (
        <div
          key={idx}
          className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 flex flex-col gap-3"
        >
          <Skeleton className="h-6 w-2/3 mb-2" />
          <Skeleton className="h-4 w-1/3 mb-4" />
          <Skeleton className="h-4 w-1/2 mb-2" />
          <Skeleton className="h-10 w-full" />
        </div>
      ));
    }

    if (schools.length === 0) {
      return (
        <div className="col-span-full text-gray-500 text-center py-8">
          No schools found matching your search.
        </div>
      );
    }

    return sortedSchools.map((school) => {
      const isSelected = selectedSchools.includes(school.schoolId);
      const isExpanded = expandedCards.includes(school.schoolId);
      const prevBudget = Number(school.max_budget || 0);
      const currentBudget = editingBudgets[school.schoolId] ?? 0;
      const difference = currentBudget - prevBudget;

      return (
        <div
          key={school.schoolId}
          className={`rounded-lg border transition-all overflow-hidden cursor-pointer flex flex-col 
            ${isExpanded ? "h-auto" : "h-[120px]"} ${
            isSelected
              ? "border-brand-500 shadow-lg shadow-brand-100/50 dark:shadow-brand-900/20"
              : getBorderColor(difference, isSelected, isExpanded)
          } hover:border-brand-400 dark:hover:border-brand-500`}
          onClick={(e) => {
            if (
              e.target instanceof HTMLButtonElement ||
              e.target instanceof HTMLInputElement
            ) {
              return;
            }
            toggleSchoolSelection(school.schoolId);
          }}
        >
          <div className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-medium text-gray-800 dark:text-gray-200">
                  {school.schoolName}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  ID: {school.schoolId}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                {difference !== 0 && (
                  <div
                    className={`text-xs px-2 py-1 rounded-full ${getBadgeColor(
                      difference
                    )}`}
                  >
                    {difference > 0 ? "+" : ""}
                    {formatCurrency(difference)}
                    {difference > 0 ? (
                      <ArrowRight className="h-3 w-3 inline ml-1 rotate-45" />
                    ) : difference < 0 ? (
                      <ArrowRight className="h-3 w-3 inline ml-1 -rotate-45" />
                    ) : null}
                  </div>
                )}
                {school.hasBacklog && (
                  <div className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                    Pending: {formatCurrency(school.pendingAmount || 0)}
                    <AlertTriangle className="h-3 w-3 inline ml-1" />
                  </div>
                )}
              </div>
            </div>

            {isExpanded && (
              <>
                <div className="mt-4 flex items-center justify-between">
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    Current Budget
                  </div>
                  <div className="font-medium">
                    {formatCurrency(currentBudget)}
                  </div>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    Previous Budget
                  </div>
                  <div className="text-sm">{formatCurrency(prevBudget)}</div>
                </div>
                {school.hasBacklog && (
                  <div className="mt-1 flex items-center justify-between">
                    <div className="text-sm text-amber-600 dark:text-amber-400">
                      Pending Requests
                    </div>
                    <div className="text-sm text-amber-600 dark:text-amber-400">
                      {formatCurrency(school.pendingAmount || 0)}
                    </div>
                  </div>
                )}

                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-center gap-4">
                    <Button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        adjustBudget(school.schoolId, false);
                      }}
                      variant="outline"
                      size="sm"
                      disabled={currentBudget <= 0}
                      className="px-4 py-2 h-10 w-full"
                    >
                      <Minus className="h-4 w-4" />
                      <span className="ml-2">Decrease</span>
                    </Button>
                    <Button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        adjustBudget(school.schoolId, true);
                      }}
                      variant="outline"
                      size="sm"
                      className="px-4 py-2 h-10 w-full"
                    >
                      <Plus className="h-4 w-4" />
                      <span className="ml-2">Increase</span>
                    </Button>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <span className="text-gray-500">₱</span>
                    </div>
                    <Input
                      type="number"
                      value={editingBudgets[school.schoolId] || 0}
                      onChange={(e) =>
                        handleBudgetChange(
                          school.schoolId,
                          parseFloat(e.target.value) || 0
                        )
                      }
                      className="pl-8 h-10 text-center"
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      );
    });
  };

  // Update save confirmation dialog to show backlog warning
  const SaveConfirmationDialog = () => (
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
          {selectedSchools.some(
            (id) => schools.find((s) => s.schoolId === id)?.hasBacklog
          ) && (
            <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-md border border-amber-200 dark:border-amber-800">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm">
                  Warning:{" "}
                  {
                    selectedSchools.filter(
                      (id) => schools.find((s) => s.schoolId === id)?.hasBacklog
                    ).length
                  }{" "}
                  selected school(s) have pending requests totaling{" "}
                  {formatCurrency(
                    selectedSchools.reduce((sum, id) => {
                      const school = schools.find((s) => s.schoolId === id);
                      return sum + (school?.pendingAmount || 0);
                    }, 0)
                  )}
                  . Ensure this allocation accounts for those commitments.
                </span>
              </div>
            </div>
          )}
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
            disabled={isSaving || totalDifference === 0}
            className="px-4 py-2 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 dark:from-brand-700 dark:to-brand-600 dark:hover:from-brand-800 dark:hover:to-brand-700 text-white shadow-sm"
          >
            {isSaving ? "Saving..." : "Confirm Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

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

      <SaveConfirmationDialog />

      {/* Rest of your existing dialogs and UI components... */}
      {/* (Reset confirmation dialog, search controls, adjustment controls, etc.) */}

      <div className="mt-8">
        <div className="mt-8">
          <div className="mb-6 bg-brand-50 dark:bg-brand-900/10 p-4 rounded-lg border border-brand-100 dark:border-brand-900/20">
            <h3 className="text-lg font-medium text-brand-800 dark:text-brand-200 flex items-center gap-2 mb-2">
              <Info className="h-5 w-5" /> How to allocate resource
            </h3>
            <ol className="list-decimal list-inside space-y-1 text-brand-700 dark:text-brand-300">
              <li>Click on school cards to select them</li>
              <li>Select an adjustment amount from the top controls</li>
              <li>
                Use the + and - buttons in each selected school to adjust the
                budget
              </li>
              <li>Click "Save Selected" when ready</li>
            </ol>
          </div>
        </div>

        {/* Reset Confirmation Dialog */}

        {/* Search and Controls */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-6">
          <div className="relative w-full">
            <Input
              type="text"
              placeholder={`Search schools (min ${MIN_SEARCH_LENGTH} chars)...`}
              value={searchTerm}
              onChange={handleSearchChange}
              className="pl-10"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-400">
              {searchTerm.length > 0 &&
              searchTerm.length < MIN_SEARCH_LENGTH ? (
                <span className="text-yellow-600 dark:text-yellow-400">
                  Type {MIN_SEARCH_LENGTH - searchTerm.length} more
                </span>
              ) : (
                `${totalSchools} schools`
              )}
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

        {/* Adjustment Controls */}
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Adjustment Amount
          </h3>
          <div className="flex flex-wrap gap-2">
            {QUICK_ADD_AMOUNTS.map((amount) => (
              <Button
                key={amount}
                variant={adjustmentAmount === amount ? "primary" : "outline"}
                size="sm"
                onClick={() => setAdjustmentAmount(amount)}
              >
                {formatCurrency(amount)}
              </Button>
            ))}
          </div>
        </div>
        {/* Summary Bar */}
        {selectedSchools.length > 0 && (
          <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 mb-6 py-3 px-4 shadow-sm">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {selectedSchools.length} school(s) selected • Total:{" "}
                {formatCurrency(totalSelected)} • Change:{" "}
                <span
                  className={
                    totalDifference > 0
                      ? "text-green-600"
                      : totalDifference < 0
                      ? "text-red-600"
                      : "text-gray-500"
                  }
                >
                  {formatCurrency(Math.abs(totalDifference))}
                  {totalDifference !== 0 && (totalDifference > 0 ? "↑" : "↓")}
                </span>
                {selectedSchools.some(
                  (id) => schools.find((s) => s.schoolId === id)?.hasBacklog
                ) && (
                  <span className="ml-2 text-amber-600 dark:text-amber-400">
                    •{" "}
                    {
                      selectedSchools.filter(
                        (id) =>
                          schools.find((s) => s.schoolId === id)?.hasBacklog
                      ).length
                    }{" "}
                    with pending requests
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={() => setSelectedSchools([])}
                  variant="outline"
                  size="sm"
                >
                  Clear All
                </Button>
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
                  disabled={isSaving || totalDifference === 0}
                  className="min-w-[120px]"
                >
                  {isSaving ? "Saving..." : "Save Selected"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* School Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {renderSchoolCards()}
        </div>

        {/* Pagination */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Page {currentPage} of {totalPages} • {totalSchools} total schools
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
              {Array.from(
                {
                  length: Math.min(5, totalPages),
                },
                (_, i) => {
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
                }
              )}
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
          <div className="flex items-center gap-2">
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
    </div>
  );
};

export default ResourceAllocation;
