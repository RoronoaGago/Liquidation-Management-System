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

  // Function to get actual amounts from localStorage for active liquidation
  const getActualAmountsFromLocalStorage = (liquidationID: string) => {
    try {
      const savedAmounts = localStorage.getItem(`liquidation_${liquidationID}_amounts`);
      if (savedAmounts) {
        return JSON.parse(savedAmounts);
      }
    } catch (error) {
      console.warn("Error parsing saved amounts from localStorage:", error);
    }
    return {};
  };

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

          // Get actual amounts from localStorage for this liquidation
          const actualAmountsFromStorage = getActualAmountsFromLocalStorage(active.LiquidationID);
          console.log("Actual amounts from localStorage:", actualAmountsFromStorage);
          
          // Compute financial metrics using actual amounts from localStorage if available
          let totalActual = 0;
          if (Object.keys(actualAmountsFromStorage).length > 0) {
            // Use actual amounts from localStorage
            totalActual = Object.values(actualAmountsFromStorage).reduce(
              (sum: number, amount: any) => sum + Number(amount || 0),
              0
            );
            console.log("Using actual amounts from localStorage, total:", totalActual);
          } else {
            // Fallback to liquidation priorities from server
            totalActual = liquidationPriorities.reduce(
              (sum: number, lp: any) => sum + Number(lp.amount || 0),
              0
            );
            console.log("Using liquidation priorities from server, total:", totalActual);
          }
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
        // If no active liquidation, try to get actual amounts from any liquidation in localStorage
        try {
          // Look for any liquidation amounts in localStorage
          const allKeys = Object.keys(localStorage);
          const liquidationKeys = allKeys.filter(key => key.startsWith('liquidation_') && key.endsWith('_amounts'));
          
          if (liquidationKeys.length > 0) {
            // Use the most recent liquidation (last key)
            const latestKey = liquidationKeys[liquidationKeys.length - 1];
            const actualAmountsFromStorage = getActualAmountsFromLocalStorage(latestKey.replace('liquidation_', '').replace('_amounts', ''));
            
            if (Object.keys(actualAmountsFromStorage).length > 0) {
              const totalActual = Object.values(actualAmountsFromStorage).reduce(
                (sum: number, amount: any) => sum + Number(amount || 0),
                0
              );
              
              // Update financial metrics with actual amounts from localStorage
              if (respData.financialMetrics) {
                respData.financialMetrics.totalLiquidatedAmount = totalActual;
                respData.financialMetrics.liquidationPercentage = respData.financialMetrics.totalDownloadedAmount > 0 
                  ? (totalActual / respData.financialMetrics.totalDownloadedAmount) * 100 
                  : 0;
                respData.financialMetrics.remainingAmount = Math.max(respData.financialMetrics.totalDownloadedAmount - totalActual, 0);
              }
              console.log("Using actual amounts from localStorage (no active liquidation), total:", totalActual);
            }
          }
        } catch (fallbackError) {
          console.warn("Error in fallback localStorage check:", fallbackError);
        }
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
    
    // Check for rejected requests in recent requests
    const hasRejectedRequest = data?.recentRequests?.some(req => 
      req.status === 'rejected'
    );
    
    // Check for rejected status in pending request
    const hasRejectedPendingRequest = data?.requestStatus?.pendingRequest?.status === 'rejected';
    
    // Debug logging to help identify the issue
    console.log("Dashboard data:", data);
    console.log("Has pending request:", hasPending);
    console.log("Has active liquidation:", hasActive);
    console.log("Has rejected request:", hasRejectedRequest);
    console.log("Has rejected pending request:", hasRejectedPendingRequest);
    console.log("Pending request:", data?.requestStatus?.pendingRequest);
    console.log("Active liquidation:", data?.requestStatus?.activeLiquidation);
    
    // Show "View Request Status" if there's a pending request, active liquidation, or rejected request
    // This matches the logic from MOOERequestPage's action required dialog
    const shouldShow = hasPending || hasActive || hasRejectedRequest || hasRejectedPendingRequest;
    console.log("Should show View Request Status:", shouldShow);
    
    return shouldShow;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50/30">
        {/* Header Section Skeleton */}
        <div className="bg-white border-b border-gray-200">
          <div className="px-6 py-8">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton.Input 
                  active 
                  size="large" 
                  style={{ width: 300, height: 36 }} 
                />
                <Skeleton.Input 
                  active 
                  style={{ width: 400, height: 24 }} 
                />
              </div>
              <div className="flex gap-3">
                <Skeleton.Button 
                  active 
                  size="large" 
                  style={{ width: 160, height: 40 }} 
                />
                <Skeleton.Button 
                  active 
                  size="large" 
                  style={{ width: 140, height: 40 }} 
                />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Skeleton */}
        <div className="px-6 py-8 space-y-8">
          {/* Key Metrics Section Skeleton */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <Skeleton.Input 
                active 
                style={{ width: 150, height: 28 }} 
              />
              <Skeleton.Input 
                active 
                style={{ width: 200, height: 20 }} 
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((item) => (
                <Card key={item} className="border-0 shadow-md">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                    <Skeleton.Input 
                      active 
                      style={{ width: 120, height: 16 }} 
                    />
                    <Skeleton.Avatar 
                      active 
                      size="default" 
                      shape="square" 
                      style={{ width: 40, height: 40 }} 
                    />
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Skeleton.Input 
                      active 
                      size="large" 
                      style={{ width: 100, height: 32 }} 
                    />
                    <Skeleton.Input 
                      active 
                      style={{ width: 140, height: 16 }} 
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Analytics Section Skeleton */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <Skeleton.Input 
                active 
                style={{ width: 200, height: 28 }} 
              />
              <Skeleton.Input 
                active 
                style={{ width: 250, height: 20 }} 
              />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Expense Breakdown Card Skeleton */}
              <Card className="border-0 shadow-lg">
                <CardHeader className="pb-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Skeleton.Input 
                        active 
                        style={{ width: 250, height: 24 }} 
                      />
                      <Skeleton.Input 
                        active 
                        style={{ width: 300, height: 16 }} 
                      />
                    </div>
                    <div className="text-right bg-gray-50 px-4 py-3 rounded-lg">
                      <Skeleton.Input 
                        active 
                        size="large" 
                        style={{ width: 120, height: 32 }} 
                      />
                      <Skeleton.Input 
                        active 
                        style={{ width: 100, height: 12 }} 
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-6">
                    {/* Summary Statistics Skeleton */}
                    <div className="grid grid-cols-2 gap-6 p-6 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl">
                      <div className="text-center space-y-2">
                        <Skeleton.Input 
                          active 
                          size="large" 
                          style={{ width: 40, height: 32 }} 
                        />
                        <Skeleton.Input 
                          active 
                          style={{ width: 80, height: 16 }} 
                        />
                      </div>
                      <div className="text-center space-y-2">
                        <Skeleton.Input 
                          active 
                          size="large" 
                          style={{ width: 100, height: 32 }} 
                        />
                        <Skeleton.Input 
                          active 
                          style={{ width: 120, height: 16 }} 
                        />
                      </div>
                    </div>

                    {/* Pie Chart Skeleton */}
                    <div className="h-80 bg-white rounded-xl p-4 border border-gray-100 flex items-center justify-center">
                      <Skeleton.Avatar 
                        active 
                        size="large" 
                        shape="circle" 
                        style={{ width: 200, height: 200 }} 
                      />
                    </div>

                    {/* Priority Details Skeleton */}
                    <div className="space-y-4">
                      <Skeleton.Input 
                        active 
                        style={{ width: 150, height: 24 }} 
                      />
                      <div className="space-y-3">
                        {[1, 2, 3].map((item) => (
                          <div
                            key={item}
                            className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl"
                          >
                            <div className="flex items-center space-x-4">
                              <Skeleton.Avatar 
                                active 
                                size="small" 
                                shape="circle" 
                                style={{ width: 20, height: 20 }} 
                              />
                              <div className="space-y-1">
                                <Skeleton.Input 
                                  active 
                                  style={{ width: 150, height: 16 }} 
                                />
                                <Skeleton.Input 
                                  active 
                                  style={{ width: 100, height: 12 }} 
                                />
                              </div>
                            </div>
                            <Skeleton.Input 
                              active 
                              style={{ width: 80, height: 16 }} 
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Priority Completion Card Skeleton */}
              <Card className="border-0 shadow-lg">
                <CardHeader className="pb-6">
                  <div className="space-y-1">
                    <Skeleton.Input 
                      active 
                      style={{ width: 200, height: 24 }} 
                    />
                    <Skeleton.Input 
                      active 
                      style={{ width: 280, height: 16 }} 
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Radial Chart Skeleton */}
                  <div className="h-80 bg-white rounded-xl p-4 border border-gray-100 flex items-center justify-center">
                    <Skeleton.Avatar 
                      active 
                      size="large" 
                      shape="circle" 
                      style={{ width: 180, height: 180 }} 
                    />
                  </div>
                  
                  {/* Progress Overview Skeleton */}
                  <div className="space-y-4">
                    <Skeleton.Input 
                      active 
                      style={{ width: 180, height: 24 }} 
                    />
                    <div className="grid grid-cols-1 gap-3">
                      {[1, 2, 3, 4].map((item) => (
                        <div
                          key={item}
                          className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl"
                        >
                          <div className="flex items-center space-x-4">
                            <Skeleton.Avatar 
                              active 
                              size="small" 
                              shape="circle" 
                              style={{ width: 20, height: 20 }} 
                            />
                            <div className="space-y-1">
                              <Skeleton.Input 
                                active 
                                style={{ width: 120, height: 16 }} 
                              />
                              <Skeleton.Input 
                                active 
                                style={{ width: 100, height: 12 }} 
                              />
                            </div>
                          </div>
                          <div className="text-right space-y-1">
                            <Skeleton.Input 
                              active 
                              style={{ width: 40, height: 16 }} 
                            />
                            <Skeleton.Input 
                              active 
                              style={{ width: 64, height: 8 }} 
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/30">
      {/* Enhanced Header Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                School Head Dashboard
              </h1>
              <p className="text-gray-600 text-sm">
                Monitor your MOOE requests and liquidation progress
              </p>
            </div>
            <div className="flex gap-3">
              {!shouldShowViewRequestStatus() && (
                <Button
                  onClick={handleCreateMOOERequest}
                  className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 px-6 py-2.5"
                  size="lg"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  New MOOE Request
                </Button>
              )}
              {shouldShowViewRequestStatus() && (
                <Button
                  onClick={handleViewRequestStatus}
                  className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 px-6 py-2.5"
                  size="lg"
                >
                  View Request Status
                </Button>
              )}
              {data?.requestStatus?.hasActiveLiquidation && (
                <Button
                  onClick={handleGoToLiquidation}
                  className="bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 px-6 py-2.5"
                  size="lg"
                >
                  <FileText className="h-5 w-5 mr-2" />
                  Go to Liquidation
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 py-8 space-y-8">
        {/* Enhanced Key Metrics Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Key Metrics</h2>
           
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="hover:shadow-lg transition-shadow duration-200 border-0 shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-xs font-medium text-gray-600">
                  Liquidation Completion
                </CardTitle>
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-2xl font-bold text-gray-900">
                  {data?.liquidationProgress?.completionPercentage !== undefined
                    ? `${data.liquidationProgress.completionPercentage.toFixed(1)}%`
                    : "0%"}
                </div>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {data?.liquidationProgress
                    ? `${data.liquidationProgress.completedPriorities} of ${data.liquidationProgress.totalPriorities} priorities completed`
                    : "No priorities to track"}
                </p>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-lg transition-shadow duration-200 border-0 shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-xs font-medium text-gray-600">
                  Amount Spent
                </CardTitle>
                <div className="p-2 bg-blue-100 rounded-lg">
                  <DollarSign className="h-5 w-5 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-2xl font-bold text-gray-900">
                  {data?.financialMetrics?.totalLiquidatedAmount !== undefined
                    ? `₱${data.financialMetrics.totalLiquidatedAmount.toLocaleString()}`
                    : "₱0"}
                </div>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {data?.financialMetrics?.liquidationPercentage !== undefined
                    ? `Actual amount spent (${data.financialMetrics.liquidationPercentage.toFixed(1)}% of budget)`
                    : "No liquidation data"}
                </p>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-lg transition-shadow duration-200 border-0 shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-xs font-medium text-gray-600">
                  Remaining Amount
                </CardTitle>
                <div className="p-2 bg-orange-100 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-2xl font-bold text-gray-900">
                  {data?.financialMetrics?.remainingAmount !== undefined
                    ? `₱${data.financialMetrics.remainingAmount.toLocaleString()}`
                    : "₱0"}
                </div>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Pending liquidation
                </p>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-lg transition-shadow duration-200 border-0 shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-xs font-medium text-gray-600">
                  Total Downloaded
                </CardTitle>
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Download className="h-5 w-5 text-purple-600" />
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-2xl font-bold text-gray-900">
                  {data?.financialMetrics?.totalDownloadedAmount !== undefined
                    ? `₱${data.financialMetrics.totalDownloadedAmount.toLocaleString()}`
                    : "₱0"}
                </div>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Initial cash advance
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
        {/* Charts and Analytics Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Analytics & Insights</h2>
           
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Enhanced Expense Breakdown */}
            <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-shadow duration-200">
              <CardHeader className="pb-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg font-semibold text-gray-900">
                      {formatMonthTitle(getCurrentRequestMonthYear())}
                    </CardTitle>
                    <p className="text-sm text-gray-500">
                      Distribution of allocated funds across priorities
                    </p>
                  </div>
                  {data?.priorityBreakdown && data.priorityBreakdown.length > 0 && (
                    <div className="text-right bg-gray-50 px-4 py-3 rounded-lg">
                      <div className="text-xl font-bold text-gray-900">
                        ₱{data.priorityBreakdown.reduce((sum, item) => sum + item.amount, 0).toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500 font-medium">Total Allocated</div>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {data?.priorityBreakdown && data.priorityBreakdown.length > 0 ? (
                  <div className="space-y-6">
                    {/* Summary Statistics */}
                    <div className="grid grid-cols-2 gap-6 p-6 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl">
                      <div className="text-center space-y-2">
                        <div className="text-xl font-bold text-gray-900">
                          {data.priorityBreakdown.length}
                        </div>
                        <div className="text-sm text-gray-600 font-medium">Priorities</div>
                      </div>
                      <div className="text-center space-y-2">
                        <div className="text-xl font-bold text-gray-900">
                          ₱{Math.round(data.priorityBreakdown.reduce((sum, item) => sum + item.amount, 0) / data.priorityBreakdown.length).toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-600 font-medium">Avg. per Priority</div>
                      </div>
                    </div>

                    {/* Enhanced Pie Chart */}
                    <div className="h-80 bg-white rounded-xl p-4 border border-gray-100">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={data.priorityBreakdown.map((item) => ({
                              ...item,
                              name: item.priority,
                            }))}
                            cx="50%"
                            cy="50%"
                            outerRadius={90}
                            innerRadius={40}
                            fill="#8884d8"
                            dataKey="amount"
                            labelLine={false}
                            label={(props: any) => `${(props.percent * 100).toFixed(0)}%`}
                            stroke="#ffffff"
                            strokeWidth={3}
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
                            labelFormatter={(label) => `Priority: ${label}`}
                            contentStyle={{
                              backgroundColor: "#1f2937",
                              border: "none",
                              borderRadius: "12px",
                              color: "#ffffff",
                              fontSize: "14px",
                              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.15)",
                              padding: "12px 16px",
                            }}
                            labelStyle={{ color: "#ffffff", fontWeight: "600" }}
                            itemStyle={{ color: "#ffffff" }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Enhanced Legend with Details */}
                    <div className="space-y-4">
                      <h4 className="text-base font-semibold text-gray-800 mb-4">Priority Details</h4>
                      <div className="space-y-3 max-h-40 overflow-y-auto pr-2">
                        {data.priorityBreakdown
                          .sort((a, b) => b.amount - a.amount)
                          .map((item, index) => (
                            <div
                              key={item.priority}
                              className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-sm hover:shadow-md"
                            >
                              <div className="flex items-center space-x-4">
                                <div
                                  className="w-5 h-5 rounded-full flex-shrink-0 shadow-sm"
                                  style={{
                                    backgroundColor: getPriorityColor(item.priority, index),
                                  }}
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="text-sm font-semibold text-gray-900 truncate">
                                    {item.priority}
                                  </div>
                                  <div className="text-xs text-gray-500 font-medium">
                                    {item.percentage.toFixed(1)}% of total
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-bold text-gray-900">
                                  ₱{item.amount.toLocaleString()}
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-80 text-center space-y-6">
                    <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
                      <DollarSign className="w-10 h-10 text-gray-400" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        No Expense Data Available
                      </h3>
                      <p className="text-gray-500 max-w-sm leading-relaxed">
                        Create a new MOOE request to see your expense breakdown and track your budget allocation.
                      </p>
                    </div>
                    <Button
                      onClick={handleCreateMOOERequest}
                      className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                      size="lg"
                    >
                      <Plus className="h-5 w-5 mr-2" />
                      Create Request
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
            {/* Enhanced Priority Completion Chart */}
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-200">
              <CardHeader className="pb-6">
                <div className="space-y-1">
                  <CardTitle className="text-lg font-semibold text-gray-900">
                    Priority Completion Status
                  </CardTitle>
                  <p className="text-sm text-gray-500">
                    Track document submission progress for each priority
                  </p>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="h-80 bg-white rounded-xl p-4 border border-gray-100">
                  {data?.liquidationProgress?.priorities &&
                  data.liquidationProgress.priorities.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <RadialBarChart
                        innerRadius="20%"
                        outerRadius="90%"
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
                        <RadialBar 
                          background 
                          dataKey="value" 
                          cornerRadius={8}
                          fillOpacity={0.8}
                        />
                        <Tooltip
                          formatter={(value) => [`${value}%`, "Completion"]}
                          contentStyle={{
                            backgroundColor: "#1f2937",
                            border: "none",
                            borderRadius: "12px",
                            color: "#ffffff",
                            fontSize: "14px",
                            boxShadow: "0 20px 40px rgba(0, 0, 0, 0.15)",
                            padding: "12px 16px",
                          }}
                          labelStyle={{ color: "#ffffff", fontWeight: "600" }}
                          itemStyle={{ color: "#ffffff" }}
                        />
                      </RadialBarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-8 h-8 text-gray-400" />
                      </div>
                      <div>
                        <h3 className="text-base font-medium text-gray-900 mb-2">
                          No Completion Data
                        </h3>
                        <p className="text-sm text-gray-500">
                          Start liquidating to track your progress
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Enhanced Legend */}
                <div className="space-y-4">
                  <h4 className="text-base font-semibold text-gray-800">Progress Overview</h4>
                  <div className="grid grid-cols-1 gap-3">
                    {data?.liquidationProgress?.priorities &&
                    data.liquidationProgress.priorities.length > 0 ? (
                      data.liquidationProgress.priorities.map((p, index) => (
                        <div
                          key={p.priorityId}
                          className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center space-x-4">
                            <div
                              className="w-5 h-5 rounded-full shadow-sm"
                              style={{
                                backgroundColor: getPriorityColor(p.priorityName, index),
                              }}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-semibold text-gray-900 truncate">
                                {p.priorityName}
                              </div>
                              <div className="text-xs text-gray-500">
                                {p.documentsUploaded} of {p.documentsRequired} documents
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold text-gray-900">
                              {p.completionPercentage}%
                            </div>
                            <div className="w-16 bg-gray-200 rounded-full h-2 mt-1">
                              <div
                                className="h-2 rounded-full transition-all duration-300"
                                style={{
                                  width: `${p.completionPercentage}%`,
                                  backgroundColor: getPriorityColor(p.priorityName, index),
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        No priorities to display
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SchoolHeadDashboard;
