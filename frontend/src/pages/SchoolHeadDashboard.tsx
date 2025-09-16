/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Button from "@/components/ui/button/Button";
import {
  DollarSign,
  FileText,
  CheckCircle2,
  Upload,
  BarChart3,
  Clock,
  Download,
} from "lucide-react";
import { Card, Statistic, Progress, Table, Tag, Space } from "antd";
import api from "@/api/axios";
import { formatCurrency } from "@/lib/helpers";

interface PrioritySummary {
  id: string | number;
  title: string;
  downloadedAmount: number;
  actualAmount: number;
  uploadedCompletion: number; // Percentage of required docs uploaded
  status: "completed" | "partial" | "pending";
}

interface DashboardData {
  totalDownloaded: number;
  totalActual: number;
  liquidatedPercentage: number;
  uploadCompletion: number; // Overall % of priorities with full uploads
  priorities: PrioritySummary[];
  remainingDays?: number;
}

interface RequestPriority {
  id: string | number;
  title: string;
  amount: number;
}

interface RequestData {
  totalRequested: number;
  numPriorities: number;
  status: string;
  nextAvailableMonth: string;
  canSubmit: boolean;
  priorities: RequestPriority[];
  requestMonthyear: string;
}

const SchoolHeadDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [requestData, setRequestData] = useState<RequestData | null>(null);
  const [maxBudget, setMaxBudget] = useState(0);
  const [mode, setMode] = useState<"request" | "liquidation" | "none">("none");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      setMode("none");
      try {
        // Fetch user data to get school budget
        const userRes = await api.get("/users/me/");
        const userData = userRes.data;
        const fetchedMaxBudget = userData.school?.max_budget || 0;
        setMaxBudget(fetchedMaxBudget);

        // Fetch pending liquidation
        const res = await api.get("/liquidation/");
        const liquidationData = Array.isArray(res.data) ? res.data[0] : null;

        if (liquidationData) {
          // Process liquidation data
          const priorities = (liquidationData.request?.priorities || []).map(
            (priority: any) => {
              const expenseId = priority.id || priority.priority?.LOPID || "";
              const downloadedAmount = Number(priority.amount) || 0;
              const actualAmount =
                liquidationData.actual_amounts?.find(
                  (a: any) => a.expense_id === expenseId
                )?.actual_amount || 0;

              // Calculate upload completion for this priority
              const requirements = priority.priority?.requirements || [];
              const requiredReqs = requirements.filter(
                (r: any) => r.is_required
              );
              const totalRequired = requiredReqs.length;
              let uploadedRequired = 0;
              (liquidationData.documents || []).forEach((doc: any) => {
                if (String(doc.request_priority_id) === String(expenseId)) {
                  const req = requiredReqs.find(
                    (r: any) =>
                      String(r.requirementID) === String(doc.requirement_id)
                  );
                  if (req && doc.is_approved !== false) {
                    uploadedRequired++;
                  }
                }
              });
              const uploadedCompletion =
                totalRequired > 0
                  ? (uploadedRequired / totalRequired) * 100
                  : 100;

              const status =
                uploadedCompletion === 100
                  ? "completed"
                  : uploadedCompletion > 0
                  ? "partial"
                  : "pending";

              return {
                id: expenseId,
                title: priority.priority?.expenseTitle || "",
                downloadedAmount,
                actualAmount,
                uploadedCompletion,
                status,
              };
            }
          );

          const totalDownloaded = priorities.reduce(
            (sum: any, p: { downloadedAmount: any }) =>
              sum + p.downloadedAmount,
            0
          );
          const totalActual = priorities.reduce(
            (sum: any, p: { actualAmount: any }) => sum + p.actualAmount,
            0
          );
          const liquidatedPercentage =
            totalDownloaded > 0 ? (totalActual / totalDownloaded) * 100 : 0;
          const completedPriorities = priorities.filter(
            (p: { status: string }) => p.status === "completed"
          ).length;
          const totalPriorities = priorities.length;
          const uploadCompletion =
            totalPriorities > 0
              ? (completedPriorities / totalPriorities) * 100
              : 0;

          setData({
            totalDownloaded,
            totalActual,
            liquidatedPercentage,
            uploadCompletion,
            priorities,
            remainingDays: liquidationData.remaining_days ?? null,
          });
          setMode("liquidation");
          setLoading(false);
          return;
        }

        // No liquidation, fetch user requests
        const reqRes = await api.get("/user-requests/");
        const requests = reqRes.data || [];
        // Find the current active request (not liquidated or rejected)
        const currentRequest =
          requests.find(
            (r: any) => !["liquidated", "rejected"].includes(r.status)
          ) || requests[0];

        if (currentRequest) {
          // Process request data
          const priorities = currentRequest.priorities || [];
          const processedPriorities = priorities.map((p: any) => ({
            id: p.id || p.LOPID,
            title: p.priority?.expenseTitle || p.expenseTitle || "",
            amount: Number(p.amount),
          }));

          const totalRequested = processedPriorities.reduce(
            (sum: number, p: RequestPriority) => sum + p.amount,
            0
          );

          setRequestData({
            totalRequested,
            numPriorities: processedPriorities.length,
            status: currentRequest.status,
            nextAvailableMonth: currentRequest.next_available_month || "",
            canSubmit: currentRequest.can_submit_for_month || false,
            priorities: processedPriorities,
            requestMonthyear: currentRequest.request_monthyear || "",
          });
        } else {
          // Fetch next available month even if no requests exist
          const monthRes = await api.get("/requests/next-available-month/");
          setRequestData({
            totalRequested: 0,
            numPriorities: 0,
            status: "none",
            nextAvailableMonth: monthRes.data.next_available_month || "",
            canSubmit: true,
            priorities: [],
            requestMonthyear: "",
          });
        }
        setMode("request");
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
      case "downloaded":
        return "#10b981";
      case "pending":
        return "#f59e0b";
      case "rejected":
        return "#ef4444";
      default:
        return "#6b7280";
    }
  };

  const getTagColor = (status: string) => {
    switch (status) {
      case "approved":
      case "downloaded":
        return "green";
      case "pending":
        return "blue";
      case "rejected":
        return "red";
      default:
        return "default";
    }
  };

  const getStatusPercent = (status: string) => {
    switch (status) {
      case "downloaded":
        return 75;
      case "approved":
        return 50;
      case "pending":
        return 25;
      case "rejected":
      case "none":
        return 0;
      default:
        return 0;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading dashboard...</div>
      </div>
    );
  }

  if (mode === "liquidation" && data) {
    const columns = [
      {
        title: "Expense",
        dataIndex: "title",
        key: "title",
        render: (text: string) => <span className="font-medium">{text}</span>,
      },
      {
        title: "Downloaded Amount",
        dataIndex: "downloadedAmount",
        key: "downloadedAmount",
        render: (amount: number) => formatCurrency(amount),
      },
      {
        title: "Actual Amount",
        dataIndex: "actualAmount",
        key: "actualAmount",
        render: (amount: number) => formatCurrency(amount),
      },
      {
        title: "Liquidated %",
        dataIndex: "downloadedAmount",
        key: "liquidatedPct",
        render: (_: any, record: PrioritySummary) => {
          const pct =
            record.downloadedAmount > 0
              ? (record.actualAmount / record.downloadedAmount) * 100
              : 0;
          return (
            <Progress
              percent={pct}
              size="small"
              status="active"
              strokeColor="#10b981"
              className="w-20"
            />
          );
        },
      },
      {
        title: "Upload Completion",
        dataIndex: "uploadedCompletion",
        key: "uploadCompletion",
        render: (pct: number) => (
          <Progress
            percent={pct}
            size="small"
            status={pct === 100 ? "success" : "active"}
            strokeColor={pct === 100 ? "#10b981" : "#f59e0b"}
            className="w-20"
          />
        ),
      },
      {
        title: "Status",
        key: "status",
        render: (_: any, record: PrioritySummary) => {
          const color =
            record.status === "completed"
              ? "green"
              : record.status === "partial"
              ? "orange"
              : "gray";
          return <Tag color={color}>{record.status.toUpperCase()}</Tag>;
        },
      },
    ];

    return (
      <div className="space-y-6">
        <PageBreadcrumb pageTitle="School Head Dashboard" />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Downloaded */}
          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
            <Statistic
              title={
                <Space>
                  <Download className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  Total Downloaded
                </Space>
              }
              value={data.totalDownloaded}
              precision={2}
              valueStyle={{ color: "#3b82f6" }}
              prefix={<DollarSign className="h-4 w-4 inline" />}
              formatter={(value) => formatCurrency(Number(value))}
            />
          </Card>

          {/* Total Liquidated */}
          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
            <Statistic
              title={
                <Space>
                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                  Total Liquidated
                </Space>
              }
              value={data.totalActual}
              precision={2}
              valueStyle={{ color: "#10b981" }}
              prefix={<DollarSign className="h-4 w-4 inline" />}
              formatter={(value) => formatCurrency(Number(value))}
            />
          </Card>

          {/* Liquidated Percentage */}
          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20">
            <Statistic
              title={
                <Space>
                  <BarChart3 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  Liquidated %
                </Space>
              }
              value={data.liquidatedPercentage}
              precision={1}
              suffix="%"
              valueStyle={{
                color:
                  data.liquidatedPercentage > 80
                    ? "#10b981"
                    : data.liquidatedPercentage > 50
                    ? "#f59e0b"
                    : "#ef4444",
              }}
            />
            <Progress
              percent={data.liquidatedPercentage}
              status="active"
              strokeColor={
                data.liquidatedPercentage > 80
                  ? "#10b981"
                  : data.liquidatedPercentage > 50
                  ? "#f59e0b"
                  : "#ef4444"
              }
              className="mt-2"
            />
          </Card>

          {/* Upload Completion */}
          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20">
            <Statistic
              title={
                <Space>
                  <Upload className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                  Upload Completion
                </Space>
              }
              value={data.uploadCompletion}
              precision={1}
              suffix="%"
              valueStyle={{
                color:
                  data.uploadCompletion > 80
                    ? "#10b981"
                    : data.uploadCompletion > 50
                    ? "#f59e0b"
                    : "#ef4444",
              }}
            />
            <Progress
              percent={data.uploadCompletion}
              status="active"
              strokeColor={
                data.uploadCompletion > 80
                  ? "#10b981"
                  : data.uploadCompletion > 50
                  ? "#f59e0b"
                  : "#ef4444"
              }
              className="mt-2"
            />
            {data.remainingDays !== undefined && (
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex items-center">
                <Clock className="h-3 w-3 mr-1" />
                {data.remainingDays} days remaining
              </div>
            )}
          </Card>
        </div>

        {/* Priorities Table */}
        <Card
          title={
            <Space>
              <FileText className="h-5 w-5" />
              List of Priorities (Expenses)
            </Space>
          }
          className="shadow-sm"
        >
          <Table
            columns={columns}
            dataSource={data.priorities}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            loading={loading}
            scroll={{ x: "max-content" }}
            className="modern-table"
          />
        </Card>
      </div>
    );
  }

  // Default to request mode even if no request data exists
  const statusPercent = requestData ? getStatusPercent(requestData.status) : 0;
  const eligiblePercent = requestData?.canSubmit ? 100 : 0;
  const utilization =
    maxBudget > 0 && requestData
      ? (requestData.totalRequested / maxBudget) * 100
      : 0;
  const remainingBudget = maxBudget - (requestData?.totalRequested || 0);

  const requestColumns = [
    {
      title: "Expense",
      dataIndex: "title",
      key: "title",
      render: (text: string) => <span className="font-medium">{text}</span>,
    },
    {
      title: "Requested Amount",
      dataIndex: "amount",
      key: "amount",
      render: (amount: number) => formatCurrency(amount),
    },
    {
      title: "Status",
      key: "status",
      render: () => (
        <Tag color={getTagColor(requestData?.status || "none")}>
          {(requestData?.status || "none").toUpperCase()}
        </Tag>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="School Head Dashboard" />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Requested */}
        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
          <Statistic
            title={
              <Space>
                <Download className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                Total Requested
              </Space>
            }
            value={requestData?.totalRequested || 0}
            precision={2}
            valueStyle={{ color: "#3b82f6" }}
            prefix={<DollarSign className="h-4 w-4 inline" />}
            formatter={(value) => formatCurrency(Number(value))}
          />
        </Card>

        {/* Budget Utilization */}
        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
          <Statistic
            title={
              <Space>
                <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
                Budget Utilization
              </Space>
            }
            value={utilization}
            precision={1}
            suffix="%"
            valueStyle={{
              color:
                utilization > 80
                  ? "#ef4444"
                  : utilization > 50
                  ? "#f59e0b"
                  : "#10b981",
            }}
          />
          <Progress
            percent={utilization}
            status="active"
            strokeColor={
              utilization > 80
                ? "#ef4444"
                : utilization > 50
                ? "#f59e0b"
                : "#10b981"
            }
            className="mt-2"
          />
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Remaining: {formatCurrency(remainingBudget)}
          </div>
        </Card>

        {/* Request Progress */}
        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20">
          <Statistic
            title={
              <Space>
                <BarChart3 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                Request Progress
              </Space>
            }
            value={statusPercent}
            precision={0}
            suffix="%"
            valueStyle={{
              color: getStatusColor(requestData?.status || "none"),
            }}
          />
          <Progress
            percent={statusPercent}
            status="active"
            strokeColor={getStatusColor(requestData?.status || "none")}
            className="mt-2"
          />
        </Card>

        {/* Eligible to Submit */}
        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20">
          <Statistic
            title={
              <Space>
                <CheckCircle2 className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                Eligible to Submit
              </Space>
            }
            value={eligiblePercent}
            precision={0}
            suffix="%"
            valueStyle={{
              color: requestData?.canSubmit ? "#10b981" : "#ef4444",
            }}
          />
          <Progress
            percent={eligiblePercent}
            status={requestData?.canSubmit ? "success" : "exception"}
            strokeColor={requestData?.canSubmit ? "#10b981" : "#ef4444"}
            className="mt-2"
          />
          {requestData?.nextAvailableMonth && (
            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Next: {requestData.nextAvailableMonth}
            </div>
          )}
        </Card>
      </div>

      {/* Priorities Table */}
      <Card
        title={
          <Space>
            <FileText className="h-5 w-5" />
            List of Priorities (Expenses)
            {requestData?.requestMonthyear &&
              ` - ${requestData.requestMonthyear}`}
          </Space>
        }
        extra={
          <Button
            type="button"
            onClick={() => navigate("/requests/create")}
            size="sm"
            disabled={!requestData?.canSubmit}
          >
            Create New MOOE Request
          </Button>
        }
        className="shadow-sm"
      >
        <Table
          columns={requestColumns}
          dataSource={requestData?.priorities || []}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          loading={loading}
          scroll={{ x: "max-content" }}
          className="modern-table"
        />
      </Card>
    </div>
  );
};

export default SchoolHeadDashboard;
