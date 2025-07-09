/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  PlusCircle,
  Upload,
  AlertTriangle,
  Calendar,
  ArrowRight,
  ChevronRight,
  FileText,
  AlertCircle,
} from "lucide-react";
import api from "@/api/axios";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Progress } from "@/components/ui/progress";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface DashboardData {
  allocatedBudget: number;
  pendingRequests: any[];
  activeLiquidations: any[];
  recentActivity: any[];
  liquidationDeadlines: {
    requestId: string;
    deadline: Date;
    daysRemaining: number;
    status: string;
  }[];
}

const StatusBadge = ({ status }: { status: string }) => {
  const statusClasses: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    approved: "bg-blue-100 text-blue-800",
    downloaded: "bg-green-100 text-green-800",
    unliquidated: "bg-orange-100 text-orange-800",
    liquidated: "bg-purple-100 text-purple-800",
    submitted: "bg-blue-100 text-blue-800",
    under_review_district: "bg-yellow-100 text-yellow-800",
    under_review_division: "bg-yellow-100 text-yellow-800",
    approved_district: "bg-green-100 text-green-800",
    resubmit: "bg-red-100 text-red-800",
  };

  const statusLabels: Record<string, string> = {
    pending: "Pending",
    approved: "Approved",
    downloaded: "Downloaded",
    unliquidated: "Unliquidated",
    liquidated: "Liquidated",
    submitted: "Submitted",
    under_review_district: "Under Review (District)",
    under_review_division: "Under Review (Division)",
    approved_district: "Approved (District)",
    resubmit: "Needs Revision",
  };

  return (
    <span
      className={`px-2 py-0.5 rounded text-xs font-semibold ${
        statusClasses[status] || "bg-gray-100 text-gray-800"
      }`}
    >
      {statusLabels[status] || status}
    </span>
  );
};

const SchoolHeadDashboard = () => {
  const navigate = useNavigate();
  const [, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    allocatedBudget: 0,
    pendingRequests: [],
    activeLiquidations: [],
    recentActivity: [],
    liquidationDeadlines: [],
  });
  const [showLiquidationAlert, setShowLiquidationAlert] = useState(false);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [budgetRes, pendingRes, liquidationsRes, activityRes] =
          await Promise.all([
            api
              .get("/users/me/")
              .then((res) => api.get(`/schools/${res.data.school?.schoolId}/`)),
            api.get("/user-requests/"), // <-- user-specific requests
            api.get("/liquidation/"), // <-- user-specific liquidations
            api.get("/requests/?limit=5"),
          ]);

        const allocatedBudget = Number(budgetRes.data.max_budget) || 0;
        // Filter only pending/approved for active requests
        const pendingRequests = (
          pendingRes.data.results ||
          pendingRes.data ||
          []
        ).filter((r: any) =>
          ["pending", "approved", "downloaded"].includes(r.status)
        );
        // Filter out liquidated for active liquidations
        const activeLiquidations = (
          liquidationsRes.data.results ||
          liquidationsRes.data ||
          []
        ).filter((l: any) => l.status !== "liquidated");
        const recentActivity =
          activityRes.data.results || activityRes.data || [];

        // Calculate liquidation deadlines
        const liquidationDeadlines = activeLiquidations
          .filter((l: any) => l.request?.downloaded_at)
          .map((l: any) => {
            const deadline = new Date(l.request.downloaded_at);
            deadline.setDate(deadline.getDate() + 30);
            return {
              requestId: l.request?.request_id,
              deadline,
              daysRemaining: Math.ceil(
                (deadline.getTime() - new Date().getTime()) /
                  (1000 * 60 * 60 * 24)
              ),
              status: l.status,
            };
          });

        setDashboardData({
          allocatedBudget,
          pendingRequests,
          activeLiquidations,
          recentActivity,
          liquidationDeadlines,
        });

        // Show alert if any liquidation is due in <=5 days
        if (
          liquidationDeadlines.some(
            (ld: { daysRemaining: number }) =>
              ld.daysRemaining <= 5 && ld.daysRemaining > 0
          )
        ) {
          setShowLiquidationAlert(true);
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        toast.error("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const getRequestProgress = (status: string): number => {
    switch (status) {
      case "pending":
        return 33;
      case "approved":
        return 66;
      case "downloaded":
        return 100;
      default:
        return 0;
    }
  };

  const getProgressColor = (status: string, daysRemaining?: number) => {
    if (status === "pending") return "bg-yellow-500";
    if (status === "approved") return "bg-blue-500";
    if (status === "downloaded") return "bg-green-500";

    if (daysRemaining !== undefined) {
      if (daysRemaining <= 5) return "bg-red-500";
      if (daysRemaining <= 15) return "bg-yellow-500";
      return "bg-green-500";
    }

    return "bg-gray-500";
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">School Head Dashboard</h1>

      {/* Liquidation Alert Banner */}
      {showLiquidationAlert && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-medium text-red-800">
              Urgent: Pending Liquidations
            </h3>
            <p className="text-sm text-red-700">
              You have liquidations due soon. Please submit before the deadline
              to avoid penalties.
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 text-red-700 hover:bg-red-100"
              onClick={() => navigate("/liquidation")}
            >
              View Liquidations <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Budget Allocation Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Monthly MOOE Allocation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₱{dashboardData.allocatedBudget.toLocaleString()}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Based on school enrollment
            </p>
          </CardContent>
        </Card>

        {/* Active Requests Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Active Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dashboardData.pendingRequests.length > 0 ? (
              dashboardData.pendingRequests.map((request: any) => (
                <div key={request.request_id} className="mb-4">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium">
                      Request {request.request_id}
                    </span>
                    <StatusBadge status={request.status} />
                  </div>
                  <Progress
                    value={getRequestProgress(request.status)}
                    className="h-2"
                    indicatorClassName={getProgressColor(request.status)}
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Submitted</span>
                    <span>Approved</span>
                    <span>Downloaded</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-sm text-gray-500">
                No active requests
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Liquidations Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Active Liquidations
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dashboardData.activeLiquidations.filter(
              (l: any) => l.status !== "liquidated"
            ).length > 0 ? (
              dashboardData.activeLiquidations
                .filter((l: any) => l.status !== "liquidated")
                .map((liquidation: any) => {
                  const remaining_days = (() => {
                    if (!liquidation.request?.downloaded_at) return null;
                    const start = new Date(liquidation.request.downloaded_at);
                    const deadline = new Date(start);
                    deadline.setDate(deadline.getDate() + 30);
                    return Math.ceil(
                      (deadline.getTime() - new Date().getTime()) /
                        (1000 * 60 * 60 * 24)
                    );
                  })();
                  return (
                    <div
                      key={liquidation.LiquidationID || liquidation.id}
                      className="mb-4"
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium">
                          Request {liquidation.request?.request_id}
                        </span>
                        <StatusBadge status={liquidation.status} />
                      </div>
                      {liquidation.request?.downloaded_at && (
                        <>
                          <Progress
                            value={
                              remaining_days !== null
                                ? ((30 - remaining_days) / 30) * 100
                                : 0
                            }
                            className="h-2"
                            indicatorClassName={getProgressColor(
                              liquidation.status,
                              remaining_days || 0
                            )}
                          />
                          <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>Start</span>
                            {remaining_days !== null && (
                              <span className="font-medium">
                                {remaining_days} days left
                              </span>
                            )}
                            <span>Deadline</span>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })
            ) : (
              <div className="text-center text-sm text-gray-500">
                No active liquidations
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Create LOP Card */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <PlusCircle className="h-5 w-5 text-blue-600" />
              Submit MOOE Request
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Submit your monthly MOOE spending plan for approval
            </p>
            <Button
              onClick={() => navigate("/prepare-list-of-priorities")}
              disabled={dashboardData.pendingRequests.length > 0}
              className="w-full"
            >
              {dashboardData.pendingRequests.length > 0
                ? "Pending Request Exists"
                : "Create New LOP"}
            </Button>
            {dashboardData.pendingRequests.length > 0 && (
              <p className="text-xs text-red-600 mt-2">
                Only one active request is allowed at a time.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Submit Liquidation Card */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Upload className="h-5 w-5 text-blue-600" />
              Submit Liquidation Report
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Upload supporting documents for your Liquidation Report
            </p>
            <Button
              onClick={() => navigate("/liquidation")}
              disabled={
                !dashboardData.pendingRequests.some(
                  (req: any) => req.status === "downloaded"
                )
              }
              className="w-full"
            >
              {dashboardData.pendingRequests.some(
                (req: any) => req.status === "downloaded"
              )
                ? "View Liquidations"
                : "No Downloaded Requests"}
            </Button>
            {dashboardData.pendingRequests.some(
              (req: any) => req.status === "downloaded"
            ) ? null : (
              <p className="text-xs text-red-600 mt-2">
                You can only submit a liquidation after your request has been
                downloaded. Complete your current request first.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gray-500" />
            Recent Activity
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/requests-history")}
            className="text-blue-600 hover:text-blue-800"
          >
            View All <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="space-y-3">
          {dashboardData.recentActivity.length > 0 ? (
            dashboardData.recentActivity.map((activity, index) => (
              <Card key={index} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        <FileText className="h-4 w-4 text-gray-400" />
                        Request {activity.request_id}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {new Date(activity.created_at).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={activity.status} />
                    </div>
                  </div>
                  {activity.rejection_comment && (
                    <div className="mt-2 p-2 bg-red-50 rounded text-sm text-red-700 flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="font-medium">Rejection Reason:</span>{" "}
                        {activity.rejection_comment}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="p-4 text-center text-gray-500">
                No recent activity found
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default SchoolHeadDashboard;
