import { useState, useEffect } from "react";
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
} from "recharts";
import { FileText, CheckCircle, TrendingUp, School } from "lucide-react";
import { Button } from "@/components/ui/button";
import  Badge  from "@/components/ui/badge/Badge";
import { Skeleton } from "antd";
import api from "@/api/axios";
import { useNavigate } from "react-router-dom";

// Types for our data
interface DashboardData {
  pendingLiquidations: PendingLiquidation[];
  divisionCompletion: DivisionCompletionData;
  liquidationTimeline: LiquidationTimelineData[];
  schoolPerformance: SchoolPerformanceData[];
}

interface PendingLiquidation {
  id: string;
  liquidationId: string;
  schoolName: string;
  schoolId: string;
  submittedDate: string;
  status: string;
  amount: number;
  priorityCount: number;
  documentCount: number;
  daysSinceSubmission: number;
}

interface DivisionCompletionData {
  totalSchools: number;
  schoolsWithLiquidation: number;
  approvedLiquidations: number;
  pendingLiquidations: number;
  rejectedLiquidations: number;
  completionRate: number;
}

interface LiquidationTimelineData {
  month: string; // Shows months within current quarter (e.g., "Jul", "Aug", "Sep" for Q3)
  submitted: number;
  approved: number;
  rejected: number;
  avgProcessingTime: number;
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

const COLORS = ["#465FFF", "#9CB9FF", "#FF8042", "#00C49F", "#FFBB28", "#8884D8"];


const DivisionDistrictAdaDashboard = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch all liquidations for district ADA - use same approach as LiquidationReportPage
      // For dashboard, we need ALL liquidations regardless of status to calculate completion rates
      const liquidationsRes = await api.get("liquidations/", {
        params: { 
          page_size: 1000,
          ordering: "-created_at",
          // Explicitly request all statuses to bypass role-based filtering
          status: "draft,submitted,under_review_district,under_review_liquidator,under_review_division,resubmit,approved_district,approved_liquidator,liquidated"
        }
      });
      const liquidations = liquidationsRes.data || [];
      
      // Debug: Log the liquidation data structure
      console.log("Liquidations API response:", liquidationsRes);
      console.log("Liquidations data:", liquidations);
      console.log("Sample liquidation structure:", liquidations[0]);

      // Fetch all schools
      const schoolsRes = await api.get("schools/", {
        params: { page_size: 1000 }
      });
      const schools = schoolsRes.data?.results || schoolsRes.data || [];
      
      // Debug: Log schools data
      console.log("Schools API response:", schoolsRes);
      console.log("Schools data:", schools);
      console.log("Total schools:", schools.length);

      // Fetch all requests for timeline and performance data
      const requestsRes = await api.get("requests/", {
        params: { page_size: 1000 }
      });
      const requests = requestsRes.data?.results || requestsRes.data || [];
      
      // Debug: Log requests data
      console.log("Requests API response:", requestsRes);
      console.log("Requests data:", requests);
      console.log("Total requests:", requests.length);

      // Process pending liquidations (status: submitted, under_review_district, under_review_liquidator)
      const pendingLiquidations: PendingLiquidation[] = liquidations
        .filter((l: any) => ['submitted', 'approved_district', 'under_review_liquidator'].includes(l.status))
        .map((l: any) => {
          const request = l.request;
          const schoolName = request?.user?.school?.schoolName || "";
          const schoolId = request?.user?.school?.schoolId || "";
          const totalAmount = (l.liquidation_priorities || []).reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
          const submittedDate = l.date_submitted || l.submitted_at || l.created_at || request?.created_at || "";
          const daysSinceSubmission = submittedDate ? Math.max(0, Math.round((Date.now() - new Date(submittedDate).getTime()) / (1000 * 60 * 60 * 24))) : 0;
          
          return {
            id: String(l.LiquidationID),
            liquidationId: l.LiquidationID,
            schoolName,
            schoolId,
            submittedDate,
            status: l.status,
            amount: totalAmount,
            priorityCount: (l.liquidation_priorities || []).length,
            documentCount: (l.documents || []).length,
            daysSinceSubmission,
          };
        });

      // Calculate division completion data
      const totalSchools = schools.length;

      // For completion rate: count schools with at least one liquidation with status 'approved_district'
      const schoolIdsFromApprovedDistrict = liquidations
        .filter((l: any) => l.status === 'approved_liquidator')
        .map((l: any) => l.request?.user?.school?.schoolId)
        .filter(Boolean);
      const schoolsWithLiquidations = new Set(schoolIdsFromApprovedDistrict).size;

      // For "No Submission": count schools with NO liquidation with status in ['submitted', 'approved_district', 'resubmit', 'liquidated']
      const submittedStatuses = ['submitted', 'approved_district','approved_liquidator', 'resubmit', 'liquidated'];
      const schoolIdsWithSubmission = new Set(
        liquidations
          .filter((l: any) => submittedStatuses.includes(l.status))
          .map((l: any) => l.request?.user?.school?.schoolId)
          .filter(Boolean)
      );
      const noSubmissionCount = totalSchools - schoolIdsWithSubmission.size;

      // For approved liquidations: only count 'approved_district'
      const approvedLiquidations = liquidations.filter((l: any) => l.status === 'approved_liquidator').length;
      const pendingLiquidationsCount = pendingLiquidations.length;
      const rejectedLiquidations = liquidations.filter((l: any) => l.status === 'resubmit').length;
      const completionRate = totalSchools > 0 ? Math.round((schoolsWithLiquidations / totalSchools) * 100) : 0;
      
      // Debug: Log completion calculation
      const statusBreakdown = liquidations.reduce((acc: any, l: any) => {
        acc[l.status] = (acc[l.status] || 0) + 1;
        return acc;
      }, {});
      
      console.log("Completion calculation:", {
        totalSchools,
        schoolsWithLiquidations,
        completionRate,
        liquidationsCount: liquidations.length,
        approvedLiquidations,
        pendingLiquidationsCount,
        rejectedLiquidations,
        statusBreakdown
      });

      // Generate liquidation timeline for current quarter (showing months within the quarter)
      const liquidationTimeline: LiquidationTimelineData[] = [];
      const currentDate = new Date();
      // Helper function to get quarter info
      const getQuarterInfo = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const quarter = Math.floor(month / 3) + 1;
        return { year, quarter };
      };
      // Get current quarter info
      const currentQuarter = getQuarterInfo(currentDate);
      const quarterStartMonth = (currentQuarter.quarter - 1) * 3;
      // Show the 3 months of the current quarter
      for (let i = 0; i < 3; i++) {
        const monthIndex = quarterStartMonth + i;
        const monthDate = new Date(currentQuarter.year, monthIndex, 1);
        const monthName = monthDate.toLocaleDateString('en-US', { month: 'short' });

        const monthLiquidations = liquidations.filter((l: any) => {
          const liquidationDate = new Date(l.date_submitted || l.submitted_at || l.created_at);
          return liquidationDate.getFullYear() === currentQuarter.year && liquidationDate.getMonth() === monthIndex;
        });

        // For submitted: count liquidations with status 'submitted' and 'approved_district'
        const submitted = monthLiquidations.filter((l: any) =>
          ['submitted', 'approved_liquidator','approved_district', 'under_review_liquidator'].includes(l.status)
        ).length;
        const approved = monthLiquidations.filter((l: any) =>
          ['approved_liquidator', 'liquidated'].includes(l.status)
        ).length;
        const rejected = monthLiquidations.filter((l: any) => l.status === 'resubmit').length;
        const avgProcessingTime = monthLiquidations.length > 0 ? Math.round(monthLiquidations.reduce((sum: number, l: any) => {
          const created = new Date(l.date_submitted || l.submitted_at || l.created_at);
          const completed = l.date_liquidated ? new Date(l.date_liquidated) : new Date();
          return sum + Math.max(0, Math.round((completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)));
        }, 0) / monthLiquidations.length) : 0;

        liquidationTimeline.push({
          month: monthName,
          submitted,
          approved,
          rejected,
          avgProcessingTime,
        });
      }



      const dashboardData: DashboardData = {
        pendingLiquidations,
        divisionCompletion: {
          totalSchools,
          schoolsWithLiquidation: schoolsWithLiquidations,
          approvedLiquidations,
          pendingLiquidations: pendingLiquidationsCount,
          rejectedLiquidations,
          completionRate,
        },
        liquidationTimeline,
        schoolPerformance: [],
      };

      setData(dashboardData);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      // Set empty data on error
      setData({
        pendingLiquidations: [],
        divisionCompletion: {
          totalSchools: 0,
          schoolsWithLiquidation: 0,
          approvedLiquidations: 0,
          pendingLiquidations: 0,
          rejectedLiquidations: 0,
          completionRate: 0,
        },
        liquidationTimeline: [],
        schoolPerformance: [],
      });
    } finally {
      setLoading(false);
    }
  };


  if (loading) {
    // Make noSubmissionCount available in render
    const noSubmissionCount = data?.divisionCompletion
      ? data.divisionCompletion.totalSchools -
        (data.divisionCompletion.schoolsWithLiquidation +
          data.divisionCompletion.pendingLiquidations +
          data.divisionCompletion.rejectedLiquidations)
      : 0;
  
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Division Liquidator Dashboard
            </h1>
            <p className="mt-1 text-gray-500 text-theme-sm">
              Liquidation oversight and approval management
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6">
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

  // Calculate noSubmissionCount for PieChart
  const noSubmissionCount = data?.divisionCompletion
    ? data.divisionCompletion.totalSchools -
      (data.divisionCompletion.schoolsWithLiquidation +
        data.divisionCompletion.pendingLiquidations +
        data.divisionCompletion.rejectedLiquidations)
    : 0;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Division Liquidator Dashboard
          </h1>
          <p className="mt-1 text-gray-500 text-theme-sm">
            Liquidation oversight and approval management
          </p>
        </div>
        <div className="flex items-center gap-3" />
      </div>

      {/* Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-6 mb-6">
        {/* Removed Total Schools Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Liquidations</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.divisionCompletion.pendingLiquidations}</div>
            <p className="text-xs text-muted-foreground">Awaiting review</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved Liquidations</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.divisionCompletion.approvedLiquidations}</div>
            <p className="text-xs text-muted-foreground">Completed reviews</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.divisionCompletion.completionRate}%</div>
            <p className="text-xs text-muted-foreground">Schools with liquidations</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Division Completion Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Division Completion Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: "Approved", value: data?.divisionCompletion.approvedLiquidations || 0 },
                      { name: "Pending", value: data?.divisionCompletion.pendingLiquidations || 0 },
                      { name: "Rejected", value: data?.divisionCompletion.rejectedLiquidations || 0 },
                      { name: "No Submission", value: noSubmissionCount },
                    ]}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={false}
                  >
                    {COLORS.map((color, index) => (
                      <Cell key={`cell-${index}`} fill={color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number, name: string) => [
                      `${value} schools`,
                      name
                    ]}
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #E4E7EC",
                      borderRadius: "8px",
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                    }}
                  />
                  <Legend 
                    formatter={(value, entry) => {
                      const payload: any = entry && (entry as any).payload;
                      const total = (data?.divisionCompletion.totalSchools || 0);
                      const count = payload?.value || 0;
                      const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
                      return `${value}: ${percentage}%`;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Liquidation Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Liquidation Timeline (Current Quarter)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data?.liquidationTimeline || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis 
                    domain={[0, 'dataMax']}
                    tickCount={6}
                    allowDecimals={false}
                  />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="submitted"
                    stroke="#465FFF"
                    strokeWidth={2}
                    name="Submitted"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="approved"
                    stroke="#00C49F"
                    strokeWidth={2}
                    name="Approved"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="rejected"
                    stroke="#FF8042"
                    strokeWidth={2}
                    name="Rejected"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Liquidations Table */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Pending Liquidations</CardTitle>
        </CardHeader>
          <CardContent>
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-3 text-left font-medium">School</th>
                  <th className="p-3 text-left font-medium">Submitted</th>
                  <th className="p-3 text-left font-medium">Amount</th>
                  <th className="p-3 text-left font-medium">Priorities</th>
                  <th className="p-3 text-left font-medium">Documents</th>
                  <th className="p-3 text-left font-medium">Status</th>
                  <th className="p-3 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data?.pendingLiquidations.map((liquidation) => (
                  <tr key={liquidation.id} className="border-b">
                    <td className="p-3">
                      <div className="font-medium">{liquidation.schoolName}</div>
                      <div className="text-sm text-muted-foreground">{liquidation.schoolId}</div>
                    </td>
                    <td className="p-3">
                      {new Date(liquidation.submittedDate).toLocaleDateString()}
                      <div className="text-sm text-muted-foreground">
                        {liquidation.daysSinceSubmission} days ago
                      </div>
                    </td>
                    <td className="p-3">₱{liquidation.amount.toLocaleString()}</td>
                    <td className="p-3">{liquidation.priorityCount}</td>
                    <td className="p-3">{liquidation.documentCount}</td>
                    <td className="p-3">
                      <Badge
                        variant="solid"
                        color={
                          liquidation.status === "submitted"
                            ? "secondary"
                            : liquidation.status === "under_review_district"
                            ? "primary"
                            : liquidation.status === "under_review_liquidator"
                            ? "warning"
                            : "success"
                        }
                      >
                        {liquidation.status.replace(/_/g, " ")}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate("/liquidation-finalize", { state: { liquidationId: liquidation.liquidationId } })}
                        >
                          View
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {(!data?.pendingLiquidations || data.pendingLiquidations.length === 0) && (
                  <tr>
                    <td colSpan={7} className="p-3 text-center text-muted-foreground">
                      No pending liquidations
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

    </div>
  );
};

export default DivisionDistrictAdaDashboard;