// components/LiquidationReminder.tsx
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertTriangle,
  Clock,
  FileText,
  AlertCircle,
  Calendar,
} from "lucide-react";

import api from "@/api/axios";
import Button from "./ui/button/Button";

export default function LiquidationReminder() {
  const { user, isLoading } = useAuth();
  const [open, setOpen] = useState(false);
  const [liquidations, setLiquidations] = useState<any[]>([]);

  useEffect(() => {
    if (isLoading) return; // Wait for auth to finish
    if (user?.role !== "school_head") return;

    const checkLiquidations = async () => {
      try {
        // Check localStorage for last shown time
        const lastShown = localStorage.getItem("liquidationReminderLastShown");
        const today = new Date().toISOString().split("T")[0];

        // Only check if we haven't shown it today
        if (lastShown !== today) {
          const response = await api.get("liquidations/");
          const data = response.data;

          // Filter liquidations with <=15 days remaining
          const urgentLiquidations = data.filter(
            (l: any) =>
              l.remaining_days !== null &&
              l.remaining_days <= 15 &&
              ["draft", "resubmit"].includes(l.status)
          );

          if (urgentLiquidations.length > 0) {
            setLiquidations(urgentLiquidations);
            setOpen(true);
            localStorage.setItem("liquidationReminderLastShown", today);
          }
        }
      } catch (error) {
        console.error("Error checking liquidations:", error);
      }
    };

    checkLiquidations();
  }, [user, isLoading]);

  if (liquidations.length === 0) return null;

  // Count urgent items for summary
  const overdueCount = liquidations.filter((l) => l.remaining_days <= 0).length;
  const criticalCount = liquidations.filter(
    (l) => l.remaining_days > 0 && l.remaining_days <= 5
  ).length;
  const warningCount = liquidations.filter(
    (l) => l.remaining_days > 5 && l.remaining_days <= 15
  ).length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex flex-row items-start gap-3 pb-2 border-b">
          <div className="p-2 bg-red-50 dark:bg-red-950/20 rounded-full">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <div className="flex-1">
            <DialogTitle className="text-xl font-bold text-red-700 flex items-center gap-2">
              Liquidation Reminder
              <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded-full">
                {liquidations.length} urgent item
                {liquidations.length !== 1 ? "s" : ""}
              </span>
            </DialogTitle>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
              Action required for pending liquidations approaching their
              deadline
            </p>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            {overdueCount > 0 && (
              <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-medium text-red-700">
                    Overdue
                  </span>
                </div>
                <p className="text-2xl font-bold text-red-600 mt-1">
                  {overdueCount}
                </p>
                <p className="text-xs text-red-600">Demand letter sent</p>
              </div>
            )}
            {criticalCount > 0 && (
              <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-orange-600" />
                  <span className="text-sm font-medium text-orange-700">
                    Critical
                  </span>
                </div>
                <p className="text-2xl font-bold text-orange-600 mt-1">
                  {criticalCount}
                </p>
                <p className="text-xs text-orange-600">Due within 5 days</p>
              </div>
            )}
            {warningCount > 0 && (
              <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm font-medium text-yellow-700">
                    Warning
                  </span>
                </div>
                <p className="text-2xl font-bold text-yellow-600 mt-1">
                  {warningCount}
                </p>
                <p className="text-xs text-yellow-600">Due in 6-15 days</p>
              </div>
            )}
          </div>

          {/* Liquidations List */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              <FileText className="h-4 w-4" />
              Pending Liquidations
            </div>

            <div className="border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-100 dark:divide-gray-800">
              {liquidations.map((liquidation) => (
                <div
                  key={liquidation.LiquidationID}
                  className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                          Liquidation #{liquidation.LiquidationID}
                        </h3>
                        <span
                          className={`px-2 py-1 text-xs rounded-full font-medium ${
                            liquidation.status === "resubmit"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                              : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
                          }`}
                        >
                          {liquidation.status === "resubmit"
                            ? "Needs Revision"
                            : "Draft"}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>
                            {liquidation.remaining_days > 0 ? (
                              <>
                                Due in{" "}
                                <strong>{liquidation.remaining_days}</strong>{" "}
                                day{liquidation.remaining_days !== 1 ? "s" : ""}
                              </>
                            ) : (
                              <span className="text-red-600 font-semibold">
                                Overdue
                              </span>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        liquidation.remaining_days <= 0
                          ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                          : liquidation.remaining_days <= 5
                          ? "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300"
                          : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                      }`}
                    >
                      {liquidation.remaining_days <= 0
                        ? "Demand Letter Sent"
                        : liquidation.remaining_days <= 5
                        ? "Critical"
                        : "Attention Needed"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Important Notice */}
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-amber-800 dark:text-amber-300 text-sm mb-1">
                  Important Notice
                </h4>
                <p className="text-amber-700 dark:text-amber-400 text-sm">
                  Failure to liquidate within the 30-day period will result in a
                  demand letter being issued. Please address these pending
                  liquidations promptly to avoid administrative actions.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Last checked: {new Date().toLocaleDateString()}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="border-gray-300 text-gray-700"
            >
              Dismiss
            </Button>
            <Button
              onClick={() => {
                window.location.href = "/liquidation";
                setOpen(false);
              }}
              variant="destructive"
              className="bg-red-600 hover:bg-red-700"
            >
              Review Liquidations
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
