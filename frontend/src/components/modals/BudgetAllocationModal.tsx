import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertTriangle,
  Calendar,
  DollarSign,
  Clock,
  CheckCircle,
} from "lucide-react";
import api from "@/api/axios";
import Button from "../ui/button/Button";

interface BudgetAllocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProceed: () => void;
  year: number;
}

const BudgetAllocationModal: React.FC<BudgetAllocationModalProps> = ({
  isOpen,
  onClose,
  onProceed,
  year,
}) => {
  const [unliquidatedRequests, setUnliquidatedRequests] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchUnliquidatedRequests();
    }
  }, [isOpen, year]);

  const fetchUnliquidatedRequests = async () => {
    try {
      setLoading(true);
      const response = await api.get(
        "/budget-allocation/unliquidated-requests/"
      );
      setUnliquidatedRequests(response.data);
    } catch (error) {
      console.error("Failed to fetch unliquidated requests:", error);
      setUnliquidatedRequests({});
    } finally {
      setLoading(false);
    }
  };

  const handleDoLater = async () => {
    try {
      // This will show the notification again tomorrow
      onClose();
    } catch (error) {
      console.error("Error postponing notification:", error);
    }
  };

  const handleProceed = async () => {
    try {
      // Acknowledge the notification
      await api.post("/budget-allocation/acknowledge-notification/", {
        year: year,
      });
      onProceed();
    } catch (error) {
      console.error("Error acknowledging notification:", error);
      // Still proceed even if acknowledgment fails
      onProceed();
    }
  };

  const hasUnliquidatedRequests =
    unliquidatedRequests && Object.keys(unliquidatedRequests).length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/30">
              <Calendar className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">
                Budget Allocation Required
              </DialogTitle>
              <DialogDescription className="text-gray-600 dark:text-gray-300">
                It's time to allocate yearly budgets for all schools
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 overflow-y-auto max-h-[60vh] px-1">
          {/* Main Message */}
          <div className="bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-900/20 p-4">
            <div className="flex items-start gap-3">
              <DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  Yearly Budget Allocation for {year}
                </h3>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  As the first Monday of January, you need to allocate yearly
                  budgets for all schools. These budgets will be automatically
                  divided by 12 to determine monthly allocations.
                </p>
              </div>
            </div>
          </div>

          {/* Unliquidated Requests Warning */}
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-amber-500"></div>
              <span className="ml-2 text-sm text-gray-600 dark:text-gray-300">
                Checking for unliquidated requests...
              </span>
            </div>
          ) : hasUnliquidatedRequests ? (
            <div className="bg-amber-50 dark:bg-amber-900/10 rounded-lg border border-amber-100 dark:border-amber-900/20 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-amber-900 dark:text-amber-100 mb-2">
                    Unliquidated Requests Found
                  </h3>
                  <p className="text-sm text-amber-800 dark:text-amber-200 mb-3">
                    There are {Object.keys(unliquidatedRequests).length} schools
                    with unliquidated requests from {year - 1}.
                  </p>
                  <div className="max-h-32 overflow-y-auto space-y-2">
                    {Object.entries(unliquidatedRequests)
                      .slice(0, 5)
                      .map(([schoolId, data]: [string, any]) => (
                        <div
                          key={schoolId}
                          className="bg-white dark:bg-gray-800 rounded p-2 border border-amber-200 dark:border-amber-700"
                        >
                          <div className="font-medium text-sm text-gray-900 dark:text-white">
                            {data.school.schoolName}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-300">
                            {data.total_unliquidated} unliquidated request(s)
                          </div>
                        </div>
                      ))}
                    {Object.keys(unliquidatedRequests).length > 5 && (
                      <div className="text-xs text-amber-700 dark:text-amber-300">
                        ... and {Object.keys(unliquidatedRequests).length - 5}{" "}
                        more schools
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-amber-700 dark:text-amber-300 mt-2">
                    Please review these before allocating new budgets.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-100 dark:border-green-900/20 p-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-green-900 dark:text-green-100 mb-1">
                    No Outstanding Issues
                  </h3>
                  <p className="text-sm text-green-800 dark:text-green-200">
                    All schools have completed their liquidations from the
                    previous year. You can proceed with budget allocation.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              What happens next:
            </h3>
            <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
              <li className="flex items-start gap-2">
                <span className="font-medium">1.</span>
                <span>
                  You'll be redirected to the Resource Allocation page
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-medium">2.</span>
                <span>Set yearly budgets for each school (e.g., ₱120,000)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-medium">3.</span>
                <span>
                  Monthly budgets will be automatically calculated
                  (₱10,000/month)
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-medium">4.</span>
                <span>
                  Schools can then make requests using their monthly allocation
                </span>
              </li>
            </ul>
          </div>

          {/* Reminder about "Do it Later" */}
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-start gap-2">
              <Clock className="h-4 w-4 text-gray-500 dark:text-gray-400 mt-0.5" />
              <div className="text-sm text-gray-600 dark:text-gray-300">
                <span className="font-medium">Note:</span> If you choose "Do it
                Later", you'll receive this notification again tomorrow until
                you allocate the budgets.
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button
            variant="outline"
            onClick={handleDoLater}
            className="px-6 py-2"
          >
            Do it Later
          </Button>
          <Button
            variant="primary"
            onClick={handleProceed}
            className="px-6 py-2 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600"
          >
            Proceed to Allocate Budgets
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BudgetAllocationModal;
