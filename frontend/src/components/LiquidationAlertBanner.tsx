import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useNavigate } from "react-router";
import {
  AlertTriangle,
  Clock,
  X,
  Bell,
  ExternalLink,
} from "lucide-react";
import liquidationService from "@/services/liquidationService";
import { LiquidationManagement } from "@/types/liquidation";

export default function LiquidationAlertBanner() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [urgentLiquidations, setUrgentLiquidations] = useState<LiquidationManagement[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [hasNewAlert, setHasNewAlert] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // WebSocket integration for real-time alerts
  useWebSocket({
    onLiquidationReminder: (data) => {
      console.log('Real-time liquidation alert received:', data);
      if (data.notification && user?.role === "school_head") {
        setHasNewAlert(true);
        setIsVisible(true);
      }
    }
  });

  useEffect(() => {
    if (isLoading || user?.role !== "school_head") return;

    const checkUrgentLiquidations = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await liquidationService.getUrgentLiquidations();
        
        // Filter for critical liquidations (≤5 days remaining)
        const criticalLiquidations = response.liquidations.filter(
          (l) =>
            l.remaining_days !== null &&
            l.remaining_days <= 5
        );

        if (criticalLiquidations.length > 0) {
          setUrgentLiquidations(criticalLiquidations);
          setIsVisible(true);
        }
      } catch (error: any) {
        console.error("Error checking urgent liquidations:", error);
        setError(error.message || "Failed to fetch urgent liquidations");
      } finally {
        setLoading(false);
      }
    };

    checkUrgentLiquidations();
  }, [user, isLoading, hasNewAlert]);

  if (!isVisible || urgentLiquidations.length === 0) return null;

  const overdueCount = urgentLiquidations.filter((l) => l.remaining_days <= 0).length;
  const criticalCount = urgentLiquidations.filter((l) => l.remaining_days > 0 && l.remaining_days <= 5).length;

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg transform transition-transform duration-300 ${
      isVisible ? 'translate-y-0' : '-translate-y-full'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              {hasNewAlert ? (
                <Bell className="h-6 w-6 text-white animate-pulse" />
              ) : (
                <AlertTriangle className="h-6 w-6 text-white" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-semibold">
                  {hasNewAlert ? "NEW ALERT:" : "URGENT:"} Liquidation Deadline Approaching
                </h3>
                {hasNewAlert && (
                  <span className="px-2 py-1 text-xs bg-white/20 rounded-full animate-pulse">
                    LIVE
                  </span>
                )}
              </div>
              <p className="text-sm text-red-100 mt-1">
                {overdueCount > 0 && (
                  <span className="font-semibold">{overdueCount} overdue</span>
                )}
                {overdueCount > 0 && criticalCount > 0 && ", "}
                {criticalCount > 0 && (
                  <span className="font-semibold">{criticalCount} due within 5 days</span>
                )}
                {" - "}Immediate action required to avoid demand letters
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                navigate("/liquidation");
                setIsVisible(false);
              }}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-red-700 bg-white rounded-md hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-red-600 transition-colors"
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              Review Now
            </button>
            
            <button
              onClick={() => setIsVisible(false)}
              className="text-white hover:text-red-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-red-600 rounded-md p-1"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        {/* Progress bar showing urgency */}
        <div className="mt-2">
          <div className="flex items-center space-x-2 text-xs text-red-100">
            <Clock className="h-3 w-3" />
            <span>Time remaining:</span>
            {urgentLiquidations.map((liquidation, index) => (
              <span key={liquidation.LiquidationID} className="font-medium">
                #{liquidation.LiquidationID}: {liquidation.remaining_days <= 0 ? 'OVERDUE' : `${liquidation.remaining_days} days`}
                {index < urgentLiquidations.length - 1 && ', '}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
