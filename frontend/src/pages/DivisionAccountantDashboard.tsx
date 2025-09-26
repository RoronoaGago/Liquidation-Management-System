import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Download,
  FileText,
  School as SchoolIcon,
  DollarSign,
  RefreshCw,
  Eye,
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
}

interface ApprovedRequest {
  requestId: string;
  schoolName: string;
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
      // Pending liquidations with status approved_liquidator
      const liqRes = await api.get("liquidations/", {
        params: { status: "approved_liquidator", ordering: "-created_at" },
      });
      const liqs = (liqRes.data?.results || liqRes.data || []) as any[];
      const pendingLiquidations = liqs.map((l: any) => {
        const req = l.request;
        const schoolName = req?.user?.school?.schoolName || "";
        const schoolId = req?.user?.school?.schoolId || "";
        const totalAmount = (req?.priorities || []).reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
        const submittedDate = l.created_at || req?.created_at || "";
        const daysPending = submittedDate ? Math.max(0, Math.round((Date.now() - new Date(submittedDate).getTime()) / (1000*60*60*24))) : 0;
        return {
          id: String(l.LiquidationID),
          liquidationId: l.LiquidationID,
          requestId: req?.request_id,
          schoolName,
          schoolId,
          submittedDate,
          daysPending,
          totalAmount,
          status: l.status,
          priority: daysPending > 14 ? "high" : daysPending > 7 ? "medium" : "low",
        } as PendingLiquidation;
      });

      // Expense categories from admin dashboard (computed from RequestPriority)
      const adminRes = await api.get("admin-dashboard/");
      const categorySpending = adminRes.data?.categorySpending || [];
      const expenseStatistics: ExpenseStatistic[] = categorySpending.map((c: any) => ({
        category: c.category,
        amount: Number(c.totalAmount || 0),
        percentage: Number(c.percentage || 0),
        count: Number(c.frequency || 0),
        trend: (c.trend || "stable") as "up" | "down" | "stable",
      }));

      // Requests to download table (fetch all for now, no status filter)
      const reqRes = await api.get("requests/", { params: { ordering: "-created_at" } });
      const reqs = (reqRes.data?.results || reqRes.data || []) as any[];
      const approvedRequests: ApprovedRequest[] = reqs.map((r: any) => ({
        requestId: r.request_id,
        schoolName: r.user?.school?.schoolName || "",
        userFullName: r.user ? `${r.user.first_name} ${r.user.last_name}` : "",
        totalAmount: (r.priorities || []).reduce((s: number, p: any) => s + Number(p.amount || 0), 0),
        createdAt: r.created_at,
      }));

      // Completed liquidations (status=liquidated)
      const liqCompletedRes = await api.get("liquidations/", {
        params: { status: "liquidated", ordering: "-created_at" },
      });
      const completedCount = (liqCompletedRes.data?.results || liqCompletedRes.data || []).length;
      const pendingCount = pendingLiquidations.length;
      const completionRate = (completedCount + pendingCount) > 0
        ? (completedCount / (completedCount + pendingCount)) * 100
        : 0;

      setData({
        pendingLiquidations,
        expenseStatistics,
        approvedRequests,
        dashboardMetrics: {
          totalPendingLiquidations: pendingLiquidations.length,
          totalAmountPendingLiquidations: pendingLiquidations.reduce((s, x) => s + (Number(x.totalAmount) || 0), 0),
          totalApprovedRequests: approvedRequests.length,
          completionRate,
        },
      });
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
      setData({
        pendingLiquidations: [],
        expenseStatistics: [],
        approvedRequests: [],
        dashboardMetrics: {
          totalPendingLiquidations: 0,
          totalAmountPendingLiquidations: 0,
          totalApprovedRequests: 0,
          completionRate: 0,
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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400";
      case "medium":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400";
      default:
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "under_review_division":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400";
      case "under_review_accountant":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
    }
  };

  // Removed mock data

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white/90">
              Division Accountant Dashboard
            </h1>
            <p className="mt-1 text-gray-500 text-theme-sm dark:text-gray-400">
              Liquidation review and financial oversight
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6">
          {[1, 2, 3, 4].map((item) => (
            <Skeleton key={item} active paragraph={{ rows: 3 }} />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((item) => (
            <Skeleton key={item} active paragraph={{ rows: 6 }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white/90">
            Division Accountant Dashboard
          </h1>
          <p className="mt-1 text-gray-500 text-theme-sm dark:text-gray-400">
            Liquidation review and financial oversight
          </p>
        </div>
        <div className="flex items-center gap-3 mt-4 md:mt-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Liquidations</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.dashboardMetrics.totalPendingLiquidations}</div>
            <p className="text-xs text-muted-foreground">Awaiting review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Amount Pending (Liquidations)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₱{(data?.dashboardMetrics.totalAmountPendingLiquidations || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total amount awaiting liquidation</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved Requests (To Download)</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.dashboardMetrics.totalApprovedRequests}</div>
            <p className="text-xs text-muted-foreground">Awaiting fund download</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(data?.dashboardMetrics.completionRate || 0).toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Liquidated vs total (completed + pending)</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Pending Liquidations */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Pending Liquidations
            </CardTitle>
            <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
              {data?.pendingLiquidations.length} items
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {data?.pendingLiquidations.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <SchoolIcon className="h-8 w-8 text-gray-400" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {item.liquidationId}
                        </h4>
                        <Badge className={getPriorityColor(item.priority)}>
                          {item.priority}
                        </Badge>
                        <Badge className={getStatusColor(item.status)}>
                          {item.status.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {item.schoolName} • {item.daysPending} days pending
                      </p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        ₱{item.totalAmount.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {data?.pendingLiquidations.length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <p>No pending liquidations</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Expense Statistics */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Expense Categories
            </CardTitle>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data?.expenseStatistics as any}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={40}
                    paddingAngle={5}
                    dataKey="amount"
                    label={({ category, percentage }) => `${category} (${percentage}%)`}
                  >
                  {data?.expenseStatistics.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [`₱${Number(value).toLocaleString()}`, "Amount"]}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Approved Requests to Download */}
      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Approved MOOE Requests (To Download)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-3 text-left font-medium">School</th>
                    <th className="p-3 text-left font-medium">Request ID</th>
                    <th className="p-3 text-left font-medium">Submitted By</th>
                    <th className="p-3 text-left font-medium">Amount</th>
                    <th className="p-3 text-left font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.approvedRequests || []).map((req) => (
                    <tr key={req.requestId} className="border-b">
                      <td className="p-3 font-medium">{req.schoolName}</td>
                      <td className="p-3">{req.requestId}</td>
                      <td className="p-3">{req.userFullName}</td>
                      <td className="p-3">₱{req.totalAmount.toLocaleString()}</td>
                      <td className="p-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate("/approved-requests", { state: { requestId: req.requestId } })}
                        >
                          <Eye className="h-4 w-4 mr-1" /> View
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {(data?.approvedRequests || []).length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-3 text-center">No approved requests found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DivisionAccountantDashboard;