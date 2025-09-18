/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/prefer-as-const */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import Button from "@/components/ui/button/Button";
import {
  AlertTriangle,
  FileText,
  TrendingUp,
  Download,
  Eye,
  BarChart3,
} from "lucide-react";
import {
  Card,
  Table,
  Tag,
  Row,
  Col,
  Skeleton,
  Tooltip,
  Empty,
  Progress,
  Statistic,
} from "antd";
import { Pie } from "@ant-design/charts";
import { formatCurrency } from "@/lib/helpers";

interface UnliquidatedSchool {
  id: string;
  schoolId: string;
  schoolName: string;
  district: string;
  liquidationId: string;
  daysElapsed: number;
  agingPeriod: string;
  amount: number;
}

interface MOOERequest {
  id: string;
  requestId: string;
  schoolId: string;
  schoolName: string;
  district: string;
  submittedDate: string;
  totalAmount: number;
  status: "pending" | "approved" | "rejected" | "downloaded" | "unliquidated";
  priorities: { title: string; amount: number }[];
}

interface DashboardStats {
  totalPendingRequests: number;
  totalUnliquidatedSchools: number;
  requestStatusBreakdown: {
    pending: number;
    approved: number;
    rejected: number;
  };
}

const DivisionSuperintendentDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<{
    unliquidatedSchools: UnliquidatedSchool[];
    mooeRequests: MOOERequest[];
    stats: DashboardStats;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  // Dummy data for demonstration
  const dummyData = {
    unliquidatedSchools: [
      {
        id: "1",
        schoolId: "SCH001",
        schoolName: "Central Elementary School",
        district: "North District",
        liquidationId: "LQN-2023-001",
        daysElapsed: 45,
        agingPeriod: "45 days (15 days overdue)",
        amount: 25000,
      },
      {
        id: "2",
        schoolId: "SCH002",
        schoolName: "West High School",
        district: "West District",
        liquidationId: "LQN-2023-002",
        daysElapsed: 35,
        agingPeriod: "35 days (5 days overdue)",
        amount: 35000,
      },
      {
        id: "3",
        schoolId: "SCH003",
        schoolName: "East Primary School",
        district: "East District",
        liquidationId: "LQN-2023-003",
        daysElapsed: 65,
        agingPeriod: "65 days (35 days overdue)",
        amount: 18000,
      },
    ],
    mooeRequests: [
      {
        id: "1",
        requestId: "REQ-2023-004",
        schoolId: "SCH004",
        schoolName: "South Elementary School",
        district: "South District",
        submittedDate: "2023-10-15",
        totalAmount: 42000,
        status: "pending" as "pending",
        priorities: [
          { title: "Instructional Materials", amount: 15000 },
          { title: "Repair and Maintenance", amount: 12000 },
          { title: "Office Supplies", amount: 10000 },
          { title: "Training Expenses", amount: 5000 },
        ],
      },
      {
        id: "2",
        requestId: "REQ-2023-005",
        schoolId: "SCH005",
        schoolName: "North High School",
        district: "North District",
        submittedDate: "2023-10-12",
        totalAmount: 38000,
        status: "pending" as "pending",
        priorities: [
          { title: "Laboratory Equipment", amount: 20000 },
          { title: "Sports Facilities", amount: 10000 },
          { title: "Utility Expenses", amount: 8000 },
        ],
      },
      {
        id: "3",
        requestId: "REQ-2023-006",
        schoolId: "SCH006",
        schoolName: "Central Integrated School",
        district: "Central District",
        submittedDate: "2023-10-10",
        totalAmount: 55000,
        status: "approved" as "approved",
        priorities: [
          { title: "Classroom Furniture", amount: 25000 },
          { title: "Audio-Visual Equipment", amount: 20000 },
          { title: "Library Books", amount: 10000 },
        ],
      },
    ],
    stats: {
      totalPendingRequests: 12,
      totalUnliquidatedSchools: 8,
      requestStatusBreakdown: {
        pending: 5,
        approved: 15,
        rejected: 2,
      },
    },
  };

  useEffect(() => {
    // Simulate API call with dummy data
    setTimeout(() => {
      setData(dummyData);
      setLoading(false);
    }, 1000);
  }, [user]);

  const handleViewRequest = (requestId: string) => {
    navigate(`/requests/${requestId}`);
  };

  const handleExportReport = () => {
    console.log("Exporting report");
    // Implement export functionality
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton active paragraph={{ rows: 1 }} />
        <Row gutter={16}>
          {[1, 2, 3].map((item) => (
            <Col xs={24} sm={12} md={8} key={item}>
              <Skeleton active paragraph={{ rows: 2 }} />
            </Col>
          ))}
        </Row>
        <Skeleton active paragraph={{ rows: 8 }} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-8">
        <FileText className="mx-auto h-12 w-12 text-gray-400 mb-2" />
        <p className="text-gray-500">No data available</p>
      </div>
    );
  }

  const { unliquidatedSchools, mooeRequests, stats } = data;

  // Prepare data for pie chart
  const pieChartData = [
    {
      type: "Pending",
      value: stats.requestStatusBreakdown.pending,
      color: "#3f51b5",
    },
    {
      type: "Approved",
      value: stats.requestStatusBreakdown.approved,
      color: "#4caf50",
    },
    {
      type: "Rejected",
      value: stats.requestStatusBreakdown.rejected,
      color: "#f44336",
    },
  ];

  const pieConfig = {
    data: pieChartData,
    angleField: "value",
    colorField: "type",
    color: ["#3f51b5", "#4caf50", "#f44336"],
    radius: 0.95,
    label: {
      type: "outer",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      content: (data: any) => `${data.type}: ${data.value}`,
    },
    interactions: [{ type: "element-active" }],
    height: 280,
    legend: {
      position: "bottom",
    },
  };

  // Update the table columns to ensure consistent sizing
  const unliquidatedColumns = [
    {
      title: "School",
      dataIndex: "schoolName",
      key: "schoolName",
      width: "30%",
      render: (text: string, record: UnliquidatedSchool) => (
        <div>
          <div className="font-medium">{text}</div>
          <div className="text-xs text-gray-500">{record.schoolId}</div>
        </div>
      ),
    },
    {
      title: "Liquidation ID",
      dataIndex: "liquidationId",
      key: "liquidationId",
      width: "20%",
      render: (text: string) => (
        <span className="font-mono text-sm">{text}</span>
      ),
    },
    {
      title: "Aging",
      dataIndex: "agingPeriod",
      key: "agingPeriod",
      width: "25%",
      render: (text: string, record: UnliquidatedSchool) => (
        <Tag
          color={
            record.daysElapsed > 60
              ? "red"
              : record.daysElapsed > 30
              ? "orange"
              : "gold"
          }
          className="text-xs"
        >
          {text}
        </Tag>
      ),
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      width: "25%",
      render: (amount: number) => (
        <span className="font-medium">{formatCurrency(amount)}</span>
      ),
    },
  ];

  const mooeRequestColumns = [
    {
      title: "Request ID",
      dataIndex: "requestId",
      key: "requestId",
      width: "20%",
      render: (text: string) => (
        <span className="font-mono text-sm">{text}</span>
      ),
    },
    {
      title: "School",
      dataIndex: "schoolName",
      key: "schoolName",
      width: "30%",
      render: (text: string, record: MOOERequest) => (
        <div>
          <div className="font-medium">{text}</div>
          <div className="text-xs text-gray-500">{record.district}</div>
        </div>
      ),
    },
    {
      title: "Submitted",
      dataIndex: "submittedDate",
      key: "submittedDate",
      width: "15%",
      render: (text: string) => (
        <span className="text-sm">{new Date(text).toLocaleDateString()}</span>
      ),
    },
    {
      title: "Amount",
      dataIndex: "totalAmount",
      key: "totalAmount",
      width: "15%",
      render: (amount: number) => (
        <span className="font-medium">{formatCurrency(amount)}</span>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: "10%",
      render: (status: string) => {
        const statusConfig: Record<string, { color: string; text: string }> = {
          pending: { color: "gold", text: "Pending" },
          approved: { color: "green", text: "Approved" },
          rejected: { color: "red", text: "Rejected" },
          downloaded: { color: "blue", text: "Downloaded" },
          unliquidated: { color: "orange", text: "Unliquidated" },
        };
        const config = statusConfig[status] || {
          color: "default",
          text: status,
        };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: "Action",
      key: "action",
      width: "10%",
      render: (record: MOOERequest) => (
        <Tooltip title="View Details">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleViewRequest(record.requestId)}
          >
            <Eye size={14} />
          </Button>
        </Tooltip>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
            Division Superintendent Dashboard
          </h2>
        </div>
        <Button onClick={handleExportReport}>
          <Download size={16} className="mr-2" />
          Export
        </Button>
      </div>

      {/* Main Overview Section */}
      <Row gutter={[16, 16]}>
        {/* Pie Chart */}
        <Col xs={24} md={16} lg={17}>
          <Card
            className="border-0 shadow-sm rounded-lg h-full"
            title={
              <div className="flex items-center">
                <BarChart3 size={18} className="text-indigo-500 mr-2" />
                <span>Request Status Overview</span>
              </div>
            }
            bodyStyle={{ padding: "10px" }}
          >
            <Pie {...pieConfig} />
          </Card>
        </Col>

        {/* Stats Cards */}
        <Col xs={24} md={8} lg={7}>
          <div className="flex flex-col gap-4 h-full">
            <Card className="border-0 shadow-sm rounded-lg flex-1">
              <Statistic
                title="Pending Requests"
                value={stats.totalPendingRequests}
                prefix={<FileText className="text-blue-500" />}
                valueStyle={{ color: "#3f51b5" }}
              />
              <Progress
                percent={Math.round(
                  (stats.requestStatusBreakdown.pending /
                    (stats.requestStatusBreakdown.pending +
                      stats.requestStatusBreakdown.approved +
                      stats.requestStatusBreakdown.rejected)) *
                    100
                )}
                size="small"
                status="active"
                strokeColor="#3f51b5"
              />
            </Card>
            <Card className="border-0 shadow-sm rounded-lg flex-1">
              <Statistic
                title="Approval Rate"
                value={Math.round(
                  (stats.requestStatusBreakdown.approved /
                    (stats.requestStatusBreakdown.pending +
                      stats.requestStatusBreakdown.approved +
                      stats.requestStatusBreakdown.rejected)) *
                    100
                )}
                suffix="%"
                prefix={<TrendingUp className="text-green-500" />}
                valueStyle={{ color: "#4caf50" }}
              />
              <div className="mt-2 text-xs text-gray-500">
                {stats.requestStatusBreakdown.approved} approved,{" "}
                {stats.requestStatusBreakdown.rejected} rejected
              </div>
            </Card>
          </div>
        </Col>
      </Row>

      {/* Tables Section */}
      <Row gutter={[16, 16]}>
        {/* MOOE Requests */}
        <Col xs={24} lg={12}>
          <Card
            className="border-0 shadow-sm rounded-lg h-full"
            title={
              <div className="flex items-center">
                <FileText size={18} className="text-blue-500 mr-2" />
                <span>MOOE Requests for Approval</span>
              </div>
            }
            bodyStyle={{ padding: "10px" }}
          >
            {mooeRequests.length > 0 ? (
              <Table
                columns={mooeRequestColumns}
                dataSource={mooeRequests.filter((r) => r.status === "pending")}
                rowKey="id"
                pagination={{
                  pageSize: 3,
                  hideOnSinglePage: true,
                  total: mooeRequests.filter((r) => r.status === "pending")
                    .length,
                  showSizeChanger: false,
                }}
                scroll={{ x: "max-content" }}
                size="middle"
                className="rounded-lg"
              />
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No pending requests"
              />
            )}
          </Card>
        </Col>

        {/* Unliquidated Accounts */}
        <Col xs={24} lg={12}>
          <Card
            className="border-0 shadow-sm rounded-lg h-full"
            title={
              <div className="flex items-center">
                <AlertTriangle size={18} className="text-amber-500 mr-2" />
                <span>Schools with Unliquidated Accounts</span>
              </div>
            }
            bodyStyle={{ padding: "10px" }}
          >
            {unliquidatedSchools.length > 0 ? (
              <Table
                columns={unliquidatedColumns}
                dataSource={unliquidatedSchools}
                rowKey="id"
                pagination={{
                  pageSize: 3,
                  hideOnSinglePage: true,
                  total: unliquidatedSchools.length,
                  showSizeChanger: false,
                }}
                scroll={{ x: "max-content" }}
                size="middle"
                className="rounded-lg"
              />
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No unliquidated schools"
              />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DivisionSuperintendentDashboard;
