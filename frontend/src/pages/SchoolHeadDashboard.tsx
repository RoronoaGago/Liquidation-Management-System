import api from "@/services/api";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  RadialBarChart,
  RadialBar,
} from "recharts";
import {
  Download,
  AlertCircle,
  CheckCircle,
  DollarSign,
  RefreshCw,
  Plus,
  FileText,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Badge from "@/components/ui/badge/Badge";
import { Skeleton } from "antd";
import { useNavigate } from "react-router-dom";
import {
  MetricCard,
  PriorityProgressTable,
  RequestStatusCard,
} from "@/components/ui/dashboard";

// Types for our data
interface SchoolHeadDashboardData {
  liquidationProgress: {
    priorities: PriorityProgress[];
    totalPriorities: number;
    completedPriorities: number;
    completionPercentage: number;
  };
  financialMetrics: {
    totalDownloadedAmount: number;
    totalLiquidatedAmount: number;
    liquidationPercentage: number;
    remainingAmount: number;
  };
  recentLiquidations: LiquidationItem[];
  priorityBreakdown: PriorityBreakdownItem[];
  requestStatus?: {
    hasPendingRequest: boolean;
    hasActiveLiquidation: boolean;
    pendingRequest?: {
      request_id: string;
      status: string;
      request_monthyear: string;
      created_at: string;
      school_name?: string;
      school_id?: string;
      division?: string;
      total_amount?: number;
      priorities?: {
        expenseTitle: string;
        amount: number;
        description?: string;
      }[];
    };
    activeLiquidation?: {
      LiquidationID: string;
      status: string;
      created_at: string;
    };
  };
  frequentlyUsedPriorities?: {
    priority: string;
    frequency: number;
    totalAmount: number;
    lastUsed: string;
  }[];
  recentRequests?: {
    request_id: string;
    status: string;
    request_monthyear: string;
    created_at: string;
    total_amount: number;
    priorities: {
      expenseTitle: string;
      amount: number;
    }[];
  }[];
}

interface PriorityProgress {
  priorityId: string;
  priorityName: string;
  status: "not_started" | "in_progress" | "completed";
  documentsRequired: number;
  documentsUploaded: number;
  completionPercentage: number;
}

interface LiquidationItem {
  id: string;
  priorityName: string;
  amount: number;
  status: "draft" | "submitted" | "under_review" | "approved" | "rejected";
  date: string;
}

interface PriorityBreakdownItem {
  priority: string;
  amount: number;
  percentage: number;
  color: string;
  name: string; // Add this property for recharts compatibility
}

const COLORS = [
  "#465FFF",
  "#9CB9FF",
  "#FF8042",
  "#00C49F",
  "#FFBB28",
  "#8884D8",
];

const SchoolHeadDashboard = () => {
  const [data, setData] = useState<SchoolHeadDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [, setRefreshing] = useState(false);
  const [showRequestStatus, setShowRequestStatus] = useState(false);
  const navigate = useNavigate();

  const getPriorityColor = (priorityName: string, fallbackIndex = 0) => {
    const index = data?.liquidationProgress.priorities.findIndex(
      (p) => p.priorityName === priorityName
    );
    const colorIndex =
      index !== undefined && index !== -1 ? index : fallbackIndex;
    return COLORS[colorIndex % COLORS.length];
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const response = await api.get("/school-head/dashboard/");
      setData(response.data);
      setLoading(false);
      setRefreshing(false);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setData(null);
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case "in_progress":
        return <Badge className="bg-blue-100 text-blue-800">In Progress</Badge>;
      case "not_started":
        return <Badge className="bg-gray-100 text-gray-800">Not Started</Badge>;
      case "approved":
        return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
      case "submitted":
        return <Badge className="bg-blue-100 text-blue-800">Submitted</Badge>;
      case "under_review":
        return (
          <Badge className="bg-yellow-100 text-yellow-800">Under Review</Badge>
        );
      case "rejected":
        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
      case "downloaded":
        return (
          <Badge className="bg-purple-100 text-purple-800">Downloaded</Badge>
        );
      case "unliquidated":
        return (
          <Badge className="bg-orange-100 text-orange-800">Unliquidated</Badge>
        );
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
    }
  };

  const handleCreateMOOERequest = () => {
    navigate("/prepare-list-of-priorities");
  };

  const handleViewRequestStatus = () => {
    setShowRequestStatus(true);
  };

  const handleCloseRequestStatus = () => {
    setShowRequestStatus(false);
  };

  const handleGoToLiquidation = () => {
    navigate("/liquidation");
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              School Head Dashboard
            </h1>
            <p className="mt-1 text-gray-500">
              Liquidation progress and financial metrics
            </p>
          </div>
          <Button variant="outline" disabled>
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            Loading...
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {[1, 2, 3, 4].map((item) => (
            <Skeleton key={item} active paragraph={{ rows: 3 }} />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map((item) => (
            <Skeleton key={item} active paragraph={{ rows: 6 }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            School Head Dashboard
          </h1>
          <p className="mt-1 text-gray-500">
            Liquidation progress and financial metrics
          </p>
        </div>
        <div className="flex gap-3">
          {!data?.requestStatus?.hasPendingRequest &&
            !data?.requestStatus?.hasActiveLiquidation && (
              <Button
                onClick={handleCreateMOOERequest}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                New MOOE Request
              </Button>
            )}
          {data?.requestStatus?.hasPendingRequest && (
            <Button
              onClick={
                showRequestStatus
                  ? handleCloseRequestStatus
                  : handleViewRequestStatus
              }
              variant="outline"
              className="border-blue-200 text-blue-600 hover:bg-blue-50"
            >
              <Eye className="h-4 w-4 mr-2" />
              {showRequestStatus
                ? "Hide Request Status"
                : "View Request Status"}
            </Button>
          )}
          {data?.requestStatus?.hasActiveLiquidation && (
            <Button
              onClick={handleGoToLiquidation}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <FileText className="h-4 w-4 mr-2" />
              Go to Liquidation
            </Button>
          )}
        </div>
      </div>
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <MetricCard
          title="Liquidation Completion"
          value={
            data?.liquidationProgress?.completionPercentage !== undefined
              ? `${data.liquidationProgress.completionPercentage.toFixed(1)}%`
              : "0%"
          }
          description={
            data?.liquidationProgress
              ? `${data.liquidationProgress.completedPriorities} of ${data.liquidationProgress.totalPriorities} list of priorities`
              : "0 of 0 list of priorities"
          }
          icon={CheckCircle}
        />
        <MetricCard
          title="Amount Liquidated"
          value={
            data?.financialMetrics?.totalLiquidatedAmount !== undefined
              ? `₱${data.financialMetrics.totalLiquidatedAmount.toLocaleString()}`
              : "₱0"
          }
          description={
            data?.financialMetrics?.liquidationPercentage !== undefined
              ? `${data.financialMetrics.liquidationPercentage.toFixed(
                  1
                )}% of downloaded amount`
              : "0% of downloaded amount"
          }
          icon={DollarSign}
        />
        <MetricCard
          title="Remaining Amount"
          value={
            data?.financialMetrics?.remainingAmount !== undefined
              ? `₱${data.financialMetrics.remainingAmount.toLocaleString()}`
              : "₱0"
          }
          description="To be liquidated"
          icon={AlertCircle}
        />
        <MetricCard
          title="Total Downloaded"
          value={
            data?.financialMetrics?.totalDownloadedAmount !== undefined
              ? `₱${data.financialMetrics.totalDownloadedAmount.toLocaleString()}`
              : "₱0"
          }
          description="Initial cash advance"
          icon={Download}
        />
      </div>
      {/* Request Status View (shows overview when button is clicked) */}
      {showRequestStatus && (
        <div className="mb-6">
          {data?.requestStatus?.pendingRequest ? (
            <RequestStatusCard
              request={data.requestStatus.pendingRequest}
              getStatusBadge={getStatusBadge}
              getPriorityColor={getPriorityColor}
            />
          ) : (
            <div className="p-6 text-center text-gray-500 border rounded bg-gray-50">
              No request status available yet.
            </div>
          )}
        </div>
      )}
      {/* Charts and Detailed Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-4">
        {/* Expense Breakdown (moved left) */}
        <Card>
          <CardHeader>
            <CardTitle>
              {data?.requestStatus?.pendingRequest?.request_monthyear
                ? `${new Date(
                    data.requestStatus.pendingRequest.request_monthyear + "-01"
                  ).toLocaleString("default", { month: "long" })}, ${
                    data.requestStatus.pendingRequest.request_monthyear.split(
                      "-"
                    )[0]
                  } Expense Breakdown`
                : "Month Expense Breakdown"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {data?.priorityBreakdown && data.priorityBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.priorityBreakdown.map((item) => ({
                        ...item,
                        name: item.priority,
                      }))}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="amount"
                      label={({ name, percent }) =>
                        `${name} (${(Number(percent) * 100).toFixed(0)}%)`
                      }
                    >
                      {data.priorityBreakdown.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={getPriorityColor(entry.priority, index)}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => [
                        `₱${Number(value).toLocaleString()}`,
                        "Amount",
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  No expense breakdown data available.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* List of Priority Completion Chart (moved right) */}
        <Card>
          <CardHeader>
            <CardTitle>List of Priority Completion Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {data?.liquidationProgress?.priorities &&
              data.liquidationProgress.priorities.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart
                    innerRadius="10%"
                    outerRadius="100%"
                    data={data.liquidationProgress.priorities.map(
                      (p, index) => ({
                        name: p.priorityName,
                        value: p.completionPercentage,
                        fill: COLORS[index % COLORS.length],
                      })
                    )}
                  >
                    <RadialBar background dataKey="value" />
                    <Tooltip
                      formatter={(value) => [`${value}%`, "Completion"]}
                      contentStyle={{
                        backgroundColor: "#111827",
                        border: "none",
                        borderRadius: 6,
                        color: "#FFFFFF",
                      }}
                      labelStyle={{ color: "#FFFFFF" }}
                      itemStyle={{ color: "#FFFFFF" }}
                    />
                  </RadialBarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  No priority completion data available.
                </div>
              )}
            </div>
            {/* External Legend */}
            <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-900">
              {data?.liquidationProgress?.priorities &&
              data.liquidationProgress.priorities.length > 0 ? (
                data.liquidationProgress.priorities.map((p, index) => (
                  <div key={p.priorityId} className="flex items-center gap-2">
                    <span
                      className="inline-block h-3 w-3 rounded-sm"
                      style={{
                        backgroundColor: getPriorityColor(
                          p.priorityName,
                          index
                        ),
                      }}
                    />
                    <span className="font-semibold">{p.priorityName}</span>
                    <span className="text-slate-500">
                      - {p.completionPercentage}%
                    </span>
                  </div>
                ))
              ) : (
                <span className="text-gray-500">No priorities to display.</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Priority Progress Details */}
      <PriorityProgressTable
        priorities={data?.liquidationProgress?.priorities || []}
        getPriorityColor={getPriorityColor}
        getStatusBadge={getStatusBadge}
        onViewDetails={() => window.open("/liquidation", "_blank")}
      />
    </div>
  );
};

export default SchoolHeadDashboard;
