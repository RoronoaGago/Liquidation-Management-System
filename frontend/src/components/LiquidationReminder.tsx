// components/LiquidationReminder.tsx
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
        console.log(today);

        // Only check if we haven't shown it today
        if (lastShown !== today) {
          console.log("hi");
          const response = await api.get("liquidations/");
          const data = response.data;

          // Filter liquidations with <=15 days remaining
          const urgentLiquidations = data.filter(
            (l: any) =>
              l.remaining_days !== null &&
              l.remaining_days <= 15 &&
              ["draft", "resubmit"].includes(l.status)
          );
          console.log(urgentLiquidations);

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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-[90vw] lg:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-red-600">
            Liquidation Reminder
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            You have liquidation that need your attention:
          </p>

          <div className="border rounded-lg divide-y">
            {liquidations.map((liquidation) => (
              <div key={liquidation.LiquidationID} className="p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-medium">
                      Liquidation ID: {liquidation?.LiquidationID}
                    </h3>
                    {liquidation.remaining_days > 0 ? (
                      <p className="text-sm text-gray-500">
                        Due in {liquidation.remaining_days} day
                        {liquidation.remaining_days !== 1 ? "s" : ""}
                      </p>
                    ) : (
                      <p className="text-sm text-red-600 font-semibold">
                        Overdue! A demand letter has been sent to your email.
                      </p>
                    )}
                  </div>
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      liquidation.remaining_days <= 0
                        ? "bg-red-700 text-white"
                        : liquidation.remaining_days <= 5
                        ? "bg-red-100 text-red-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {liquidation.remaining_days <= 0
                      ? "Demand Letter Sent"
                      : liquidation.status === "resubmit"
                      ? "Needs Revision"
                      : "Draft"}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <p className="text-sm text-red-600 font-medium">
            Important: Failure to liquidate within the 30-day period will result
            in a demand letter being issued.
          </p>

          <div className="flex justify-end gap-2 pt-4">
            {/* <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="border-gray-300"
            >
              Remind Me Later
            </Button> */}
            <Button
              onClick={() => {
                window.location.href = "/liquidation";
                setOpen(false);
              }}
              variant="destructive"
            >
              Go to Liquidation
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
