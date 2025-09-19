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
} from "recharts";
import {
  Download,
  Filter,
  Calendar,
  BarChart3,
  PieChart as PieChartIcon,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  School,
  UserCheck,
  FileCheck,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import  Badge  from "@/components/ui/badge/Badge";
import { Skeleton } from "antd";
import api from "@/api/axios";

// Types for our data
interface DashboardData {
  pendingLiquidations: PendingLiquidation[];
  divisionCompletion: DivisionCompletionData;
  liquidationTimeline: LiquidationTimelineData[];
  schoolPerformance: SchoolPerformanceData[];
  documentCompliance: DocumentComplianceData[];
}

interface PendingLiquidation {
  id: string;
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
  month: string;
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

interface DocumentComplianceData {
  requirement: string;
  totalSubmitted: number;
  compliant: number;
  complianceRate: number;
}

const COLORS = ["#465FFF", "#9CB9FF", "#FF8042", "#00C49F", "#FFBB28", "#8884D8"];

const DivisionDistrictAdaDashboard = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<string>("last_quarter");

  useEffect(() => {
    fetchDashboardData();
  }, [timeRange]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      // This endpoint would need to be created in your backend
      const response = await api.get(
        `/ada-dashboard/?time_range=${timeRange}`
      );
      setData(response.data);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveLiquidation = async (liquidationId: string) => {
    try {
      // This endpoint would need to be created in your backend
      await api.post(`/liquidations/${liquidationId}/approve/`);
      // Refresh data after approval
      fetchDashboardData();
    } catch (error) {
      console.error("Failed to approve liquidation:", error);
    }
  };

  const handleRejectLiquidation = async (liquidationId: string, reason: string) => {
    try {
      // This endpoint would need to be created in your backend
      await api.post(`/liquidations/${liquidationId}/reject/`, { reason });
      // Refresh data after rejection
      fetchDashboardData();
    } catch (error) {
      console.error("Failed to reject liquidation:", error);
    }
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white/90">
              Division District ADA Dashboard
            </h1>
            <p className="mt-1 text-gray-500 text-theme-sm dark:text-gray-400">
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

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white/90">
            Division District ADA Dashboard
          </h1>
          <p className="mt-1 text-gray-500 text-theme-sm dark:text-gray-400">
            Liquidation oversight and approval management
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last_week">Last Week</SelectItem>
              <SelectItem value="last_month">Last Month</SelectItem>
              <SelectItem value="last_quarter">Last Quarter</SelectItem>
              <SelectItem value="last_year">Last Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Schools</CardTitle>
            <School className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.divisionCompletion.totalSchools}</div>
            <p className="text-xs text-muted-foreground">In your division</p>
          </CardContent>
        </Card>
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
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: "Approved", value: data?.divisionCompletion.approvedLiquidations || 0 },
                      { name: "Pending", value: data?.divisionCompletion.pendingLiquidations || 0 },
                      { name: "Rejected", value: data?.divisionCompletion.rejectedLiquidations || 0 },
                      { name: "No Submission", value: (data?.divisionCompletion.totalSchools || 0) - (data?.divisionCompletion.schoolsWithLiquidation || 0) },
                    ]}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={(props: any) => `${props.name}: ${(props.percent * 100).toFixed(0)}%`}
                  >
                    {COLORS.map((color, index) => (
                      <Cell key={`cell-${index}`} fill={color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Liquidation Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Liquidation Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data?.liquidationTimeline || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="submitted"
                    stroke="#465FFF"
                    strokeWidth={2}
                    name="Submitted"
                  />
                  <Line
                    type="monotone"
                    dataKey="approved"
                    stroke="#00C49F"
                    strokeWidth={2}
                    name="Approved"
                  />
                  <Line
                    type="monotone"
                    dataKey="rejected"
                    stroke="#FF8042"
                    strokeWidth={2}
                    name="Rejected"
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
                            : liquidation.status === "under_review"
                            ? "primary"
                            : "success"
                        }
                      >
                        {liquidation.status.replace("_", " ")}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          onClick={() => handleApproveLiquidation(liquidation.id)}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const reason = prompt("Please provide a reason for rejection:");
                            if (reason) {
                              handleRejectLiquidation(liquidation.id, reason);
                            }
                          }}
                        >
                          Reject
                        </Button>
                        <Button size="sm" variant="ghost">
                          <FileText className="h-4 w-4" />
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

      {/* School Performance */}
      <Card>
        <CardHeader>
          <CardTitle>School Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.schoolPerformance || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="schoolName" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="approvedRequests" fill="#465FFF" name="Approved Requests" />
                <Bar dataKey="avgProcessingTime" fill="#00C49F" name="Avg Processing Time (days)" />
                <Bar dataKey="budgetUtilization" fill="#FFBB28" name="Budget Utilization (%)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DivisionDistrictAdaDashboard;