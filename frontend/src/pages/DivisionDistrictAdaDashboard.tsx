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
import { FileText, CheckCircle, TrendingUp, School, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import  Badge  from "@/components/ui/badge/Badge";
import { Skeleton } from "antd";
// Using dummy data for demo purposes; no backend calls needed

// Types for our data
interface DashboardData {
  pendingLiquidations: PendingLiquidation[];
  divisionCompletion: DivisionCompletionData;
  liquidationTimeline: LiquidationTimelineData[];
  schoolPerformance: SchoolPerformanceData[];
  documentCompliance: DocumentComplianceData[];
  adaAvgApprovalDays: number;
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

const DUMMY_DATA: DashboardData = {
  pendingLiquidations: [
    {
      id: "LQ-001",
      schoolName: "San Isidro Elementary School",
      schoolId: "300123",
      submittedDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      status: "under_review",
      amount: 125000,
      priorityCount: 3,
      documentCount: 8,
      daysSinceSubmission: 3,
    },
    {
      id: "LQ-002",
      schoolName: "Mabini High School",
      schoolId: "300456",
      submittedDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
      status: "submitted",
      amount: 98000,
      priorityCount: 2,
      documentCount: 6,
      daysSinceSubmission: 8,
    },
    {
      id: "LQ-003",
      schoolName: "Bonifacio Integrated School",
      schoolId: "300789",
      submittedDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      status: "under_review",
      amount: 210500,
      priorityCount: 4,
      documentCount: 10,
      daysSinceSubmission: 14,
    },
  ],
  divisionCompletion: {
    totalSchools: 45,
    schoolsWithLiquidation: 38,
    approvedLiquidations: 22,
    pendingLiquidations: 11,
    rejectedLiquidations: 5,
    completionRate: Math.round((38 / 45) * 100),
  },
  liquidationTimeline: [
    { month: "Jan", submitted: 12, approved: 8, rejected: 2, avgProcessingTime: 7 },
    { month: "Feb", submitted: 15, approved: 10, rejected: 1, avgProcessingTime: 6 },
    { month: "Mar", submitted: 18, approved: 12, rejected: 3, avgProcessingTime: 8 },
    { month: "Apr", submitted: 14, approved: 9, rejected: 2, avgProcessingTime: 7 },
    { month: "May", submitted: 20, approved: 15, rejected: 1, avgProcessingTime: 6 },
    { month: "Jun", submitted: 16, approved: 11, rejected: 2, avgProcessingTime: 7 },
  ],
  schoolPerformance: [
    { schoolId: "300123", schoolName: "San Isidro ES", totalRequests: 10, approvedRequests: 8, rejectionRate: 10, avgProcessingTime: 6, budgetUtilization: 85 },
    { schoolId: "300456", schoolName: "Mabini HS", totalRequests: 12, approvedRequests: 9, rejectionRate: 8, avgProcessingTime: 7, budgetUtilization: 78 },
    { schoolId: "300789", schoolName: "Bonifacio IS", totalRequests: 8, approvedRequests: 6, rejectionRate: 12, avgProcessingTime: 5, budgetUtilization: 90 },
    { schoolId: "300321", schoolName: "Rizal ES", totalRequests: 9, approvedRequests: 7, rejectionRate: 11, avgProcessingTime: 6, budgetUtilization: 82 },
  ],
  documentCompliance: [
    { requirement: "Receipts", totalSubmitted: 40, compliant: 36, complianceRate: 90 },
    { requirement: "SOAs", totalSubmitted: 38, compliant: 34, complianceRate: 89 },
    { requirement: "Travel Orders", totalSubmitted: 30, compliant: 27, complianceRate: 90 },
  ],
  adaAvgApprovalDays: 4,
};

const DivisionDistrictAdaDashboard = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    // Simulate network latency
    setTimeout(() => {
      setData(DUMMY_DATA);
      setLoading(false);
    }, 600);
  };

  const handleApproveLiquidation = async (liquidationId: string) => {
    // Update local state to reflect approval
    setData((prev) => {
      if (!prev) return prev;
      const remaining = prev.pendingLiquidations.filter((l) => l.id !== liquidationId);
      const approvedLiquidations = prev.divisionCompletion.approvedLiquidations + 1;
      const pendingLiquidations = Math.max(prev.divisionCompletion.pendingLiquidations - 1, 0);
      return {
        ...prev,
        pendingLiquidations: remaining,
        divisionCompletion: {
          ...prev.divisionCompletion,
          approvedLiquidations,
          pendingLiquidations,
          schoolsWithLiquidation: prev.divisionCompletion.schoolsWithLiquidation,
          completionRate: prev.divisionCompletion.completionRate,
        },
      };
    });
  };

  const handleRejectLiquidation = async (liquidationId: string, _reason: string) => {
    // Update local state to reflect rejection
    setData((prev) => {
      if (!prev) return prev;
      const remaining = prev.pendingLiquidations.filter((l) => l.id !== liquidationId);
      const rejectedLiquidations = prev.divisionCompletion.rejectedLiquidations + 1;
      const pendingLiquidations = Math.max(prev.divisionCompletion.pendingLiquidations - 1, 0);
      return {
        ...prev,
        pendingLiquidations: remaining,
        divisionCompletion: {
          ...prev.divisionCompletion,
          rejectedLiquidations,
          pendingLiquidations,
          schoolsWithLiquidation: prev.divisionCompletion.schoolsWithLiquidation,
          completionRate: prev.divisionCompletion.completionRate,
        },
      };
    });
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Division District ADA Dashboard
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

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Division District ADA Dashboard
          </h1>
          <p className="mt-1 text-gray-500 text-theme-sm">
            Liquidation oversight and approval management
          </p>
        </div>
        <div className="flex items-center gap-3" />
      </div>

      {/* Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6 mb-6">
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ADA Approval Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.adaAvgApprovalDays} days</div>
            <p className="text-xs text-muted-foreground">Avg time to fully approve</p>
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
            <div className="h-64">
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
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.schoolPerformance || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="schoolName" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="approvedRequests" fill="#465FFF" name="Approved liquidation reports" />
                <Bar dataKey="avgProcessingTime" fill="#00C49F" name="Average Liquidation Time (days)" />
                <Bar dataKey="budgetUtilization" fill="#FFBB28" name="Report Completion (%)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DivisionDistrictAdaDashboard;