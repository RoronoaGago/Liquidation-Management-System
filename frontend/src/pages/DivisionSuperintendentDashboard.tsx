import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { 
  Eye, 
  DollarSign, 
  Building2, 
  AlertCircle, 
  CheckCircle, 
  TrendingUp,
  Users,
  FileText,
  BarChart3
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Badge from "@/components/ui/badge/Badge";
import { Skeleton } from "antd";
import { useNavigate } from "react-router-dom";
import api from "@/api/axios";

// Types for our data
interface MOOERequest {
  requestId: string;
  schoolName: string;
  submittedAt?: string;
  status: "pending";
  totalAmount: number;
  userFullName: string;
}

interface DashboardData {
  mooeRequests: MOOERequest[];
  requestStatusDistribution: {
    status: string;
    count: number;
  }[];
  metrics: {
    pendingTotalAmount: number;
    pendingSchoolsCount: number;
  };
}

const COLORS = ["#465FFF", "#9CB9FF", "#FF8042", "#00C49F", "#FFBB28", "#8884D8"];

// Widget components
const MetricsWidget = ({ data }: { data: DashboardData | null }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-6 mb-6">
    <Card className="hover:shadow-lg transition-shadow duration-200 border-0 shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-xs font-medium text-gray-600">
          Total Pending Amount
        </CardTitle>
        <div className="p-2 bg-orange-100 rounded-lg">
          <DollarSign className="h-5 w-5 text-orange-600" />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-2xl font-bold text-gray-900">
          ₱{(data?.metrics?.pendingTotalAmount || 0).toLocaleString()}
        </div>
        <p className="text-sm text-gray-500 leading-relaxed">
          Sum of all pending requests
        </p>
      </CardContent>
    </Card>
    <Card className="hover:shadow-lg transition-shadow duration-200 border-0 shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-xs font-medium text-gray-600">
          Schools Awaiting Approval
        </CardTitle>
        <div className="p-2 bg-blue-100 rounded-lg">
          <Building2 className="h-5 w-5 text-blue-600" />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-2xl font-bold text-gray-900">
          {data?.metrics?.pendingSchoolsCount || 0}
        </div>
        <p className="text-sm text-gray-500 leading-relaxed">
          Schools with pending requests
        </p>
      </CardContent>
    </Card>
  </div>
);

// Removed Aging and Unliquidated widgets per requirements

const MOOERequestsWidget = ({
  data,
  onView,
}: {
  data: DashboardData | null;
  onView: (requestId: string) => void;
}) => {
  const requests = (data?.mooeRequests || []).filter((r) => r.status === "pending");

  return (
    <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-200">
      <CardHeader className="pb-6">
        <div className="space-y-1">
          <CardTitle className="text-lg font-semibold text-gray-900">
            Pending MOOE Requests
          </CardTitle>
          <p className="text-sm text-gray-500">
            MOOE requests awaiting superintendent approval
          </p>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {requests.length > 0 ? (
          <div className="space-y-6">
            {/* Recent Activity */}
            <div className="space-y-4">
              <h4 className="text-base font-semibold text-gray-800">Recent Submissions</h4>
              <div className="space-y-3">
                {requests.slice(0, 2).map((request) => (
                  <div
                    key={request.requestId}
                    className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{request.schoolName}</div>
                        <div className="text-sm text-gray-500">
                          {request.userFullName} • {request.requestId}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900">
                        ₱{request.totalAmount.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-500">
                        {request.submittedAt ? new Date(request.submittedAt).toLocaleDateString() : 'N/A'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
            <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-gray-400" />
            </div>
            <div className="space-y-2">
              <h3 className="text-base font-semibold text-gray-900">
                No Pending Requests
              </h3>
              <p className="text-sm text-gray-500 max-w-sm leading-relaxed">
                All MOOE requests have been processed. New requests will appear here once schools submit them.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const RequestStatusWidget = ({ data }: { data: DashboardData | null }) => {
  const distribution = data?.requestStatusDistribution || [];
  const totalCount = distribution.reduce((sum, item) => sum + item.count, 0);

  return (
    <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-200">
      <CardHeader className="pb-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg font-semibold text-gray-900">
              MOOE Requests Status Breakdown
            </CardTitle>
            <p className="text-sm text-gray-500">
              Distribution of requests across different statuses
            </p>
          </div>
          {totalCount > 0 && (
            <div className="text-right bg-gray-50 px-4 py-3 rounded-lg">
              <div className="text-xl font-bold text-gray-900">
                {totalCount}
              </div>
              <div className="text-xs text-gray-500 font-medium">Total Requests</div>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {distribution.length > 0 ? (
          <div className="space-y-6">
            {/* Enhanced Pie Chart */}
            <div className="h-80 bg-white rounded-xl p-4 border border-gray-100">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={distribution}
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    innerRadius={40}
                    fill="#8884d8"
                    dataKey="count"
                    labelLine={false}
                    label={(props: any) => `${(props.percent * 100).toFixed(0)}%`}
                    stroke="#ffffff"
                    strokeWidth={3}
                  >
                    {distribution.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number | string, name: string) => [
                      `${value} requests`,
                      "Count",
                    ]}
                    labelFormatter={(label) => `Status: ${String(label).replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}`}
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
              <h4 className="text-base font-semibold text-gray-800 mb-4">Status Details</h4>
              <div className="space-y-3 max-h-40 overflow-y-auto pr-2">
                {distribution
                  .sort((a, b) => b.count - a.count)
                  .map((item, index) => {
                    const status = String(item.status).replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
                    const percentage = totalCount > 0 ? (item.count / totalCount) * 100 : 0;
                    return (
                      <div
                        key={item.status}
                        className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-sm hover:shadow-md"
                      >
                        <div className="flex items-center space-x-4">
                          <div
                            className="w-5 h-5 rounded-full flex-shrink-0 shadow-sm"
                            style={{
                              backgroundColor: COLORS[index % COLORS.length],
                            }}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-semibold text-gray-900 truncate">
                              {status}
                            </div>
                            <div className="text-xs text-gray-500 font-medium">
                              {percentage.toFixed(1)}% of total
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-gray-900">
                            {item.count} requests
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-80 text-center space-y-6">
            <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
              <BarChart3 className="w-10 h-10 text-gray-400" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-900">
                No Request Data Available
              </h3>
              <p className="text-gray-500 max-w-sm leading-relaxed">
                No MOOE requests have been submitted yet. Data will appear here once schools start submitting requests.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const DivisionSuperintendent = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch all requests visible to superintendent - ensure we get all records
      const res = await api.get("requests/", {
        params: { page_size: 1000 } // Get more records to ensure we capture all
      });
      const list = Array.isArray(res.data) ? res.data : (res.data?.results || []);
      
      console.log("Total requests fetched:", list.length);
      console.log("Sample request data:", list.slice(0, 2));

      // Build request status distribution - count all statuses from api_requestmanagement
      const statusCounts: Record<string, number> = {};
      list.forEach((r: any) => {
        const status = (r.status || "").toLowerCase();
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });
      
      console.log("Status counts:", statusCounts);
      const requestStatusDistribution = Object.keys(statusCounts).map((k) => ({ 
        status: k, 
        count: statusCounts[k] 
      }));

      // Pending requests only for table
      const pending = list.filter((r: any) => (r.status || "").toLowerCase() === "pending");
      const mooeRequests: MOOERequest[] = pending.map((r: any) => {
        const totalAmount = (r.priorities || []).reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
        const userFullName = r.user ? `${r.user.first_name} ${r.user.last_name}` : "";
        const schoolName = r.user?.school?.schoolName || "";
        return {
          requestId: r.request_id,
          schoolName,
          submittedAt: r.created_at,
          status: "pending",
          totalAmount,
          userFullName,
        };
      });

      const pendingTotalAmount = mooeRequests.reduce((s, r) => s + (Number(r.totalAmount) || 0), 0);
      const pendingSchools = new Set(mooeRequests.map((r) => r.schoolName || ""));
      const dashboard: DashboardData = {
        mooeRequests,
        requestStatusDistribution,
        metrics: {
          pendingTotalAmount,
          pendingSchoolsCount: pendingSchools.has("") ? pendingSchools.size - 1 : pendingSchools.size,
        },
      };

      setData(dashboard);
    } catch (e) {
      setData({ mooeRequests: [], requestStatusDistribution: [], metrics: { pendingTotalAmount: 0, pendingSchoolsCount: 0 } });
    } finally {
      setLoading(false);
    }
  };

  

  const handleViewRequest = (requestId: string) => {
    navigate("/schools-priorities-submissions", { state: { requestId } });
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
                  style={{ width: 400, height: 36 }} 
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
                  style={{ width: 160, height: 40 }} 
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2].map((item) => (
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
            <div className="grid grid-cols-1 gap-8">
              {/* Status Breakdown Card Skeleton */}
              <Card className="border-0 shadow-lg">
                <CardHeader className="pb-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Skeleton.Input 
                        active 
                        style={{ width: 300, height: 24 }} 
                      />
                      <Skeleton.Input 
                        active 
                        style={{ width: 400, height: 16 }} 
                      />
                    </div>
                    <div className="text-right bg-gray-50 px-4 py-3 rounded-lg">
                      <Skeleton.Input 
                        active 
                        size="large" 
                        style={{ width: 60, height: 32 }} 
                      />
                      <Skeleton.Input 
                        active 
                        style={{ width: 80, height: 12 }} 
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-6">
                    {/* Pie Chart Skeleton */}
                    <div className="h-80 bg-white rounded-xl p-4 border border-gray-100 flex items-center justify-center">
                      <Skeleton.Avatar 
                        active 
                        size="large" 
                        shape="circle" 
                        style={{ width: 200, height: 200 }} 
                      />
                    </div>

                    {/* Status Details Skeleton */}
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
            </div>
          </div>

          {/* MOOE Requests Section Skeleton */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <Skeleton.Input 
                active 
                style={{ width: 250, height: 28 }} 
              />
              <Skeleton.Button 
                active 
                size="large" 
                style={{ width: 140, height: 40 }} 
              />
            </div>
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Skeleton.Input 
                      active 
                      style={{ width: 300, height: 24 }} 
                    />
                    <Skeleton.Input 
                      active 
                      style={{ width: 400, height: 16 }} 
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="rounded-xl border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-gradient-to-r from-gray-50 to-gray-100">
                          {[1, 2, 3, 4, 5, 6].map((item) => (
                            <th key={item} className="p-4">
                              <Skeleton.Input 
                                active 
                                style={{ width: 80, height: 16 }} 
                              />
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[1, 2, 3].map((item) => (
                          <tr key={item} className="border-b">
                            {[1, 2, 3, 4, 5, 6].map((cell) => (
                              <td key={cell} className="p-4">
                                <Skeleton.Input 
                                  active 
                                  style={{ width: 100, height: 16 }} 
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>
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
                Division Superintendent Dashboard
              </h1>
              <p className="text-gray-600 text-sm">
                Monitor and manage MOOE requests from schools across the division
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => navigate("/schools-priorities-submissions")}
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 px-6 py-2.5"
                size="lg"
              >
                <FileText className="h-5 w-5 mr-2" />
                Manage Requests
              </Button>
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
          <MetricsWidget data={data} />
        </div>

        {/* Analytics Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Analytics & Insights</h2>
          </div>
          <div className="grid grid-cols-1 gap-8">
            <RequestStatusWidget data={data} />
          </div>
        </div>

        {/* MOOE Requests Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Pending Requests</h2>
            <Badge className="bg-orange-100 text-orange-700 border-orange-200">
              {data?.mooeRequests?.filter((r) => r.status === "pending").length || 0} items
            </Badge>
          </div>
          <MOOERequestsWidget
            data={data}
            onView={handleViewRequest}
          />
        </div>
      </div>
    </div>
  );
};

export default DivisionSuperintendent;