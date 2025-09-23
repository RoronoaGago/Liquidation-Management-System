import { useState, useEffect } from "react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import {
  BarChart3,
  PieChart as PieChartIcon,
  RefreshCw,
  FileText,
  Clock,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Grid,
  Save,
  GripVertical,
  RotateCcw,
  Eye,
  CheckSquare,
  FileCheck,
  Hourglass,
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
import { Responsive, WidthProvider, Layout } from "react-grid-layout";
import Badge from "@/components/ui/badge/Badge";
import { Skeleton } from "antd";
import { Dropdown } from "@/components/ui/dropdown/Dropdown";
import { DropdownItem } from "@/components/ui/dropdown/DropdownItem";
import { MoreDotIcon } from "@/icons";

const ResponsiveGridLayout = WidthProvider(Responsive);

// Types for liquidator dashboard data
interface LiquidatorDashboardData {
  pendingLiquidations: LiquidationItem[];
  underReviewLiquidations: LiquidationItem[];
  accountantReviewLiquidations: LiquidationItem[];
  liquidationMetrics: {
    total_pending: number;
    total_under_review: number;
    total_with_accountant: number;
    avg_review_time_hours: number;
    completion_rate: number;
  };
  reviewTimeline: ReviewTimelineData[];
  districtPerformance: DistrictPerformanceData[];
  categoryBreakdown: CategoryBreakdownData[];
  priorityDistribution: PriorityDistributionData[];
}

interface LiquidationItem {
  liquidationId: string;
  requestId: string;
  schoolName: string;
  districtName: string;
  schoolId: string;
  submittedDate: string;
  districtApprovalDate: string;
  totalAmount: number;
  status: 'approved_district' | 'under_review_liquidator' | 'approved_liquidator' | 'under_review_division' | 'approved_division' | 'liquidated';
  priority: "high" | "medium" | "low";
  daysSinceSubmission: number;
  liquidatorAssigned?: string;
  accountantAssigned?: string;
  requirementsCompleted: number;
  totalRequirements: number;
}

interface ReviewTimelineData {
  date: string;
  pending: number;
  underReview: number;
  completed: number;
  avgProcessingTime: number;
}

interface DistrictPerformanceData {
  districtId: string;
  districtName: string;
  totalLiquidations: number;
  approvedLiquidations: number;
  rejectionRate: number;
  avgProcessingTime: number;
  complianceRate: number;
}

interface CategoryBreakdownData {
  category: string;
  count: number;
  amount: number;
  percentage: number;
}

interface PriorityDistributionData {
  priority: string;
  count: number;
  percentage: number;
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

//

const USE_MOCK_DATA = true;

const MOCK_DATA: LiquidatorDashboardData = {
  pendingLiquidations: [
    {
      liquidationId: "LQ-001",
      requestId: "REQ-2025-0001",
      schoolName: "Northridge Elementary",
      districtName: "North District",
      schoolId: "SCH-1001",
      submittedDate: "2025-09-01",
      districtApprovalDate: "2025-09-05",
      totalAmount: 125000,
      status: 'approved_district',
      priority: "high",
      daysSinceSubmission: 12,
      requirementsCompleted: 4,
      totalRequirements: 6,
    },
    {
      liquidationId: "LQ-002",
      requestId: "REQ-2025-0002",
      schoolName: "Lakeside High School",
      districtName: "West District",
      schoolId: "SCH-1002",
      submittedDate: "2025-08-18",
      districtApprovalDate: "2025-08-22",
      totalAmount: 98000,
      status: 'approved_district',
      priority: "medium",
      daysSinceSubmission: 28,
      requirementsCompleted: 5,
      totalRequirements: 8,
    },
  ],
  underReviewLiquidations: [
    {
      liquidationId: "LQ-003",
      requestId: "REQ-2025-0003",
      schoolName: "Maple Grove Middle",
      districtName: "East District",
      schoolId: "SCH-1003",
      submittedDate: "2025-08-10",
      districtApprovalDate: "2025-08-15",
      totalAmount: 45250,
      status: 'under_review_liquidator',
      priority: "high",
      daysSinceSubmission: 34,
      requirementsCompleted: 6,
      totalRequirements: 10,
    },
  ],
  accountantReviewLiquidations: [
    {
      liquidationId: "LQ-004",
      requestId: "REQ-2025-0004",
      schoolName: "Pinecrest Elementary",
      districtName: "South District",
      schoolId: "SCH-1004",
      submittedDate: "2025-08-02",
      districtApprovalDate: "2025-08-06",
      totalAmount: 76200,
      status: 'under_review_division',
      priority: "low",
      daysSinceSubmission: 40,
      accountantAssigned: "A. Santos",
      requirementsCompleted: 8,
      totalRequirements: 9,
    },
  ],
  liquidationMetrics: {
    total_pending: 12,
    total_under_review: 7,
    total_with_accountant: 5,
    avg_review_time_hours: 18.4,
    completion_rate: 76.3,
  },
  reviewTimeline: [
    { date: "2025-09-01", pending: 10, underReview: 4, completed: 6, avgProcessingTime: 19 },
    { date: "2025-09-08", pending: 9, underReview: 5, completed: 7, avgProcessingTime: 18 },
    { date: "2025-09-15", pending: 12, underReview: 7, completed: 8, avgProcessingTime: 17 },
  ],
  districtPerformance: [
    { districtId: "D-001", districtName: "North District", totalLiquidations: 24, approvedLiquidations: 18, rejectionRate: 8.5, avgProcessingTime: 3.1, complianceRate: 92.4 },
    { districtId: "D-002", districtName: "West District", totalLiquidations: 19, approvedLiquidations: 13, rejectionRate: 12.2, avgProcessingTime: 4.0, complianceRate: 88.6 },
    { districtId: "D-003", districtName: "East District", totalLiquidations: 15, approvedLiquidations: 10, rejectionRate: 15.4, avgProcessingTime: 4.6, complianceRate: 81.2 },
  ],
  categoryBreakdown: [
    { category: "Supplies", count: 42, amount: 210000, percentage: 35 },
    { category: "Utilities", count: 18, amount: 120000, percentage: 20 },
    { category: "Maintenance", count: 12, amount: 90000, percentage: 15 },
    { category: "Training", count: 9, amount: 60000, percentage: 10 },
    { category: "Transportation", count: 11, amount: 72000, percentage: 12 },
    { category: "Others", count: 7, amount: 48000, percentage: 8 },
  ],
  priorityDistribution: [
    { priority: "high", count: 7, percentage: 35, trend: "up" },
    { priority: "medium", count: 9, percentage: 45, trend: "stable" },
    { priority: "low", count: 4, percentage: 20, trend: "down" },
  ],
};

const defaultLayouts: DashboardLayout = {
  lg: [
    { i: "metrics", x: 0, y: 0, w: 12, h: 3, minW: 4, minH: 2 },
    { i: "pending", x: 0, y: 3, w: 6, h: 8, minW: 4, minH: 6 },
    { i: "underReview", x: 6, y: 3, w: 6, h: 8, minW: 4, minH: 6 },
    { i: "accountantReview", x: 0, y: 11, w: 6, h: 8, minW: 4, minH: 6 },
    { i: "timeline", x: 6, y: 11, w: 6, h: 6, minW: 4, minH: 4 },
    { i: "districtPerformance", x: 0, y: 19, w: 8, h: 8, minW: 6, minH: 6 },
    { i: "categoryBreakdown", x: 8, y: 19, w: 4, h: 8, minW: 4, minH: 6 },
  ],
  md: [
    { i: "metrics", x: 0, y: 0, w: 8, h: 2, minW: 4, minH: 2 },
    { i: "pending", x: 0, y: 2, w: 8, h: 6, minW: 4, minH: 4 },
    { i: "underReview", x: 0, y: 8, w: 8, h: 6, minW: 4, minH: 4 },
    { i: "accountantReview", x: 0, y: 14, w: 8, h: 6, minW: 4, minH: 4 },
    { i: "timeline", x: 0, y: 20, w: 8, h: 6, minW: 4, minH: 4 },
    { i: "districtPerformance", x: 0, y: 26, w: 8, h: 8, minW: 6, minH: 6 },
    { i: "categoryBreakdown", x: 0, y: 34, w: 8, h: 8, minW: 4, minH: 6 },
  ],
  sm: [
    { i: "metrics", x: 0, y: 0, w: 4, h: 2, minW: 4, minH: 2 },
    { i: "pending", x: 0, y: 2, w: 4, h: 6, minW: 4, minH: 4 },
    { i: "underReview", x: 0, y: 8, w: 4, h: 6, minW: 4, minH: 4 },
    { i: "accountantReview", x: 0, y: 14, w: 4, h: 6, minW: 4, minH: 4 },
    { i: "timeline", x: 0, y: 20, w: 4, h: 6, minW: 4, minH: 4 },
    { i: "districtPerformance", x: 0, y: 26, w: 4, h: 8, minW: 4, minH: 6 },
    { i: "categoryBreakdown", x: 0, y: 34, w: 4, h: 8, minW: 4, minH: 6 },
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

const MetricsWidget = ({ data }: { data: LiquidatorDashboardData | null }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 h-full">
    {[
      {
        title: "Pending Review",
        icon: <Hourglass className="h-5 w-5 text-amber-600 dark:text-amber-400" />,
        value: `${data?.liquidationMetrics?.total_pending || 0}`,
        description: "Awaiting liquidator review",
        bgColor: "bg-amber-100 dark:bg-amber-900/20",
        color: "text-amber-600 dark:text-amber-400",
      },
      {
        title: "Under Review",
        icon: <Eye className="h-5 w-5 text-blue-600 dark:text-blue-400" />,
        value: `${data?.liquidationMetrics?.total_under_review || 0}`,
        description: "Currently being reviewed",
        bgColor: "bg-blue-100 dark:bg-blue-900/20",
        color: "text-blue-600 dark:text-blue-400",
      },
      {
        title: "With Accountant",
        icon: <FileCheck className="h-5 w-5 text-purple-600 dark:text-purple-400" />,
        value: `${data?.liquidationMetrics?.total_with_accountant || 0}`,
        description: "Under accountant review",
        bgColor: "bg-purple-100 dark:bg-purple-900/20",
        color: "text-purple-600 dark:text-purple-400",
      },
      {
        title: "Avg. Review Time",
        icon: <Clock className="h-5 w-5 text-green-600 dark:text-green-400" />,
        value: `${data?.liquidationMetrics?.avg_review_time_hours?.toFixed(1) || 0}h`,
        description: "From submission to approval",
        bgColor: "bg-green-100 dark:bg-green-900/20",
        color: "text-green-600 dark:text-green-400",
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
            <h4 className={`mt-2 font-bold text-title-sm ${metric.color}`}>
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

const PendingLiquidationsWidget = ({
  data,
  editMode,
  onReviewLiquidation,
}: {
  data: LiquidatorDashboardData | null;
  editMode: boolean;
  onReviewLiquidation: (liquidationId: string) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleDropdown = () => setIsOpen(!isOpen);
  const closeDropdown = () => setIsOpen(false);

  const items = data?.pendingLiquidations || [];

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'approved_district': { label: 'District Approved', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400' },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || { label: status, color: 'bg-gray-100 text-gray-800' };
    
    return (
      <Badge size="sm" className={config.color}>
        {config.label}
      </Badge>
    );
  };

  return (
    <WidgetContainer
      title="📋 Pending Liquidations"
      subtitle="Liquidations approved by district, awaiting review"
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
              Export Data
            </DropdownItem>
            <DropdownItem
              onItemClick={closeDropdown}
              className="flex w-full font-normal text-left text-gray-500 rounded-lg hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
            >
              View All
            </DropdownItem>
          </Dropdown>
        </div>
      }
    >
      <div className="space-y-3 overflow-auto max-h-[400px] pr-1">
        {items.map((liquidation) => (
          <div
            key={liquidation.liquidationId}
            className="flex items-center justify-between p-3 border border-gray-200 rounded-lg dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
            onClick={() => onReviewLiquidation(liquidation.liquidationId)}
          >
            <div className="flex items-center min-w-0 flex-1">
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between mb-1">
                  <div className="font-medium text-gray-800 text-theme-sm dark:text-white/90 truncate">
                    {liquidation.schoolName}
                  </div>
                  {getStatusBadge(liquidation.status)}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {liquidation.districtName} • ₱{liquidation.totalAmount.toLocaleString()} • {liquidation.daysSinceSubmission} days ago
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {liquidation.requirementsCompleted}/{liquidation.totalRequirements} docs
                  </div>
                  <div className="w-16 bg-gray-200 rounded-full h-1.5 dark:bg-gray-700">
                    <div
                      className="bg-green-500 h-1.5 rounded-full"
                      style={{ 
                        width: `${(liquidation.requirementsCompleted / liquidation.totalRequirements) * 100}%` 
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
            <Button
              size="sm"
              className="no-drag shrink-0 ml-3"
              onClick={(e) => {
                e.stopPropagation();
                onReviewLiquidation(liquidation.liquidationId);
              }}
            >
              <Eye className="h-4 w-4 mr-1" />
              Review
            </Button>
          </div>
        ))}
        {items.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <FileCheck className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No pending liquidations</p>
            <p className="text-sm">All caught up!</p>
          </div>
        )}
      </div>
    </WidgetContainer>
  );
};

const UnderReviewLiquidationsWidget = ({
  data,
  editMode,
  onViewLiquidation,
}: {
  data: LiquidatorDashboardData | null;
  editMode: boolean;
  onViewLiquidation: (liquidationId: string) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleDropdown = () => setIsOpen(!isOpen);
  const closeDropdown = () => setIsOpen(false);

  const items = data?.underReviewLiquidations || [];

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'under_review_liquidator': { label: 'Under Review', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || { label: status, color: 'bg-gray-100 text-gray-800' };
    
    return (
      <Badge size="sm" className={config.color}>
        {config.label}
      </Badge>
    );
  };

  return (
    <WidgetContainer
      title="👁️ Under Review"
      subtitle="Liquidations currently being reviewed by you"
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
              Export Data
            </DropdownItem>
            <DropdownItem
              onItemClick={closeDropdown}
              className="flex w-full font-normal text-left text-gray-500 rounded-lg hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
            >
              View All
            </DropdownItem>
          </Dropdown>
        </div>
      }
    >
      <div className="space-y-3 overflow-auto max-h-[400px] pr-1">
        {items.map((liquidation) => (
          <div
            key={liquidation.liquidationId}
            className="flex items-center justify-between p-3 border border-gray-200 rounded-lg dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
            onClick={() => onViewLiquidation(liquidation.liquidationId)}
          >
            <div className="flex items-center min-w-0 flex-1">
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between mb-1">
                  <div className="font-medium text-gray-800 text-theme-sm dark:text-white/90 truncate">
                    {liquidation.schoolName}
                  </div>
                  {getStatusBadge(liquidation.status)}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {liquidation.districtName} • ₱{liquidation.totalAmount.toLocaleString()}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge
                    size="sm"
                    color={
                      liquidation.priority === "high"
                        ? "error"
                        : liquidation.priority === "medium"
                        ? "warning"
                        : "success"
                    }
                  >
                    {liquidation.priority} priority
                  </Badge>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Started: {new Date(liquidation.districtApprovalDate).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="no-drag shrink-0 ml-3"
              onClick={(e) => {
                e.stopPropagation();
                onViewLiquidation(liquidation.liquidationId);
              }}
            >
              Continue
            </Button>
          </div>
        ))}
        {items.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Eye className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No liquidations under review</p>
            <p className="text-sm">Start reviewing pending liquidations</p>
          </div>
        )}
      </div>
    </WidgetContainer>
  );
};

const AccountantReviewWidget = ({
  data,
  editMode,
  onViewLiquidation,
}: {
  data: LiquidatorDashboardData | null;
  editMode: boolean;
  onViewLiquidation: (liquidationId: string) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleDropdown = () => setIsOpen(!isOpen);
  const closeDropdown = () => setIsOpen(false);

  const items = data?.accountantReviewLiquidations || [];

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'approved_liquidator': { label: 'With Accountant', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400' },
      'under_review_division': { label: 'Accountant Review', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400' },
      'approved_division': { label: 'Accountant Approved', color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' },
      'liquidated': { label: 'Completed', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400' },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || { label: status, color: 'bg-gray-100 text-gray-800' };
    
    return (
      <Badge size="sm" className={config.color}>
        {config.label}
      </Badge>
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved_liquidator':
        return <FileCheck className="h-4 w-4 text-purple-600" />;
      case 'under_review_division':
        return <Eye className="h-4 w-4 text-indigo-600" />;
      case 'approved_division':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'liquidated':
        return <CheckSquare className="h-4 w-4 text-gray-600" />;
      default:
        return <FileText className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <WidgetContainer
      title="📊 With Accountant"
      subtitle="Liquidations sent for accountant review"
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
              Export Data
            </DropdownItem>
            <DropdownItem
              onItemClick={closeDropdown}
              className="flex w-full font-normal text-left text-gray-500 rounded-lg hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
            >
              View All
            </DropdownItem>
          </Dropdown>
        </div>
      }
    >
      <div className="space-y-3 overflow-auto max-h-[400px] pr-1">
        {items.map((liquidation) => (
          <div
            key={liquidation.liquidationId}
            className="flex items-center justify-between p-3 border border-gray-200 rounded-lg dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
            onClick={() => onViewLiquidation(liquidation.liquidationId)}
          >
            <div className="flex items-center min-w-0 flex-1">
              <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full mr-3 dark:bg-gray-800 shrink-0">
                {getStatusIcon(liquidation.status)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between mb-1">
                  <div className="font-medium text-gray-800 text-theme-sm dark:text-white/90 truncate">
                    {liquidation.schoolName}
                  </div>
                  {getStatusBadge(liquidation.status)}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {liquidation.districtName} • ₱{liquidation.totalAmount.toLocaleString()}
                </div>
                {liquidation.accountantAssigned && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Accountant: {liquidation.accountantAssigned}
                  </div>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="no-drag shrink-0 ml-3"
              onClick={(e) => {
                e.stopPropagation();
                onViewLiquidation(liquidation.liquidationId);
              }}
            >
              View
            </Button>
          </div>
        ))}
        {items.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <FileCheck className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No liquidations with accountant</p>
            <p className="text-sm">Approved liquidations will appear here</p>
          </div>
        )}
      </div>
    </WidgetContainer>
  );
};

const TimelineWidget = ({
  data,
  editMode,
}: {
  data: LiquidatorDashboardData | null;
  editMode: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleDropdown = () => setIsOpen(!isOpen);
  const closeDropdown = () => setIsOpen(false);

  return (
    <WidgetContainer
      title="📈 Review Timeline"
      subtitle="Liquidation processing trends over time"
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
              Export Data
            </DropdownItem>
            <DropdownItem
              onItemClick={closeDropdown}
              className="flex w-full font-normal text-left text-gray-500 rounded-lg hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
            >
              View Details
            </DropdownItem>
          </Dropdown>
        </div>
      }
    >
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data?.reviewTimeline || []}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E4E7EC" />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: "#6B7280" }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: "#6B7280" }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#fff",
                border: "1px solid #E4E7EC",
                borderRadius: "8px",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
              }}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="pending"
              stackId="1"
              stroke="#f59e0b"
              fill="#f59e0b"
              fillOpacity={0.2}
              name="Pending"
            />
            <Area
              type="monotone"
              dataKey="underReview"
              stackId="1"
              stroke="#3b82f6"
              fill="#3b82f6"
              fillOpacity={0.2}
              name="Under Review"
            />
            <Area
              type="monotone"
              dataKey="completed"
              stackId="1"
              stroke="#10b981"
              fill="#10b981"
              fillOpacity={0.2}
              name="Completed"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </WidgetContainer>
  );
};

const DistrictPerformanceWidget = ({
  data,
  editMode,
}: {
  data: LiquidatorDashboardData | null;
  editMode: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleDropdown = () => setIsOpen(!isOpen);
  const closeDropdown = () => setIsOpen(false);

  const rows = data?.districtPerformance || [];

  return (
    <WidgetContainer
      title="🏫 District Performance"
      subtitle="Liquidation metrics by school district"
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
              Export CSV
            </DropdownItem>
            <DropdownItem
              onItemClick={closeDropdown}
              className="flex w-full font-normal text-left text-gray-500 rounded-lg hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
            >
              View Details
            </DropdownItem>
          </Dropdown>
        </div>
      }
    >
      <div className="overflow-auto max-h-[400px] rounded-md border border-gray-200 dark:border-gray-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50 sticky top-0 z-10">
              <th className="p-3 text-left font-medium text-gray-500 text-theme-xs dark:text-gray-400">
                District
              </th>
              <th className="p-3 text-left font-medium text-gray-500 text-theme-xs dark:text-gray-400">
                Total
              </th>
              <th className="p-3 text-left font-medium text-gray-500 text-theme-xs dark:text-gray-400">
                Approved
              </th>
              <th className="p-3 text-left font-medium text-gray-500 text-theme-xs dark:text-gray-400">
                Rejection Rate
              </th>
              <th className="p-3 text-left font-medium text-gray-500 text-theme-xs dark:text-gray-400">
                Avg. Time
              </th>
              <th className="p-3 text-left font-medium text-gray-500 text-theme-xs dark:text-gray-400">
                Compliance
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((district, index) => (
              <tr
                key={district.districtId}
                className={index % 2 === 0 ? "bg-muted/30" : ""}
              >
                <td className="p-3 font-medium text-gray-800 text-theme-sm dark:text-white/90">
                  <span className="inline-block max-w-[150px] truncate">
                    {district.districtName}
                  </span>
                </td>
                <td className="p-3 text-gray-500 text-theme-sm dark:text-gray-400">
                  {district.totalLiquidations}
                </td>
                <td className="p-3 text-gray-500 text-theme-sm dark:text-gray-400">
                  {district.approvedLiquidations}
                </td>
                <td className="p-3 text-gray-500 text-theme-sm dark:text-gray-400">
                  <div className="flex items-center">
                    {district.rejectionRate.toFixed(1)}%
                    {district.rejectionRate > 20 ? (
                      <TrendingDown className="ml-2 h-4 w-4 text-red-500" />
                    ) : (
                      <TrendingUp className="ml-2 h-4 w-4 text-green-500" />
                    )}
                  </div>
                </td>
                <td className="p-3 text-gray-500 text-theme-sm dark:text-gray-400">
                  {district.avgProcessingTime.toFixed(1)} days
                </td>
                <td className="p-3 text-gray-500 text-theme-sm dark:text-gray-400">
                  <div className="flex items-center">
                    {district.complianceRate.toFixed(1)}%
                    <div className="ml-2 w-16 bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${district.complianceRate}%` }}
                      />
                    </div>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td
                  className="p-3 text-gray-500 dark:text-gray-400"
                  colSpan={6}
                >
                  No district performance data available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </WidgetContainer>
  );
};

const CategoryBreakdownWidget = ({
  data,
  editMode,
}: {
  data: LiquidatorDashboardData | null;
  editMode: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"chart" | "list">("chart");

  const toggleDropdown = () => setIsOpen(!isOpen);
  const closeDropdown = () => setIsOpen(false);

  const categories = data?.categoryBreakdown || [];

  return (
    <WidgetContainer
      title="📊 Expense Categories"
      subtitle="Breakdown by expense type"
      editMode={editMode}
      actions={
        <div className="flex items-center gap-2">
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
                Export Data
              </DropdownItem>
              <DropdownItem
                onItemClick={closeDropdown}
                className="flex w-full font-normal text-left text-gray-500 rounded-lg hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
              >
                View Details
              </DropdownItem>
            </Dropdown>
          </div>
        </div>
      }
    >
      {viewMode === "chart" ? (
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={categories as any}
                cx="50%"
                cy="50%"
                outerRadius={80}
                innerRadius={40}
                fill="#8884d8"
                dataKey="count"
                label={({ category, percentage }) =>
                  `${category} (${percentage}%)`
                }
                labelLine={false}
              >
                {categories.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, name, props) => [
                  `${value} liquidations • ₱${props.payload.amount?.toLocaleString()}`,
                  name,
                ]}
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #E4E7EC",
                  borderRadius: "8px",
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="space-y-3 overflow-auto max-h-[360px] pr-1">
          {categories.map((category, index) => (
            <div
              key={category.category}
              className="flex items-center justify-between p-3 border border-gray-200 rounded-lg dark:border-gray-800"
            >
              <div className="flex items-center min-w-0 gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="font-medium text-gray-800 text-theme-sm dark:text-white/90 truncate max-w-[120px]">
                  {category.category}
                </span>
              </div>
              <div className="text-right">
                <div className="font-semibold text-gray-800 text-theme-sm dark:text-white/90">
                  {category.count} liquidations
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  ₱{category.amount.toLocaleString()} • {category.percentage}%
                </div>
              </div>
            </div>
          ))}
          {categories.length === 0 && (
            <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
              No category data available.
            </div>
          )}
        </div>
      )}
    </WidgetContainer>
  );
};

const DivisionLiquidatorDashboard = () => {
  const [data, setData] = useState<LiquidatorDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<string>("last_month");
  const [refreshing, setRefreshing] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [layouts, setLayouts] = useState<DashboardLayout>(defaultLayouts);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [layoutDirty, setLayoutDirty] = useState(false);

  useEffect(() => {
    fetchDashboardData();
    const savedLayout = localStorage.getItem("liquidatorDashboardLayout");
    if (savedLayout) {
      try {
        const parsed = JSON.parse(savedLayout);
        setLayouts(parsed);
      } catch {
        // ignore bad layout
      }
    }
  }, [timeRange]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      if (USE_MOCK_DATA) {
        await new Promise((r) => setTimeout(r, 400));
        setData(MOCK_DATA);
        return;
      }
      const response = await api.get(
        `/liquidator-dashboard/?time_range=${timeRange}`
      );
      setData(response.data);
    } catch (error) {
      console.error("Failed to fetch liquidator dashboard data:", error);
      setData(MOCK_DATA);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  // handled inline in ResponsiveGridLayout to avoid unused warnings

  const saveLayout = () => {
    localStorage.setItem("liquidatorDashboardLayout", JSON.stringify(layouts));
    setShowSaveDialog(false);
    setEditMode(false);
    setLayoutDirty(false);
  };

  const resetLayout = () => {
    setLayouts(defaultLayouts);
    localStorage.removeItem("liquidatorDashboardLayout");
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

  const handleReviewLiquidation = (liquidationId: string) => {
    // Navigate to liquidation review page
    window.location.href = `/liquidations/${liquidationId}/review`;
  };

  const handleViewLiquidation = (liquidationId: string) => {
    // Navigate to liquidation details page
    window.location.href = `/liquidations/${liquidationId}`;
  };

  const renderWidget = (widgetId: string) => {
    switch (widgetId) {
      case "metrics":
        return <MetricsWidget data={data} />;
      case "pending":
        return (
          <PendingLiquidationsWidget
            data={data}
            editMode={editMode}
            onReviewLiquidation={handleReviewLiquidation}
          />
        );
      case "underReview":
        return (
          <UnderReviewLiquidationsWidget
            data={data}
            editMode={editMode}
            onViewLiquidation={handleViewLiquidation}
          />
        );
      case "accountantReview":
        return (
          <AccountantReviewWidget
            data={data}
            editMode={editMode}
            onViewLiquidation={handleViewLiquidation}
          />
        );
      case "timeline":
        return <TimelineWidget data={data} editMode={editMode} />;
      case "districtPerformance":
        return <DistrictPerformanceWidget data={data} editMode={editMode} />;
      case "categoryBreakdown":
        return <CategoryBreakdownWidget data={data} editMode={editMode} />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className={`p-6 min-h-screen ${editMode ? "select-none" : ""}`}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white/90">
              Division Liquidator Dashboard
            </h1>
            <p className="mt-1 text-gray-500 text-theme-sm dark:text-gray-400">
              Liquidation review and approval workflow
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6">
          {[1, 2, 3, 4].map((item) => (
            <Skeleton key={item} active paragraph={{ rows: 3 }} />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map(() => (
            <Skeleton key={Math.random()} active paragraph={{ rows: 6 }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`p-6 min-h-screen ${editMode ? "select-none" : ""}`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white/90">
            Division Liquidator Dashboard
          </h1>
          <p className="mt-1 text-gray-500 text-theme-sm dark:text-gray-400">
            Liquidation review and approval workflow
          </p>
        </div>
        <div className="flex items-center gap-3 mt-4 md:mt-0">
          <div className="flex items-center gap-2">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[180px] no-drag">
                <SelectValue placeholder="Time Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="last_week">Last Week</SelectItem>
                <SelectItem value="last_month">Last Month</SelectItem>
                <SelectItem value="last_quarter">Last Quarter</SelectItem>
              </SelectContent>
            </Select>

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
          </div>
        </div>
      </div>

      {editMode && (
        <div className="mb-3 text-xs text-gray-600 dark:text-gray-400">
          Drag using the handle next to each title. Resize from the edges.
          Changes are not saved until you click Save.
        </div>
      )}

      <ResponsiveGridLayout
        className="layout"
        layouts={layouts}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480 }}
        cols={{ lg: 12, md: 8, sm: 4 }}
        rowHeight={60}
        margin={[20, 20]}
        isDraggable={editMode}
        isResizable={editMode}
        compactType="vertical"
        preventCollision={false}
        isBounded={true}
        useCSSTransforms={true}
        verticalCompact={true}
        allowOverlap={false}
        onLayoutChange={(_, allLayouts: any) => {
          setLayouts((prev) => ({
            ...prev,
            ...allLayouts,
          }));
          setLayoutDirty(true);
        }}
        containerPadding={[0, 0]}
        draggableHandle=".widget-drag-handle"
        draggableCancel=".no-drag, button, input, textarea, select, [role='menu'], [role='dialog']"
      >
        <div key="metrics" className="rounded-2xl">
          {renderWidget("metrics")}
        </div>
        <div key="pending" className="rounded-2xl">
          {renderWidget("pending")}
        </div>
        <div key="underReview" className="rounded-2xl">
          {renderWidget("underReview")}
        </div>
        <div key="accountantReview" className="rounded-2xl">
          {renderWidget("accountantReview")}
        </div>
        <div key="timeline" className="rounded-2xl">
          {renderWidget("timeline")}
        </div>
        <div key="districtPerformance" className="rounded-2xl">
          {renderWidget("districtPerformance")}
        </div>
        <div key="categoryBreakdown" className="rounded-2xl">
          {renderWidget("categoryBreakdown")}
        </div>
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
            <Button onClick={saveLayout} disabled={!layoutDirty}>
              Save Layout
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DivisionLiquidatorDashboard;