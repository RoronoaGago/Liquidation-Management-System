/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import Button from "@/components/ui/button/Button";
import {
  // DollarSign,
  PhilippinePeso,
  FileText,
  // BarChart3,
  Activity,
  Clock,
  CheckCircle,
  AlertCircle,
  Eye,
  Plus,
} from "lucide-react";
import {
  Card,
  Progress,
  Table,
  Tag,
  Row,
  Col,
  Skeleton,
  Typography,
  Tooltip,
  Empty,
} from "antd";
import { formatCurrency } from "@/lib/helpers";

const { Title, Text } = Typography;

interface PrioritySummary {
  id: string | number;
  title: string;
  requestedAmount?: number;
  actualAmount?: number;
  downloadedAmount?: number;
  completion: number; // Percentage based on documents
  status: "completed" | "partial" | "pending";
}

interface DashboardData {
  yearlyBudget: number;
  monthlyBudget: number;
  totalRequested: number;
  totalActual: number;
  requestProgress: number;
  liquidationProgress: number;
  currentPriorities: PrioritySummary[];
  remainingDays?: number;
  currentMonth: string;
  mode: "request" | "liquidation";
  recentActivity: any[];
  liquidatedAmount: number;
  downloadedAmount: number;
}

const SchoolHeadDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  // Dummy data for demonstration
  const dummyData: DashboardData = {
    yearlyBudget: 120000,
    monthlyBudget: 10000,
    totalRequested: 8000,
    totalActual: 7500,
    requestProgress: 60,
    liquidationProgress: 85,
    currentPriorities: [
      {
        id: 1,
        title: "Instructional Materials",
        requestedAmount: 3000,
        downloadedAmount: 3000,
        actualAmount: 3000,
        completion: 100,
        status: "completed",
      },
      {
        id: 2,
        title: "Repair and Maintenance",
        requestedAmount: 2500,
        downloadedAmount: 2500,
        actualAmount: 1875,
        completion: 75,
        status: "partial",
      },
      {
        id: 3,
        title: "Office Supplies",
        requestedAmount: 2000,
        downloadedAmount: 0,
        actualAmount: 0,
        completion: 0,
        status: "pending",
      },
      {
        id: 4,
        title: "Travel Expenses",
        requestedAmount: 500,
        downloadedAmount: 500,
        actualAmount: 250,
        completion: 50,
        status: "partial",
      },
    ],
    remainingDays: 15,
    currentMonth: "September 2025",
    mode: "request",
    recentActivity: [
      {
        id: 1,
        type: "request",
        action: "submitted",
        date: "2025-09-15",
        amount: 2500,
      },
      {
        id: 2,
        type: "liquidation",
        action: "approved",
        date: "2025-09-10",
        amount: 3000,
      },
      {
        id: 3,
        type: "request",
        action: "needs revision",
        date: "2025-09-05",
        amount: 1500,
      },
    ],
    liquidatedAmount: 5125, // Sum of actualAmount from priorities
    downloadedAmount: 6000, // Sum of downloadedAmount from priorities
  };

  useEffect(() => {
    // Simulate API call with dummy data
    setTimeout(() => {
      setData(dummyData);
      setLoading(false);
    }, 1000);

    // In real implementation:
    // fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton active paragraph={{ rows: 1 }} />
        <Row gutter={24}>
          <Col span={24}>
            <Skeleton active paragraph={{ rows: 4 }} />
          </Col>
        </Row>
        <Skeleton active paragraph={{ rows: 8 }} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <p className="text-gray-500">No data available</p>
      </div>
    );
  }

  const {
    yearlyBudget,
    monthlyBudget,
    currentPriorities,
    remainingDays,
    currentMonth,
    recentActivity,
    liquidatedAmount,
    downloadedAmount,
  } = data;

  // Calculate utilization percentage based on how much of downloaded funds have been liquidated
  const utilization =
    downloadedAmount > 0 ? (liquidatedAmount / downloadedAmount) * 100 : 0;

  const priorityColumns = [
    {
      title: "Priority",
      dataIndex: "title",
      key: "title",
      render: (text: string) => <span className="font-medium">{text}</span>,
    },
    // {
    //   title: "Requested Amount",
    //   dataIndex: "requestedAmount",
    //   key: "requestedAmount",
    //   render: (amount?: number) => formatCurrency(amount || 0),
    // }
    {
      title: "Downloaded Amount",
      dataIndex: "downloadedAmount",
      key: "downloadedAmount",
      render: (amount?: number) => formatCurrency(amount || 0),
    },
    {
      title: "Liquidated Amount",
      dataIndex: "actualAmount",
      key: "actualAmount",
      render: (amount?: number) => formatCurrency(amount || 0),
    },
    {
      title: "Completion",
      key: "completion",
      render: (_: any, record: PrioritySummary) => (
        <div className="flex items-center">
          <Progress
            percent={record.completion}
            size="small"
            status={record.completion === 100 ? "success" : "active"}
            strokeColor={record.completion === 100 ? "#10b981" : "#f59e0b"}
            className="w-16 mr-2"
            showInfo={false}
          />
          <span>{record.completion}%</span>
        </div>
      ),
    },
    {
      title: "Status",
      key: "status",
      render: (_: any, record: PrioritySummary) => {
        const statusConfig = {
          completed: { color: "green", text: "Completed" },
          partial: { color: "orange", text: "In Progress" },
          pending: { color: "default", text: "Pending" },
        };

        const config = statusConfig[record.status];
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: "Actions",
      key: "actions",
      render: () => (
        <div className="flex space-x-2">
          <Tooltip title="View details">
            <Button size="sm">
              <Eye size={14} />
            </Button>
          </Tooltip>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        {/* Only show the title, not the breadcrumb trail */}
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">
          School Head Dashboard
        </h2>
        <div className="flex space-x-2">
          <Button onClick={() => navigate("/requests/create")}>
            <Plus size={16} className="mr-2" />
            New Request
          </Button>
          <Button onClick={() => navigate("/liquidations")}>
            View Liquidations
          </Button>
        </div>
      </div>

      {/* Quick Stats Row */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={8}>
          <Card className="h-full border-0 shadow-sm hover:shadow transition-all">
            <div className="flex items-center">
              <div className="bg-blue-100 p-3 rounded-full mr-4">
                <PhilippinePeso className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <Text type="secondary">Monthly Budget</Text>
                <Title level={4} className="mt-1 mb-0">
                  {formatCurrency(monthlyBudget)}
                </Title>
                <Text type="secondary" className="text-xs">
                  Yearly: {formatCurrency(yearlyBudget)}
                </Text>
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={8}>
          <Card className="h-full border-0 shadow-sm hover:shadow transition-all">
            <div className="flex items-center">
              <div className="bg-green-100 p-3 rounded-full mr-4">
                <Activity className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <Text type="secondary">Liquidation Report Progress</Text>
                <Title level={4} className="mt-1 mb-0">
                  {utilization.toFixed(1)}%
                </Title>
                <Text type="secondary" className="text-xs">
                  {formatCurrency(liquidatedAmount)} of{" "}
                  {formatCurrency(downloadedAmount)} liquidated
                </Text>
              </div>
            </div>
            <Progress
              percent={utilization}
              size="small"
              status="active"
              strokeColor={
                utilization > 90
                  ? "#10b981"
                  : utilization > 50
                  ? "#f59e0b"
                  : "#ef4444"
              }
              className="mt-3"
              showInfo={false}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} md={8}>
          <Card className="h-full border-0 shadow-sm hover:shadow transition-all">
            <div className="flex items-center">
              <div className="bg-amber-100 p-3 rounded-full mr-4">
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <Text type="secondary">Days Remaining</Text>
                <Title level={4} className="mt-1 mb-0">
                  {remainingDays}
                </Title>
                <Text type="secondary" className="text-xs">
                  Requesting for {currentMonth}
                </Text>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Main Content Area */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card
            className="h-full border-0 shadow-sm"
            title="List of Priorities"
          >
            {currentPriorities.length > 0 ? (
              <Table
                columns={priorityColumns}
                dataSource={currentPriorities}
                rowKey="id"
                pagination={{ pageSize: 5, hideOnSinglePage: true }}
                scroll={{ x: "max-content" }}
                className="border-0"
                size="middle"
              />
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No current priorities"
              />
            )}
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card
            title="Recent Activity"
            className="h-full border-0 shadow-sm"
            // extra={<Button size="sm">View All</Button>}
          >
            {recentActivity.length > 0 ? (
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start py-2 border-0 border-b border-gray-100 last:border-0"
                  >
                    <div className="mr-3 mt-1">
                      {activity.action === "approved" ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-amber-500" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <Text strong className="capitalize">
                          {activity.type} {activity.action}
                        </Text>
                        <Text type="secondary" className="text-xs">
                          {new Date(activity.date).toLocaleDateString()}
                        </Text>
                      </div>
                      <Text type="secondary" className="block">
                        {formatCurrency(activity.amount)}
                      </Text>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No recent activity"
                className="py-8"
              />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default SchoolHeadDashboard;
