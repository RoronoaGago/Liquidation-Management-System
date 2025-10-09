import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  FileText,
  DollarSign,
  RefreshCw,
  Eye,
  CheckCircle,
  Clock,
  TrendingUp,
  BarChart3,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Badge  from "@/components/ui/badge/Badge";
import { Skeleton } from "antd";
import api from "@/api/axios";
import { useNavigate } from "react-router-dom";

// Types for our data
interface DivisionAccountantDashboardData {
  pendingLiquidations: PendingLiquidation[];
  expenseStatistics: ExpenseStatistic[];
  dashboardMetrics: DashboardMetrics;
  approvedRequests: ApprovedRequest[];
}

interface PendingLiquidation {
  id: string;
  liquidationId: string;
  requestId: string;
  schoolName: string;
  schoolId: string;
  district?: string;
  submittedDate: string;
  daysPending: number;
  totalAmount: number;
  status: string;
  priority: "high" | "medium" | "low";
}

// Removed AgingData and aging report per requirements

interface ExpenseStatistic {
  category: string;
  amount: number;
  percentage: number;
  count: number;
  trend: "up" | "down" | "stable";
}

interface DashboardMetrics {
  totalPendingLiquidations: number;
  totalAmountPendingLiquidations: number;
  totalApprovedRequests: number;
  completionRate: number;
  totalRefundAmount: number;
}

interface ApprovedRequest {
  requestId: string;
  schoolName: string;
  district?: string;
  userFullName: string;
  totalAmount: number;
  createdAt: string;
}

const COLORS = ["#465FFF", "#9CB9FF", "#FF8042", "#00C49F", "#FFBB28", "#8884D8"];

const DivisionAccountantDashboard = () => {
  const [data, setData] = useState<DivisionAccountantDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      let pendingLiquidations: PendingLiquidation[] = [];
      let expenseStatistics: ExpenseStatistic[] = [];
      let approvedRequests: ApprovedRequest[] = [];

      // Pending liquidations - only approved_liquidator and under_review_division statuses
      try {
        const liqRes = await api.get("liquidations/", {
          params: { ordering: "-created_at" },
        });
        const allLiqs = (liqRes.data?.results || liqRes.data || []) as any[];
        // Filter to only include specific pending statuses
        const pendingLiqs = allLiqs.filter((l: any) => 
          l.status === "approved_liquidator" || l.status === "under_review_division"
        );
        pendingLiquidations = pendingLiqs.map((l: any) => {
          const req = l.request;
          const schoolName = req?.user?.school?.schoolName || "";
          const schoolId = req?.user?.school?.schoolId || "";
          const district = req?.user?.school?.district?.districtName || req?.user?.school?.municipality || "";
          const totalAmount = (req?.priorities || []).reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
          const submittedDate = l.created_at || req?.created_at || "";
          const daysPending = submittedDate ? Math.max(0, Math.round((Date.now() - new Date(submittedDate).getTime()) / (1000*60*60*24))) : 0;
          return {
            id: String(l.LiquidationID),
            liquidationId: l.LiquidationID,
            requestId: req?.request_id,
            schoolName,
            schoolId,
            district,
            submittedDate,
            daysPending,
            totalAmount,
            status: l.status,
            priority: daysPending > 14 ? "high" : daysPending > 7 ? "medium" : "low",
          } as PendingLiquidation;
        });
      } catch (e) {
        console.warn("Failed to fetch pending liquidations", e);
      }

      // Expense categories from admin dashboard (may 403 for non-admin users)
      // Removed - using client-side calculation from all requests instead

      // Requests to download table (approved requests only, newest first)
      try {
        const reqRes = await api.get("requests/", {
          params: { status: "approved", ordering: "-created_at" },
        });
        const reqs = (reqRes.data?.results || reqRes.data || []) as any[];
        approvedRequests = reqs.map((r: any) => ({
          requestId: r.request_id,
          schoolName: r.user?.school?.schoolName || "",
          district: r.user?.school?.district?.districtName || r.user?.school?.municipality || "",
          userFullName: r.user ? `${r.user.first_name} ${r.user.last_name}` : "",
          totalAmount: (r.priorities || []).reduce((s: number, p: any) => s + Number(p.amount || 0), 0),
          createdAt: r.created_at,
        }));
      } catch (e) {
        console.warn("Failed to fetch approved requests", e);
      }

      // Fetch all request priorities to count most used priorities (regardless of request status)
      try {
        // Get all requests with their priorities to count usage
        const allRequestsRes = await api.get("requests/", {
          params: { ordering: "-created_at" },
        });
        const allRequests = (allRequestsRes.data?.results || allRequestsRes.data || []) as any[];
        
        // Extract all priorities from all requests
        const allPriorities: any[] = [];
        for (const request of allRequests) {
          if (request.priorities && Array.isArray(request.priorities)) {
            allPriorities.push(...request.priorities);
          }
        }
        
        // Count priorities by expenseTitle
        const priorityCounts: Record<string, number> = {};
        for (const p of allPriorities) {
          const title = p?.priority?.expenseTitle || "Unknown";
          priorityCounts[title] = (priorityCounts[title] || 0) + 1;
        }
        
        const totalCount = Object.values(priorityCounts).reduce((s, n) => s + n, 0);
        
        const topFive = Object.entries(priorityCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([name, count]) => ({
            category: name,
            amount: 0, // not used in chart anymore
            percentage: totalCount > 0 ? (count / totalCount) * 100 : 0,
            count,
            trend: "stable" as const,
          }));
        expenseStatistics = topFive;
      } catch (e) {
        console.warn("Failed to fetch request priorities", e);
      }

      // Ensure we have some data for the pie chart
      if (!expenseStatistics || expenseStatistics.length === 0) {
        expenseStatistics = [
          {
            category: "No data available",
            amount: 0,
            percentage: 100,
            count: 0,
            trend: "stable" as const,
          }
        ];
      }


      // Calculate completion rate based on liquidated vs total liquidation reports
      let completionRate = 0;
      try {
        const allLiqRes = await api.get("liquidations/", {
          params: { ordering: "-created_at" },
        });
        const allLiquidations = allLiqRes.data?.results || allLiqRes.data || [];
        const completedLiquidations = allLiquidations.filter((l: any) => l.status === "liquidated");
        const totalLiquidations = allLiquidations.length;
        const completedCount = completedLiquidations.length;
        
        // Calculate completion rate based on liquidated vs total liquidation reports
        completionRate = totalLiquidations > 0
          ? (completedCount / totalLiquidations) * 100
          : 0;
      } catch (e) {
        console.warn("Failed to fetch liquidations for completion rate", e);
      }


      // Calculate total amount pending for all liquidations
      const totalAmountPendingLiquidations = pendingLiquidations.reduce(
        (sum, item) => sum + (item.totalAmount || 0),
        0
      );

      setData({
        pendingLiquidations,
        expenseStatistics,
        approvedRequests,
        dashboardMetrics: {
          totalPendingLiquidations: pendingLiquidations.length,
          totalAmountPendingLiquidations,
          totalApprovedRequests: approvedRequests.length,
          completionRate,
          totalRefundAmount: totalAmountPendingLiquidations,
        },
      });
    } catch (error) {
      console.error("Unexpected error building dashboard data:", error);
      setData({
        pendingLiquidations: [],
        expenseStatistics: [],
        approvedRequests: [],
        dashboardMetrics: {
          totalPendingLiquidations: 0,
          totalAmountPendingLiquidations: 0,
          totalApprovedRequests: 0,
          completionRate: 0,
          totalRefundAmount: 0,
        },
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };



  // View handling is delegated to ApprovedRequestPage's modal via navigation

  // Removed mock data

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50/30">
        {/* Header Section Skeleton */}
        <div className="bg-white border-b border-gray-200">
          <div className="px-6 py-8">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton.Input 
                  active 
                  size="large" 
                  style={{ width: 350, height: 36 }} 
                />
                <Skeleton.Input 
                  active 
                  style={{ width: 400, height: 24 }} 
                />
              </div>
              <div className="flex gap-3">
                <Skeleton.Button 
                  active 
                  size="large" 
                  style={{ width: 120, height: 40 }} 
                />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Skeleton */}
        <div className="px-6 py-8 space-y-8">
          {/* Key Metrics Section Skeleton */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <Skeleton.Input 
                active 
                style={{ width: 150, height: 28 }} 
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((item) => (
                <Card key={item} className="border-0 shadow-md">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                    <Skeleton.Input 
                      active 
                      style={{ width: 120, height: 16 }} 
                    />
                    <Skeleton.Avatar 
                      active 
                      size="default" 
                      shape="square" 
                      style={{ width: 40, height: 40 }} 
                    />
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Skeleton.Input 
                      active 
                      size="large" 
                      style={{ width: 100, height: 32 }} 
                    />
                    <Skeleton.Input 
                      active 
                      style={{ width: 140, height: 16 }} 
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Analytics Section Skeleton */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <Skeleton.Input 
                active 
                style={{ width: 200, height: 28 }} 
              />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Pending Liquidations Card Skeleton */}
              <Card className="border-0 shadow-lg">
                <CardHeader className="pb-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Skeleton.Input 
                        active 
                        style={{ width: 200, height: 24 }} 
                      />
                      <Skeleton.Input 
                        active 
                        style={{ width: 250, height: 16 }} 
                      />
                    </div>
                    <Skeleton.Input 
                      active 
                      style={{ width: 80, height: 24 }} 
                    />
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-4">
                    {[1, 2, 3].map((item) => (
                      <div
                        key={item}
                        className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl"
                      >
                        <div className="flex items-center space-x-4">
                          <Skeleton.Avatar 
                            active 
                            size="default" 
                            shape="square" 
                            style={{ width: 40, height: 40 }} 
                          />
                          <div className="space-y-1">
                            <Skeleton.Input 
                              active 
                              style={{ width: 150, height: 16 }} 
                            />
                            <Skeleton.Input 
                              active 
                              style={{ width: 200, height: 12 }} 
                            />
                            <Skeleton.Input 
                              active 
                              style={{ width: 100, height: 14 }} 
                            />
                          </div>
                        </div>
                        <Skeleton.Button 
                          active 
                          size="small" 
                          style={{ width: 40, height: 32 }} 
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Expense Statistics Card Skeleton */}
              <Card className="border-0 shadow-lg">
                <CardHeader className="pb-6">
                  <div className="space-y-1">
                    <Skeleton.Input 
                      active 
                      style={{ width: 250, height: 24 }} 
                    />
                    <Skeleton.Input 
                      active 
                      style={{ width: 300, height: 16 }} 
                    />
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="h-80 bg-white rounded-xl p-4 border border-gray-100 flex items-center justify-center">
                    <Skeleton.Avatar 
                      active 
                      size="large" 
                      shape="circle" 
                      style={{ width: 200, height: 200 }} 
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Approved Requests Table Skeleton */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <Skeleton.Input 
                active 
                style={{ width: 300, height: 28 }} 
              />
            </div>
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-6">
                <Skeleton.Input 
                  active 
                  style={{ width: 250, height: 24 }} 
                />
              </CardHeader>
              <CardContent className="pt-0">
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                  <div className="max-w-full overflow-x-auto">
                    <div className="divide-y divide-gray-200">
                      {/* Table Header Skeleton */}
                      <div className="bg-gray-50 px-6 py-3">
                        <div className="flex space-x-6">
                          {[1, 2, 3, 4, 5].map((item) => (
                            <Skeleton.Input 
                              key={item}
                              active 
                              style={{ width: 100, height: 16 }} 
                            />
                          ))}
                        </div>
                      </div>
                      {/* Table Rows Skeleton */}
                      {[1, 2, 3].map((item) => (
                        <div key={item} className="px-6 py-4">
                          <div className="flex items-center space-x-6">
                            {[1, 2, 3, 4, 5].map((cell) => (
                              <Skeleton.Input 
                                key={cell}
                                active 
                                style={{ width: 100, height: 16 }} 
                              />
          ))}
        </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/30">
      {/* Enhanced Header Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">
            Division Accountant Dashboard
          </h1>
              <p className="text-gray-600 text-sm">
                Monitor liquidation reports and manage approved requests
          </p>
        </div>
            <div className="flex gap-3">
          <Button
            variant="outline"
                size="lg"
            onClick={handleRefresh}
            disabled={refreshing}
                className="shadow-lg hover:shadow-xl transition-all duration-200 px-6 py-2.5"
          >
                <RefreshCw className={`h-5 w-5 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 py-8 space-y-8">
        {/* Enhanced Key Metrics Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Key Metrics</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="hover:shadow-lg transition-shadow duration-200 border-0 shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-xs font-medium text-gray-600">
                  Pending Liquidation Reports
                </CardTitle>
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Clock className="h-5 w-5 text-orange-600" />
                </div>
          </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-2xl font-bold text-gray-900">
                  {data?.dashboardMetrics.totalPendingLiquidations || 0}
                </div>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Awaiting division review
                </p>
          </CardContent>
        </Card>

            <Card className="hover:shadow-lg transition-shadow duration-200 border-0 shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-xs font-medium text-gray-600">
                  Amount Pending (Liquidations)
                </CardTitle>
                <div className="p-2 bg-blue-100 rounded-lg">
                  <DollarSign className="h-5 w-5 text-blue-600" />
                </div>
          </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-2xl font-bold text-gray-900">
                  ₱{(data?.dashboardMetrics.totalAmountPendingLiquidations || 0).toLocaleString()}
                </div>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Total amount from all requests
                </p>
          </CardContent>
        </Card>

            <Card className="hover:shadow-lg transition-shadow duration-200 border-0 shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-xs font-medium text-gray-600">
                  Approved Requests (To Download)
                </CardTitle>
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
          </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-2xl font-bold text-gray-900">
                  {data?.dashboardMetrics.totalApprovedRequests || 0}
                </div>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Awaiting fund download
                </p>
          </CardContent>
        </Card>

            <Card className="hover:shadow-lg transition-shadow duration-200 border-0 shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-xs font-medium text-gray-600">
                  Completion Rate
                </CardTitle>
                <div className="p-2 bg-purple-100 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                </div>
          </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-2xl font-bold text-gray-900">
                  {(data?.dashboardMetrics.completionRate || 0).toFixed(1)}%
                </div>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Liquidated accounts
                </p>
          </CardContent>
        </Card>
          </div>
      </div>

        {/* Enhanced Pending Liquidations Summary */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Pending Liquidations</h2>
            <Badge className="bg-orange-100 text-orange-700 border-orange-200">
              {data?.pendingLiquidations.length || 0} items
            </Badge>
          </div>
          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-200">
            <CardHeader className="pb-6">
              <div className="space-y-1">
                <CardTitle className="text-lg font-semibold text-gray-900">
                  Pending Liquidation Reports
                </CardTitle>
                <p className="text-sm text-gray-500">
                  Liquidation reports awaiting division review
                </p>
              </div>
          </CardHeader>
            <CardContent className="pt-0">
              {data?.pendingLiquidations && data.pendingLiquidations.length > 0 ? (
                <div className="space-y-6">
                  {/* Recent Activity */}
                  <div className="space-y-4">
                    <h4 className="text-base font-semibold text-gray-800">Recent Activity</h4>
                    <div className="space-y-3">
                      {data.pendingLiquidations.slice(0, 2).map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 bg-gradient-to-br from-orange-100 to-orange-200 rounded-lg flex items-center justify-center">
                              <FileText className="h-5 w-5 text-orange-600" />
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{item.schoolName}</div>
                              <div className="text-sm text-gray-500">
                                {item.district || 'No district'} • {item.liquidationId}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-gray-900">
                              ₱{item.totalAmount.toLocaleString()}
                            </div>
                            <div className="text-sm text-gray-500">
                              {item.submittedDate ? new Date(item.submittedDate).toLocaleDateString() : 'N/A'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="flex justify-center pt-4">
                    <Button
                      onClick={() => navigate("/division-review")}
                      className="bg-orange-600 hover:bg-orange-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 px-8 py-3"
                      size="lg"
                    >
                      <Eye className="h-5 w-5 mr-2" />
                      View All Pending Liquidations
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-8 h-8 text-gray-400" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-base font-semibold text-gray-900">
                      No Pending Liquidations
                    </h3>
                    <p className="text-sm text-gray-500 max-w-sm leading-relaxed">
                      All liquidation reports have been reviewed. Check back later for new submissions.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Approved Requests Summary */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Approved MOOE Requests</h2>
            <Badge className="bg-green-100 text-green-700 border-green-200">
              {data?.approvedRequests.length || 0} requests
                        </Badge>
          </div>
          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-200">
            <CardHeader className="pb-6">
              <div className="space-y-1">
                <CardTitle className="text-lg font-semibold text-gray-900">
                  Approved Requests (To Download)
                </CardTitle>
                <p className="text-sm text-gray-500">
                  MOOE requests approved and ready for fund download
                </p>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {data?.approvedRequests && data.approvedRequests.length > 0 ? (
                <div className="space-y-6">
                  {/* Recent Activity */}
                  <div className="space-y-4">
                    <h4 className="text-base font-semibold text-gray-800">Recent Approvals</h4>
                    <div className="space-y-3">
                      {data.approvedRequests.slice(0, 2).map((req) => (
                        <div
                          key={req.requestId}
                          className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 bg-gradient-to-br from-green-100 to-green-200 rounded-lg flex items-center justify-center">
                              <CheckCircle className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{req.schoolName}</div>
                              <div className="text-sm text-gray-500">
                                {req.district || 'No district'} • {req.requestId}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-gray-900">
                              ₱{req.totalAmount.toLocaleString()}
                            </div>
                            <div className="text-sm text-gray-500">
                              {new Date(req.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="flex justify-center pt-4">
                    <Button
                      onClick={() => navigate("/approved-requests")}
                      className="bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 px-8 py-3"
                      size="lg"
                    >
                      <Download className="h-5 w-5 mr-2" />
                      View All Approved Requests
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-8 h-8 text-gray-400" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-base font-semibold text-gray-900">
                      No Approved Requests
                    </h3>
                    <p className="text-sm text-gray-500 max-w-sm leading-relaxed">
                      No approved MOOE requests found. Approved requests will appear here for fund download.
                    </p>
                  </div>
                </div>
              )}
          </CardContent>
        </Card>
        </div>

        {/* Charts and Analytics Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Analytics & Insights</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-1 gap-8">

            {/* Enhanced Expense Statistics */}
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-200">
              <CardHeader className="pb-6">
                <div className="space-y-1">
                  <CardTitle className="text-lg font-semibold text-gray-900">
              Most Used List of Priorities (Top 5)
            </CardTitle>
                  <p className="text-sm text-gray-500">
                    Most frequently requested expense categories across all schools
                  </p>
                </div>
          </CardHeader>
              <CardContent className="pt-0">
                {data?.expenseStatistics && data.expenseStatistics.length > 0 ? (
                  <div className="space-y-6">
                    {/* Summary Statistics */}
                    <div className="grid grid-cols-2 gap-6 p-6 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl">
                      <div className="text-center space-y-2">
                        <div className="text-xl font-bold text-gray-900">
                          {data.expenseStatistics.length}
                        </div>
                        <div className="text-sm text-gray-600 font-medium">Categories</div>
                      </div>
                      <div className="text-center space-y-2">
                        <div className="text-xl font-bold text-gray-900">
                          {data.expenseStatistics.reduce((sum, item) => sum + item.count, 0)}
                        </div>
                        <div className="text-sm text-gray-600 font-medium">Total Usage</div>
                      </div>
                    </div>

                    {/* Enhanced Pie Chart */}
                    <div className="h-80 bg-white rounded-xl p-4 border border-gray-100">
              <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={data.expenseStatistics.map((item, index) => ({
                              ...item,
                              name: item.category,
                              fill: COLORS[index % COLORS.length]
                            }))}
                            cx="50%"
                            cy="50%"
                            outerRadius={90}
                            innerRadius={40}
                            fill="#8884d8"
                            dataKey="count"
                            labelLine={false}
                            label={(props: any) => `${(props.percent * 100).toFixed(0)}%`}
                            stroke="#ffffff"
                            strokeWidth={3}
                          >
                            {data.expenseStatistics.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value) => [
                              `${value} requests`,
                              "Usage",
                            ]}
                            labelFormatter={(label) => `Category: ${label}`}
                            contentStyle={{
                              backgroundColor: "#1f2937",
                              border: "none",
                              borderRadius: "12px",
                              color: "#ffffff",
                              fontSize: "14px",
                              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.15)",
                              padding: "12px 16px",
                            }}
                            labelStyle={{ color: "#ffffff", fontWeight: "600" }}
                            itemStyle={{ color: "#ffffff" }}
                          />
                </PieChart>
              </ResponsiveContainer>
      </div>

                    {/* Enhanced Legend with Details */}
                    <div className="space-y-4">
                      <h4 className="text-base font-semibold text-gray-800 mb-4">Category Details</h4>
                      <div className="space-y-3 max-h-40 overflow-y-auto pr-2">
                        {data.expenseStatistics
                          .sort((a, b) => b.count - a.count)
                          .map((item, index) => (
                            <div
                              key={item.category}
                              className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-sm hover:shadow-md"
                            >
                              <div className="flex items-center space-x-4">
                                <div
                                  className="w-5 h-5 rounded-full flex-shrink-0 shadow-sm"
                                  style={{
                                    backgroundColor: COLORS[index % COLORS.length],
                                  }}
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="text-sm font-semibold text-gray-900 truncate">
                                    {item.category}
                                  </div>
                                  <div className="text-xs text-gray-500 font-medium">
                                    {item.percentage.toFixed(1)}% of total usage
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-bold text-gray-900">
                                  {item.count} requests
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-80 text-center space-y-6">
                    <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
                      <BarChart3 className="w-10 h-10 text-gray-400" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        No Usage Data Available
                      </h3>
                      <p className="text-gray-500 max-w-sm leading-relaxed">
                        No priority usage data found. This will populate as schools submit their MOOE requests.
                      </p>
              </div>
            </div>
                )}
          </CardContent>
        </Card>
          </div>
      </div>

      </div>
    </div>
  );
};

export default DivisionAccountantDashboard;