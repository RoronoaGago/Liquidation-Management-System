import React, { useState, useEffect, useMemo } from "react";
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
  BarChart3,
  PieChart as PieChartIcon,
  RefreshCw,
  FileText,
  Clock,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Grid,
  Save,
  GripVertical,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import api from "@/api/axios";
import { Responsive, WidthProvider, Layout } from "react-grid-layout";
import Badge from "@/components/ui/badge/Badge";
import { Skeleton } from "antd";
import { Dropdown } from "@/components/ui/dropdown/Dropdown";
import { DropdownItem } from "@/components/ui/dropdown/DropdownItem";
import { MoreDotIcon } from "@/icons";

const ResponsiveGridLayout = WidthProvider(Responsive);

// Custom Loading Components
const MetricCardSkeleton = () => (
  <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 animate-pulse">
    <div className="flex items-center justify-center w-12 h-12 bg-gray-200 rounded-xl dark:bg-gray-700 mb-5 animate-pulse">
      <div className="w-6 h-6 bg-gray-300 rounded dark:bg-gray-600 animate-pulse"></div>
    </div>
    <div className="space-y-3">
      <div className="h-4 bg-gray-200 rounded dark:bg-gray-700 w-3/4 animate-pulse"></div>
      <div className="h-6 bg-gray-200 rounded dark:bg-gray-700 w-1/2 animate-pulse"></div>
      <div className="h-3 bg-gray-200 rounded dark:bg-gray-700 w-full animate-pulse"></div>
    </div>
  </div>
);

const ChartSkeleton = ({ height = "300px" }: { height?: string }) => (
  <div className="animate-pulse">
    <div className="flex items-center justify-center" style={{ height }}>
      <div className="relative">
        {/* Circular loading animation */}
        <div className="w-32 h-32 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin dark:border-gray-700 dark:border-t-blue-400"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 border-2 border-gray-200 border-b-blue-500 rounded-full animate-spin dark:border-gray-700 dark:border-b-blue-400" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
        </div>
      </div>
    </div>
    <div className="mt-4 space-y-2">
      <div className="flex justify-center space-x-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-gray-200 rounded-full dark:bg-gray-700"></div>
            <div className="h-3 bg-gray-200 rounded dark:bg-gray-700 w-16"></div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const TableSkeleton = () => (
  <div className="animate-pulse">
    <div className="overflow-auto max-h-[400px] rounded-md border border-gray-200 dark:border-gray-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50">
            {[1, 2, 3, 4, 5].map((i) => (
              <th key={i} className="p-3">
                <div className="h-4 bg-gray-200 rounded dark:bg-gray-700 w-20"></div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[1, 2, 3, 4, 5].map((row) => (
            <tr key={row} className={row % 2 === 0 ? "bg-muted/30" : ""}>
              {[1, 2, 3, 4, 5].map((cell) => (
                <td key={cell} className="p-3">
                  <div className="h-4 bg-gray-200 rounded dark:bg-gray-700 w-16"></div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const ListSkeleton = () => (
  <div className="space-y-3 animate-pulse">
    {[1, 2, 3, 4, 5].map((i) => (
      <div key={i} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg dark:border-gray-800">
        <div className="flex items-center min-w-0">
          <div className="w-8 h-8 bg-gray-200 rounded-full mr-3 dark:bg-gray-700"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded dark:bg-gray-700 w-32"></div>
            <div className="h-3 bg-gray-200 rounded dark:bg-gray-700 w-24"></div>
          </div>
        </div>
        <div className="text-right space-y-2">
          <div className="h-4 bg-gray-200 rounded dark:bg-gray-700 w-16"></div>
          <div className="h-3 bg-gray-200 rounded dark:bg-gray-700 w-12"></div>
        </div>
      </div>
    ))}
  </div>
);

const WidgetSkeleton = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 h-full overflow-hidden">
    <div className="flex justify-between items-start mb-5">
      <div className="min-w-0">
        <div className="h-6 bg-gray-200 rounded dark:bg-gray-700 w-40 mb-2 animate-pulse"></div>
        <div className="h-4 bg-gray-200 rounded dark:bg-gray-700 w-60 animate-pulse"></div>
      </div>
    </div>
    <div className="h-full">{children}</div>
  </div>
);

// Types for our data
interface DashboardData {
  budgetUtilization: BudgetUtilizationData[];
  categoryBreakdown: CategoryBreakdownData[];
  requestStatusDistribution: StatusData[];
  schoolPerformance: SchoolPerformanceData[];
  categorySpending: CategoryData[];
  documentCompliance: ComplianceData[];
  overallCompliance: number; // NEW
  complianceTrend?: number; // NEW
  topPriorities: PriorityData[];
  activeRequests: ActiveRequestItem[];
  liquidationMetrics: {
    total_liquidations: number;
    completed_liquidations: number;
    pending_liquidations: number;
    completion_rate: number;
    avg_liquidation_time_days: number;
  };
  topSchoolsBySpeed: SchoolSpeedData[];
  schoolDocumentCompliance: SchoolDocumentComplianceData[];
}

interface SchoolDocumentComplianceData {
  schoolId: string;
  schoolName: string;
  uploadedDocuments: number;
  requiredDocuments: number;
  complianceRate: number;
  pendingDocuments: number;
}
interface SchoolSpeedData {
  schoolId: string;
  schoolName: string;
  avgProcessingDays: number;
}
interface BudgetUtilizationData {
  month: string;
  allocated: number;
  planned: number; // NEW
  actual: number; // NEW
  plannedUtilizationRate: number; // NEW
  actualUtilizationRate: number; // NEW
}
interface CategoryBreakdownData {
  month: string;
  [category: string]: { planned: number; actual: number } | string; // Index signature
}

interface StatusData {
  status: string;
  count: number;
  percentage: number;
  [key: string]: any;
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
interface ActiveRequestItem {
  id: string;
  type: "request";
  title: string;
  description: string;
  status: string;
  priority: "high" | "medium" | "low";
  timestamp: string;
  schoolName: string;
  userName: string;
}

interface PriorityData {
  priority: string;
  frequency: number;
  totalAmount: number;
  trend: "up" | "down" | "stable";
}


interface DashboardLayout {
  lg: Layout[];
  md: Layout[];
  sm: Layout[];
  [key: string]: Layout[];
}

const COLORS = [
  "#465FFF",
  "#9CB9FF",
  "#FF8042",
  "#00C49F",
  "#FFBB28",
  "#8884D8",
];

// Default layouts for different screen sizes
// In the defaultLayouts object, update the compliance widget position and size
const defaultLayouts: DashboardLayout = {
  lg: [
    { i: "metrics", x: 0, y: 0, w: 12, h: 3, minW: 4, minH: 2 },
    { i: "actions", x: 0, y: 4, w: 6, h: 6, minW: 6, minH: 4 },
    { i: "status", x: 7, y: 4, w: 6, h: 6, minW: 4, minH: 4 },
    { i: "performance", x: 0, y: 10, w: 12, h: 8, minW: 6, minH: 6 },
    { i: "categories", x: 0, y: 18, w: 6, h: 6, minW: 6, minH: 4 },
    // { i: "actions", x: 6, y: 41, w: 6, h: 6, minW: 4, minH: 4 }, // Same x:0 and h:6 as categories
  ],
  md: [
    { i: "metrics", x: 0, y: 0, w: 12, h: 3, minW: 4, minH: 2 },
    { i: "actions", x: 0, y: 4, w: 6, h: 6, minW: 6, minH: 4 },
    { i: "status", x: 7, y: 4, w: 6, h: 6, minW: 4, minH: 4 },
    { i: "performance", x: 0, y: 10, w: 12, h: 8, minW: 6, minH: 6 },
    { i: "categories", x: 0, y: 18, w: 6, h: 6, minW: 6, minH: 4 },
    // { i: "actions", x: 6, y: 41, w: 6, h: 6, minW: 4, minH: 4 }, // Same x:0 and h:6 as categories
  ],
  sm: [
    { i: "metrics", x: 0, y: 0, w: 12, h: 3, minW: 4, minH: 2 },
    { i: "actions", x: 0, y: 4, w: 6, h: 6, minW: 6, minH: 4 },
    { i: "status", x: 7, y: 4, w: 6, h: 6, minW: 4, minH: 4 },
    { i: "performance", x: 0, y: 10, w: 12, h: 8, minW: 6, minH: 6 },
    { i: "categories", x: 0, y: 18, w: 6, h: 6, minW: 6, minH: 4 },
    // { i: "actions", x: 6, y: 41, w: 6, h: 6, minW: 4, minH: 4 }, // Same x:0 and h:6 as categories
  ],
  xs: [
    { i: "metrics", x: 0, y: 0, w: 12, h: 3, minW: 4, minH: 2 },
    { i: "actions", x: 0, y: 4, w: 6, h: 6, minW: 6, minH: 4 },
    { i: "status", x: 7, y: 4, w: 6, h: 6, minW: 4, minH: 4 },
    { i: "performance", x: 0, y: 10, w: 12, h: 8, minW: 6, minH: 6 },
    { i: "categories", x: 0, y: 18, w: 6, h: 6, minW: 6, minH: 4 },
    // { i: "actions", x: 6, y: 41, w: 6, h: 6, minW: 4, minH: 4 }, // Same x:0 and h:6 as categories
  ],
  xxs: [
    { i: "metrics", x: 0, y: 0, w: 12, h: 3, minW: 4, minH: 2 },
    { i: "actions", x: 0, y: 4, w: 6, h: 6, minW: 6, minH: 4 },
    { i: "status", x: 7, y: 4, w: 6, h: 6, minW: 4, minH: 4 },
    { i: "performance", x: 0, y: 10, w: 12, h: 8, minW: 6, minH: 6 },
    { i: "categories", x: 0, y: 18, w: 6, h: 6, minW: 6, minH: 4 },
    // { i: "actions", x: 6, y: 41, w: 6, h: 6, minW: 4, minH: 4 }, // Same x:0 and h:6 as categories
  ],
};

const WidgetContainer = ({
  title,
  subtitle,
  children,
  editMode,
  actions,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  editMode: boolean;
  actions?: React.ReactNode;
}) => {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 h-full overflow-hidden">
      <div className="flex justify-between items-start mb-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 truncate">
              {title}
            </h3>
            {editMode && (
              <span className="widget-drag-handle cursor-grab active:cursor-grabbing p-1">
                <GripVertical className="h-5 w-5 text-gray-400" />
              </span>
            )}
          </div>
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


// Widget components with updated styling
const MetricsWidget = ({ data }: { data: DashboardData | null }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 h-full">
    {[
      {
        title: "Active Requests",
        icon: (
          <AlertCircle className="h-5 w-5 text-gray-800 dark:text-white/90" />
        ),
        value: `${data?.activeRequests?.length || 0}`,
        description: "Currently being processed",
        bgColor: "bg-gray-100 dark:bg-gray-800",
      },
      {
        title: "Avg. Liquidation Time",
        icon: <Clock className="h-5 w-5 text-gray-800 dark:text-white/90" />,
        value: `${
          data?.liquidationMetrics?.avg_liquidation_time_days?.toFixed(1) || 0
        } days`,
        description: "From submission to completion",
        bgColor: "bg-gray-100 dark:bg-gray-800",
      },
      {
        title: "Liquidation Completion",
        icon: (
          <CheckCircle className="h-5 w-5 text-gray-800 dark:text-white/90" />
        ),
        value: `${data?.liquidationMetrics?.completion_rate?.toFixed(1) || 0}%`,
        description: `${
          data?.liquidationMetrics?.completed_liquidations || 0
        } of ${data?.liquidationMetrics?.total_liquidations || 0} completed`,
        bgColor: "bg-gray-100 dark:bg-gray-800",
      },
      {
        title: "Document Compliance",
        icon: <FileText className="h-5 w-5 text-gray-800 dark:text-white/90" />,
        value: `${data?.overallCompliance?.toFixed(1) || 0}%`,
        description: data?.complianceTrend
          ? `${
              data.complianceTrend >= 0 ? "+" : ""
            }${data.complianceTrend.toFixed(1)}% from previous period`
          : "No trend data",
        bgColor: "bg-gray-100 dark:bg-gray-800",
      },
    ].map((metric, index) => (
      <div
        key={index}
        className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6"
      >
        <div
          className={`flex items-center justify-center w-12 h-12 ${metric.bgColor} rounded-xl`}
        >
          {metric.icon}
        </div>
        <div className="flex items-end justify-between mt-5">
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {metric.title}
            </span>
            <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
              {metric.value}
            </h4>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {metric.description}
        </p>
      </div>
    ))}
  </div>
);


const StatusWidget = ({
  data,
  editMode,
}: {
  data: DashboardData | null;
  editMode: boolean;
}) => {

  const distribution = data?.requestStatusDistribution ?? [];

  // Enhanced color scheme with better contrast
  const PIE_COLORS = [
    "#465FFF", // Blue - primary brand color
    "#00C49F", // Teal - good for approved/completed
    "#FF8042", // Orange - for pending/processing
    "#FFBB28", // Yellow - for warnings
    "#8884D8", // Purple - alternate color
    "#FF6B6B", // Red - for rejected/errors
  ];

  // Custom tooltip component
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-gray-800">
          <p className="font-medium text-gray-900 dark:text-white">
            {capitalizeFirstLetter(payload[0].name)}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {payload[0].value} requests
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {payload[0].payload.percentage.toFixed(1)}% of total
          </p>
        </div>
      );
    }
    return null;
  };

  // Custom label component to show values inside pie segments
  const renderCustomizedLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
  }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    // Only show label if segment is large enough
    if (percent < 0.05) return null;

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
        className="text-xs font-medium"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  // Helper function to capitalize first letter
  const capitalizeFirstLetter = (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  return (
    <WidgetContainer
      title="Request Status Distribution"
      subtitle="Breakdown of requests by current status"
      editMode={editMode}
    >
      <div className="h-[300px] flex flex-col">
        {distribution.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
            No status data available
          </div>
        ) : (
          <>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={distribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="count"
                    nameKey="status"
                    label={renderCustomizedLabel}
                    labelLine={false}
                  >
                    {distribution.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                        stroke="#fff"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Custom Legend */}
            <div className="mt-4 grid grid-cols-2 gap-2 px-2">
              {distribution.map((entry, index) => (
                <div key={entry.status} className="flex items-center text-xs">
                  <div
                    className="w-3 h-3 rounded-full mr-2 flex-shrink-0"
                    style={{
                      backgroundColor: PIE_COLORS[index % PIE_COLORS.length],
                    }}
                  />
                  <span className="text-gray-700 dark:text-gray-300 truncate">
                    {capitalizeFirstLetter(entry.status)}
                  </span>
                  <span className="ml-auto font-medium text-gray-900 dark:text-white">
                    {entry.count}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </WidgetContainer>
  );
};


const SchoolPerformanceWidget = ({
  data,
  editMode,
}: {
  data: DashboardData | null;
  editMode: boolean;
}) => {
  const [viewMode, setViewMode] = useState<"overview" | "speed" | "compliance">(
    "speed"
  );

  // Add sorting state
  const [sortField, setSortField] = useState<
    "totalRequests" | "approvalRate" | "avgProcessingTime" | "budgetUtilization"
  >("avgProcessingTime");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const performanceRows = data?.schoolPerformance ?? [];
  const fastestSchools = data?.topSchoolsBySpeed ?? [];
  const complianceData = data?.schoolDocumentCompliance ?? [];

  // Filter out schools with no requests before sorting
  const schoolsWithRequests = useMemo(() => {
    return performanceRows.filter((school) => school.totalRequests > 0);
  }, [performanceRows]);

  // Sort performance data based on current sort field and direction
  const sortedPerformanceRows = useMemo(() => {
    return [...schoolsWithRequests].sort((a, b) => {
      let aValue: number, bValue: number;

      switch (sortField) {
        case "approvalRate":
          aValue = (a.approvedRequests / Math.max(a.totalRequests, 1)) * 100;
          bValue = (b.approvedRequests / Math.max(b.totalRequests, 1)) * 100;
          break;
        default:
          aValue = a[sortField];
          bValue = b[sortField];
      }

      return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
    });
  }, [schoolsWithRequests, sortField, sortDirection]);

  // Get schools with no requests separately
  const schoolsWithNoRequests = useMemo(() => {
    return performanceRows.filter((school) => school.totalRequests === 0);
  }, [performanceRows]);

  // Get top 5 fastest schools (only those with requests)
  const topFastestSchools = useMemo(() => {
    return fastestSchools
      .filter((school) => school.avgProcessingDays > 0) // Filter out schools with 0 processing time
      .sort((a, b) => a.avgProcessingDays - b.avgProcessingDays)
      .slice(0, 5)
      .map((school, index) => ({
        ...school,
        rank: index + 1,
      }));
  }, [fastestSchools]);

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

  // Handle column header click for sorting
  const handleSort = (field: typeof sortField) => {
    if (field === sortField) {
      // Toggle direction if same field
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // Set new field with default ascending direction
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Render sort indicator
  const renderSortIndicator = (field: typeof sortField) => {
    if (field !== sortField) return null;

    return sortDirection === "asc" ? (
      <TrendingUp className="ml-1 h-3 w-3" />
    ) : (
      <TrendingDown className="ml-1 h-3 w-3" />
    );
  };

  return (
    <WidgetContainer
      title="School Performance"
      subtitle="Comprehensive school performance metrics"
      editMode={editMode}
      actions={
        <div className="flex items-center gap-2 custom-scrollbar">
          {/* View mode toggle */}
          <div className="flex rounded-lg border border-gray-200 p-1 dark:border-gray-700">
            {/* <button
              onClick={() => setViewMode("overview")}
              className={`rounded-md px-2 py-1 text-sm ${
                viewMode === "overview"
                  ? "bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
              title="Overview"
            >
              <BarChart3 className="h-4 w-4" />
            </button> */}
            <button
              onClick={() => setViewMode("speed")}
              className={`rounded-md px-2 py-1 text-sm ${
                viewMode === "speed"
                  ? "bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
              title="Processing Speed"
            >
              <Clock className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("compliance")}
              className={`rounded-md px-2 py-1 text-sm ${
                viewMode === "compliance"
                  ? "bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
              title="Document Compliance"
            >
              <FileText className="h-4 w-4" />
            </button>
          </div>

          {/* <Button
            variant="outline"
            size="sm"
            className="no-drag inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-theme-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
          >
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>

          <div className="relative inline-block">
            <button
              className="dropdown-toggle no-drag"
              onClick={toggleDropdown}
            >
              <MoreDotIcon className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 size-6" />
            </button>
            <Dropdown
              isOpen={isOpen}
              onClose={closeDropdown}
              className="w-40 p-2"
            >
              <DropdownItem
                onItemClick={closeDropdown}
                className="flex w-full font-normal text-left text-gray-500 rounded-lg hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
              >
                View More
              </DropdownItem>
              <DropdownItem
                onItemClick={closeDropdown}
                className="flex w-full font-normal text-left text-gray-500 rounded-lg hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
              >
                Delete
              </DropdownItem>
            </Dropdown>
          </div> */}
        </div>
      }
    >
      {viewMode === "overview" ? (
        // Overview Table View
        <div className="overflow-auto max-h-[400px] rounded-md border border-gray-200 dark:border-gray-800 custom-scrollbar">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50 sticky top-0 z-10">
                <th className="p-3 text-left font-medium text-gray-500 text-theme-xs dark:text-gray-400">
                  School
                </th>
                <th
                  className="p-3 text-left font-medium text-gray-500 text-theme-xs dark:text-gray-400 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => handleSort("totalRequests")}
                >
                  <div className="flex items-center">
                    Total Requests
                    {renderSortIndicator("totalRequests")}
                  </div>
                </th>
                <th
                  className="p-3 text-left font-medium text-gray-500 text-theme-xs dark:text-gray-400 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => handleSort("approvalRate")}
                >
                  <div className="flex items-center">
                    Approval Rate
                    {renderSortIndicator("approvalRate")}
                  </div>
                </th>
                <th
                  className="p-3 text-left font-medium text-gray-500 text-theme-xs dark:text-gray-400 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => handleSort("avgProcessingTime")}
                >
                  <div className="flex items-center">
                    Avg. Processing Time
                    {renderSortIndicator("avgProcessingTime")}
                  </div>
                </th>
                <th
                  className="p-3 text-left font-medium text-gray-500 text-theme-xs dark:text-gray-400 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => handleSort("budgetUtilization")}
                >
                  <div className="flex items-center">
                    Budget Utilization
                    {renderSortIndicator("budgetUtilization")}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedPerformanceRows?.map((school, index) => (
                <tr
                  key={school.schoolId}
                  className={index % 2 === 0 ? "bg-muted/30" : ""}
                >
                  <td className="p-3 font-medium text-gray-800 text-theme-sm dark:text-white/90">
                    <span className="inline-block max-w-[220px] truncate">
                      {school.schoolName}
                    </span>
                  </td>
                  <td className="p-3 text-gray-500 text-theme-sm dark:text-gray-400">
                    {school.totalRequests}
                  </td>
                  <td className="p-3 text-gray-500 text-theme-sm dark:text-gray-400">
                    <div className="flex items-center">
                      {school.totalRequests > 0
                        ? (
                            (school.approvedRequests / school.totalRequests) *
                            100
                          ).toFixed(1)
                        : 0}
                      % %
                      {school.rejectionRate > 20 ? (
                        <TrendingDown className="ml-2 h-4 w-4 text-red-500" />
                      ) : (
                        <TrendingUp className="ml-2 h-4 w-4 text-green-500" />
                      )}
                    </div>
                  </td>
                  <td className="p-3 text-gray-500 text-theme-sm dark:text-gray-400">
                    {school.avgProcessingTime.toFixed(1)} days
                  </td>
                  <td className="p-3 text-gray-500 text-theme-sm dark:text-gray-400">
                    <div className="flex items-center">
                      {school.budgetUtilization}%
                      <div className="ml-2 w-24 bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${school.budgetUtilization}%` }}
                        />
                      </div>
                    </div>
                  </td>
                </tr>
              ))}

              {/* Show schools with no requests at the bottom */}
              {schoolsWithNoRequests.length > 0 && (
                <>
                  <tr className="bg-gray-50 dark:bg-gray-800/30">
                    <td
                      colSpan={5}
                      className="p-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400"
                    >
                      Schools with no requests
                    </td>
                  </tr>
                  {schoolsWithNoRequests.map((school, index) => (
                    <tr
                      key={school.schoolId}
                      className={index % 2 === 0 ? "bg-muted/20" : ""}
                    >
                      <td className="p-3 font-medium text-gray-600 text-theme-sm dark:text-gray-400">
                        <span className="inline-block max-w-[220px] truncate">
                          {school.schoolName}
                        </span>
                      </td>
                      <td className="p-3 text-gray-400 text-theme-sm dark:text-gray-500">
                        0
                      </td>
                      <td className="p-3 text-gray-400 text-theme-sm dark:text-gray-500">
                        -
                      </td>
                      <td className="p-3 text-gray-400 text-theme-sm dark:text-gray-500">
                        -
                      </td>
                      <td className="p-3 text-gray-400 text-theme-sm dark:text-gray-500">
                        -
                      </td>
                    </tr>
                  ))}
                </>
              )}

              {performanceRows.length === 0 && (
                <tr>
                  <td
                    className="p-3 text-gray-500 dark:text-gray-400"
                    colSpan={5}
                  >
                    No performance data available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : viewMode === "speed" ? (
        // Fastest Processing Schools View
        <div className="space-y-3 overflow-auto max-h-[360px] pr-1">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
            Top 5 schools by average liquidation time
          </div>
          {topFastestSchools.map((school) => (
            <div
              key={school.schoolId}
              className="flex items-center justify-between p-3 border border-gray-200 rounded-lg dark:border-gray-800"
            >
              <div className="flex items-center min-w-0">
                <div className="w-8 h-8 flex items-center justify-center bg-blue-100 rounded-full mr-3 dark:bg-blue-900/20 shrink-0">
                  <span className="font-semibold text-blue-600 dark:text-blue-400">
                    #{school.rank}
                  </span>
                </div>
                <span className="font-medium text-gray-800 text-theme-sm dark:text-white/90 truncate">
                  {school.schoolName}
                </span>
              </div>
              <div className="text-right shrink-0">
                <div className="font-semibold text-green-600 text-theme-sm dark:text-green-400">
                  {school.avgProcessingDays.toFixed(1)} days
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  avg. processing
                </div>
              </div>
            </div>
          ))}
          {topFastestSchools.length === 0 && (
            <div className="text-sm text-gray-500 dark:text-gray-400">
              No processing speed data available.
            </div>
          )}
        </div>
      ) : (
        // Document Compliance View
        <div className="space-y-3 overflow-auto max-h-[360px] pr-1">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
            Document compliance by school
          </div>
          {complianceData.slice(0, 8).map((school) => (
            <div
              key={school.schoolId}
              className="flex items-center justify-between p-3 border border-gray-200 rounded-lg dark:border-gray-800"
            >
              <div className="flex items-center min-w-0 flex-1">
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-gray-800 text-theme-sm dark:text-white/90 truncate">
                    {school.schoolName}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {school.uploadedDocuments}/{school.requiredDocuments}{" "}
                    documents
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0 ml-3">
                <div
                  className={`font-semibold text-theme-sm ${getComplianceColor(
                    school.complianceRate
                  )}`}
                >
                  {school.complianceRate.toFixed(1)}%
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {getComplianceStatus(school.complianceRate)}
                </div>
              </div>
            </div>
          ))}

          {complianceData.length === 0 && (
            <div className="text-sm text-gray-500 dark:text-gray-400">
              No document compliance data available.
            </div>
          )}

          {complianceData.length > 8 && (
            <div className="text-center pt-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                +{complianceData.length - 8} more schools
              </span>
            </div>
          )}
        </div>
      )}
    </WidgetContainer>
  );
};

const CategoriesWidget = ({
  data,
  editMode,
}: {
  data: DashboardData | null;
  editMode: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "chart">("chart"); // New state for toggle

  const toggleDropdown = () => setIsOpen(!isOpen);
  const closeDropdown = () => setIsOpen(false);

  // Get top 5 categories, sorted by amount
  const topCategories = useMemo(() => {
    const items = data?.categorySpending ?? [];
    return items
      .filter((category) => category.percentage > 0) // Filter out 0% categories
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
      title="Top Spending Categories"
      subtitle="Top 5 categories by spending amount"
      editMode={editMode}
      actions={
        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex rounded-lg border border-gray-200 p-1 dark:border-gray-700">
            <button
              onClick={() => setViewMode("chart")}
              className={`rounded-md px-2 py-1 text-sm ${
                viewMode === "chart"
                  ? "bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
            >
              <PieChartIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`rounded-md px-2 py-1 text-sm ${
                viewMode === "list"
                  ? "bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
            >
              <BarChart3 className="h-4 w-4" />
            </button>
          </div>

          <div className="relative inline-block">
            <button
              className="dropdown-toggle no-drag"
              onClick={toggleDropdown}
            >
              <MoreDotIcon className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 size-6" />
            </button>
            <Dropdown
              isOpen={isOpen}
              onClose={closeDropdown}
              className="w-40 p-2"
            >
              <DropdownItem
                onItemClick={closeDropdown}
                className="flex w-full font-normal text-left text-gray-500 rounded-lg hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
              >
                View More
              </DropdownItem>
              <DropdownItem
                onItemClick={closeDropdown}
                className="flex w-full font-normal text-left text-gray-500 rounded-lg hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
              >
                Delete
              </DropdownItem>
            </Dropdown>
          </div>
        </div>
      }
    >
      {viewMode === "chart" ? (
        // Pie Chart View
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={topCategories}
                cx="50%"
                cy="50%"
                outerRadius={80}
                innerRadius={60}
                fill="#8884d8"
                dataKey="totalAmount"
                label={
                  ({ category, percentage }: any) =>
                    `${category} (${(percentage as number).toFixed(2)}%)` // Changed this line
                }
                labelLine={false}
              >
                {topCategories.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => [
                  `₱${Number(value).toLocaleString()}`,
                  "Amount",
                ]}
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #E4E7EC",
                  borderRadius: "8px",
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                }}
              />
              <Legend
                verticalAlign="bottom"
                height={36}
                iconType="circle"
                iconSize={10}
                formatter={(_value: any, _entry: any, index: number) => (
                  <span className="text-xs">
                    {topCategories[index]?.category}
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      ) : (
        // List View
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
                  {category.percentage.toFixed(2)}% of total line
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
      )}
    </WidgetContainer>
  );
};

const ActiveRequestsWidget = ({
  data,
  editMode,
}: {
  data: DashboardData | null;
  editMode: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleDropdown = () => setIsOpen(!isOpen);
  const closeDropdown = () => setIsOpen(false);

  const items = data?.activeRequests ?? [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400";
      case "approved":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400";
      case "downloaded":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400";
      case "unliquidated":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4" />;
      case "approved":
        return <CheckCircle className="h-4 w-4" />;
      case "downloaded":
        return <Download className="h-4 w-4" />;
      case "unliquidated":
        return <FileText className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  return (
    <WidgetContainer
      title="Active Requests"
      subtitle="Currently active requests across all schools"
      editMode={editMode}
      actions={
        <div className="relative inline-block">
          <button className="dropdown-toggle no-drag" onClick={toggleDropdown}>
            <MoreDotIcon className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 size-6" />
          </button>
          <Dropdown
            isOpen={isOpen}
            onClose={closeDropdown}
            className="w-40 p-2"
          >
            <DropdownItem
              onItemClick={closeDropdown}
              className="flex w-full font-normal text-left text-gray-500 rounded-lg hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
            >
              View All Requests
            </DropdownItem>
            {/* <DropdownItem
              onItemClick={closeDropdown}
              className="flex w-full font-normal text-left text-gray-500 rounded-lg hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
            >
              Export Data
            </DropdownItem> */}
          </Dropdown>
        </div>
      }
    >
      <div className="space-y-3 overflow-auto max-h-[400px] pr-1 custom-scrollbar">
        {items.slice(0, 5).map((request) => (
          <div
            key={request.id}
            className="flex items-start justify-between p-3 border border-gray-200 rounded-lg dark:border-gray-800"
          >
            <div className="space-y-1 min-w-0 pr-3 flex-1">
              <div className="flex items-center justify-between">
                <div className="font-medium text-gray-800 text-theme-sm dark:text-white/90 truncate">
                  {request.title}
                </div>
                <Badge size="sm" className={getStatusColor(request.status)}>
                  <div className="flex items-center gap-1">
                    {getStatusIcon(request.status)}
                    {request.status.charAt(0).toUpperCase() +
                      request.status.slice(1)}
                  </div>
                </Badge>
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                {request.description}
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>{request.schoolName}</span>
                <span>{new Date(request.timestamp).toLocaleDateString()}</span>
              </div>
            </div>
            <Badge
              size="sm"
              color={
                request.priority === "high"
                  ? "error"
                  : request.priority === "medium"
                  ? "warning"
                  : "success"
              }
              className="shrink-0 ml-2"
            >
              {request.priority}
            </Badge>
          </div>
        ))}
        {items.length === 0 && (
          <div className="text-sm text-gray-500 dark:text-gray-400">
            No active requests.
          </div>
        )}
      </div>
    </WidgetContainer>
  );
};
const AdminDashboard = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange] = useState<string>("last_month");
  const [refreshing, setRefreshing] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [layouts, setLayouts] = useState<DashboardLayout>(defaultLayouts);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [layoutDirty, setLayoutDirty] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!editMode) return;

    const handleScrollDuringDrag = (e: WheelEvent) => {
      if (!isDragging) return;

      e.preventDefault();
      window.scrollBy({
        top: e.deltaY > 0 ? 100 : -100,
        behavior: "smooth",
      });
    };

    window.addEventListener("wheel", handleScrollDuringDrag, {
      passive: false,
    });

    return () => {
      window.removeEventListener("wheel", handleScrollDuringDrag);
    };
  }, [editMode, isDragging]);

  useEffect(() => {
    fetchDashboardData();
    const savedLayout = localStorage.getItem("dashboardLayout");
    if (savedLayout) {
      try {
        const parsed = JSON.parse(savedLayout);
        setLayouts(parsed);
      } catch {
        // ignore bad layout
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const handleLayoutChange = (_currentLayout: Layout[], allLayouts: any) => {
    setLayouts((prev) => ({
      ...prev,
      ...allLayouts,
    }));
    setLayoutDirty(true);
  };

  const saveLayout = () => {
    localStorage.setItem("dashboardLayout", JSON.stringify(layouts));
    setShowSaveDialog(false);
    setEditMode(false);
    setLayoutDirty(false);
  };

  const resetLayout = () => {
    setLayouts(defaultLayouts);
    localStorage.removeItem("dashboardLayout");
    setEditMode(false);
    setLayoutDirty(false);
  };

  const toggleEditMode = () => {
    if (editMode && layoutDirty) {
      setShowSaveDialog(true);
    } else {
      setEditMode((v) => !v);
    }
  };

  const renderWidget = (widgetId: string) => {
    switch (widgetId) {
      case "metrics":
        return <MetricsWidget data={data} />;
      // case "budget":
      //   return <BudgetWidget data={data} editMode={editMode} />;
      case "status":
        return <StatusWidget data={data} editMode={editMode} />;
      case "performance": // This now includes both performance and fastest schools
        return <SchoolPerformanceWidget data={data} editMode={editMode} />;
      case "categories":
        return <CategoriesWidget data={data} editMode={editMode} />;
      case "actions":
        return <ActiveRequestsWidget data={data} editMode={editMode} />;
      // Remove the "topSchools" case since it's now merged
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div
        className={`p-4 md:p-6 ${editMode ? "select-none min-h-screen" : ""}`}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white/90">
              Admin Dashboard
            </h1>
            <p className="mt-1 text-gray-500 text-theme-sm dark:text-gray-400">
              Liquidation request metrics and analytics
            </p>
          </div>
        </div>
        
        
        {/* Metrics Cards Loading */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6">
          {[1, 2, 3, 4].map((item) => (
            <MetricCardSkeleton key={item} />
          ))}
        </div>
        
        {/* Widgets Loading */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Status Widget */}
          <WidgetSkeleton title="Request Status Distribution">
            <ChartSkeleton height="300px" />
          </WidgetSkeleton>
          
          {/* Active Requests Widget */}
          <WidgetSkeleton title="Active Requests">
            <ListSkeleton />
          </WidgetSkeleton>
          
          {/* School Performance Widget */}
          <WidgetSkeleton title="School Performance">
            <TableSkeleton />
          </WidgetSkeleton>
          
          {/* Categories Widget */}
          <WidgetSkeleton title="Top Spending Categories">
            <ChartSkeleton height="300px" />
          </WidgetSkeleton>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-4 md:p-6 ${editMode ? "select-none" : ""} animate-in fade-in duration-500`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white/90">
            Admin Dashboard
          </h1>
          <p className="mt-1 text-gray-500 text-theme-sm dark:text-gray-400">
            Liquidation request metrics and analytics
          </p>
        </div>
        <div className="flex items-center gap-3 mt-4 md:mt-0">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="no-drag inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-theme-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
              {refreshing ? "Refreshing..." : "Refresh"}
            </Button>
            <Button
              variant={editMode ? "default" : "outline"}
              size="sm"
              className="no-drag inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-theme-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
              onClick={toggleEditMode}
            >
              <Grid className="h-4 w-4" />
              {editMode ? "Done" : "Edit Layout"}
            </Button>
            {editMode && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="no-drag inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-theme-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
                  onClick={() => setShowSaveDialog(true)}
                  disabled={!layoutDirty}
                >
                  <Save className="h-4 w-4" />
                  Save
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="no-drag inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-theme-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
                  onClick={resetLayout}
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset
                </Button>
              </>
            )}
            {/* {!editMode && (
              <Button
                variant="outline"
                size="sm"
                className="no-drag inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-theme-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
              >
                <Download className="h-4 w-4" />
                Export
              </Button>
            )} */}
          </div>
        </div>
      </div>

      {/* <div className="flex flex-wrap items-center gap-3 mb-6">
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[180px] no-drag">
            <SelectValue placeholder="Select time range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="last_week">Last Week</SelectItem>
            <SelectItem value="last_month">Last Month</SelectItem>
            <SelectItem value="last_quarter">Last Quarter</SelectItem>
            <SelectItem value="last_year">Last Year</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center">
          {["overview", "performance", "compliance"].map((view) => (
            <Button
              key={view}
              variant={activeView === view ? "default" : "outline"}
              size="sm"
              className="no-drag rounded-none first:rounded-l-lg last:rounded-r-lg"
              onClick={() => setActiveView(view)}
            >
              {view.charAt(0).toUpperCase() + view.slice(1)}
            </Button>
          ))}
        </div>
      </div> */}

      {editMode && (
        <div className="mb-3 text-xs text-gray-600 dark:text-gray-400">
          Drag using the handle next to each title. Resize from the edges.
          Changes are not saved until you click Save.
        </div>
      )}

      <ResponsiveGridLayout
        className="layout animate-in slide-in-from-bottom-4 duration-700"
        layouts={layouts}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 8, sm: 4, xs: 4, xxs: 4 }}
        rowHeight={60} // Increase from 60 to 100 or higher
        margin={[20, 20]} // Increase margin for better spacing
        isDraggable={editMode}
        isResizable={editMode}
        compactType="vertical"
        preventCollision={false} // Allow widgets to swap positions
        isBounded={true}
        useCSSTransforms={true}
        onDragStart={() => setIsDragging(true)}
        onDragStop={() => setIsDragging(false)}
        verticalCompact={true} // Explicitly enable vertical compaction
        allowOverlap={false} // Ensure widgets don't overlap
        onLayoutChange={handleLayoutChange}
        containerPadding={[0, 0]}
        draggableHandle=".widget-drag-handle"
        draggableCancel=".no-drag, button, input, textarea, select, [role='menu'], [role='dialog']"
      >
        <div key="metrics" className="rounded-2xl">
          {renderWidget("metrics")}
        </div>
        {/* <div key="budget" className="rounded-2xl">
          {renderWidget("budget")}
        </div> */}
        <div key="status" className="rounded-2xl">
          {renderWidget("status")}
        </div>
        <div key="performance" className="rounded-2xl">
          {renderWidget("performance")}
        </div>
        <div key="categories" className="rounded-2xl">
          {renderWidget("categories")}
        </div>
        <div key="actions" className="rounded-2xl">
          {renderWidget("actions")}
        </div>
        {/* <div key="compliance" className="rounded-2xl">
          {renderWidget("compliance")}
        </div> */}
      </ResponsiveGridLayout>

      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Dashboard Layout</DialogTitle>
            <DialogDescription>
              Do you want to save the current layout as your default dashboard
              view?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={saveLayout}
              disabled={!layoutDirty}
              variant="default"
            >
              Save Layout
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
