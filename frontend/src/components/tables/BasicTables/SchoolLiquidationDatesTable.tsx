import React, { useState } from "react";
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

  const handleViewSchool = (school: School) => {
    setSelectedSchool(school);
    setDialogMonth(editingLiquidationDates[school.schoolId]?.month ?? school.last_liquidated_month);
    setDialogYear(editingLiquidationDates[school.schoolId]?.year ?? school.last_liquidated_year);
  };

  const handleSaveChanges = async () => {
    if (selectedSchool) {
      try {
        await onSaveIndividualLiquidationDate(selectedSchool.schoolId, dialogMonth, dialogYear);
        setSelectedSchool(null);
        setShowSaveConfirm(false);
      } catch (error) {
        // Error handling is done in the parent component
        console.error("Error saving liquidation date:", error);
      }
    }
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
      <Dialog open={!!selectedSchool} onOpenChange={() => setSelectedSchool(null)}>
        <DialogContent className="w-full max-w-lg rounded-xl bg-white dark:bg-gray-800 p-0 overflow-hidden shadow-2xl border border-gray-200 dark:border-gray-700">
          <div className="bg-gradient-to-r from-brand-50 to-gray-50 dark:from-gray-700 dark:to-gray-800 px-6 py-5 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-4">
              <div className="p-2.5 rounded-lg bg-brand-100/80 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400">
                <CalendarCheck className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Edit Liquidation Date
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Update the last liquidation date for this school
                </p>
              </div>
            </div>
          </div>

          {selectedSchool && (
            <div className="space-y-6 px-6 py-5">
              {/* School Info */}
              <div className="bg-gradient-to-r from-gray-50 to-gray-100/50 dark:from-gray-700/50 dark:to-gray-800/50 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">School:</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{selectedSchool.schoolName}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">District:</span>
                    <span className="text-sm text-gray-900 dark:text-white">{selectedSchool.district?.districtName || 'No district'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Current Date:</span>
                    <span className="text-sm font-mono font-semibold text-blue-900 dark:text-blue-100">
                      {formatLiquidationDate(selectedSchool.last_liquidated_month, selectedSchool.last_liquidated_year)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Liquidation Date Inputs */}
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    Last Liquidation Month
                  </label>
                  <select
                    value={dialogMonth ?? ""}
                    onChange={(e) => setDialogMonth(e.target.value ? parseInt(e.target.value) : null)}
                    className="h-11 w-full appearance-none rounded-lg border-2 border-gray-300 bg-transparent px-4 py-2.5 pr-11 text-sm shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
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
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
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
                    className="h-11 w-full appearance-none rounded-lg border-2 border-gray-300 bg-transparent px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                    disabled={!selectedSchool.is_active}
                    placeholder="Enter year (e.g., 2024)"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="bg-gray-50 dark:bg-gray-700/50 px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center -mx-6 -mb-5">
                <Button
                  variant="outline"
                  onClick={() => setSelectedSchool(null)}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={() => setShowSaveConfirm(true)}
                  disabled={!selectedSchool.is_active || isSaving}
                  className="px-4 py-2 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 dark:from-brand-700 dark:to-brand-600 dark:hover:from-brand-800 dark:hover:to-brand-700 text-white shadow-sm"
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
        <DialogContent className="w-full max-w-md rounded-lg bg-white dark:bg-gray-800 p-0 overflow-hidden shadow-2xl border border-gray-200 dark:border-gray-700">
          <div className="bg-gradient-to-r from-brand-50 to-gray-50 dark:from-gray-700 dark:to-gray-800 px-6 py-5 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-4">
              <div className="p-2.5 rounded-lg bg-brand-100/80 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Confirm Date Change
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Are you sure you want to update the liquidation date for this school?
                </p>
              </div>
            </div>
          </div>

          {selectedSchool && (
            <div className="space-y-4 px-6 py-5">
              {/* School Info */}
              <div className="bg-gradient-to-r from-gray-50 to-gray-100/50 dark:from-gray-700/50 dark:to-gray-800/50 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">School:</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{selectedSchool.schoolName}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Current Date:</span>
                    <span className="text-sm text-gray-900 dark:text-white">
                      {formatLiquidationDate(selectedSchool.last_liquidated_month, selectedSchool.last_liquidated_year)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">New Date:</span>
                    <span className="text-sm font-mono font-semibold text-blue-900 dark:text-blue-100">
                      {formatLiquidationDate(dialogMonth, dialogYear)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

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
              onClick={handleSaveChanges}
              disabled={isSaving}
              className="px-4 py-2 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 dark:from-brand-700 dark:to-brand-600 dark:hover:from-brand-800 dark:hover:to-brand-700 text-white shadow-sm"
            >
              {isSaving ? "Saving..." : "Confirm Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SchoolLiquidationDatesTable;
