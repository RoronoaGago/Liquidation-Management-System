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
  onLiquidationDateChange: (schoolId: string, field: 'month' | 'year', value: number | null) => void;
  onSchoolSelection: (schoolId: string, selected: boolean) => void;
  onSelectAll: (selected: boolean) => void;
  isFutureMonth: (month: number, year: number | null) => boolean;
  monthNames: string[];
  loading: boolean;
  error: string | null;
}

const SchoolLiquidationDatesTable: React.FC<SchoolLiquidationDatesTableProps> = ({
  schools,
  selectedSchools,
  editingLiquidationDates,
  onLiquidationDateChange,
  onSchoolSelection,
  onSelectAll,
  isFutureMonth,
  monthNames,
  loading,
  error,
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

  const handleSaveChanges = () => {
    if (selectedSchool) {
      onLiquidationDateChange(selectedSchool.schoolId, 'month', dialogMonth);
      onLiquidationDateChange(selectedSchool.schoolId, 'year', dialogYear);
      setSelectedSchool(null);
      setShowSaveConfirm(false);
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
        <div className="flex items-center text-gray-600 dark:text-gray-400">
          <CalendarX className="h-3 w-3 inline mr-1" />
          Not assigned yet
        </div>
      );
    }
    
    // Calculate months behind
    const monthsBehind = (currentYear - lastLiquidatedYear) * 12 + (currentMonth - lastLiquidatedMonth);
    
    if (monthsBehind <= 1) {
      // Up to date: current month or last month
      return (
        <div className="flex items-center text-green-600 dark:text-green-400">
          <CalendarCheck className="h-3 w-3 inline mr-1" />
          Up to date
        </div>
      );
    } else if (monthsBehind >= 2) {
      // Backlog: 2+ months behind
      return (
        <div className="flex items-center text-red-600 dark:text-red-400">
          <CalendarX className="h-3 w-3 inline mr-1" />
          Backlog ({monthsBehind} months behind)
        </div>
      );
    } else {
      // This shouldn't happen, but just in case
      return (
        <div className="flex items-center text-yellow-600 dark:text-yellow-400">
          <CalendarCheck className="h-3 w-3 inline mr-1" />
          Up to date
        </div>
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
    <div>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50 dark:bg-gray-700">
              <TableCell className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <input
                  type="checkbox"
                  checked={selectedSchools.length === schools.length && schools.length > 0}
                  onChange={(e) => onSelectAll(e.target.checked)}
                  className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                />
              </TableCell>
              <TableCell className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                School Name
              </TableCell>
              <TableCell className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                District
              </TableCell>
              <TableCell className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Last Liquidation Date
              </TableCell>
              <TableCell className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Liquidation Status
              </TableCell>
              <TableCell className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {schools.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                  No schools found
                </TableCell>
              </TableRow>
            ) : (
              schools.map((school) => (
                <TableRow key={school.schoolId} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <TableCell className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedSchools.includes(school.schoolId)}
                      onChange={(e) => onSchoolSelection(school.schoolId, e.target.checked)}
                      className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                    />
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {school.schoolName}
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                    {school.district?.districtName || 'No district'}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                    {formatLiquidationDate(
                      editingLiquidationDates[school.schoolId]?.month ?? school.last_liquidated_month,
                      editingLiquidationDates[school.schoolId]?.year ?? school.last_liquidated_year
                    )}
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    {getLiquidationStatus(school)}
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewSchool(school)}
                      className="flex items-center gap-2"
                    >
                      <Eye className="h-4 w-4" />
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
        <DialogContent className="w-full max-w-md rounded-lg bg-white dark:bg-gray-800 p-6 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">
              Edit Liquidation Date
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              Update the last liquidation date for this school
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
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">District:</span>
                    <span className="text-sm text-gray-900 dark:text-white">{selectedSchool.district?.districtName || 'No district'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Current Date:</span>
                    <span className="text-sm text-gray-900 dark:text-white">
                      {formatLiquidationDate(selectedSchool.last_liquidated_month, selectedSchool.last_liquidated_year)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Liquidation Date Inputs */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Last Liquidation Month
                  </label>
                  <select
                    value={dialogMonth ?? ""}
                    onChange={(e) => setDialogMonth(e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
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
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    disabled={!selectedSchool.is_active}
                  />
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
              Confirm Date Change
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              Are you sure you want to update the liquidation date for this school?
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
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Current Date:</span>
                    <span className="text-sm text-gray-900 dark:text-white">
                      {formatLiquidationDate(selectedSchool.last_liquidated_month, selectedSchool.last_liquidated_year)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">New Date:</span>
                    <span className="text-sm font-mono font-semibold text-blue-900 dark:text-blue-100">
                      {formatLiquidationDate(dialogMonth, dialogYear)}
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
                  onClick={handleSaveChanges}
                >
                  Confirm Save
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SchoolLiquidationDatesTable;
