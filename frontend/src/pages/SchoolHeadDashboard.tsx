/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import api from "@/services/api"; // Assuming this is your backend API client
import { format } from "date-fns";
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
  PolarAngleAxis,
} from "recharts";
import {
  Download,
  AlertCircle,
  CheckCircle,
  DollarSign,
  RefreshCw,
  Plus,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Badge from "@/components/ui/badge/Badge";
import { Skeleton } from "antd";
import { useNavigate } from "react-router-dom";

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
      date_approved?: string;
      date_downloaded?: string;
      date_rejected?: string;
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
      date_districtApproved?: string;
      date_liquidatorApproved?: string;
      date_liquidated?: string;
      date_submitted?: string;
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

// Toggle to use mock data for showcasing the dashboard without backend
const USE_MOCK_DATA = false;

const MOCK_DASHBOARD_DATA: SchoolHeadDashboardData = {
  liquidationProgress: {
    priorities: [
      {
        priorityId: "p1",
        priorityName: "Utilities",
        status: "completed",
        documentsRequired: 5,
        documentsUploaded: 5,
        completionPercentage: 100,
      },
      {
        priorityId: "p2",
        priorityName: "Supplies",
        status: "in_progress",
        documentsRequired: 6,
        documentsUploaded: 4,
        completionPercentage: 67,
      },
      {
        priorityId: "p3",
        priorityName: "Repair & Maintenance",
        status: "in_progress",
        documentsRequired: 4,
        documentsUploaded: 2,
        completionPercentage: 50,
      },
      {
        priorityId: "p4",
        priorityName: "Training",
        status: "not_started",
        documentsRequired: 3,
        documentsUploaded: 0,
        completionPercentage: 0,
      },
    ],
    totalPriorities: 4,
    completedPriorities: 1,
    completionPercentage: 54.3,
  },
  financialMetrics: {
    totalDownloadedAmount: 250000,
    totalLiquidatedAmount: 135800,
    liquidationPercentage: 54.3,
    remainingAmount: 114200,
  },
  recentLiquidations: [
    {
      id: "l1",
      priorityName: "Utilities",
      amount: 45000,
      status: "approved",
      date: new Date().toISOString(),
    },
    {
      id: "l2",
      priorityName: "Supplies",
      amount: 35800,
      status: "submitted",
      date: new Date().toISOString(),
    },
  ],
  priorityBreakdown: [
    {
      priority: "Utilities",
      amount: 65000,
      percentage: 26,
      color: "#465FFF",
      name: "Utilities",
    },
    {
      priority: "Supplies",
      amount: 80000,
      percentage: 32,
      color: "#9CB9FF",
      name: "Supplies",
    },
    {
      priority: "Repair & Maintenance",
      amount: 70000,
      percentage: 28,
      color: "#FF8042",
      name: "Repair & Maintenance",
    },
    {
      priority: "Training",
      amount: 35000,
      percentage: 14,
      color: "#00C49F",
      name: "Training",
    },
  ],
  requestStatus: {
    hasPendingRequest: true,
    hasActiveLiquidation: false,
    pendingRequest: {
      request_id: "REQ-2025-09",
      status: "submitted",
      request_monthyear: format(new Date(), "yyyy-MM"),
      created_at: new Date().toISOString(),
      school_name: "Sample High School",
      school_id: "SCH-001",
      division: "Division A",
      total_amount: 250000,
      priorities: [
        { expenseTitle: "Utilities", amount: 65000 },
        { expenseTitle: "Supplies", amount: 80000 },
        { expenseTitle: "Repair & Maintenance", amount: 70000 },
        { expenseTitle: "Training", amount: 35000 },
      ],
    },
  },
  frequentlyUsedPriorities: [
    {
      priority: "Supplies",
      frequency: 8,
      totalAmount: 560000,
      lastUsed: new Date().toISOString(),
    },
    {
      priority: "Utilities",
      frequency: 7,
      totalAmount: 420000,
      lastUsed: new Date().toISOString(),
    },
  ],
  recentRequests: [
    {
      request_id: "REQ-2025-08",
      status: "approved",
      request_monthyear: "2025-08",
      created_at: new Date().toISOString(),
      total_amount: 200000,
      priorities: [
        { expenseTitle: "Utilities", amount: 60000 },
        { expenseTitle: "Supplies", amount: 70000 },
      ],
    },
  ],
};

const SchoolHeadDashboard = () => {
  const [data, setData] = useState<SchoolHeadDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [selectedMonth] = useState(format(new Date(), "yyyy-MM"));

  const getPriorityColor = (priorityName: string, fallbackIndex = 0) => {
    const index = data?.liquidationProgress.priorities.findIndex(
      (p) => p.priorityName === priorityName
    );
    const colorIndex =
      index !== undefined && index !== -1 ? index : fallbackIndex;
    return COLORS[colorIndex % COLORS.length];
  };

  const truncateLabel = (value: string, maxLength = 16) => {
    if (!value) return "";
    return value.length > maxLength
      ? value.slice(0, maxLength - 1) + "…"
      : value;
  };

  const formatMonthTitle = (ym: string | undefined) => {
    if (!ym) return "Month Expense Breakdown";
    try {
      const date = new Date(ym + "-01");
      const month = date.toLocaleString("default", { month: "long" });
      const year = ym.split("-")[0];
      return `${month} ${year} Expense Breakdown`;
    } catch {
      return "Month Expense Breakdown";
    }
  };

  useEffect(() => {
    fetchDashboardData(selectedMonth);
  }, [selectedMonth]);

  const fetchDashboardData = async (month?: string) => {
    setLoading(true);
    try {
      if (USE_MOCK_DATA) {
        // Simulate a short network delay for UX
        await new Promise((resolve) => setTimeout(resolve, 500));
        setData(MOCK_DASHBOARD_DATA);
        setLoading(false);
        return;
      }
      const url = month
        ? `/school-head/dashboard/?month=${month}`
        : "/school-head/dashboard/";
      const response = await api.get(url);
      const respData: SchoolHeadDashboardData = response.data;

      // Fallback: derive liquidationProgress from pending request priorities
      if (
        (!respData.liquidationProgress ||
          !respData.liquidationProgress.priorities ||
          respData.liquidationProgress.priorities.length === 0) &&
        respData.requestStatus?.pendingRequest?.priorities &&
        respData.requestStatus.pendingRequest.priorities.length > 0
      ) {
        const derivedPriorities: PriorityProgress[] =
          respData.requestStatus.pendingRequest.priorities.map(
            (p: any, idx: number) => ({
              priorityId: String(p.id ?? `pending-${idx}`),
              priorityName:
                p?.priority?.expenseTitle ||
                p?.expenseTitle ||
                `Priority ${idx + 1}`,
              status: "not_started",
              documentsRequired: 0,
              documentsUploaded: 0,
              completionPercentage: 0,
            })
          );

        const totalPriorities = derivedPriorities.length;
        respData.liquidationProgress = {
          priorities: derivedPriorities,
          totalPriorities,
          completedPriorities: 0,
          completionPercentage: 0,
        };
      }

      // Fallback: derive priorityBreakdown from pending request priorities if missing
      if (
        (!respData.priorityBreakdown ||
          respData.priorityBreakdown.length === 0) &&
        respData.requestStatus?.pendingRequest?.priorities &&
        respData.requestStatus.pendingRequest.priorities.length > 0
      ) {
        const total = respData.requestStatus.pendingRequest.priorities.reduce(
          (sum: number, p: any) => sum + Number(p.amount || 0),
          0
        );
        respData.priorityBreakdown =
          respData.requestStatus.pendingRequest.priorities.map(
            (p: any, idx: number) => ({
              priority:
                p?.priority?.expenseTitle ||
                p?.expenseTitle ||
                `Priority ${idx + 1}`,
              amount: Number(p.amount || 0),
              percentage: total > 0 ? (Number(p.amount || 0) / total) * 100 : 0,
              color: COLORS[idx % COLORS.length],
              name:
                p?.priority?.expenseTitle ||
                p?.expenseTitle ||
                `Priority ${idx + 1}`,
            })
          );
      }

      // If still missing data, derive from the latest user request (regardless of status)
      const deriveFromLatestRequestIfNeeded = async () => {
        const needsPriorities =
          !respData.liquidationProgress ||
          !respData.liquidationProgress.priorities ||
          respData.liquidationProgress.priorities.length === 0;
        const needsBreakdown =
          !respData.priorityBreakdown ||
          respData.priorityBreakdown.length === 0;

        if (!needsPriorities && !needsBreakdown) return;

        try {
          const ur = await api.get("/user-requests/");
          const list = Array.isArray(ur.data)
            ? ur.data
            : Array.isArray(ur.data?.results)
            ? ur.data.results
            : [];
          const latest = list && list.length > 0 ? list[0] : null;
          const latestPriorities = latest?.priorities || [];
          if (
            (needsPriorities || needsBreakdown) &&
            latestPriorities.length > 0
          ) {
            // Build liquidationProgress.priorities from latest request priorities
            if (needsPriorities) {
              const derivedPriorities: PriorityProgress[] =
                latestPriorities.map((rp: any, idx: number) => {
                  const reqs = rp.priority?.requirements || [];
                  const requiredCount = reqs.filter(
                    (r: any) => r.is_required
                  ).length;
                  return {
                    priorityId: String(rp.id ?? `req-${idx}`),
                    priorityName:
                      rp.priority?.expenseTitle ||
                      rp.expenseTitle ||
                      `Priority ${idx + 1}`,
                    status: "not_started",
                    documentsRequired: requiredCount,
                    documentsUploaded: 0,
                    completionPercentage: 0,
                  };
                });
              respData.liquidationProgress = {
                priorities: derivedPriorities,
                totalPriorities: derivedPriorities.length,
                completedPriorities: 0,
                completionPercentage: 0,
              };
            }

            // Build priorityBreakdown from latest request priorities and amounts
            if (needsBreakdown) {
              const total = latestPriorities.reduce(
                (sum: number, rp: any) => sum + Number(rp.amount || 0),
                0
              );
              respData.priorityBreakdown = latestPriorities.map(
                (rp: any, idx: number) => ({
                  priority:
                    rp.priority?.expenseTitle ||
                    rp.expenseTitle ||
                    `Priority ${idx + 1}`,
                  amount: Number(rp.amount || 0),
                  percentage:
                    total > 0 ? (Number(rp.amount || 0) / total) * 100 : 0,
                  color: COLORS[idx % COLORS.length],
                  name:
                    rp.priority?.expenseTitle ||
                    rp.expenseTitle ||
                    `Priority ${idx + 1}`,
                })
              );
            }
          }
        } catch (e) {
          // Silent fallback; UI will show empty datasets with cards visible
          console.warn("Failed to derive from latest user request:", e);
        }
      };

      await deriveFromLatestRequestIfNeeded();

      // Enhance using active liquidation data to compute document progress and metrics
      try {
        const liqRes = await api.get("/liquidation/");
        const activeList = Array.isArray(liqRes.data)
          ? liqRes.data
          : Array.isArray(liqRes.data?.results)
          ? liqRes.data.results
          : [];
        const active =
          activeList && activeList.length > 0 ? activeList[0] : null;

        if (active) {
          const reqPriorities = (active.request?.priorities || []) as any[];
          const documents = (active.documents || []) as any[];
          const liquidationPriorities = (active.liquidation_priorities ||
            []) as any[];

          // Compute document progress per priority
          const progress: PriorityProgress[] = reqPriorities.map(
            (rp: any, idx: number) => {
              const allReqs = rp.priority?.requirements || [];
              const requiredReqs = allReqs.filter((r: any) => r.is_required);
              const uploadedForPriority = documents.filter(
                (d: any) => String(d.request_priority_id) === String(rp.id)
              );
              const uploadedRequiredCount = requiredReqs.filter((r: any) =>
                uploadedForPriority.some(
                  (d: any) =>
                    String(d.requirement_id) === String(r.requirementID)
                )
              ).length;
              const requiredCount = requiredReqs.length;
              const completion =
                requiredCount > 0
                  ? (uploadedRequiredCount / requiredCount) * 100
                  : 0;
              return {
                priorityId: String(rp.id ?? `req-${idx}`),
                priorityName:
                  rp.priority?.expenseTitle || `Priority ${idx + 1}`,
                status:
                  completion >= 100
                    ? "completed"
                    : completion > 0
                    ? "in_progress"
                    : "not_started",
                documentsRequired: requiredCount,
                documentsUploaded: uploadedRequiredCount,
                completionPercentage: Math.round(completion),
              } as PriorityProgress;
            }
          );

          // Update liquidationProgress
          respData.liquidationProgress = {
            priorities: progress,
            totalPriorities: progress.length,
            completedPriorities: progress.filter(
              (p) => p.status === "completed"
            ).length,
            completionPercentage:
              progress.length > 0
                ? progress.reduce((s, p) => s + p.completionPercentage, 0) /
                  progress.length
                : 0,
          };

          // Compute priority breakdown from requested amounts
          const totalRequested = reqPriorities.reduce(
            (sum: number, rp: any) => sum + Number(rp.amount || 0),
            0
          );
          respData.priorityBreakdown = reqPriorities.map(
            (rp: any, idx: number) => ({
              priority: rp.priority?.expenseTitle || `Priority ${idx + 1}`,
              amount: Number(rp.amount || 0),
              percentage:
                totalRequested > 0
                  ? (Number(rp.amount || 0) / totalRequested) * 100
                  : 0,
              color: COLORS[idx % COLORS.length],
              name: rp.priority?.expenseTitle || `Priority ${idx + 1}`,
            })
          );

          // Compute financial metrics
          const totalActual = liquidationPriorities.reduce(
            (sum: number, lp: any) => sum + Number(lp.amount || 0),
            0
          );
          // Determine total downloaded: if latest request is unliquidated and we have school monthly budget, use it
          let totalDownloaded = totalRequested;
          try {
            const ur = await api.get("/user-requests/");
            const list = Array.isArray(ur.data)
              ? ur.data
              : Array.isArray(ur.data?.results)
              ? ur.data.results
              : [];
            const latest = list && list.length > 0 ? list[0] : null;
            if (
              latest?.status === "unliquidated" &&
              (respData as any).school_current_monthly_budget !== undefined
            ) {
              totalDownloaded =
                Number((respData as any).school_current_monthly_budget) || totalDownloaded;
            }
          } catch {
            // ignore and keep totalRequested
          }

          const remaining = Math.max(totalDownloaded - totalActual, 0);
          respData.financialMetrics = {
            totalDownloadedAmount: totalDownloaded,
            totalLiquidatedAmount: totalActual,
            liquidationPercentage:
              totalDownloaded > 0 ? (totalActual / totalDownloaded) * 100 : 0,
            remainingAmount: remaining,
          };
        }
      } catch (e) {
        // If no active liquidation, keep previous derivations
      }

      setData(respData);
      setLoading(false);
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
    // Prefer navigating to the specific active request modal (pending/approved/unliquidated)
    const req = data?.requestStatus?.pendingRequest;
    const activeStatus = req?.status?.toLowerCase?.();
    const isActive =
      activeStatus === "pending" ||
      activeStatus === "approved" ||
      activeStatus === "unliquidated";

    if (req && isActive) {
      navigate("/requests-history", { state: { requestId: req.request_id } });
      return;
    }

    // Fallbacks: active liquidation → open latest; else just go to history
    if (data?.requestStatus?.hasPendingRequest) {
      navigate("/requests-history", { state: { openLatest: true } });
    } else {
      navigate("/requests-history");
    }
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
      {/** Determine if we should show request/liquidation-related visuals */}
      {/** Visible when there's a pending request or an active liquidation (not liquidated) */}
      {/** Hidden only when there's no ongoing request/liquidation */}
      {/** Safely compute here for re-use below */}
      {/** Note: We keep header and metrics always visible */}
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
              onClick={handleViewRequestStatus}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              View Request Status
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Liquidation Completion
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data?.liquidationProgress?.completionPercentage !== undefined
                ? `${data.liquidationProgress.completionPercentage.toFixed(1)}%`
                : "0%"}
            </div>
            <p className="text-xs text-muted-foreground">
              {data?.liquidationProgress
                ? `${data.liquidationProgress.completedPriorities} of ${data.liquidationProgress.totalPriorities} list of priorities`
                : "0 of 0 list of priorities"}
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
              {data?.financialMetrics?.totalLiquidatedAmount !== undefined
                ? `₱${data.financialMetrics.totalLiquidatedAmount.toLocaleString()}`
                : "₱0"}
            </div>
            <p className="text-xs text-muted-foreground">
              {data?.financialMetrics?.liquidationPercentage !== undefined
                ? `${data.financialMetrics.liquidationPercentage.toFixed(
                    1
                  )}% of downloaded amount`
                : "0% of downloaded amount"}
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
              {data?.financialMetrics?.remainingAmount !== undefined
                ? `₱${data.financialMetrics.remainingAmount.toLocaleString()}`
                : "₱0"}
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
              {data?.financialMetrics?.totalDownloadedAmount !== undefined
                ? `₱${data.financialMetrics.totalDownloadedAmount.toLocaleString()}`
                : "₱0"}
            </div>
            <p className="text-xs text-muted-foreground">
              Initial cash advance
            </p>
          </CardContent>
        </Card>
      </div>
      {/* Charts and Detailed Information - Always render cards; datasets may be empty */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-4">
        {/* Expense Breakdown (moved left) */}
        <Card>
          <CardHeader>
            <CardTitle>
              {formatMonthTitle(
                data?.requestStatus?.pendingRequest?.request_monthyear ||
                  selectedMonth
              )}
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
                      outerRadius={70}
                      fill="#8884d8"
                      dataKey="amount"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${truncateLabel(String(name))} (${(
                          Number(percent) * 100
                        ).toFixed(0)}%)`
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
                    <PolarAngleAxis
                      type="number"
                      domain={[0, 100]}
                      tick={false}
                    />
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
      {/* Priority Progress Details - Always render; dataset may be empty */}
      <Card className={`mb-6`}>
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
                {(data?.liquidationProgress?.priorities || []).map(
                  (priority) => (
                    <tr key={priority.priorityId} className="border-b">
                      <td className="p-3 font-medium">
                        {priority.priorityName}
                      </td>
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
                  )
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      {/* Example button in the request status card */}
    </div>
  );
};

export default SchoolHeadDashboard;
