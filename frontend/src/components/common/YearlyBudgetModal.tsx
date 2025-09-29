import React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import Button from "@/components/ui/button/Button";
import { Calendar, DollarSign, School, AlertCircle } from "lucide-react";

interface YearlyBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProceed: () => void;
  onDoLater: () => void;
  currentYear: number;
  schoolsWithoutBudget: number;
  totalSchools: number;
}

const YearlyBudgetModal: React.FC<YearlyBudgetModalProps> = ({
  isOpen,
  onClose,
  onProceed,
  onDoLater,
  currentYear,
  schoolsWithoutBudget,
  totalSchools,
}) => {
  const completionPercentage = totalSchools > 0 ? ((totalSchools - schoolsWithoutBudget) / totalSchools) * 100 : 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-2xl rounded-xl bg-white dark:bg-gray-800 p-0 overflow-hidden shadow-2xl border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 px-8 py-6 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
              <Calendar className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Yearly Budget Allocation Required
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                It's time to allocate yearly budgets for {currentYear}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-8 py-6 space-y-6">
          {/* Status Overview */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Budget Allocation Status
              </h3>
              <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                {completionPercentage.toFixed(1)}% Complete
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2 mb-3">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>{totalSchools - schoolsWithoutBudget} of {totalSchools} schools allocated</span>
              <span>{schoolsWithoutBudget} remaining</span>
            </div>
          </div>

          {/* Information Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                <School className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium text-green-900 dark:text-green-100">
                  Schools with Budget
                </p>
                <p className="text-sm text-green-700 dark:text-green-300">
                  {totalSchools - schoolsWithoutBudget} schools
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
              <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium text-orange-900 dark:text-orange-100">
                  Schools Pending
                </p>
                <p className="text-sm text-orange-700 dark:text-orange-300">
                  {schoolsWithoutBudget} schools need allocation
                </p>
              </div>
            </div>
          </div>

          {/* Important Information */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                  Important Information
                </h4>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  <li>• Yearly budgets are divided by 12 to calculate monthly budgets</li>
                  <li>• Schools cannot submit requests without allocated budgets</li>
                  <li>• Budget allocation should be completed by the first Monday of January</li>
                  <li>• You can allocate budgets for multiple schools at once</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              variant="outline"
              onClick={onDoLater}
              className="flex-1 h-12 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Do It Later
            </Button>
            <Button
              variant="primary"
              onClick={onProceed}
              className="flex-1 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg"
            >
              Proceed to Allocation
            </Button>
          </div>

          {/* Footer Note */}
          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              This reminder will appear daily until all schools have yearly budgets allocated.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default YearlyBudgetModal;
