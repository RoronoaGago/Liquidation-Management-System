import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Calendar, Clock, AlertCircle, TrendingDown, Eye, CheckSquare, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
// Using dummy data for now; backend calls are disabled in this view
import Badge from "@/components/ui/badge/Badge";
import { Skeleton } from "antd";
// Breadcrumb removed to match SchoolHead header layout

// Types for our data
interface UnliquidatedAccount {
  schoolId: string;
  schoolName: string;
  requestId: string;
  daysOverdue: number;
  amount: number;
  agingPeriod: string;
  downloadedAt: string;
}

interface MOOERequest {
  requestId: string;
  schoolId: string;
  schoolName: string;
  submittedAt: string;
  status: "pending" | "approved" | "rejected";
  totalAmount: number;
  priorities: {
    expenseTitle: string;
    amount: number;
  }[];
  user: {
    firstName: string;
    lastName: string;
  };
}

interface DashboardData {
  unliquidatedAccounts: UnliquidatedAccount[];
  mooeRequests: MOOERequest[];
  agingDistribution: {
    period: string;
    count: number;
  }[];
  requestStatusDistribution: {
    status: string;
    count: number;
  }[];
  metrics: {
    totalPendingRequests: number;
    totalUnliquidatedAccounts: number;
    totalOverdueAmount: number;
    averageAgingDays: number;
  };
}

const COLORS = ["#465FFF", "#9CB9FF", "#FF8042", "#00C49F", "#FFBB28", "#8884D8"];

// Dummy dataset to showcase dashboard functionality
const MOCK_DATA: DashboardData = {
  unliquidatedAccounts: [
    {
      schoolId: "SCH-001",
      schoolName: "Central Elementary School",
      requestId: "REQ-2025-0001",
      daysOverdue: 45,
      amount: 125000,
      agingPeriod: "31-60 days",
      downloadedAt: new Date().toISOString(),
    },
    {
      schoolId: "SCH-002",
      schoolName: "North High School",
      requestId: "REQ-2025-0002",
      daysOverdue: 12,
      amount: 54000,
      agingPeriod: "0-30 days",
      downloadedAt: new Date().toISOString(),
    },
    {
      schoolId: "SCH-003",
      schoolName: "West Integrated School",
      requestId: "REQ-2025-0003",
      daysOverdue: 78,
      amount: 210500,
      agingPeriod: "61-90 days",
      downloadedAt: new Date().toISOString(),
    },
    {
      schoolId: "SCH-004",
      schoolName: "South Elementary School",
      requestId: "REQ-2025-0004",
      daysOverdue: 102,
      amount: 90500,
      agingPeriod: ">90 days",
      downloadedAt: new Date().toISOString(),
    },
  ],
  mooeRequests: [
    {
      requestId: "REQ-2025-0101",
      schoolId: "SCH-001",
      schoolName: "Central Elementary School",
      submittedAt: new Date().toISOString(),
      status: "pending",
      totalAmount: 150000,
      priorities: [
        { expenseTitle: "Learning Materials", amount: 60000 },
        { expenseTitle: "Utilities", amount: 90000 },
      ],
      user: { firstName: "Ana", lastName: "Santos" },
    },
    {
      requestId: "REQ-2025-0102",
      schoolId: "SCH-002",
      schoolName: "North High School",
      submittedAt: new Date().toISOString(),
      status: "pending",
      totalAmount: 98000,
      priorities: [
        { expenseTitle: "Maintenance", amount: 30000 },
        { expenseTitle: "ICT", amount: 68000 },
      ],
      user: { firstName: "Brian", lastName: "Lopez" },
    },
    {
      requestId: "REQ-2025-0103",
      schoolId: "SCH-003",
      schoolName: "West Integrated School",
      submittedAt: new Date().toISOString(),
      status: "approved",
      totalAmount: 120000,
      priorities: [
        { expenseTitle: "Repairs", amount: 50000 },
        { expenseTitle: "Security", amount: 70000 },
      ],
      user: { firstName: "Carla", lastName: "Reyes" },
    },
    {
      requestId: "REQ-2025-0104",
      schoolId: "SCH-004",
      schoolName: "South Elementary School",
      submittedAt: new Date().toISOString(),
      status: "rejected",
      totalAmount: 75000,
      priorities: [
        { expenseTitle: "Travel", amount: 30000 },
        { expenseTitle: "Supplies", amount: 45000 },
      ],
      user: { firstName: "Daryl", lastName: "Cruz" },
    },
  ],
  agingDistribution: [
    { period: "0-30 days", count: 8 },
    { period: "31-60 days", count: 5 },
    { period: "61-90 days", count: 3 },
    { period: ">90 days", count: 2 },
  ],
  requestStatusDistribution: [
    { status: "pending", count: 2 },
    { status: "approved", count: 1 },
    { status: "rejected", count: 1 },
  ],
  metrics: {
    totalPendingRequests: 2,
    totalUnliquidatedAccounts: 4,
    totalOverdueAmount: 125000 + 54000 + 210500 + 90500,
    averageAgingDays: Math.round((45 + 12 + 78 + 102) / 4),
  },
};

// Widget components
const MetricsWidget = ({ data }: { data: DashboardData | null }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
    {[
      {
        title: "Pending Requests",
        icon: <AlertCircle className="h-4 w-4 text-muted-foreground" />,
        value: `${data?.metrics?.totalPendingRequests || 0}`,
        description: "Awaiting your approval",
      },
      {
        title: "Unliquidated Accounts",
        icon: <Clock className="h-4 w-4 text-muted-foreground" />,
        value: `${data?.metrics?.totalUnliquidatedAccounts || 0}`,
        description: "Beyond 30-day period",
      },
      {
        title: "Total Overdue Amount",
        icon: <TrendingDown className="h-4 w-4 text-muted-foreground" />,
        value: `₱${(data?.metrics?.totalOverdueAmount || 0).toLocaleString()}`,
        description: "Across all schools",
      },
      {
        title: "Average Aging",
        icon: <Calendar className="h-4 w-4 text-muted-foreground" />,
        value: `${data?.metrics?.averageAgingDays || 0} days`,
        description: "Across all accounts",
      },
    ].map((metric, index) => (
      <Card key={index}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
          {metric.icon}
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metric.value}</div>
          <p className="text-xs text-muted-foreground">{metric.description}</p>
        </CardContent>
      </Card>
    ))}
  </div>
);

const UnliquidatedAccountsWidget = ({
  data,
  onViewDetails,
}: {
  data: DashboardData | null;
  onViewDetails: (account: UnliquidatedAccount) => void;
}) => {
  const accounts = data?.unliquidatedAccounts || [];

  const getAgingColor = (days: number) => {
    if (days <= 30) return "text-green-600";
    if (days <= 60) return "text-yellow-600";
    if (days <= 90) return "text-orange-600";
    return "text-red-600";
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-semibold text-gray-800">
            Unliquidated Accounts
          </CardTitle>
          <div className="flex items-center gap-2">
            
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="p-3 text-left font-medium">School</th>
                <th className="p-3 text-left font-medium">Request ID</th>
                <th className="p-3 text-left font-medium">Days Overdue</th>
                <th className="p-3 text-left font-medium">Amount</th>
                <th className="p-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => (
                <tr key={account.requestId} className="border-b">
                  <td className="p-3 font-medium">{account.schoolName}</td>
                  <td className="p-3">{account.requestId}</td>
                  <td className="p-3">
                    <span className={`font-semibold ${getAgingColor(account.daysOverdue)}`}>
                      {account.daysOverdue} days
                    </span>
                  </td>
                  <td className="p-3">₱{account.amount.toLocaleString()}</td>
                  <td className="p-3">
                    <Button variant="ghost" size="sm" onClick={() => onViewDetails(account)}>
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  </td>
                </tr>
              ))}
              {accounts.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-3 text-center">
                    No unliquidated accounts found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

const AgingDistributionWidget = ({ data }: { data: DashboardData | null }) => {
  const distribution = data?.agingDistribution || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-800">
          Aging Distribution
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={distribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E4E7EC" />
              <XAxis
                dataKey="period"
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
                formatter={(value) => [`${value} accounts`, "Count"]}
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #E4E7EC",
                  borderRadius: "8px",
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                }}
              />
              <Bar dataKey="count" fill="#465FFF" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

const MOOERequestsWidget = ({
  data,
  onApprove,
  onReject,
}: {
  data: DashboardData | null;
  onApprove: (request: MOOERequest) => void;
  onReject: (request: MOOERequest) => void;
}) => {
  const requests = data?.mooeRequests || [];

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-semibold text-gray-800">
            MOOE Requests
          </CardTitle>
          <div className="flex items-center gap-2">
            
            <a href="/schools-priorities-submissions">
              <Button className="mb-4" size="sm" variant="outline">View Details</Button>
            </a>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="p-3 text-left font-medium">School</th>
                <th className="p-3 text-left font-medium">Request ID</th>
                <th className="p-3 text-left font-medium">Submitted By</th>
                <th className="p-3 text-left font-medium">Amount</th>
                <th className="p-3 text-left font-medium">Status</th>
                <th className="p-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr key={request.requestId} className="border-b">
                  <td className="p-3 font-medium">{request.schoolName}</td>
                  <td className="p-3">{request.requestId}</td>
                  <td className="p-3">{request.user.firstName} {request.user.lastName}</td>
                  <td className="p-3">₱{request.totalAmount.toLocaleString()}</td>
                  <td className="p-3">
                    <Badge
                      color={
                        request.status === "approved"
                          ? "success"
                          : request.status === "rejected"
                          ? "error"
                          : "warning"
                      }
                    >
                      {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      {request.status === "pending" && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onApprove(request)}
                            className="text-green-600 border-green-200 hover:bg-green-50"
                          >
                            <CheckSquare className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onReject(request)}
                            className="text-red-600 border-red-200 hover:bg-red-50"
                          >
                            <X className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </>
                      )}
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {requests.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-3 text-center">
                    No MOOE requests found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

const RequestStatusWidget = ({ data }: { data: DashboardData | null }) => {
  const distribution = data?.requestStatusDistribution || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-800">
          Request Status Distribution
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={distribution}
                cx="50%"
                cy="50%"
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
                label={({ status, value }) => `${status} (${value as number})`}
              >
                {distribution.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, name) => [`${value} requests`, name]}
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
      </CardContent>
    </Card>
  );
};

const DivisionSuperintendent = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [selectedAccount, setSelectedAccount] = useState<UnliquidatedAccount | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    // Simulate network latency
    setTimeout(() => {
      setData(MOCK_DATA);
      setLoading(false);
      
    }, 600);
  };

  

  const handleViewDetails = (account: UnliquidatedAccount) => {
    setSelectedAccount(account);
    setIsDetailsOpen(true);
  };

  const handleApproveRequest = async (request: MOOERequest) => {
    setData((prev) => {
      if (!prev) return prev;
      const updatedRequests: MOOERequest[] = prev.mooeRequests.map((r) =>
        r.requestId === request.requestId ? { ...r, status: "approved" as const } : r
      );
      const statusDist = prev.requestStatusDistribution.map((d) => ({ ...d }));
      const pendingIdx = statusDist.findIndex((d) => d.status === "pending");
      const approvedIdx = statusDist.findIndex((d) => d.status === "approved");
      if (pendingIdx !== -1 && statusDist[pendingIdx].count > 0) statusDist[pendingIdx].count -= 1;
      if (approvedIdx !== -1) statusDist[approvedIdx].count += 1;
      return {
        ...prev,
        mooeRequests: updatedRequests,
        requestStatusDistribution: statusDist,
        metrics: {
          ...prev.metrics,
          totalPendingRequests: Math.max(0, prev.metrics.totalPendingRequests - 1),
        },
      };
    });
  };

  const handleRejectRequest = async (request: MOOERequest) => {
    setData((prev) => {
      if (!prev) return prev;
      const updatedRequests: MOOERequest[] = prev.mooeRequests.map((r) =>
        r.requestId === request.requestId ? { ...r, status: "rejected" as const } : r
      );
      const statusDist = prev.requestStatusDistribution.map((d) => ({ ...d }));
      const pendingIdx = statusDist.findIndex((d) => d.status === "pending");
      const rejectedIdx = statusDist.findIndex((d) => d.status === "rejected");
      if (pendingIdx !== -1 && statusDist[pendingIdx].count > 0) statusDist[pendingIdx].count -= 1;
      if (rejectedIdx !== -1) statusDist[rejectedIdx].count += 1;
      return {
        ...prev,
        mooeRequests: updatedRequests,
        requestStatusDistribution: statusDist,
        metrics: {
          ...prev.metrics,
          totalPendingRequests: Math.max(0, prev.metrics.totalPendingRequests - 1),
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
              Division Superintendent Dashboard
            </h1>
            <p className="mt-1 text-gray-500 text-theme-sm">
              Manage unliquidated accounts and MOOE requests
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
    <div className="p-6 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Division Superintendent Dashboard
          </h1>
          <p className="mt-1 text-gray-500 text-theme-sm">
            Manage unliquidated accounts and MOOE requests
          </p>
        </div>
        <div className="flex items-center gap-3 mt-4 md:mt-0">
          
        </div>
      </div>

      {/* Metrics */}
      <div className="mb-6">
        <MetricsWidget data={data} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <AgingDistributionWidget data={data} />
        <RequestStatusWidget data={data} />
      </div>

      {/* MOOE Requests - full width */}
      <div className="grid grid-cols-1 mb-6">
        <MOOERequestsWidget
          data={data}
          onApprove={handleApproveRequest}
          onReject={handleRejectRequest}
        />
      </div>

      {/* Unliquidated Accounts - full width */}
      <div className="grid grid-cols-1">
        <UnliquidatedAccountsWidget
          data={data}
          onViewDetails={handleViewDetails}
        />
      </div>

      {/* Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Unliquidated Account Details</DialogTitle>
            <DialogDescription>
              Detailed information about the selected unliquidated account.
            </DialogDescription>
          </DialogHeader>
          {selectedAccount && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-500 dark:text-gray-400">School</h4>
                  <p className="text-gray-800 dark:text-white/90">{selectedAccount.schoolName}</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-500 dark:text-gray-400">Request ID</h4>
                  <p className="text-gray-800 dark:text-white/90">{selectedAccount.requestId}</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-500 dark:text-gray-400">Days Overdue</h4>
                  <p className="text-gray-800 dark:text-white/90">{selectedAccount.daysOverdue} days</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-500 dark:text-gray-400">Amount</h4>
                  <p className="text-gray-800 dark:text-white/90">₱{selectedAccount.amount.toLocaleString()}</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-500 dark:text-gray-400">Downloaded At</h4>
                  <p className="text-gray-800 dark:text-white/90">
                    {new Date(selectedAccount.downloadedAt).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-500 dark:text-gray-400">Aging Period</h4>
                  <p className="text-gray-800 dark:text-white/90">{selectedAccount.agingPeriod}</p>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>
                  Close
                </Button>
                <Button>Send Reminder</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DivisionSuperintendent;