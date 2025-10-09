import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../ui/table";
import {
  Plus,
  CalendarCheck,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
// Using local School type from ResourceAllocation
type School = {
  schoolId: string;
  schoolName: string;
  current_monthly_budget: number;
  current_yearly_budget: number;
  municipality: string;
  district: { districtId: string; districtName: string; is_active?: boolean; legislativeDistrict?: string; municipality?: string; };
  legislativeDistrict: string;
  is_active: boolean;
  hasUnliquidated?: boolean;
  last_liquidated_month: number | null;
  last_liquidated_year: number | null;
  hasAllocation?: boolean;
  districtId: string;
};

interface SchoolBudgetAllocationTableProps {
  schools: any[];
  selectedSchools: string[];
  editingBudgets: Record<string, number>;
  onSaveIndividualBudget: (schoolId: string, yearlyBudget: number) => Promise<void>;
  formatCurrency: (value: number) => string;
  loading?: boolean;
  error?: string | null;
  isSaving?: boolean;
  sortConfig?: { key: string; direction: "asc" | "desc" } | null;
  requestSort?: (key: string) => void;
}

const SchoolBudgetAllocationTable: React.FC<SchoolBudgetAllocationTableProps> = ({
  schools,
  selectedSchools,
  editingBudgets,
  onSaveIndividualBudget,
  formatCurrency,
  loading = false,
  error = null,
  isSaving = false,
  sortConfig,
  requestSort,
}) => {
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [dialogBudget, setDialogBudget] = useState<number>(0);
  const [dialogBudgetDisplay, setDialogBudgetDisplay] = useState<string>("0");
  const [showSaveConfirm, setShowSaveConfirm] = useState<boolean>(false);

  // Status badge constants matching PrioritySubmissionsTable
  const statusLabels: Record<string, string> = {
    allocated: "Allocated",
    unallocated: "Unallocated",
    inactive: "Inactive",
    eligible: "Eligible",
    not_eligible: "Cannot Request Yet",
  };

  const statusColors: Record<string, string> = {
    allocated: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    unallocated: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    inactive: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
    eligible: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    not_eligible: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  };

  const statusIcons: Record<string, React.ReactNode> = {
    allocated: <CheckCircle className="h-4 w-4" />,
    unallocated: <Clock className="h-4 w-4" />,
    inactive: <XCircle className="h-4 w-4" />,
    eligible: <CheckCircle className="h-4 w-4" />,
    not_eligible: <AlertCircle className="h-4 w-4" />,
  };

  // Helper function to format number with commas
  const formatNumberWithCommas = (num: number): string => {
    return num.toLocaleString('en-US');
  };

  // Helper function to parse comma-formatted string to number
  const parseCommaFormattedNumber = (str: string): number => {
    return parseFloat(str.replace(/,/g, '')) || 0;
  };
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="max-w-full overflow-x-auto">
        <Table className="divide-y divide-gray-200">
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableCell
                isHeader
                className="px-6 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 uppercase"
              >
                <div
                  className="flex items-center gap-1 cursor-pointer"
                  onClick={() => requestSort && requestSort("schoolName")}
                >
                  School Name
                  <span className="inline-flex flex-col ml-1">
                    <ChevronUp
                      className={`h-3 w-3 transition-colors ${
                        sortConfig?.key === "schoolName" &&
                        sortConfig.direction === "asc"
                          ? "text-primary-500 dark:text-primary-400"
                          : "text-gray-400 dark:text-gray-500"
                      }`}
                    />
                    <ChevronDown
                      className={`h-3 w-3 -mt-1 transition-colors ${
                        sortConfig?.key === "schoolName" &&
                        sortConfig.direction === "desc"
                          ? "text-primary-500 dark:text-primary-400"
                          : "text-gray-400 dark:text-gray-500"
                      }`}
                    />
                  </span>
                </div>
              </TableCell>
              <TableCell
                isHeader
                className="px-6 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 uppercase"
              >
                <div
                  className="flex items-center gap-1 cursor-pointer"
                  onClick={() => requestSort && requestSort("status")}
                >
                  Status
                  <span className="inline-flex flex-col ml-1">
                    <ChevronUp
                      className={`h-3 w-3 transition-colors ${
                        sortConfig?.key === "status" &&
                        sortConfig.direction === "asc"
                          ? "text-primary-500 dark:text-primary-400"
                          : "text-gray-400 dark:text-gray-500"
                      }`}
                    />
                    <ChevronDown
                      className={`h-3 w-3 -mt-1 transition-colors ${
                        sortConfig?.key === "status" &&
                        sortConfig.direction === "desc"
                          ? "text-primary-500 dark:text-primary-400"
                          : "text-gray-400 dark:text-gray-500"
                      }`}
                    />
                  </span>
                </div>
              </TableCell>
              <TableCell
                isHeader
                className="px-6 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 uppercase"
              >
                <div
                  className="flex items-center gap-1 cursor-pointer"
                  onClick={() => requestSort && requestSort("yearlyBudget")}
                >
                  Current Yearly Budget
                  <span className="inline-flex flex-col ml-1">
                    <ChevronUp
                      className={`h-3 w-3 transition-colors ${
                        sortConfig?.key === "yearlyBudget" &&
                        sortConfig.direction === "asc"
                          ? "text-primary-500 dark:text-primary-400"
                          : "text-gray-400 dark:text-gray-500"
                      }`}
                    />
                    <ChevronDown
                      className={`h-3 w-3 -mt-1 transition-colors ${
                        sortConfig?.key === "yearlyBudget" &&
                        sortConfig.direction === "desc"
                          ? "text-primary-500 dark:text-primary-400"
                          : "text-gray-400 dark:text-gray-500"
                      }`}
                    />
                  </span>
                </div>
              </TableCell>
              <TableCell
                isHeader
                className="px-6 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 uppercase"
              >
                <div
                  className="flex items-center gap-1 cursor-pointer"
                  onClick={() => requestSort && requestSort("monthlyBudget")}
                >
                  Monthly Budget
                  <span className="inline-flex flex-col ml-1">
                    <ChevronUp
                      className={`h-3 w-3 transition-colors ${
                        sortConfig?.key === "monthlyBudget" &&
                        sortConfig.direction === "asc"
                          ? "text-primary-500 dark:text-primary-400"
                          : "text-gray-400 dark:text-gray-500"
                      }`}
                    />
                    <ChevronDown
                      className={`h-3 w-3 -mt-1 transition-colors ${
                        sortConfig?.key === "monthlyBudget" &&
                        sortConfig.direction === "desc"
                          ? "text-primary-500 dark:text-primary-400"
                          : "text-gray-400 dark:text-gray-500"
                      }`}
                    />
                  </span>
                </div>
              </TableCell>
              <TableCell
                isHeader
                className="px-6 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 uppercase"
              >
                Actions
              </TableCell>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-200 dark:divide-white/[0.05]">
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-8 text-center text-gray-500"
                >
                  Loading schools...
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-8 text-center text-red-500"
                >
                  {error}
                </TableCell>
              </TableRow>
            ) : schools.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-8 text-center text-gray-500"
                >
                  No schools found.
                </TableCell>
              </TableRow>
            ) : (
              schools.map((school) => {
                const isSelected = selectedSchools.includes(school.schoolId);
                const prevBudget = Number(school.current_yearly_budget || 0);
                const currentBudget = editingBudgets[school.schoolId] ?? 0;
                const difference = currentBudget - prevBudget;

                // Determine status for badge
                let statusKey = "unallocated";
                if (!school.is_active) {
                  statusKey = "inactive";
                } else if (school.hasAllocation) {
                  statusKey = "allocated";
                }

                return (
                  <TableRow
                    key={school.schoolId}
                    className={`hover:bg-gray-50 dark:hover:bg-gray-900/20 ${
                      isSelected ? "bg-blue-50 dark:bg-blue-900/10" : ""
                    } ${
                      !school.is_active
                        ? "bg-gray-50 opacity-75 dark:bg-gray-800/50"
                        : school.hasAllocation
                        ? "bg-green-50/30 dark:bg-green-900/10"
                        : ""
                    }`}
                  >
                    {/* School Name */}
                    <TableCell className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {school.schoolName}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {school.municipality && school.municipality}
                        </div>
                      </div>
                    </TableCell>

                    {/* Status */}
                    <TableCell className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium w-fit min-w-[90px] justify-center ${
                            statusColors[statusKey] ||
                            "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                          }`}
                          style={{
                            maxWidth: "140px",
                            whiteSpace: "nowrap",
                            textOverflow: "ellipsis",
                            overflow: "hidden",
                          }}
                        >
                          {statusIcons[statusKey]}
                          {statusLabels[statusKey]}
                        </span>
                        {/* Only show edit difference if school doesn't have allocation yet */}
                        {difference !== 0 && !school.hasAllocation && (
                          <div
                            className={`text-xs px-2 py-1 rounded-full w-fit ${
                              difference > 0
                                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                            }`}
                          >
                            {difference > 0 ? "+" : ""}
                            {formatCurrency(difference)}
                          </div>
                        )}
                      </div>
                    </TableCell>

                    {/* Current Yearly Budget */}
                    <TableCell className="px-6 py-4">
                      <span className="font-mono text-sm text-gray-900 dark:text-white">
                        {formatCurrency(editingBudgets[school.schoolId] || 0)}
                      </span>
                    </TableCell>

                    {/* Monthly Budget */}
                    <TableCell className="px-6 py-4">
                      <span className="font-mono text-sm text-gray-600 dark:text-gray-400">
                        {formatCurrency(currentBudget / 12)}
                      </span>
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="px-6 py-4">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          const budget = editingBudgets[school.schoolId] || 0;
                          setSelectedSchool(school);
                          setDialogBudget(budget);
                          setDialogBudgetDisplay(formatNumberWithCommas(budget));
                        }}
                        disabled={!school.is_active}
                        className="px-3 py-1 text-xs"
                        startIcon={<Eye className="h-3 w-3" />}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Budget Allocation Dialog */}
      <Dialog open={!!selectedSchool} onOpenChange={() => setSelectedSchool(null)}>
        <DialogContent className="w-full max-w-4xl sm:max-w-4xl rounded-xl bg-white dark:bg-gray-800 p-0 shadow-2xl border-0 overflow-hidden">
          <DialogHeader className="px-6 py-5 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-gray-100/50 dark:from-gray-800 dark:to-gray-700/50 rounded-t-xl">
            <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/40 rounded-lg flex items-center justify-center">
                <Plus className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              {selectedSchool && (
                selectedSchool.hasAllocation 
                  ? "Edit Budget Allocation" 
                  : "Add Budget Allocation"
              )}
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400 mt-2">
              {selectedSchool && (
                selectedSchool.hasAllocation 
                  ? `Update yearly budget allocation for ${selectedSchool.schoolName}`
                  : `Add yearly budget allocation for ${selectedSchool.schoolName}`
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedSchool && (
            <div className="px-6 py-6 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
              {/* School Info Card */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50/50 dark:bg-gray-900/30 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-start">
                      <span className="font-medium text-gray-700 dark:text-gray-300 w-24 flex-shrink-0">
                        School:
                      </span>
                      <span className="text-gray-900 dark:text-white break-all min-w-0">
                        {selectedSchool.schoolName}
                      </span>
                    </div>
                    <div className="flex items-start">
                      <span className="font-medium text-gray-700 dark:text-gray-300 w-24 flex-shrink-0">
                        District:
                      </span>
                      <span className="text-gray-900 dark:text-white break-all min-w-0">
                        {selectedSchool.municipality}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <span className="font-medium text-gray-700 dark:text-gray-300 w-24 flex-shrink-0">
                        Status:
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium w-fit min-w-[90px] justify-center ${
                          selectedSchool.hasAllocation
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                        }`}
                      >
                        {selectedSchool.hasAllocation ? (
                          <>
                            <CheckCircle className="h-4 w-4" />
                            Allocated
                          </>
                        ) : (
                          <>
                            <Clock className="h-4 w-4" />
                            Unallocated
                          </>
                        )}
                      </span>
                    </div>
                    {selectedSchool.hasAllocation && (
                      <div className="flex items-center">
                        <span className="font-medium text-gray-700 dark:text-gray-300 w-24 flex-shrink-0">
                          Current:
                        </span>
                        <span className="text-sm font-mono text-gray-900 dark:text-white">
                          {formatCurrency(editingBudgets[selectedSchool.schoolId] || 0)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Budget Input Section */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    {selectedSchool.hasAllocation ? "New Yearly Budget" : "Yearly Budget Amount"}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                      <span className="text-gray-500 text-lg">₱</span>
                    </div>
                    <Input
                      type="text"
                      value={dialogBudgetDisplay}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Allow only numbers and commas
                        if (/^[\d,]*$/.test(value)) {
                          setDialogBudgetDisplay(value);
                          setDialogBudget(parseCommaFormattedNumber(value));
                        }
                      }}
                      className="pl-12 h-14 text-lg font-medium"
                      placeholder="Enter yearly budget amount"
                    />
                  </div>
                </div>

                {/* Quick Adjustment Buttons */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Quick Adjustments
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newBudget = dialogBudget + 10000;
                        setDialogBudget(newBudget);
                        setDialogBudgetDisplay(formatNumberWithCommas(newBudget));
                      }}
                      className="flex items-center justify-center gap-2 h-10"
                    >
                      <Plus className="h-4 w-4" />
                      ₱10,000
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newBudget = dialogBudget + 50000;
                        setDialogBudget(newBudget);
                        setDialogBudgetDisplay(formatNumberWithCommas(newBudget));
                      }}
                      className="flex items-center justify-center gap-2 h-10"
                    >
                      <Plus className="h-4 w-4" />
                      ₱50,000
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newBudget = dialogBudget + 100000;
                        setDialogBudget(newBudget);
                        setDialogBudgetDisplay(formatNumberWithCommas(newBudget));
                      }}
                      className="flex items-center justify-center gap-2 h-10"
                    >
                      <Plus className="h-4 w-4" />
                      ₱100,000
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newBudget = dialogBudget + 500000;
                        setDialogBudget(newBudget);
                        setDialogBudgetDisplay(formatNumberWithCommas(newBudget));
                      }}
                      className="flex items-center justify-center gap-2 h-10"
                    >
                      <Plus className="h-4 w-4" />
                      ₱500,000
                    </Button>
                  </div>
                </div>

                {/* Budget Preview Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800/30">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/40 rounded-lg flex items-center justify-center">
                        <CalendarCheck className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                      </div>
                      <span className="text-sm font-semibold text-blue-800 dark:text-blue-200">
                        Monthly Budget
                      </span>
                    </div>
                    <p className="text-lg font-mono font-bold text-blue-900 dark:text-blue-100">
                      {formatCurrency(dialogBudget / 12)}
                    </p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800/30">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-6 h-6 bg-green-100 dark:bg-green-900/40 rounded-lg flex items-center justify-center">
                        <CheckCircle className="h-3 w-3 text-green-600 dark:text-green-400" />
                      </div>
                      <span className="text-sm font-semibold text-green-800 dark:text-green-200">
                        Yearly Total
                      </span>
                    </div>
                    <p className="text-lg font-mono font-bold text-green-900 dark:text-green-100">
                      {formatCurrency(dialogBudget)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                <Button
                  variant="outline"
                  onClick={() => setSelectedSchool(null)}
                  className="order-2 sm:order-1"
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={() => setShowSaveConfirm(true)}
                  disabled={
                    !selectedSchool.is_active || 
                    dialogBudget <= 0 || 
                    (selectedSchool.hasAllocation && dialogBudget === (editingBudgets[selectedSchool.schoolId] || 0))
                  }
                  className="order-1 sm:order-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white shadow-sm"
                >
                  {selectedSchool.hasAllocation ? "Update Budget Allocation" : "Add Budget Allocation"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Save Confirmation Dialog */}
      <Dialog open={showSaveConfirm} onOpenChange={setShowSaveConfirm}>
        <DialogContent className="w-full max-w-2xl sm:max-w-2xl rounded-xl bg-white dark:bg-gray-800 p-0 shadow-2xl border-0 overflow-hidden">
          <DialogHeader className="px-6 py-5 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-gray-100/50 dark:from-gray-800 dark:to-gray-700/50 rounded-t-xl">
            <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/40 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              {selectedSchool && (
                selectedSchool.hasAllocation 
                  ? "Confirm Budget Update" 
                  : "Confirm Budget Allocation"
              )}
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400 mt-2">
              {selectedSchool && (
                selectedSchool.hasAllocation 
                  ? `Are you sure you want to update the yearly budget for ${selectedSchool.schoolName}?`
                  : `Are you sure you want to add yearly budget allocation for ${selectedSchool.schoolName}?`
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedSchool && (
            <div className="px-6 py-6 space-y-6">
              {/* School Info Card */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50/50 dark:bg-gray-900/30 shadow-sm">
                <div className="space-y-3">
                  <div className="flex items-start">
                    <span className="font-medium text-gray-700 dark:text-gray-300 w-24 flex-shrink-0">
                      School:
                    </span>
                    <span className="text-gray-900 dark:text-white break-all min-w-0">
                      {selectedSchool.schoolName}
                    </span>
                  </div>
                  <div className="flex items-start">
                    <span className="font-medium text-gray-700 dark:text-gray-300 w-24 flex-shrink-0">
                      District:
                    </span>
                    <span className="text-gray-900 dark:text-white break-all min-w-0">
                      {selectedSchool.municipality}
                    </span>
                  </div>
                </div>
              </div>

              {/* Budget Details */}
              <div className="space-y-4">
                {selectedSchool.hasAllocation && (
                  <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Current Budget:</span>
                    <span className="text-sm font-mono text-gray-900 dark:text-white">
                      {formatCurrency(editingBudgets[selectedSchool.schoolId] || 0)}
                    </span>
                  </div>
                )}
                
                <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800/30">
                  <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                    {selectedSchool.hasAllocation ? "New Budget:" : "Budget Amount:"}
                  </span>
                  <span className="text-sm font-mono font-semibold text-blue-900 dark:text-blue-100">
                    {formatCurrency(dialogBudget)}
                  </span>
                </div>

                {selectedSchool.hasAllocation && (
                  <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800/30">
                    <span className="text-sm font-medium text-green-800 dark:text-green-200">Change:</span>
                    <span className={`text-sm font-mono font-semibold ${
                      dialogBudget > (editingBudgets[selectedSchool.schoolId] || 0)
                        ? "text-green-600 dark:text-green-400"
                        : dialogBudget < (editingBudgets[selectedSchool.schoolId] || 0)
                        ? "text-red-600 dark:text-red-400"
                        : "text-gray-600 dark:text-gray-400"
                    }`}>
                      {dialogBudget > (editingBudgets[selectedSchool.schoolId] || 0) ? "+" : ""}
                      {formatCurrency(dialogBudget - (editingBudgets[selectedSchool.schoolId] || 0))}
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800/30">
                  <span className="text-sm font-medium text-amber-800 dark:text-amber-200">Monthly Budget:</span>
                  <span className="text-sm font-mono font-semibold text-amber-900 dark:text-amber-100">
                    {formatCurrency(dialogBudget / 12)}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button
                  variant="outline"
                  onClick={() => setShowSaveConfirm(false)}
                  className="order-2 sm:order-1"
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={async () => {
                    try {
                      await onSaveIndividualBudget(selectedSchool.schoolId, dialogBudget);
                      setSelectedSchool(null);
                      setShowSaveConfirm(false);
                    } catch (error) {
                      // Error handling is done in the parent component
                      console.error("Error saving individual budget:", error);
                    }
                  }}
                  disabled={isSaving}
                  className="order-1 sm:order-2 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white shadow-sm"
                >
                  {isSaving ? "Processing..." : (selectedSchool.hasAllocation ? "Update Budget" : "Create Allocation")}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SchoolBudgetAllocationTable;
