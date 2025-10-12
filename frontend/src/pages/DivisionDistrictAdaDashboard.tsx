import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  LineChart,
  Line,
} from "recharts";
import { 
  FileText, 
  CheckCircle, 
  TrendingUp, 
  School, 
  Clock,
  BarChart3,
  Eye
} from "lucide-react";
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
        .filter((l: any) => ['submitted', 'under_review_district', 'under_review_liquidator'].includes(l.status))
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

      // For completion rate: count schools with at least one liquidation with any status except 'draft'
      const schoolIdsWithSubmission = liquidations
        .filter((l: any) => l.status !== 'draft')
        .map((l: any) => l.request?.user?.school?.schoolId)
        .filter(Boolean);
      const schoolsWithLiquidations = new Set(schoolIdsWithSubmission).size;

      // For "No Submission": count schools with NO liquidation with any status except 'draft'

      // For liquidated liquidations: only count 'liquidated' status
      const liquidatedLiquidations = liquidations.filter((l: any) => l.status === 'liquidated').length;
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
        liquidatedLiquidations,
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

        // For submitted: count liquidations with any status except 'draft'
        const submitted = monthLiquidations.filter((l: any) => l.status !== 'draft').length;
        const liquidated = monthLiquidations.filter((l: any) => l.status === 'liquidated').length;
        const rejected = monthLiquidations.filter((l: any) => l.status === 'resubmit').length;
        const avgProcessingTime = monthLiquidations.length > 0 ? Math.round(monthLiquidations.reduce((sum: number, l: any) => {
          const created = new Date(l.date_submitted || l.submitted_at || l.created_at);
          const completed = l.date_liquidated ? new Date(l.date_liquidated) : new Date();
          return sum + Math.max(0, Math.round((completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)));
        }, 0) / monthLiquidations.length) : 0;

        liquidationTimeline.push({
          month: monthName,
          submitted,
          approved: liquidated,
          rejected,
          avgProcessingTime,
        });
      }



      const dashboardData: DashboardData = {
        pendingLiquidations,
        divisionCompletion: {
          totalSchools,
          schoolsWithLiquidation: schoolsWithLiquidations,
          approvedLiquidations: liquidatedLiquidations,
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
                  style={{ width: 350, height: 36 }} 
                />
                <Skeleton.Input 
                  active 
                  style={{ width: 500, height: 24 }} 
                />
              </div>
              <div className="flex gap-3">
                <Skeleton.Button 
                  active 
                  size="large" 
                  style={{ width: 120, height: 40 }} 
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

          {/* Charts Section Skeleton */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <Skeleton.Input 
                active 
                style={{ width: 200, height: 28 }} 
              />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Division Completion Chart Skeleton */}
              <Card className="border-0 shadow-lg">
                <CardHeader className="pb-6">
                  <Skeleton.Input 
                    active 
                    style={{ width: 250, height: 24 }} 
                  />
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="h-64 bg-white rounded-xl p-4 border border-gray-100 flex items-center justify-center">
                    <Skeleton.Avatar 
                      active 
                      size="large" 
                      shape="circle" 
                      style={{ width: 200, height: 200 }} 
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Liquidation Timeline Chart Skeleton */}
              <Card className="border-0 shadow-lg">
                <CardHeader className="pb-6">
                  <Skeleton.Input 
                    active 
                    style={{ width: 300, height: 24 }} 
                  />
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="h-64 bg-white rounded-xl p-4 border border-gray-100 flex items-center justify-center">
                    <Skeleton.Avatar 
                      active 
                      size="large" 
                      shape="square" 
                      style={{ width: 250, height: 180 }} 
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Pending Liquidations Table Skeleton */}
          <div className="space-y-6">
            <Skeleton.Input 
              active 
              style={{ width: 200, height: 28 }} 
            />
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-6">
                <Skeleton.Input 
                  active 
                  style={{ width: 200, height: 24 }} 
                />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[1, 2, 3].map((item) => (
                    <div
                      key={item}
                      className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl"
                    >
                      <div className="flex items-center space-x-4">
                        <Skeleton.Avatar 
                          active 
                          size="default" 
                          shape="square" 
                          style={{ width: 40, height: 40 }} 
                        />
                        <div className="space-y-2">
                          <Skeleton.Input 
                            active 
                            style={{ width: 200, height: 16 }} 
                          />
                          <Skeleton.Input 
                            active 
                            style={{ width: 150, height: 12 }} 
                          />
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <Skeleton.Input 
                          active 
                          style={{ width: 100, height: 16 }} 
                        />
                        <Skeleton.Button 
                          active 
                          style={{ width: 80, height: 32 }} 
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Calculate noSubmissionCount for PieChart
  const noSubmissionCount = data?.divisionCompletion
    ? data.divisionCompletion.totalSchools - data.divisionCompletion.schoolsWithLiquidation
    : 0;

  return (
    <div className="min-h-screen bg-gray-50/30">
      {/* Enhanced Header Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                Division District ADA Dashboard
              </h1>
              <p className="text-gray-600 text-sm">
                Monitor liquidation progress and school performance across your division
              </p>
            </div>
            <div className="flex gap-3" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 py-8 space-y-8">
        {/* Enhanced Key Metrics Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Division Overview</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="hover:shadow-lg transition-shadow duration-200 border-0 shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-xs font-medium text-gray-600">
                  Total Schools
                </CardTitle>
                <div className="p-2 bg-blue-100 rounded-lg">
                  <School className="h-5 w-5 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-2xl font-bold text-gray-900">
                  {data?.divisionCompletion.totalSchools || 0}
                </div>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Schools in your division
                </p>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-lg transition-shadow duration-200 border-0 shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-xs font-medium text-gray-600">
                  Pending Liquidations
                </CardTitle>
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Clock className="h-5 w-5 text-orange-600" />
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-2xl font-bold text-gray-900">
                  {data?.divisionCompletion.pendingLiquidations || 0}
                </div>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Awaiting district review
                </p>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-lg transition-shadow duration-200 border-0 shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-xs font-medium text-gray-600">
                  Liquidated Liquidations
                </CardTitle>
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-2xl font-bold text-gray-900">
                  {data?.divisionCompletion.approvedLiquidations || 0}
                </div>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Successfully liquidated
                </p>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-lg transition-shadow duration-200 border-0 shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-xs font-medium text-gray-600">
                  Completion Rate
                </CardTitle>
                <div className="p-2 bg-purple-100 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-2xl font-bold text-gray-900">
                  {data?.divisionCompletion.completionRate || 0}%
                </div>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Schools with submissions
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Charts and Analytics Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Analytics & Insights</h2>
            <div className="text-sm text-gray-500">
              Current quarter performance
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Enhanced Division Completion Chart */}
            <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-shadow duration-200">
              <CardHeader className="pb-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg font-semibold text-gray-900">
                      Division Completion Status
                    </CardTitle>
                    <p className="text-sm text-gray-500">
                      Overview of liquidation status across all schools
                    </p>
                  </div>
                  {data?.divisionCompletion && (
                    <div className="text-right bg-gray-50 px-4 py-3 rounded-lg">
                      <div className="text-xl font-bold text-gray-900">
                        {data.divisionCompletion.totalSchools}
                      </div>
                      <div className="text-xs text-gray-500 font-medium">Total Schools</div>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="h-80 bg-white rounded-xl p-4 border border-gray-100">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Liquidated", value: data?.divisionCompletion.approvedLiquidations || 0 },
                          { name: "Pending", value: data?.divisionCompletion.pendingLiquidations || 0 },
                          { name: "Rejected", value: data?.divisionCompletion.rejectedLiquidations || 0 },
                          { name: "No Submission", value: noSubmissionCount },
                        ]}
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                        innerRadius={40}
                        fill="#8884d8"
                        dataKey="value"
                        labelLine={false}
                        label={(props: any) => `${(props.percent * 100).toFixed(0)}%`}
                        stroke="#ffffff"
                        strokeWidth={3}
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
                      <Legend 
                        formatter={(value, entry) => {
                          const payload: any = entry && (entry as any).payload;
                          const total = (data?.divisionCompletion.totalSchools || 0);
                          const count = payload?.value || 0;
                          const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
                          return `${value}: ${percentage}%`;
                        }}
                        wrapperStyle={{
                          fontSize: "12px",
                          paddingTop: "20px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                {/* Enhanced Legend with Details */}
                <div className="space-y-4 mt-6">
                  <h4 className="text-base font-semibold text-gray-800 mb-4">Status Breakdown</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { name: "Liquidated", value: data?.divisionCompletion.approvedLiquidations || 0, color: COLORS[0] },
                      { name: "Pending", value: data?.divisionCompletion.pendingLiquidations || 0, color: COLORS[1] },
                      { name: "Rejected", value: data?.divisionCompletion.rejectedLiquidations || 0, color: COLORS[2] },
                      { name: "No Submission", value: noSubmissionCount, color: COLORS[3] },
                    ].map((item) => (
                      <div
                        key={item.name}
                        className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <div
                            className="w-4 h-4 rounded-full flex-shrink-0"
                            style={{ backgroundColor: item.color }}
                          />
                          <div className="text-sm font-medium text-gray-900">
                            {item.name}
                          </div>
                        </div>
                        <div className="text-sm font-bold text-gray-900">
                          {item.value}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Enhanced Liquidation Timeline */}
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-200">
              <CardHeader className="pb-6">
                <div className="space-y-1">
                  <CardTitle className="text-lg font-semibold text-gray-900">
                    Liquidation Timeline (Current Quarter)
                  </CardTitle>
                  <p className="text-sm text-gray-500">
                    Monthly trends in liquidation submissions and approvals
                  </p>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="h-80 bg-white rounded-xl p-4 border border-gray-100">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data?.liquidationTimeline || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="month" 
                        tick={{ fontSize: 12, fill: '#6b7280' }}
                        axisLine={{ stroke: '#e5e7eb' }}
                      />
                      <YAxis 
                        domain={[0, 'dataMax']}
                        tickCount={6}
                        allowDecimals={false}
                        tick={{ fontSize: 12, fill: '#6b7280' }}
                        axisLine={{ stroke: '#e5e7eb' }}
                      />
                      <Tooltip 
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
                      <Legend 
                        wrapperStyle={{
                          fontSize: "12px",
                          paddingTop: "20px",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="submitted"
                        stroke="#465FFF"
                        strokeWidth={3}
                        name="Submitted"
                        dot={{ fill: "#465FFF", strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, stroke: "#465FFF", strokeWidth: 2 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="approved"
                        stroke="#00C49F"
                        strokeWidth={3}
                        name="Liquidated"
                        dot={{ fill: "#00C49F", strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, stroke: "#00C49F", strokeWidth: 2 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="rejected"
                        stroke="#FF8042"
                        strokeWidth={3}
                        name="Rejected"
                        dot={{ fill: "#FF8042", strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, stroke: "#FF8042", strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                
                {/* Timeline Summary */}
                {data?.liquidationTimeline && data.liquidationTimeline.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="text-base font-semibold text-gray-800">Quarter Summary</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl">
                        <div className="text-lg font-bold text-blue-600">
                          {data.liquidationTimeline.reduce((sum, item) => sum + item.submitted, 0)}
                        </div>
                        <div className="text-xs text-blue-600 font-medium">Total Submitted</div>
                      </div>
                      <div className="text-center p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-xl">
                        <div className="text-lg font-bold text-green-600">
                          {data.liquidationTimeline.reduce((sum, item) => sum + item.approved, 0)}
                        </div>
                        <div className="text-xs text-green-600 font-medium">Total Liquidated</div>
                      </div>
                      <div className="text-center p-4 bg-gradient-to-r from-red-50 to-red-100 rounded-xl">
                        <div className="text-lg font-bold text-red-600">
                          {data.liquidationTimeline.reduce((sum, item) => sum + item.rejected, 0)}
                        </div>
                        <div className="text-xs text-red-600 font-medium">Total Rejected</div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Enhanced Pending Liquidations Table */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Pending Liquidations</h2>
            <div className="text-sm text-gray-500">
              {data?.pendingLiquidations?.length || 0} pending reviews
            </div>
          </div>
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg font-semibold text-gray-900">
                    Liquidation Review Queue
                  </CardTitle>
                  <p className="text-sm text-gray-500">
                    Schools awaiting district ADA review and approval
                  </p>
                </div>
                {data?.pendingLiquidations && data.pendingLiquidations.length > 0 && (
                  <div className="text-right bg-gray-50 px-4 py-3 rounded-lg">
                    <div className="text-xl font-bold text-gray-900">
                      ₱{data.pendingLiquidations.reduce((sum, item) => sum + item.amount, 0).toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500 font-medium">Total Amount</div>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {data?.pendingLiquidations && data.pendingLiquidations.length > 0 ? (
                <div className="space-y-4">
                  {data.pendingLiquidations.map((liquidation) => (
                    <div
                      key={liquidation.id}
                      className="flex items-center justify-between p-6 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-sm hover:shadow-md"
                    >
                      <div className="flex items-center space-x-6">
                        <div className="p-3 bg-blue-100 rounded-lg">
                          <School className="h-6 w-6 text-blue-600" />
                        </div>
                        <div className="space-y-1">
                          <div className="font-semibold text-gray-900 text-lg">
                            {liquidation.schoolName}
                          </div>
                          <div className="text-sm text-gray-500">
                            School ID: {liquidation.schoolId}
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span className="flex items-center">
                              <Clock className="h-4 w-4 mr-1" />
                              {liquidation.daysSinceSubmission} days ago
                            </span>
                            <span className="flex items-center">
                              <FileText className="h-4 w-4 mr-1" />
                              {liquidation.priorityCount} priorities
                            </span>
                            <span className="flex items-center">
                              <BarChart3 className="h-4 w-4 mr-1" />
                              {liquidation.documentCount} documents
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-6">
                        <div className="text-right space-y-1">
                          <div className="text-lg font-bold text-gray-900">
                            ₱{liquidation.amount.toLocaleString()}
                          </div>
                          <div className="text-sm text-gray-500">Total Amount</div>
                        </div>
                        
                        <div className="flex flex-col items-center space-y-2">
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
                            className="px-3 py-1"
                          >
                            {liquidation.status.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                          </Badge>
                          <Button
                            size="sm"
                            onClick={() => navigate("/pre-auditing", { state: { liquidationId: liquidation.liquidationId } })}
                            className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md transition-all duration-200 px-4 py-2"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Review
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center space-y-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-10 h-10 text-gray-400" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      No Pending Liquidations
                    </h3>
                    <p className="text-gray-500 max-w-sm leading-relaxed">
                      All liquidations have been reviewed. Check back later for new submissions.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DivisionDistrictAdaDashboard;