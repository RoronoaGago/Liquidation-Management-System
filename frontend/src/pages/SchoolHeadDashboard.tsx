/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import Button from "@/components/ui/button/Button";
import {
  PhilippinePeso,
  FileText,
  Activity,
  Clock,
  CheckCircle,
  AlertCircle,
  Eye,
  Plus,
  Download,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart as PieChartIcon,
  Filter,
  Calendar,
} from "lucide-react";
import {
  Card,
  Progress,
  Table,
  Tag,
  Row,
  Col,
  Skeleton,
  Typography,
  Tooltip,
  Empty,
  Select,
} from "antd";
import { formatCurrency } from "@/lib/helpers";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import api from "@/api/axios";

const { Title, Text } = Typography;
const { Option } = Select;

interface PrioritySummary {
  id: string | number;
  title: string;
  requestedAmount?: number;
  actualAmount?: number;
  downloadedAmount?: number;
  completion: number; // Percentage based on documents
  status: "completed" | "partial" | "pending";
}

interface DashboardData {
  yearlyBudget: number;
  monthlyBudget: number;
  totalRequested: number;
  totalActual: number;
  requestProgress: number;
  liquidationProgress: number;
  currentPriorities: PrioritySummary[];
  remainingDays?: number;
  currentMonth: string;
  mode: "request" | "liquidation";
  recentActivity: any[];
  liquidatedAmount: number;
  downloadedAmount: number;
  budgetUtilization: BudgetUtilizationData[];
  liquidationTimeline: TimelineData[];
  categorySpending: CategoryData[];
  documentCompliance: ComplianceData[];
}

interface BudgetUtilizationData {
  month: string;
  allocated: number;
  planned: number;
  actual: number;
  plannedUtilizationRate: number;
  actualUtilizationRate: number;
}

interface TimelineData {
  month: string;
  avgProcessingTime: number;
  approved: number;
  rejected: number;
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

const COLORS = [
  "#465FFF",
  "#9CB9FF",
  "#FF8042",
  "#00C49F",
  "#FFBB28",
  "#8884D8",
];

const WidgetContainer = ({
  title,
  subtitle,
  children,
  actions,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) => {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 h-full overflow-hidden">
      <div className="flex justify-between items-start mb-5">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 truncate">
            {title}
          </h3>
          {subtitle && (
            <p className="mt-1 text-gray-500 text-theme-sm dark:text-gray-400 truncate">
              {subtitle}
            </p>
          )}
        </div>
        <div className="no-drag">{actions}</div>
      </div>
      <div className="h-full">{children}</div>
    </div>
  );
};

const BudgetWidget = ({ data }: { data: DashboardData | null }) => {
  return (
    <WidgetContainer
      title="Budget Utilization"
      subtitle="Planned vs. actual spending"
    >
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data?.budgetUtilization || []}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E4E7EC" />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: "#6B7280" }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: "#6B7280" }}
              tickFormatter={(value) => `₱${value / 1000}k`}
            />
            <RechartsTooltip
              formatter={(value, name) => {
                const formattedValue = `₱${Number(value).toLocaleString()}`;
                if (
                  name === "plannedUtilizationRate" ||
                  name === "actualUtilizationRate"
                ) {
                  return [
                    `${Number(value).toFixed(1)}%`,
                    name.includes("planned") ? "Planned %" : "Actual %",
                  ];
                }
                return [formattedValue, name];
              }}
              contentStyle={{
                backgroundColor: "#fff",
                border: "1px solid #E4E7EC",
                borderRadius: "8px",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="planned"
              stroke="#465FFF"
              strokeWidth={2}
              name="Planned Amount"
              dot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="actual"
              stroke="#00C49F"
              strokeWidth={2}
              name="Actual Amount"
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </WidgetContainer>
  );
};

const TimelineWidget = ({ data }: { data: DashboardData | null }) => {
  return (
    <WidgetContainer
      title="Liquidation Timeline"
      subtitle="Processing time and approvals"
    >
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data?.liquidationTimeline || []}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E4E7EC" />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: "#6B7280" }}
            />
            <YAxis
              yAxisId="left"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: "#6B7280" }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: "#6B7280" }}
            />
            <RechartsTooltip
              contentStyle={{
                backgroundColor: "#fff",
                border: "1px solid #E4E7EC",
                borderRadius: "8px",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
              }}
            />
            <Legend
              verticalAlign="top"
              height={36}
              iconType="circle"
              iconSize={10}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="avgProcessingTime"
              stroke="#465FFF"
              strokeWidth={2}
              activeDot={{ r: 6, fill: "#465FFF" }}
              name="Avg. Processing Time (days)"
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="approved"
              stroke="#9CB9FF"
              strokeWidth={2}
              name="Completed Liquidations"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </WidgetContainer>
  );
};

const CategoriesWidget = ({ data }: { data: DashboardData | null }) => {
  // Get top 5 categories, sorted by amount
  const topCategories = useMemo(() => {
    const items = data?.categorySpending ?? [];
    return items
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 5)
      .map((category, index) => ({
        ...category,
        rank: index + 1,
      }));
  }, [data?.categorySpending]);

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
    <WidgetContainer
      title="Spending Categories"
      subtitle="Top categories by spending amount"
    >
      <div className="space-y-4 overflow-auto max-h-[360px] pr-1 custom-scrollbar">
        {topCategories.map((category, index) => (
          <div
            key={category.category}
            className="flex items-center justify-between p-3 border border-gray-200 rounded-lg dark:border-gray-800"
          >
            <div className="flex items-center min-w-0 gap-2">
              <div className="w-6 h-6 flex items-center justify-center bg-blue-100 rounded-full mr-2 dark:bg-blue-900/20 shrink-0">
                <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                  #{category.rank}
                </span>
              </div>
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <span className="font-medium text-gray-800 text-theme-sm dark:text-white/90 truncate max-w-[120px]">
                {category.category}
              </span>
              {renderTrendIcon(category.trend)}
            </div>
            <div className="text-right">
              <div className="font-semibold text-gray-800 text-theme-sm dark:text-white/90">
                ₱{category.totalAmount.toLocaleString()}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {category.percentage}% of total
              </div>
            </div>
          </div>
        ))}
        {topCategories.length === 0 && (
          <div className="text-sm text-gray-500 dark:text-gray-400">
            No data available.
          </div>
        )}
      </div>
    </WidgetContainer>
  );
};

const ComplianceWidget = ({ data }: { data: DashboardData | null }) => {
  const items = data?.documentCompliance ?? [];

  const getComplianceColor = (rate: number) => {
    if (rate >= 90) return "text-green-600 dark:text-green-400";
    if (rate >= 70) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getComplianceStatus = (rate: number) => {
    if (rate >= 90) return "Excellent";
    if (rate >= 70) return "Good";
    if (rate >= 50) return "Fair";
    return "Poor";
  };

  return (
    <WidgetContainer
      title="Document Compliance"
      subtitle="Document upload progress"
    >
      <div className="space-y-3 overflow-auto max-h-[360px] pr-1">
        {items.slice(0, 8).map((item) => (
          <div
            key={item.requirement}
            className="flex items-center justify-between p-3 border border-gray-200 rounded-lg dark:border-gray-800"
          >
            <div className="flex items-center min-w-0 flex-1">
              <div className="min-w-0 flex-1">
                <div className="font-medium text-gray-800 text-theme-sm dark:text-white/90 truncate">
                  {item.requirement}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {item.compliant}/{item.totalSubmitted} documents
                </div>
              </div>
            </div>

            <div className="text-right shrink-0 ml-3">
              <div
                className={`font-semibold text-theme-sm ${getComplianceColor(
                  item.complianceRate
                )}`}
              >
                {item.complianceRate.toFixed(1)}%
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {getComplianceStatus(item.complianceRate)}
              </div>
            </div>
          </div>
        ))}

        {items.length === 0 && (
          <div className="text-sm text-gray-500 dark:text-gray-400">
            No document compliance data available.
          </div>
        )}
      </div>
    </WidgetContainer>
  );
};

const SchoolHeadDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState<string>("last_quarter");

  useEffect(() => {
    fetchDashboardData();
  }, [timeRange, user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      // In a real implementation, this would be an API call to get school-specific data
      // For now, we'll use the dummy data structure but add the new chart data
      setTimeout(() => {
        const enhancedDummyData: DashboardData = {
          yearlyBudget: 120000,
          monthlyBudget: 10000,
          totalRequested: 8000,
          totalActual: 7500,
          requestProgress: 60,
          liquidationProgress: 85,
          currentPriorities: [
            {
              id: 1,
              title: "Instructional Materials",
              requestedAmount: 3000,
              downloadedAmount: 3000,
              actualAmount: 3000,
              completion: 100,
              status: "completed",
            },
            {
              id: 2,
              title: "Repair and Maintenance",
              requestedAmount: 2500,
              downloadedAmount: 2500,
              actualAmount: 1875,
              completion: 75,
              status: "partial",
            },
            {
              id: 3,
              title: "Office Supplies",
              requestedAmount: 2000,
              downloadedAmount: 0,
              actualAmount: 0,
              completion: 0,
              status: "pending",
            },
            {
              id: 4,
              title: "Travel Expenses",
              requestedAmount: 500,
              downloadedAmount: 500,
              actualAmount: 250,
              completion: 50,
              status: "partial",
            },
          ],
          remainingDays: 15,
          currentMonth: "September 2025",
          mode: "request",
          recentActivity: [
            {
              id: 1,
              type: "request",
              action: "submitted",
              date: "2025-09-15",
              amount: 2500,
            },
            {
              id: 2,
              type: "liquidation",
              action: "approved",
              date: "2025-09-10",
              amount: 3000,
            },
            {
              id: 3,
              type: "request",
              action: "needs revision",
              date: "2025-09-05",
              amount: 1500,
            },
          ],
          liquidatedAmount: 5125,
          downloadedAmount: 6000,
          // New data for charts
          budgetUtilization: [
            {
              month: "2025-06",
              allocated: 10000,
              planned: 8000,
              actual: 7500,
              plannedUtilizationRate: 80,
              actualUtilizationRate: 75,
            },
            {
              month: "2025-07",
              allocated: 10000,
              planned: 8500,
              actual: 8200,
              plannedUtilizationRate: 85,
              actualUtilizationRate: 82,
            },
            {
              month: "2025-08",
              allocated: 10000,
              planned: 9000,
              actual: 8700,
              plannedUtilizationRate: 90,
              actualUtilizationRate: 87,
            },
          ],
          liquidationTimeline: [
            {
              month: "2025-06",
              avgProcessingTime: 12,
              approved: 5,
              rejected: 1,
            },
            {
              month: "2025-07",
              avgProcessingTime: 10,
              approved: 7,
              rejected: 0,
            },
            {
              month: "2025-08",
              avgProcessingTime: 8,
              approved: 9,
              rejected: 1,
            },
          ],
          categorySpending: [
            {
              category: "Instructional Materials",
              totalAmount: 12000,
              percentage: 30,
              trend: "up",
            },
            {
              category: "Repair and Maintenance",
              totalAmount: 9000,
              percentage: 22.5,
              trend: "stable",
            },
            {
              category: "Office Supplies",
              totalAmount: 8000,
              percentage: 20,
              trend: "down",
            },
            {
              category: "Travel Expenses",
              totalAmount: 6000,
              percentage: 15,
              trend: "up",
            },
            {
              category: "Training Expenses",
              totalAmount: 5000,
              percentage: 12.5,
              trend: "stable",
            },
          ],
          documentCompliance: [
            {
              requirement: "Receipts",
              totalSubmitted: 45,
              compliant: 42,
              complianceRate: 93.3,
            },
            {
              requirement: "Approval Forms",
              totalSubmitted: 38,
              compliant: 35,
              complianceRate: 92.1,
            },
            {
              requirement: "Delivery Reports",
              totalSubmitted: 28,
              compliant: 25,
              complianceRate: 89.3,
            },
            {
              requirement: "Attendance Sheets",
              totalSubmitted: 20,
              compliant: 18,
              complianceRate: 90.0,
            },
          ],
        };
        setData(enhancedDummyData);
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
      setLoading(false);
    } finally {
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton active paragraph={{ rows: 1 }} />
        <Row gutter={24}>
          <Col span={24}>
            <Skeleton active paragraph={{ rows: 4 }} />
          </Col>
        </Row>
        <Skeleton active paragraph={{ rows: 8 }} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <p className="text-gray-500">No data available</p>
      </div>
    );
  }

  const {
    yearlyBudget,
    monthlyBudget,
    currentPriorities,
    remainingDays,
    currentMonth,
    recentActivity,
    liquidatedAmount,
    downloadedAmount,
  } = data;

  // Calculate utilization percentage based on how much of downloaded funds have been liquidated
  const utilization =
    downloadedAmount > 0 ? (liquidatedAmount / downloadedAmount) * 100 : 0;

  const priorityColumns = [
    {
      title: "Priority",
      dataIndex: "title",
      key: "title",
      render: (text: string) => <span className="font-medium">{text}</span>,
    },
    {
      title: "Downloaded Amount",
      dataIndex: "downloadedAmount",
      key: "downloadedAmount",
      render: (amount?: number) => formatCurrency(amount || 0),
    },
    {
      title: "Liquidated Amount",
      dataIndex: "actualAmount",
      key: "actualAmount",
      render: (amount?: number) => formatCurrency(amount || 0),
    },
    {
      title: "Completion",
      key: "completion",
      render: (_: any, record: PrioritySummary) => (
        <div className="flex items-center">
          <Progress
            percent={record.completion}
            size="small"
            status={record.completion === 100 ? "success" : "active"}
            strokeColor={record.completion === 100 ? "#10b981" : "#f59e0b"}
            className="w-16 mr-2"
            showInfo={false}
          />
          <span>{record.completion}%</span>
        </div>
      ),
    },
    {
      title: "Status",
      key: "status",
      render: (_: any, record: PrioritySummary) => {
        const statusConfig = {
          completed: { color: "green", text: "Completed" },
          partial: { color: "orange", text: "In Progress" },
          pending: { color: "default", text: "Pending" },
        };

        const config = statusConfig[record.status];
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: "Actions",
      key: "actions",
      render: () => (
        <div className="flex space-x-2">
          <Tooltip title="View details">
            <Button size="sm">
              <Eye size={14} />
            </Button>
          </Tooltip>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">
            School Head Dashboard
          </h2>
          <p className="mt-1 text-gray-500 text-theme-sm dark:text-gray-400">
            Manage your school's budget and liquidation requests
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={timeRange}
            onChange={setTimeRange}
            className="w-[140px] no-drag"
            size="small"
          >
            <Option value="last_month">Last Month</Option>
            <Option value="last_quarter">Last Quarter</Option>
            <Option value="last_year">Last Year</Option>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
            {refreshing ? "Refreshing..." : "Refresh"}
          </Button>

          <Button onClick={() => navigate("/requests/create")}>
            <Plus size={16} className="mr-2" />
            New Request
          </Button>
          <Button onClick={() => navigate("/liquidations")}>
            View Liquidations
          </Button>
        </div>
      </div>

      {/* Quick Stats Row */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <Card className="h-full border-0 shadow-sm hover:shadow transition-all">
            <div className="flex items-center">
              <div className="bg-blue-100 p-3 rounded-full mr-4">
                <PhilippinePeso className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <Text type="secondary">Monthly Budget</Text>
                <Title level={4} className="mt-1 mb-0">
                  {formatCurrency(monthlyBudget)}
                </Title>
                <Text type="secondary" className="text-xs">
                  Yearly: {formatCurrency(yearlyBudget)}
                </Text>
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={8}>
          <Card className="h-full border-0 shadow-sm hover:shadow transition-all">
            <div className="flex items-center">
              <div className="bg-green-100 p-3 rounded-full mr-4">
                <Activity className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <Text type="secondary">Liquidation Report Progress</Text>
                <Title level={4} className="mt-1 mb-0">
                  {utilization.toFixed(1)}%
                </Title>
                <Text type="secondary" className="text-xs">
                  {formatCurrency(liquidatedAmount)} of{" "}
                  {formatCurrency(downloadedAmount)} liquidated
                </Text>
              </div>
            </div>
            <Progress
              percent={utilization}
              size="small"
              status="active"
              strokeColor={
                utilization > 90
                  ? "#10b981"
                  : utilization > 50
                  ? "#f59e0b"
                  : "#ef4444"
              }
              className="mt-3"
              showInfo={false}
            />
          </Card>
        </Col>

        <Col xs={24} sm={8}>
          <Card className="h-full border-0 shadow-sm hover:shadow transition-all">
            <div className="flex items-center">
              <div className="bg-amber-100 p-3 rounded-full mr-4">
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <Text type="secondary">Days Remaining</Text>
                <Title level={4} className="mt-1 mb-0">
                  {remainingDays}
                </Title>
                <Text type="secondary" className="text-xs">
                  Requesting for {currentMonth}
                </Text>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Charts Row */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <BudgetWidget data={data} />
        </Col>
        <Col xs={24} lg={12}>
          <TimelineWidget data={data} />
        </Col>
      </Row>

      {/* Main Content Area */}
      <Row gutter={[16, 16]}>
        {/* Priorities Table: 2/3 width on large screens, full width on small screens */}
        <Col xs={24} lg={16}>
          <Card
            className="h-full border-0 shadow-sm"
            title="List of Priorities"
            extra={
              <Button size="sm" onClick={() => navigate("/requests")}>
                View All
              </Button>
            }
          >
            {currentPriorities.length > 0 ? (
              <div className="overflow-auto max-h-[400px] rounded-md border border-gray-200 dark:border-gray-800">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50 sticky top-0 z-10">
                      <th className="p-3 text-left font-medium text-gray-500 text-theme-xs dark:text-gray-400">
                        Priority
                      </th>
                      <th className="p-3 text-left font-medium text-gray-500 text-theme-xs dark:text-gray-400">
                        Downloaded Amount
                      </th>
                      <th className="p-3 text-left font-medium text-gray-500 text-theme-xs dark:text_gray-400">
                        Liquidated Amount
                      </th>
                      <th className="p-3 text-left font-medium text-gray-500 text-theme-xs dark:text-gray-400">
                        Completion
                      </th>
                      <th className="p-3 text-left font-medium text-gray-500 text-theme-xs dark:text-gray-400">
                        Status
                      </th>
                      <th className="p-3 text-left font-medium text-gray-500 text-theme-xs dark:text_gray-400">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentPriorities.map((record, index) => (
                      <tr
                        key={record.id}
                        className={index % 2 === 0 ? "bg-muted/30" : ""}
                      >
                        <td className="p-3 font-medium text-gray-800 text-theme-sm dark:text-white/90">
                          <span className="inline-block max-w-[220px] truncate">
                            {record.title}
                          </span>
                        </td>
                        <td className="p-3 text-gray-500 text-theme-sm dark:text-gray-400">
                          {formatCurrency(record.downloadedAmount || 0)}
                        </td>
                        <td className="p-3 text-gray-500 text-theme-sm dark:text-gray-400">
                          {formatCurrency(record.actualAmount || 0)}
                        </td>
                        <td className="p-3 text-gray-500 text-theme-sm dark:text-gray-400">
                          <div className="flex items-center">
                            <Progress
                              percent={record.completion}
                              size="small"
                              status={
                                record.completion === 100 ? "success" : "active"
                              }
                              strokeColor={
                                record.completion === 100
                                  ? "#10b981"
                                  : "#f59e0b"
                              }
                              className="w-16 mr-2"
                              showInfo={false}
                            />
                            <span>{record.completion}%</span>
                          </div>
                        </td>
                        <td className="p-3 text-gray-500 text-theme-sm dark:text-gray-400">
                          {(() => {
                            const statusConfig = {
                              completed: { color: "green", text: "Completed" },
                              partial: { color: "orange", text: "In Progress" },
                              pending: { color: "default", text: "Pending" },
                            };
                            const config = statusConfig[record.status];
                            return (
                              <Tag color={config.color}>{config.text}</Tag>
                            );
                          })()}
                        </td>
                        <td className="p-3 text-gray-500 text-theme-sm dark:text-gray-400">
                          <div className="flex space-x-2">
                            <Tooltip title="View details">
                              <Button size="sm">
                                <Eye size={14} />
                              </Button>
                            </Tooltip>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {currentPriorities.length === 0 && (
                      <tr>
                        <td
                          className="p-3 text-gray-500 dark:text-gray-400"
                          colSpan={6}
                        >
                          No current priorities.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No current priorities"
              />
            )}
          </Card>
        </Col>
        {/* Sidebar: 1/3 width on large screens, full width on small screens */}
        <Col xs={24} lg={8}>
          <div className="flex flex-col gap-4 h-full">
            <Card
              title="Recent Activity"
              className="border-0 shadow-sm"
              extra={
                <Button size="sm" onClick={() => navigate("/activity")}>
                  View All
                </Button>
              }
            >
              {recentActivity.length > 0 ? (
                <div className="space-y-4">
                  {recentActivity.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-start py-2 border-0 border-b border-gray-100 last:border-0"
                    >
                      <div className="mr-3 mt-1">
                        {activity.action === "approved" ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-amber-500" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between">
                          <Text strong className="capitalize">
                            {activity.type} {activity.action}
                          </Text>
                          <Text type="secondary" className="text-xs">
                            {new Date(activity.date).toLocaleDateString()}
                          </Text>
                        </div>
                        <Text type="secondary" className="block">
                          {formatCurrency(activity.amount)}
                        </Text>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="No recent activity"
                  className="py-8"
                />
              )}
            </Card>
            <CategoriesWidget data={data} />
            <ComplianceWidget data={data} />
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default SchoolHeadDashboard;
