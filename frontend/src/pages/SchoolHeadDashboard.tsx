/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import api from "@/api/axios"; // Backend API client
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
      request?: {
        request_monthyear: string;
        request_id: string;
        status: string;
        priorities?: any[];
      };
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

  const getCurrentRequestMonthYear = () => {
    // Priority 1: Check for pending request (highest priority)
    if (data?.requestStatus?.pendingRequest?.request_monthyear) {
      return data.requestStatus.pendingRequest.request_monthyear;
    }
    
    // Priority 2: Check for active liquidation (unliquidated) - second priority
    if (data?.requestStatus?.hasActiveLiquidation && data?.requestStatus?.activeLiquidation) {
      // For active liquidations, get the month/year from the associated request
      if (data.requestStatus.activeLiquidation.request?.request_monthyear) {
        return data.requestStatus.activeLiquidation.request.request_monthyear;
      }
      // Fallback to selectedMonth if request data is not available
      return selectedMonth;
    }
    
    // Priority 3: Check recent requests for any active/unliquidated status
    if (data?.recentRequests && data.recentRequests.length > 0) {
      const activeRequest = data.recentRequests.find(req => 
        req.status === 'unliquidated' || req.status === 'approved'
      );
      if (activeRequest?.request_monthyear) {
        return activeRequest.request_monthyear;
      }
    }
    
    // Default fallback: use current month/year when no active request or liquidation
    return selectedMonth;
  };

  useEffect(() => {
    fetchDashboardData(selectedMonth);
  }, [selectedMonth]);

  const fetchDashboardData = async (month?: string) => {
    setLoading(true);
    try {
      // Use the same endpoint as MOOERequestPage to check for pending requests
      const [dashboardResponse, pendingCheckResponse] = await Promise.all([
        api.get(month ? `/school-head/dashboard/?month=${month}` : "/school-head/dashboard/"),
        api.get("check-pending-requests/")
      ]);
      
      const respData: SchoolHeadDashboardData = dashboardResponse.data;
      const pendingCheckData = pendingCheckResponse.data;
      
      // Debug logging to see what the backend returns
      console.log("Backend API response:", respData);
      console.log("Pending check response:", pendingCheckData);
      console.log("Request status from backend:", respData.requestStatus);
      console.log("Recent requests from backend:", respData.recentRequests);
      
      // Update request status based on pending check (same logic as MOOERequestPage)
      const hasPending = pendingCheckData.has_pending_request;
      const activeLiquidation = pendingCheckData.active_liquidation;
      const hasActive = !!activeLiquidation && activeLiquidation.status !== "liquidated";
      
      // Override the request status with the pending check data
      respData.requestStatus = {
        hasPendingRequest: hasPending,
        hasActiveLiquidation: hasActive,
        pendingRequest: pendingCheckData.pending_request,
        activeLiquidation: activeLiquidation
      };

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

          // Update requestStatus.activeLiquidation with request information
          if (respData.requestStatus) {
            respData.requestStatus.hasActiveLiquidation = true;
            respData.requestStatus.activeLiquidation = {
              date_districtApproved: active.date_districtApproved,
              date_liquidatorApproved: active.date_liquidatorApproved,
              date_liquidated: active.date_liquidated,
              date_submitted: active.date_submitted,
              LiquidationID: active.LiquidationID,
              status: active.status,
              created_at: active.created_at,
              request: {
                request_monthyear: active.request?.request_monthyear,
                request_id: active.request?.request_id,
                status: active.request?.status,
                priorities: active.request?.priorities,
              },
            };
          }
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
    // Use the same navigation logic as MOOERequestPage but pass specific request ID
    const hasPending = data?.requestStatus?.hasPendingRequest;
    const hasActive = data?.requestStatus?.hasActiveLiquidation;
    const pendingRequest = data?.requestStatus?.pendingRequest;
    const activeLiquidation = data?.requestStatus?.activeLiquidation;
    
    if (hasPending && pendingRequest?.request_id) {
      // Navigate to requests history with specific request ID to open modal
      navigate("/requests-history", { 
        state: { requestId: pendingRequest.request_id } 
      });
    } else if (hasActive && activeLiquidation?.request?.request_id) {
      // Navigate to requests history with specific request ID from active liquidation
      navigate("/requests-history", { 
        state: { requestId: activeLiquidation.request.request_id } 
      });
    } else {
      // Fallback to requests history without specific request
      navigate("/requests-history");
    }
  };

  const handleGoToLiquidation = () => {
    navigate("/liquidation");
  };

  const shouldShowViewRequestStatus = () => {
    // Use the same logic as MOOERequestPage's action required dialog
    const hasPending = data?.requestStatus?.hasPendingRequest;
    const hasActive = data?.requestStatus?.hasActiveLiquidation;
    
    // Debug logging to help identify the issue
    console.log("Dashboard data:", data);
    console.log("Has pending request:", hasPending);
    console.log("Has active liquidation:", hasActive);
    console.log("Pending request:", data?.requestStatus?.pendingRequest);
    console.log("Active liquidation:", data?.requestStatus?.activeLiquidation);
    
    // Show "View Request Status" if there's a pending request OR active liquidation
    // This matches the logic from MOOERequestPage's action required dialog
    const shouldShow = hasPending || hasActive;
    console.log("Should show View Request Status:", shouldShow);
    
    return shouldShow;
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
          </p>
        </div>
        <div className="flex gap-3">
          {!shouldShowViewRequestStatus() &&
            !data?.requestStatus?.hasActiveLiquidation && (
              <Button
                onClick={handleCreateMOOERequest}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                New MOOE Request
              </Button>
            )}
          {shouldShowViewRequestStatus() && (
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
              {formatMonthTitle(getCurrentRequestMonthYear())}
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
