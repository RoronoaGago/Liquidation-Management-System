/* eslint-disable @typescript-eslint/no-unused-vars */
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Badge from "@/components/ui/badge/Badge";
import { Skeleton } from "antd";

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

const dummyData: SchoolHeadDashboardData = {
  liquidationProgress: {
    priorities: [
      {
        priorityId: "1",
        priorityName: "School Supplies",
        status: "completed",
        documentsRequired: 5,
        documentsUploaded: 5,
        completionPercentage: 100,
      },
      {
        priorityId: "2",
        priorityName: "Facility Repairs",
        status: "in_progress",
        documentsRequired: 8,
        documentsUploaded: 6,
        completionPercentage: 75,
      },
      {
        priorityId: "3",
        priorityName: "Teacher Training",
        status: "not_started",
        documentsRequired: 4,
        documentsUploaded: 0,
        completionPercentage: 0,
      },
    ],
    totalPriorities: 3,
    completedPriorities: 1,
    completionPercentage: 58.3,
  },
  financialMetrics: {
    totalDownloadedAmount: 150000,
    totalLiquidatedAmount: 90000,
    liquidationPercentage: 60,
    remainingAmount: 60000,
  },
  recentLiquidations: [
    {
      id: "l1",
      priorityName: "School Supplies",
      amount: 50000,
      status: "approved",
      date: "2025-09-10",
    },
    {
      id: "l2",
      priorityName: "Facility Repairs",
      amount: 30000,
      status: "submitted",
      date: "2025-09-12",
    },
    {
      id: "l3",
      priorityName: "Teacher Training",
      amount: 10000,
      status: "draft",
      date: "2025-09-15",
    },
  ],
  priorityBreakdown: [
    {
      priority: "School Supplies",
      amount: 50000,
      percentage: 33.3,
      color: "#465FFF",
      name: "School Supplies",
    },
    {
      priority: "Facility Repairs",
      amount: 70000,
      percentage: 46.7,
      color: "#FF8042",
      name: "Facility Repairs",
    },
    {
      priority: "Teacher Training",
      amount: 30000,
      percentage: 20,
      color: "#00C49F",
      name: "Teacher Training",
    },
  ],
};

const SchoolHeadDashboard = () => {
  const [data, setData] = useState<SchoolHeadDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const getPriorityColor = (priorityName: string, fallbackIndex = 0) => {
    const index = data?.liquidationProgress.priorities.findIndex(
      (p) => p.priorityName === priorityName
    );
    const colorIndex =
      index !== undefined && index !== -1 ? index : fallbackIndex;
    return COLORS[colorIndex % COLORS.length];
  };

  useEffect(() => {
    // Simulate loading
    setLoading(true);
    setTimeout(() => {
      setData(dummyData);
      setLoading(false);
      setRefreshing(false);
    }, 800);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setData(dummyData);
      setLoading(false);
      setRefreshing(false);
    }, 800);
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
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
    }
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
        <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw
            className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
          />
          {refreshing ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Liquidation Completion
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data?.liquidationProgress.completionPercentage.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {data?.liquidationProgress.completedPriorities} of{" "}
              {data?.liquidationProgress.totalPriorities} priorities
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Amount Liquidated
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₱{data?.financialMetrics.totalLiquidatedAmount.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {data?.financialMetrics.liquidationPercentage.toFixed(1)}% of
              downloaded amount
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Remaining Amount
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₱{data?.financialMetrics.remainingAmount.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">To be liquidated</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Downloaded
            </CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₱{data?.financialMetrics.totalDownloadedAmount.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Initial cash advance
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Detailed Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-4">
        {/* Financial Breakdown (moved left) */}
        <Card>
          <CardHeader>
            <CardTitle>Financial Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data?.priorityBreakdown?.map((item) => ({
                      ...item,
                      name: item.priority, // Ensure 'name' property exists
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
                    {data?.priorityBreakdown?.map((entry, index) => (
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
            </div>
          </CardContent>
        </Card>

        {/* Priority Completion Chart (moved right) */}
        <Card>
          <CardHeader>
            <CardTitle>Priority Completion Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart
                  innerRadius="10%"
                  outerRadius="100%"
                  data={data?.liquidationProgress.priorities.map(
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
                  {/* ensure each arc color matches the same color mapping */}
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
            {/* External Legend */}
            <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-900">
              {data?.liquidationProgress.priorities.map((p, index) => (
                <div key={p.priorityId} className="flex items-center gap-2">
                  <span
                    className="inline-block h-3 w-3 rounded-sm"
                    style={{
                      backgroundColor: getPriorityColor(p.priorityName, index),
                    }}
                  />
                  <span className="font-semibold">{p.priorityName}</span>
                  <span className="text-slate-500">
                    - {p.completionPercentage}%
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Priority Progress Details */}
      <Card className="mb-6">
        <CardHeader className="flex items-center justify-between">
          <CardTitle>List of Priority Document Progress</CardTitle>
          <a href="/liquidation">
            <Button className="mb-4" size="sm" variant="outline">
              View Details
            </Button>
          </a>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-3 text-left font-medium">Priority</th>
                  <th className="p-3 text-left font-medium">Status</th>
                  <th className="p-3 text-left font-medium">Documents</th>
                  <th className="p-3 text-left font-medium">Completion</th>
                </tr>
              </thead>
              <tbody>
                {data?.liquidationProgress.priorities.map((priority) => (
                  <tr key={priority.priorityId} className="border-b">
                    <td className="p-3 font-medium">{priority.priorityName}</td>
                    <td className="p-3">{getStatusBadge(priority.status)}</td>
                    <td className="p-3">
                      {priority.documentsUploaded} of{" "}
                      {priority.documentsRequired}
                    </td>
                    <td className="p-3">
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div
                          className="h-2.5 rounded-full"
                          style={{
                            width: `${priority.completionPercentage}%`,
                            backgroundColor: getPriorityColor(
                              priority.priorityName
                            ),
                          }}
                        ></div>
                      </div>
                      <span className="text-xs text-muted-foreground mt-1">
                        {priority.completionPercentage}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SchoolHeadDashboard;
