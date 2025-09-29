import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { Eye } from "lucide-react";
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
  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-4 md:gap-6 mb-6">
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Total Pending Amount</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">₱{(data?.metrics?.pendingTotalAmount || 0).toLocaleString()}</div>
        <p className="text-xs text-muted-foreground">Sum of all pending requests</p>
      </CardContent>
    </Card>
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Schools Awaiting Approval</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{data?.metrics?.pendingSchoolsCount || 0}</div>
        <p className="text-xs text-muted-foreground">Unique schools with pending requests</p>
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
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-semibold text-gray-800">
            List of Pending MOOE Requests
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
                  <td className="p-3">{request.userFullName}</td>
                  <td className="p-3">₱{request.totalAmount.toLocaleString()}</td>
                  <td className="p-3">
                    <Badge color="warning">Pending</Badge>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => onView(request.requestId)}>
                        <Eye className="h-4 w-4 mr-1" /> View
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
  const totalCount = distribution.reduce((sum, item) => sum + item.count, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-800">
          MOOE Requests Status Breakdown
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
                labelLine={false}
                label={false}
              >
                {distribution.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Legend 
                verticalAlign="bottom" 
                height={24}
                formatter={(value, entry) => {
                  const payload: any = entry && (entry as any).payload;
                  const count = payload?.count || 0;
                  const status = String(payload?.status || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
                  return `${status}: ${count}`;
                }}
              />
              <Tooltip
                formatter={(value: number | string, name: string) => [
                  `${value} requests`,
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
      <div className="grid grid-cols-1 lg:grid-cols-1 gap-6 mb-6">
        <RequestStatusWidget data={data} />
      </div>

      {/* MOOE Requests - full width */
      }
      <div className="grid grid-cols-1 mb-6">
        <MOOERequestsWidget
          data={data}
          onView={handleViewRequest}
        />
      </div>
    </div>
  );
};

export default DivisionSuperintendent;