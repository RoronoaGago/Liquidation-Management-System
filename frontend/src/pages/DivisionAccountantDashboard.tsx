import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
} from "recharts";
import {
  Download,
  Filter,
  Calendar,
  BarChart3,
  PieChart as PieChartIcon,
  FileText,
  Clock,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  Users,
  School,
  DollarSign,
  RefreshCw,
  Eye,
  ChevronRight,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import Badge  from "@/components/ui/badge/Badge";
import { Skeleton } from "antd";
import api from "@/api/axios";

// Types for our data
interface DivisionAccountantDashboardData {
  pendingLiquidations: PendingLiquidation[];
  liquidationAging: AgingData[];
  expenseStatistics: ExpenseStatistic[];
  dashboardMetrics: DashboardMetrics;
  recentActivity: RecentActivity[];
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

interface AgingData {
  period: string;
  count: number;
  amount: number;
  color: string;
}

interface ExpenseStatistic {
  category: string;
  amount: number;
  percentage: number;
  count: number;
  trend: "up" | "down" | "stable";
}

interface DashboardMetrics {
  totalPending: number;
  totalUnliquidated: number;
  avgProcessingTime: number;
  completionRate: number;
  totalAmountPending: number;
}

interface RecentActivity {
  id: string;
  liquidationId: string;
  schoolName: string;
  action: string;
  timestamp: string;
  amount: number;
}

const COLORS = ["#465FFF", "#9CB9FF", "#FF8042", "#00C49F", "#FFBB28", "#8884D8"];

const DivisionAccountantDashboard = () => {
  const [data, setData] = useState<DivisionAccountantDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<string>("last_quarter");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, [timeRange]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      // This endpoint would need to be created in the backend
      const response = await api.get(
        `/division-accountant-dashboard/?time_range=${timeRange}`
      );
      setData(response.data);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
      // Fallback to mock data for demonstration
      setData(getMockData());
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

  // Mock data for demonstration
  const getMockData = (): DivisionAccountantDashboardData => ({
    pendingLiquidations: [
      {
        id: "1",
        liquidationId: "LQN-ABC123",
        requestId: "REQ-001",
        schoolName: "Central Elementary School",
        schoolId: "SCH-001",
        submittedDate: "2024-01-15",
        daysPending: 12,
        totalAmount: 125000,
        status: "under_review_accountant",
        priority: "high"
      },
      {
        id: "2",
        liquidationId: "LQN-DEF456",
        requestId: "REQ-002",
        schoolName: "North High School",
        schoolId: "SCH-002",
        submittedDate: "2024-01-18",
        daysPending: 9,
        totalAmount: 89000,
        status: "under_review_division",
        priority: "medium"
      },
      {
        id: "3",
        liquidationId: "LQN-GHI789",
        requestId: "REQ-003",
        schoolName: "South Elementary School",
        schoolId: "SCH-003",
        submittedDate: "2024-01-20",
        daysPending: 7,
        totalAmount: 156000,
        status: "under_review_accountant",
        priority: "high"
      }
    ],
    liquidationAging: [
      { period: "0-7 days", count: 5, amount: 450000, color: "#00C49F" },
      { period: "8-14 days", count: 3, amount: 280000, color: "#FFBB28" },
      { period: "15-30 days", count: 2, amount: 195000, color: "#FF8042" },
      { period: "30+ days", count: 1, amount: 120000, color: "#FF6B6B" }
    ],
    expenseStatistics: [
      { category: "Travel Expenses", amount: 450000, percentage: 35, count: 23, trend: "up" },
      { category: "Training Expenses", amount: 280000, percentage: 22, count: 15, trend: "stable" },
      { category: "Office Supplies", amount: 195000, percentage: 15, count: 18, trend: "down" },
      { category: "Utilities", amount: 120000, percentage: 9, count: 12, trend: "up" },
      { category: "Communication", amount: 95000, percentage: 7, count: 8, trend: "stable" },
      { category: "Other", amount: 140000, percentage: 12, count: 11, trend: "up" }
    ],
    dashboardMetrics: {
      totalPending: 8,
      totalUnliquidated: 15,
      avgProcessingTime: 4.2,
      completionRate: 78.5,
      totalAmountPending: 1285000
    },
    recentActivity: [
      {
        id: "1",
        liquidationId: "LQN-JKL012",
        schoolName: "West Elementary School",
        action: "approved",
        timestamp: "2024-01-22T10:30:00Z",
        amount: 67500
      },
      {
        id: "2",
        liquidationId: "LQN-MNO345",
        schoolName: "East High School",
        action: "returned",
        timestamp: "2024-01-21T14:20:00Z",
        amount: 89000
      },
      {
        id: "3",
        liquidationId: "LQN-PQR678",
        schoolName: "Central Elementary School",
        action: "approved",
        timestamp: "2024-01-20T09:15:00Z",
        amount: 123000
      }
    ]
  });

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
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last_week">Last Week</SelectItem>
              <SelectItem value="last_month">Last Month</SelectItem>
              <SelectItem value="last_quarter">Last Quarter</SelectItem>
              <SelectItem value="last_year">Last Year</SelectItem>
            </SelectContent>
          </Select>
          
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
            <div className="text-2xl font-bold">
              {data?.dashboardMetrics.totalPending}
            </div>
            <p className="text-xs text-muted-foreground">Awaiting review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unliquidated Accounts</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data?.dashboardMetrics.totalUnliquidated}
            </div>
            <p className="text-xs text-muted-foreground">Outstanding accounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data?.dashboardMetrics.completionRate}%
            </div>
            <p className="text-xs text-muted-foreground">Overall completion</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Amount Pending</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₱{(data?.dashboardMetrics.totalAmountPending || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Total amount under review</p>
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
                      <School className="h-8 w-8 text-gray-400" />
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
                  <CheckCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
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
                    {data?.expenseStatistics.map((entry, index) => (
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

      {/* Second Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Aging Report */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Liquidation Aging Report
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.liquidationAging}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E4E7EC" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip
                    formatter={(value, name) => {
                      if (name === "amount") return [`₱${Number(value).toLocaleString()}`, "Amount"];
                      return [value, "Count"];
                    }}
                  />
                  <Legend />
                  <Bar dataKey="count" name="Number of Liquidations" fill="#465FFF" />
                  <Bar dataKey="amount" name="Total Amount" fill="#00C49F" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {data?.liquidationAging.map((item) => (
                <div key={item.period} className="flex items-center justify-between text-sm">
                  <div className="flex items-center">
                    <div
                      className="w-3 h-3 rounded-full mr-2"
                      style={{ backgroundColor: item.color }}
                    />
                    <span>{item.period}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-medium">{item.count} liquidations</span>
                    <span className="text-gray-500 ml-2">₱{item.amount.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data?.recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg dark:border-gray-800"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-full ${
                      activity.action === 'approved' 
                        ? 'bg-green-100 text-green-600 dark:bg-green-900/20' 
                        : 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/20'
                    }`}>
                      {activity.action === 'approved' ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <AlertCircle className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {activity.liquidationId}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {activity.schoolName}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(activity.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900 dark:text-white">
                      ₱{activity.amount.toLocaleString()}
                    </p>
                    <Badge
                      color={activity.action === 'approved' ? "success" : "warning"}
                      className="mt-1"
                    >
                      {activity.action}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="ghost" className="w-full mt-4" size="sm">
              View All Activity
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DivisionAccountantDashboard;