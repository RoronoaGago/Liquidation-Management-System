import React, { useState, useEffect } from "react";
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
  LineChart as LineChartIcon,
  Settings,
  RefreshCw,
  Users,
  School,
  FileText,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  Grid,
  Save,
  Edit,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import api from "@/api/axios";
import { Responsive, WidthProvider } from "react-grid-layout";
import Badge from "@/components/ui/badge/Badge";
import { Skeleton, Switch } from "antd";
import Toggle from "@/components/form/Toggle";

const ResponsiveGridLayout = WidthProvider(Responsive);

// Types for our data
interface DashboardData {
  budgetUtilization: BudgetUtilizationData[];
  requestStatusDistribution: StatusData[];
  liquidationTimeline: TimelineData[];
  schoolPerformance: SchoolPerformanceData[];
  categorySpending: CategoryData[];
  documentCompliance: ComplianceData[];
  topPriorities: PriorityData[];
  pendingActions: ActionItem[];
}

interface BudgetUtilizationData {
  month: string;
  allocated: number;
  utilized: number;
  utilizationRate: number;
}

interface StatusData {
  status: string;
  count: number;
  percentage: number;
}

interface TimelineData {
  month: string;
  avgProcessingTime: number;
  approved: number;
  rejected: number;
}

interface SchoolPerformanceData {
  schoolId: string;
  schoolName: string;
  totalRequests: number;
  approvedRequests: number;
  rejectionRate: number;
  avgProcessingTime: number;
  budgetUtilization: number;
}

interface CategoryData {
  category: string;
  totalAmount: number;
  percentage: number;
  trend: "up" | "down" | "stable";
}

interface ComplianceData {
  requirement: string;
  totalSubmitted: number;
  compliant: number;
  complianceRate: number;
}

interface PriorityData {
  priority: string;
  frequency: number;
  totalAmount: number;
  trend: "up" | "down" | "stable";
}

interface ActionItem {
  id: string;
  type: "request" | "liquidation" | "user";
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  timestamp: string;
}

interface DashboardLayout {
  lg: Layout[];
  md: Layout[];
  sm: Layout[];
}

interface Layout {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
}

const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884D8",
  "#82CA9D",
];

// Default layouts for different screen sizes
const defaultLayouts: DashboardLayout = {
  lg: [
    { i: "metrics", x: 0, y: 0, w: 12, h: 2, minW: 4, minH: 2 },
    { i: "budget", x: 0, y: 2, w: 6, h: 6, minW: 4, minH: 4 },
    { i: "status", x: 6, y: 2, w: 6, h: 6, minW: 4, minH: 4 },
    { i: "timeline", x: 0, y: 8, w: 12, h: 6, minW: 6, minH: 4 },
    { i: "performance", x: 0, y: 14, w: 12, h: 8, minW: 6, minH: 6 },
    { i: "categories", x: 0, y: 22, w: 6, h: 8, minW: 4, minH: 6 },
    { i: "actions", x: 6, y: 22, w: 6, h: 8, minW: 4, minH: 6 },
  ],
  md: [
    { i: "metrics", x: 0, y: 0, w: 8, h: 2, minW: 4, minH: 2 },
    { i: "budget", x: 0, y: 2, w: 8, h: 6, minW: 4, minH: 4 },
    { i: "status", x: 0, y: 8, w: 8, h: 6, minW: 4, minH: 4 },
    { i: "timeline", x: 0, y: 14, w: 8, h: 6, minW: 6, minH: 4 },
    { i: "performance", x: 0, y: 20, w: 8, h: 8, minW: 6, minH: 6 },
    { i: "categories", x: 0, y: 28, w: 8, h: 8, minW: 4, minH: 6 },
    { i: "actions", x: 0, y: 36, w: 8, h: 8, minW: 4, minH: 6 },
  ],
  sm: [
    { i: "metrics", x: 0, y: 0, w: 4, h: 2, minW: 4, minH: 2 },
    { i: "budget", x: 0, y: 2, w: 4, h: 6, minW: 4, minH: 4 },
    { i: "status", x: 0, y: 8, w: 4, h: 6, minW: 4, minH: 4 },
    { i: "timeline", x: 0, y: 14, w: 4, h: 6, minW: 4, minH: 4 },
    { i: "performance", x: 0, y: 20, w: 4, h: 8, minW: 4, minH: 6 },
    { i: "categories", x: 0, y: 28, w: 4, h: 8, minW: 4, minH: 6 },
    { i: "actions", x: 0, y: 36, w: 4, h: 8, minW: 4, minH: 6 },
  ],
};

// Widget components
const MetricsWidget = ({ data }: { data: DashboardData | null }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 h-full">
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          Avg. Processing Time
        </CardTitle>
        <Clock className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {data?.liquidationTimeline[
            data.liquidationTimeline.length - 1
          ]?.avgProcessingTime.toFixed(1) || 0}{" "}
          days
        </div>
        <p className="text-xs text-muted-foreground">
          -2.5% from previous period
        </p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          Budget Utilization Rate
        </CardTitle>
        <BarChart3 className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {data?.budgetUtilization[
            data.budgetUtilization.length - 1
          ]?.utilizationRate.toFixed(1) || 0}
          %
        </div>
        <p className="text-xs text-muted-foreground">
          +5.2% from previous period
        </p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          Document Compliance
        </CardTitle>
        <FileText className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {data?.documentCompliance.reduce(
            (acc, curr) => acc + curr.complianceRate,
            0
          ) / (data?.documentCompliance.length || 1) || 0}
          %
        </div>
        <p className="text-xs text-muted-foreground">
          +3.1% from previous period
        </p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Pending Actions</CardTitle>
        <AlertCircle className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {data?.pendingActions.length || 0}
        </div>
        <p className="text-xs text-muted-foreground">
          {data?.pendingActions.filter((a) => a.priority === "high").length ||
            0}{" "}
          high priority
        </p>
      </CardContent>
    </Card>
  </div>
);

const BudgetWidget = ({ data }: { data: DashboardData | null }) => (
  <Card className="h-full">
    <CardHeader>
      <CardTitle>Budget Utilization Over Time</CardTitle>
    </CardHeader>
    <CardContent className="h-[calc(100%-80px)]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data?.budgetUtilization || []}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip
            formatter={(value) => [
              `₱${Number(value).toLocaleString()}`,
              "Amount",
            ]}
          />
          <Area
            type="monotone"
            dataKey="allocated"
            stackId="1"
            stroke="#8884d8"
            fill="#8884d8"
          />
          <Area
            type="monotone"
            dataKey="utilized"
            stackId="2"
            stroke="#82ca9d"
            fill="#82ca9d"
          />
        </AreaChart>
      </ResponsiveContainer>
    </CardContent>
  </Card>
);

const StatusWidget = ({ data }: { data: DashboardData | null }) => (
  <Card className="h-full">
    <CardHeader>
      <CardTitle>Request Status Distribution</CardTitle>
    </CardHeader>
    <CardContent className="h-[calc(100%-80px)]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data?.requestStatusDistribution || []}
            cx="50%"
            cy="50%"
            outerRadius={80}
            fill="#8884d8"
            dataKey="count"
            label={({ status, percentage }) => `${status} (${percentage}%)`}
          >
            {data?.requestStatusDistribution.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip formatter={(value, name) => [`${value} requests`, name]} />
        </PieChart>
      </ResponsiveContainer>
    </CardContent>
  </Card>
);

const TimelineWidget = ({ data }: { data: DashboardData | null }) => (
  <Card className="h-full">
    <CardHeader>
      <CardTitle>Processing Timeline</CardTitle>
    </CardHeader>
    <CardContent className="h-[calc(100%-80px)]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data?.liquidationTimeline || []}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis yAxisId="left" />
          <YAxis yAxisId="right" orientation="right" />
          <Tooltip />
          <Legend />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="avgProcessingTime"
            stroke="#8884d8"
            activeDot={{ r: 8 }}
            name="Avg. Processing Time (days)"
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="approved"
            stroke="#82ca9d"
            name="Approved Requests"
          />
        </LineChart>
      </ResponsiveContainer>
    </CardContent>
  </Card>
);

const PerformanceWidget = ({ data }: { data: DashboardData | null }) => {
  const renderTrendIcon = (trend: "up" | "down" | "stable") => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "down":
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <span className="h-4 w-4 text-gray-500">─</span>;
    }
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>School Performance Metrics</span>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="h-[calc(100%-80px)] overflow-auto">
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="p-4 text-left font-medium">School</th>
                <th className="p-4 text-left font-medium">Total Requests</th>
                <th className="p-4 text-left font-medium">Approval Rate</th>
                <th className="p-4 text-left font-medium">
                  Avg. Processing Time
                </th>
                <th className="p-4 text-left font-medium">
                  Budget Utilization
                </th>
              </tr>
            </thead>
            <tbody>
              {data?.schoolPerformance.map((school, index) => (
                <tr
                  key={school.schoolId}
                  className={index % 2 === 0 ? "bg-muted/30" : ""}
                >
                  <td className="p-4 font-medium">{school.schoolName}</td>
                  <td className="p-4">{school.totalRequests}</td>
                  <td className="p-4">
                    <div className="flex items-center">
                      {(
                        (school.approvedRequests / school.totalRequests) *
                        100
                      ).toFixed(1)}
                      %
                      {school.rejectionRate > 20 ? (
                        <TrendingDown className="ml-2 h-4 w-4 text-red-500" />
                      ) : (
                        <TrendingUp className="ml-2 h-4 w-4 text-green-500" />
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    {school.avgProcessingTime.toFixed(1)} days
                  </td>
                  <td className="p-4">
                    <div className="flex items-center">
                      {school.budgetUtilization}%
                      <div className="ml-2 w-24 bg-secondary rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{ width: `${school.budgetUtilization}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

const CategoriesWidget = ({ data }: { data: DashboardData | null }) => {
  const renderTrendIcon = (trend: "up" | "down" | "stable") => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "down":
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <span className="h-4 w-4 text-gray-500">─</span>;
    }
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Top Spending Categories</CardTitle>
      </CardHeader>
      <CardContent className="h-[calc(100%-80px)] overflow-auto">
        <div className="space-y-4">
          {data?.categorySpending.map((category, index) => (
            <div
              key={category.category}
              className="flex items-center justify-between"
            >
              <div className="flex items-center">
                <div
                  className="w-3 h-3 rounded-full mr-2"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                ></div>
                <span className="font-medium">{category.category}</span>
                {renderTrendIcon(category.trend)}
              </div>
              <div className="text-right">
                <div className="font-semibold">
                  ₱{category.totalAmount.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">
                  {category.percentage}% of total
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

const ActionsWidget = ({ data }: { data: DashboardData | null }) => (
  <Card className="h-full">
    <CardHeader>
      <CardTitle>Pending Actions</CardTitle>
    </CardHeader>
    <CardContent className="h-[calc(100%-80px)] overflow-auto">
      <div className="space-y-4">
        {data?.pendingActions.slice(0, 5).map((action) => (
          <div
            key={action.id}
            className="flex items-start justify-between p-3 border rounded-lg"
          >
            <div className="space-y-1">
              <div className="font-medium">{action.title}</div>
              <div className="text-sm text-muted-foreground">
                {action.description}
              </div>
              <div className="text-xs text-muted-foreground">
                {new Date(action.timestamp).toLocaleDateString()}
              </div>
            </div>
            <Badge
              variant={
                action.priority === "high"
                  ? "destructive"
                  : action.priority === "medium"
                  ? "default"
                  : "secondary"
              }
            >
              {action.priority}
            </Badge>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

const AdminDashboard = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<string>("last_quarter");
  const [activeView, setActiveView] = useState<string>("overview");
  const [refreshing, setRefreshing] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [layouts, setLayouts] = useState<DashboardLayout>(defaultLayouts);
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  useEffect(() => {
    fetchDashboardData();
    // Load saved layout from localStorage
    const savedLayout = localStorage.getItem("dashboardLayout");
    if (savedLayout) {
      setLayouts(JSON.parse(savedLayout));
    }
  }, [timeRange]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await api.get(
        `/admin-dashboard/?time_range=${timeRange}`
      );
      setData(response.data);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const handleLayoutChange = (currentLayout: any, allLayouts: any) => {
    setLayouts(allLayouts);
  };

  const saveLayout = () => {
    localStorage.setItem("dashboardLayout", JSON.stringify(layouts));
    setShowSaveDialog(true);
    setTimeout(() => setShowSaveDialog(false), 2000);
  };

  const resetLayout = () => {
    setLayouts(defaultLayouts);
    localStorage.removeItem("dashboardLayout");
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mt-2" />
                <Skeleton className="h-4 w-32 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Performance metrics and analytics for the MOOE system
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="mr-2 h-4 w-4" />
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
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>

          <Toggle pressed={editMode} onPressedChange={setEditMode}>
            {editMode ? (
              <>
                <Grid className="mr-2 h-4 w-4" />
                Editing Layouts
              </>
            ) : (
              <>
                <Edit className="mr-2 h-4 w-4" />
                Edit Layout
              </>
            )}
          </Toggle>

          {editMode && (
            <>
              <Button variant="outline" onClick={saveLayout}>
                <Save className="mr-2 h-4 w-4" />
                Save Layout
              </Button>
              <Button variant="outline" onClick={resetLayout}>
                Reset Layout
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Draggable Dashboard Grid */}
      <ResponsiveGridLayout
        className="layout"
        layouts={layouts}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 8, sm: 4, xs: 4, xxs: 4 }}
        rowHeight={100}
        isDraggable={editMode}
        isResizable={editMode}
        onLayoutChange={handleLayoutChange}
        margin={[16, 16]}
        containerPadding={[0, 0]}
      >
        <div key="metrics" className="dashboard-widget">
          <MetricsWidget data={data} />
        </div>
        <div key="budget" className="dashboard-widget">
          <BudgetWidget data={data} />
        </div>
        <div key="status" className="dashboard-widget">
          <StatusWidget data={data} />
        </div>
        <div key="timeline" className="dashboard-widget">
          <TimelineWidget data={data} />
        </div>
        <div key="performance" className="dashboard-widget">
          <PerformanceWidget data={data} />
        </div>
        <div key="categories" className="dashboard-widget">
          <CategoriesWidget data={data} />
        </div>
        <div key="actions" className="dashboard-widget">
          <ActionsWidget data={data} />
        </div>
      </ResponsiveGridLayout>

      {/* Save Confirmation Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Dashboard Layout Saved</DialogTitle>
            <DialogDescription>
              Your dashboard layout has been successfully saved. It will be
              restored the next time you visit.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      <style jsx>{`
        .dashboard-widget {
          height: 100%;
          width: 100%;
        }

        .react-grid-item {
          transition: all 200ms ease;
          transition-property: left, top;
        }

        .react-grid-item.cssTransforms {
          transition-property: transform;
        }

        .react-grid-item.resizing {
          z-index: 1;
          will-change: width, height;
        }

        .react-grid-item.react-draggable-dragging {
          transition: none;
          z-index: 3;
          will-change: transform;
        }

        .react-grid-item.react-grid-placeholder {
          background: #f0f0f0;
          opacity: 0.2;
          transition-duration: 100ms;
          z-index: 2;
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          -o-user-select: none;
          user-select: none;
        }
      `}</style>
    </div>
  );
};

export default AdminDashboard;
