import React, { useState, useEffect, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../ui/table";
import {
  CalendarCheck,
  CalendarX,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  ChevronUp,
  ChevronDown,
  Save,
  RotateCcw,
  Info,
} from "lucide-react";
import Button from "@/components/ui/button/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Local School type to match the expected interface
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

interface SchoolLiquidationDatesTableProps {
  schools: School[];
  selectedSchools: string[];
  editingLiquidationDates: {
    [schoolId: string]: { month: number | null; year: number | null };
  };
  onSaveIndividualLiquidationDate: (schoolId: string, month: number | null, year: number | null) => Promise<void>;
  onSchoolSelection: (schoolId: string, selected: boolean) => void;
  onSelectAll: (selected: boolean) => void;
  isFutureMonth: (month: number, year: number | null) => boolean;
  monthNames: string[];
  loading: boolean;
  error: string | null;
  isSaving?: boolean;
  sortConfig?: {
    key: string;
    direction: "asc" | "desc";
  } | null;
  requestSort?: (key: string) => void;
}

const SchoolLiquidationDatesTable: React.FC<SchoolLiquidationDatesTableProps> = ({
  schools,
  selectedSchools,
  editingLiquidationDates,
  onSaveIndividualLiquidationDate,
  onSchoolSelection,
  onSelectAll,
  isFutureMonth,
  monthNames,
  loading,
  error,
  isSaving = false,
  sortConfig,
  requestSort,
}) => {
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [dialogMonth, setDialogMonth] = useState<number | null>(null);
  const [dialogYear, setDialogYear] = useState<number | null>(null);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [originalMonth, setOriginalMonth] = useState<number | null>(null);
  const [originalYear, setOriginalYear] = useState<number | null>(null);

  const handleViewSchool = (school: School) => {
    setSelectedSchool(school);
    const currentMonth = editingLiquidationDates[school.schoolId]?.month ?? school.last_liquidated_month;
    const currentYear = editingLiquidationDates[school.schoolId]?.year ?? school.last_liquidated_year;
    setDialogMonth(currentMonth);
    setDialogYear(currentYear);
    setOriginalMonth(currentMonth);
    setOriginalYear(currentYear);
  };

  // Check if there are any changes
  const hasChanges = useMemo(() => {
    return dialogMonth !== originalMonth || dialogYear !== originalYear;
  }, [dialogMonth, dialogYear, originalMonth, originalYear]);

  // Validate the current date selection
  const validationError = useMemo(() => {
    if (!dialogMonth || !dialogYear) return null;
    
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    
    if (dialogYear > currentYear || (dialogYear === currentYear && dialogMonth > currentMonth)) {
      return "Cannot set liquidation date in the future";
    }
    
    return null;
  }, [dialogMonth, dialogYear]);

  const handleSaveChanges = async () => {
    if (selectedSchool) {
      try {
        await onSaveIndividualLiquidationDate(selectedSchool.schoolId, dialogMonth, dialogYear);
        setSelectedSchool(null);
        setShowSaveConfirm(false);
        setShowCancelConfirm(false);
      } catch (error) {
        // Error handling is done in the parent component
        console.error("Error saving liquidation date:", error);
      }
    }
  };

  const handleCancel = () => {
    if (hasChanges) {
      setShowCancelConfirm(true);
    } else {
      setSelectedSchool(null);
    }
  };

  const handleConfirmCancel = () => {
    setSelectedSchool(null);
    setShowCancelConfirm(false);
  };

  const handleResetChanges = () => {
    setDialogMonth(originalMonth);
    setDialogYear(originalYear);
  };

  const formatLiquidationDate = (month: number | null, year: number | null) => {
    if (!month || !year) return "Not assigned yet";
    return `${monthNames[month - 1]} ${year}`;
  };

  const getLiquidationStatus = (school: School) => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1; // 1-12
    const currentYear = currentDate.getFullYear();
    
    const lastLiquidatedMonth = editingLiquidationDates[school.schoolId]?.month ?? school.last_liquidated_month;
    const lastLiquidatedYear = editingLiquidationDates[school.schoolId]?.year ?? school.last_liquidated_year;
    
    // If no liquidation date, show "Not assigned yet"
    if (!lastLiquidatedMonth || !lastLiquidatedYear) {
      return (
        <span className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
          <XCircle className="h-4 w-4" />
          Not assigned yet
        </span>
      );
    }
    
    // Calculate months behind
    const monthsBehind = (currentYear - lastLiquidatedYear) * 12 + (currentMonth - lastLiquidatedMonth);
    
    if (monthsBehind <= 1) {
      // Up to date: current month or last month
      return (
        <span className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
          <CheckCircle className="h-4 w-4" />
          Up to date
        </span>
      );
    } else if (monthsBehind >= 2) {
      // Backlog: 2+ months behind
      return (
        <span className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
          <AlertCircle className="h-4 w-4" />
          Backlog ({monthsBehind} months behind)
        </span>
      );
    } else {
      // This shouldn't happen, but just in case
      return (
        <span className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
          <CheckCircle className="h-4 w-4" />
          Up to date
        </span>
      );
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-8 text-center">
          <div className="text-lg text-gray-600 dark:text-gray-400">Loading schools...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-8 text-center">
          <div className="text-lg text-red-600 dark:text-red-400">Error: {error}</div>
        </div>
      </div>
    );
  }

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
                School Name
              </TableCell>
              <TableCell
                isHeader
                className="px-6 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 uppercase"
              >
                Last Liquidation Date
              </TableCell>
              <TableCell
                isHeader
                className="px-6 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 uppercase"
              >
                Liquidation Status
              </TableCell>
              <TableCell
                isHeader
                className="px-6 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 uppercase"
              >
                Actions
              </TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {schools.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="py-8 text-center text-gray-500"
                >
                  No schools found.
                </TableCell>
              </TableRow>
            ) : (
              schools.map((school) => (
                <TableRow
                  key={school.schoolId}
                  className={`hover:bg-gray-50 dark:hover:bg-gray-900/20 ${
                    !school.is_active
                      ? "bg-gray-50 opacity-75 dark:bg-gray-800/50"
                      : ""
                  }`}
                >
                  <TableCell className="px-6 py-4">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {school.schoolName}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {school.district?.districtName || 'No district'}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <span className="text-sm text-gray-900 dark:text-white">
                      {formatLiquidationDate(
                        editingLiquidationDates[school.schoolId]?.month ?? school.last_liquidated_month,
                        editingLiquidationDates[school.schoolId]?.year ?? school.last_liquidated_year
                      )}
                    </span>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    {getLiquidationStatus(school)}
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleViewSchool(school)}
                      disabled={!school.is_active}
                      className="px-3 py-1 text-xs"
                      startIcon={<Eye className="h-3 w-3" />}
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Liquidation Date Dialog */}
      <Dialog open={!!selectedSchool} onOpenChange={handleCancel}>
        <DialogContent className="w-full max-w-4xl sm:max-w-4xl rounded-xl bg-white dark:bg-gray-800 p-0 shadow-2xl border-0 overflow-hidden">
          <DialogHeader className="px-6 py-5 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-gray-100/50 dark:from-gray-800 dark:to-gray-700/50 rounded-t-xl">
            <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/40 rounded-lg flex items-center justify-center">
                <CalendarCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              Edit Liquidation Date
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400 mt-2">
              {selectedSchool && `Update the last liquidation date for ${selectedSchool.schoolName}`}
              {hasChanges && (
                <div className="flex items-center gap-2 mt-3 px-3 py-1.5 bg-amber-100 dark:bg-amber-900/30 rounded-lg w-fit">
                  <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                  <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                    Unsaved changes
                  </span>
                </div>
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
                        {selectedSchool.district?.districtName || 'No district'}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <span className="font-medium text-gray-700 dark:text-gray-300 w-24 flex-shrink-0">
                        Status:
                      </span>
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium w-fit min-w-[90px] justify-center bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                        <CheckCircle className="h-4 w-4" />
                        Active
                      </span>
                    </div>
                    <div className="flex items-center">
                      <span className="font-medium text-gray-700 dark:text-gray-300 w-24 flex-shrink-0">
                        Current:
                      </span>
                      <span className="text-sm font-mono text-gray-900 dark:text-white">
                        {formatLiquidationDate(selectedSchool.last_liquidated_month, selectedSchool.last_liquidated_year)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Liquidation Date Input Section */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Last Liquidation Month
                  </label>
                  <select
                    value={dialogMonth ?? ""}
                    onChange={(e) => setDialogMonth(e.target.value ? parseInt(e.target.value) : null)}
                    className={`h-14 w-full appearance-none rounded-lg border-2 bg-transparent px-4 py-3 pr-11 text-lg font-medium shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 ${
                      validationError && dialogMonth 
                        ? 'border-red-300 focus:border-red-500 dark:border-red-600' 
                        : 'border-gray-300 focus:border-brand-300 dark:border-gray-700 dark:focus:border-brand-800'
                    }`}
                    disabled={!selectedSchool.is_active}
                  >
                    <option value="">Select Month</option>
                    {monthNames.map((month, index) => {
                      const futureMonth = isFutureMonth(index + 1, dialogYear);
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
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Last Liquidation Year
                  </label>
                  <input
                    type="number"
                    min="2020"
                    max={new Date().getFullYear()}
                    value={dialogYear ?? ""}
                    onChange={(e) => {
                      const yearValue = e.target.value ? parseInt(e.target.value) : null;
                      setDialogYear(yearValue);
                    }}
                    className={`h-14 w-full appearance-none rounded-lg border-2 bg-transparent px-4 py-3 text-lg font-medium shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 ${
                      validationError && dialogYear 
                        ? 'border-red-300 focus:border-red-500 dark:border-red-600' 
                        : 'border-gray-300 focus:border-brand-300 dark:border-gray-700 dark:focus:border-brand-800'
                    }`}
                    disabled={!selectedSchool.is_active}
                    placeholder="Enter year (e.g., 2024)"
                  />
                </div>

                {/* Validation Error Message */}
                {validationError && (
                  <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-red-500 dark:text-red-400 flex-shrink-0" />
                    <span className="text-base text-red-700 dark:text-red-300">{validationError}</span>
                  </div>
                )}

                {/* Help Text */}
                <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <Info className="h-5 w-5 text-blue-500 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="text-base text-blue-700 dark:text-blue-300">
                    <p className="font-semibold mb-2">Important Guidelines:</p>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      <li>Only past liquidation dates can be set</li>
                      <li>Future dates are automatically disabled</li>
                      <li>This date will be used to calculate liquidation status</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="order-2 sm:order-1"
                >
                  Cancel
                </Button>
                {hasChanges && (
                  <Button
                    variant="outline"
                    onClick={handleResetChanges}
                    disabled={isSaving}
                    startIcon={<RotateCcw className="h-4 w-4" />}
                    className="order-3 sm:order-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    Reset
                  </Button>
                )}
                <Button
                  variant="primary"
                  onClick={() => setShowSaveConfirm(true)}
                  disabled={!selectedSchool.is_active || isSaving || !hasChanges || !!validationError}
                  className="order-1 sm:order-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white shadow-sm"
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Save Confirmation Dialog */}
      <Dialog open={showSaveConfirm} onOpenChange={setShowSaveConfirm}>
        <DialogContent className="w-full max-w-md sm:max-w-md rounded-xl bg-white dark:bg-gray-800 p-0 shadow-2xl border-0 overflow-hidden">
          <DialogHeader className="px-6 py-5 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-gray-50 dark:from-blue-900/20 dark:to-gray-800 rounded-t-xl">
            <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/40 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              Confirm Changes
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400 mt-2">
              Please review the changes before saving
            </DialogDescription>
          </DialogHeader>

          {selectedSchool && (
            <div className="px-6 py-6 space-y-4">
              {/* School Info */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50/50 dark:bg-gray-900/30 shadow-sm">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">School:</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{selectedSchool.schoolName}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">District:</span>
                    <span className="text-sm text-gray-900 dark:text-white">{selectedSchool.district?.districtName || 'No district'}</span>
                  </div>
                </div>
              </div>

              {/* Date Comparison */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Date Changes</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Current</div>
                    <div className="text-sm font-mono text-gray-900 dark:text-white">
                      {formatLiquidationDate(originalMonth, originalYear)}
                    </div>
                  </div>
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">New</div>
                    <div className="text-sm font-mono font-semibold text-blue-900 dark:text-blue-100">
                      {formatLiquidationDate(dialogMonth, dialogYear)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Impact Notice */}
              <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <Info className="h-4 w-4 text-amber-500 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-700 dark:text-amber-300">
                  <p className="font-medium mb-1">Impact:</p>
                  <p className="text-xs">This will update the school's liquidation status.</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700 px-6 pb-6">
            <Button
              variant="outline"
              onClick={() => setShowSaveConfirm(false)}
              disabled={isSaving}
              className="order-2 sm:order-1"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveChanges}
              disabled={isSaving}
              className="order-1 sm:order-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white shadow-sm"
            >
              {isSaving ? "Saving..." : "Confirm Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <DialogContent className="w-full max-w-md sm:max-w-md rounded-xl bg-white dark:bg-gray-800 p-0 shadow-2xl border-0 overflow-hidden">
          <DialogHeader className="px-6 py-5 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-red-50 to-gray-50 dark:from-red-900/20 dark:to-gray-800 rounded-t-xl">
            <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900/40 rounded-lg flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              Discard Changes?
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400 mt-2">
              You have unsaved changes that will be lost
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 py-6 space-y-4">
            <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <Info className="h-4 w-4 text-amber-500 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-700 dark:text-amber-300">
                <p className="font-medium mb-1">Warning:</p>
                <p className="text-xs">All changes made to the liquidation date will be lost and cannot be recovered.</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700 px-6 pb-6">
            <Button
              variant="outline"
              onClick={() => setShowCancelConfirm(false)}
              disabled={isSaving}
              className="order-2 sm:order-1"
            >
              Keep Editing
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirmCancel}
              disabled={isSaving}
              className="order-1 sm:order-2 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white shadow-sm"
            >
              Discard Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SchoolLiquidationDatesTable;
