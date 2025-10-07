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
  CalendarX,
  Eye,
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
  editingLiquidationDates: Record<string, { month: number | null; year: number | null }>;
  showLiquidationDetails: boolean;
  onToggleSchoolSelection: (schoolId: string) => void;
  onLiquidationDateChange: (schoolId: string, field: 'month' | 'year', value: number | null) => void;
  onSaveLiquidationDates: (schoolId: string) => void;
  onSaveIndividualBudget: (schoolId: string, yearlyBudget: number) => Promise<void>;
  canRequestNextMonth: (school: any) => boolean;
  formatCurrency: (value: number) => string;
  monthNames: string[];
  isFutureMonth: (monthIndex: number, selectedYear: number | null) => boolean;
  loading?: boolean;
  error?: string | null;
  isSaving?: boolean;
}

const SchoolBudgetAllocationTable: React.FC<SchoolBudgetAllocationTableProps> = ({
  schools,
  selectedSchools,
  editingBudgets,
  editingLiquidationDates,
  showLiquidationDetails,
  onToggleSchoolSelection,
  onLiquidationDateChange,
  onSaveLiquidationDates,
  onSaveIndividualBudget,
  canRequestNextMonth,
  formatCurrency,
  monthNames,
  isFutureMonth,
  loading = false,
  error = null,
  isSaving = false,
}) => {
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [dialogBudget, setDialogBudget] = useState<number>(0);
  const [dialogBudgetDisplay, setDialogBudgetDisplay] = useState<string>("0");
  const [showSaveConfirm, setShowSaveConfirm] = useState<boolean>(false);

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
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedSchools.length === schools.length && schools.length > 0}
                    onChange={() => {
                      if (selectedSchools.length === schools.length) {
                        // Deselect all
                        selectedSchools.forEach(onToggleSchoolSelection);
                      } else {
                        // Select all
                        schools.forEach(school => {
                          if (!selectedSchools.includes(school.schoolId)) {
                            onToggleSchoolSelection(school.schoolId);
                          }
                        });
                      }
                    }}
                    className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                  />
                  Select
                </div>
              </TableCell>
              <TableCell
                isHeader
                className="px-6 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 uppercase"
              >
                School Name
              </TableCell>
              <TableCell
                isHeader
                className="px-6 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 uppercase"
              >
                School ID
              </TableCell>
              <TableCell
                isHeader
                className="px-6 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 uppercase"
              >
                Status
              </TableCell>
              <TableCell
                isHeader
                className="px-6 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 uppercase"
              >
                Current Yearly Budget
              </TableCell>
              <TableCell
                isHeader
                className="px-6 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 uppercase"
              >
                Monthly Budget
              </TableCell>
              {showLiquidationDetails && (
                <TableCell
                  isHeader
                  className="px-6 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 uppercase"
                >
                  Liquidation Status
                </TableCell>
              )}
              {showLiquidationDetails && (
                <TableCell
                  isHeader
                  className="px-6 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 uppercase"
                >
                  Liquidation Dates
                </TableCell>
              )}
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
                  colSpan={showLiquidationDetails ? 9 : 7}
                  className="py-8 text-center text-gray-500"
                >
                  Loading schools...
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell
                  colSpan={showLiquidationDetails ? 9 : 7}
                  className="py-8 text-center text-red-500"
                >
                  {error}
                </TableCell>
              </TableRow>
            ) : schools.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={showLiquidationDetails ? 9 : 7}
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
                const canRequest = canRequestNextMonth(school);

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
                    {/* Selection Checkbox */}
                    <TableCell className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleSchoolSelection(school.schoolId)}
                        disabled={!school.is_active}
                        className="rounded border-gray-300 text-brand-600 focus:ring-brand-500 disabled:opacity-50"
                      />
                    </TableCell>

                    {/* School Name */}
                    <TableCell className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {school.schoolName}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {school.municipality && school.district && (
                            `${school.municipality}, ${school.district}`
                          )}
                        </div>
                      </div>
                    </TableCell>

                    {/* School ID */}
                    <TableCell className="px-6 py-4">
                      <span className="font-mono text-sm text-gray-600 dark:text-gray-400">
                        {school.schoolId}
                      </span>
                    </TableCell>

                    {/* Status */}
                    <TableCell className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        {!school.is_active && (
                          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-500 rounded-full w-fit dark:bg-gray-700 dark:text-gray-400">
                            Inactive
                          </span>
                        )}
                        {school.hasAllocation && school.is_active && (
                          <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full w-fit dark:bg-green-900/30 dark:text-green-200">
                            Allocated
                          </span>
                        )}
                        {!school.hasAllocation && school.is_active && (
                          <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full w-fit dark:bg-yellow-900/30 dark:text-yellow-200">
                            Unallocated
                          </span>
                        )}
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

                    {/* Liquidation Status */}
                    {showLiquidationDetails && (
                      <TableCell className="px-6 py-4">
                        <div
                          className={`text-xs px-2 py-1 rounded-full w-fit ${
                            canRequest
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200"
                              : "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200"
                          }`}
                        >
                          {canRequest ? (
                            <>
                              <CalendarCheck className="h-3 w-3 inline mr-1" />
                              Eligible
                            </>
                          ) : (
                            <>
                              <CalendarX className="h-3 w-3 inline mr-1" />
                              Cannot Request Yet
                            </>
                          )}
                        </div>
                      </TableCell>
                    )}


                    {/* Liquidation Dates */}
                    {showLiquidationDetails && (
                      <TableCell className="px-6 py-4">
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <select
                                value={editingLiquidationDates[school.schoolId]?.month ?? school.last_liquidated_month ?? ""}
                                onChange={(e) => onLiquidationDateChange(school.schoolId, 'month', e.target.value ? parseInt(e.target.value) : null)}
                                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200"
                                disabled={!school.is_active}
                              >
                                <option value="">Month</option>
                                {monthNames.map((month, index) => {
                                  const selectedYear = editingLiquidationDates[school.schoolId]?.year ?? school.last_liquidated_year ?? null;
                                  const futureMonth = isFutureMonth(index, selectedYear);
                                  
                                  return (
                                    <option 
                                      key={index} 
                                      value={index + 1}
                                      disabled={futureMonth}
                                      style={futureMonth ? { color: '#9CA3AF', fontStyle: 'italic' } : {}}
                                    >
                                      {futureMonth ? `${month} (Future)` : month}
                                    </option>
                                  );
                                })}
                              </select>
                            </div>
                            <div>
                              <input
                                type="number"
                                min="2020"
                                max={new Date().getFullYear()}
                                value={editingLiquidationDates[school.schoolId]?.year ?? school.last_liquidated_year ?? ""}
                                onChange={(e) => {
                                  const yearValue = e.target.value ? parseInt(e.target.value) : null;
                                  onLiquidationDateChange(school.schoolId, 'year', yearValue);
                                }}
                                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200"
                                disabled={!school.is_active}
                                placeholder="Year"
                              />
                            </div>
                          </div>
                          {(editingLiquidationDates[school.schoolId]?.month !== school.last_liquidated_month || 
                            editingLiquidationDates[school.schoolId]?.year !== school.last_liquidated_year) && (
                            <Button
                              type="button"
                              onClick={() => onSaveLiquidationDates(school.schoolId)}
                              variant="primary"
                              size="sm"
                              disabled={!school.is_active}
                              className="px-2 py-1 text-xs h-6"
                            >
                              Save
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
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

      {/* Budget Edit Dialog */}
      <Dialog open={!!selectedSchool} onOpenChange={() => setSelectedSchool(null)}>
        <DialogContent className="w-full max-w-md rounded-lg bg-white dark:bg-gray-800 p-6 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">
              Edit Budget Allocation
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              {selectedSchool && `Update yearly budget for ${selectedSchool.schoolName}`}
            </DialogDescription>
          </DialogHeader>

          {selectedSchool && (
            <div className="space-y-6 mt-4">
              {/* School Info */}
              <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">School:</span>
                    <span className="text-sm text-gray-900 dark:text-white">{selectedSchool.schoolName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">School ID:</span>
                    <span className="text-sm font-mono text-gray-900 dark:text-white">{selectedSchool.schoolId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Current Budget:</span>
                    <span className="text-sm font-mono text-gray-900 dark:text-white">
                      {formatCurrency(editingBudgets[selectedSchool.schoolId] || 0)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Budget Input */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    New Yearly Budget
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <span className="text-gray-500">₱</span>
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
                      className="pl-8 h-12 text-lg"
                      placeholder="Enter yearly budget amount"
                    />
                  </div>
                </div>

                {/* Quick Adjustment Buttons */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Quick Adjustments
                  </label>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newBudget = dialogBudget + 10000;
                        setDialogBudget(newBudget);
                        setDialogBudgetDisplay(formatNumberWithCommas(newBudget));
                      }}
                      className="flex items-center justify-center gap-2 flex-1"
                    >
                      <Plus className="h-4 w-4" />
                      +₱10,000
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newBudget = dialogBudget + 50000;
                        setDialogBudget(newBudget);
                        setDialogBudgetDisplay(formatNumberWithCommas(newBudget));
                      }}
                      className="flex items-center justify-center gap-2 flex-1"
                    >
                      <Plus className="h-4 w-4" />
                      +₱50,000
                    </Button>
                  </div>
                </div>

                {/* Monthly Budget Preview */}
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-blue-800 dark:text-blue-200">Monthly Budget:</span>
                    <span className="text-sm font-mono font-semibold text-blue-900 dark:text-blue-100">
                      {formatCurrency(dialogBudget / 12)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button
                  variant="outline"
                  onClick={() => setSelectedSchool(null)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={() => setShowSaveConfirm(true)}
                  disabled={!selectedSchool.is_active}
                >
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Save Confirmation Dialog */}
      <Dialog open={showSaveConfirm} onOpenChange={setShowSaveConfirm}>
        <DialogContent className="w-full max-w-md rounded-lg bg-white dark:bg-gray-800 p-6 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">
              Confirm Budget Change
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              Are you sure you want to update the yearly budget for this school?
            </DialogDescription>
          </DialogHeader>

          {selectedSchool && (
            <div className="space-y-4 mt-4">
              {/* School Info */}
              <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">School:</span>
                    <span className="text-sm text-gray-900 dark:text-white">{selectedSchool.schoolName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Current Budget:</span>
                    <span className="text-sm font-mono text-gray-900 dark:text-white">
                      {formatCurrency(editingBudgets[selectedSchool.schoolId] || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">New Budget:</span>
                    <span className="text-sm font-mono font-semibold text-blue-900 dark:text-blue-100">
                      {formatCurrency(dialogBudget)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-gray-200 dark:border-gray-600 pt-2">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Change:</span>
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
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button
                  variant="outline"
                  onClick={() => setShowSaveConfirm(false)}
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
                >
                  {isSaving ? "Saving..." : "Confirm Save"}
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
