/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  RadialBarChart,
  RadialBar,
} from "recharts";
import {
  Download,
  AlertCircle,
  CheckCircle,
  DollarSign,
  RefreshCw,
  Plus,
  FileText,
  TrendingUp,
  Clock,
  Eye,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Badge from "@/components/ui/badge/Badge";
import { Skeleton } from "antd";
// import api from "@/api/api";
import { useNavigate } from "react-router-dom";

// Types for our data
interface SchoolHeadDashboardData {
  liquidationProgress: {
    priorities: PriorityProgress[];
    totalPriorities: number;
    completedPriorities: number;
    completionPercentage: number;
  };
  financialMetrics: {
    totalDownloadedAmount: number;
    totalLiquidatedAmount: number;
    liquidationPercentage: number;
    remainingAmount: number;
  };
  recentLiquidations: LiquidationItem[];
  priorityBreakdown: PriorityBreakdownItem[];
  requestStatus?: {
    hasPendingRequest: boolean;
    hasActiveLiquidation: boolean;
    pendingRequest?: {
      request_id: string;
      status: string;
      request_monthyear: string;
      created_at: string;
      school_name?: string;
      school_id?: string;
      division?: string;
      total_amount?: number;
      priorities?: {
        expenseTitle: string;
        amount: number;
        description?: string;
      }[];
    };
    activeLiquidation?: {
      LiquidationID: string;
      status: string;
      created_at: string;
    };
  };
  frequentlyUsedPriorities?: {
    priority: string;
    frequency: number;
    totalAmount: number;
    lastUsed: string;
  }[];
  recentRequests?: {
    request_id: string;
    status: string;
    request_monthyear: string;
    created_at: string;
    total_amount: number;
    priorities: {
      expenseTitle: string;
      amount: number;
    }[];
  }[];
}

interface PriorityProgress {
  priorityId: string;
  priorityName: string;
  status: "not_started" | "in_progress" | "completed";
  documentsRequired: number;
  documentsUploaded: number;
  completionPercentage: number;
}

interface LiquidationItem {
  id: string;
  priorityName: string;
  amount: number;
  status: "draft" | "submitted" | "under_review" | "approved" | "rejected";
  date: string;
}

interface PriorityBreakdownItem {
  priority: string;
  amount: number;
  percentage: number;
  color: string;
  name: string; // Add this property for recharts compatibility
}

const COLORS = [
  "#465FFF",
  "#9CB9FF",
  "#FF8042",
  "#00C49F",
  "#FFBB28",
  "#8884D8",
];

const dummyData: SchoolHeadDashboardData = {
  liquidationProgress: {
    priorities: [
      {
        priorityId: "1",
        priorityName: "School Supplies",
        status: "completed",
        documentsRequired: 5,
        documentsUploaded: 5,
        completionPercentage: 100,
      },
      {
        priorityId: "2",
        priorityName: "Facility Repairs",
        status: "in_progress",
        documentsRequired: 8,
        documentsUploaded: 6,
        completionPercentage: 75,
      },
      {
        priorityId: "3",
        priorityName: "Teacher Training",
        status: "not_started",
        documentsRequired: 4,
        documentsUploaded: 0,
        completionPercentage: 0,
      },
      {
        priorityId: "4",
        priorityName: "Office Supplies",
        status: "in_progress",
        documentsRequired: 6,
        documentsUploaded: 3,
        completionPercentage: 50,
      },
      {
        priorityId: "5",
        priorityName: "Maintenance",
        status: "completed",
        documentsRequired: 7,
        documentsUploaded: 7,
        completionPercentage: 100,
      },
    ],
    totalPriorities: 5,
    completedPriorities: 2,
    completionPercentage: 65.0,
  },
  financialMetrics: {
    totalDownloadedAmount: 250000,
    totalLiquidatedAmount: 162500,
    liquidationPercentage: 65,
    remainingAmount: 87500,
  },
  recentLiquidations: [
    {
      id: "l1",
      priorityName: "School Supplies",
      amount: 75000,
      status: "approved",
      date: "2025-01-15",
    },
    {
      id: "l2",
      priorityName: "Facility Repairs",
      amount: 45000,
      status: "submitted",
      date: "2025-01-18",
    },
    {
      id: "l3",
      priorityName: "Office Supplies",
      amount: 25000,
      status: "under_review",
      date: "2025-01-20",
    },
    {
      id: "l4",
      priorityName: "Maintenance",
      amount: 17500,
      status: "approved",
      date: "2025-01-22",
    },
  ],
  priorityBreakdown: [
    {
      priority: "School Supplies",
      amount: 75000,
      percentage: 30.0,
      color: "#465FFF",
      name: "School Supplies",
    },
    {
      priority: "Facility Repairs",
      amount: 90000,
      percentage: 36.0,
      color: "#FF8042",
      name: "Facility Repairs",
    },
    {
      priority: "Office Supplies",
      amount: 40000,
      percentage: 16.0,
      color: "#00C49F",
      name: "Office Supplies",
    },
    {
      priority: "Teacher Training",
      amount: 30000,
      percentage: 12.0,
      color: "#FFBB28",
      name: "Teacher Training",
    },
    {
      priority: "Maintenance",
      amount: 15000,
      percentage: 6.0,
      color: "#8884D8",
      name: "Maintenance",
    },
  ],
};

const SchoolHeadDashboard = () => {
  const [data, setData] = useState<SchoolHeadDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [, setRefreshing] = useState(false);
  const [showRequestStatus, setShowRequestStatus] = useState(false);
  const [showDownloadedPopup, setShowDownloadedPopup] = useState(false);
  const [requestStatusData, setRequestStatusData] = useState<any>(null);
  const [showRequestView, setShowRequestView] = useState(false);
  const [hasShownPopup, setHasShownPopup] = useState(false);
  const navigate = useNavigate();

  const getPriorityColor = (priorityName: string, fallbackIndex = 0) => {
    const index = data?.liquidationProgress.priorities.findIndex(
      (p) => p.priorityName === priorityName
    );
    const colorIndex =
      index !== undefined && index !== -1 ? index : fallbackIndex;
    return COLORS[colorIndex % COLORS.length];
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Use dummy data for demo purposes
      const requestStatus = {
        hasPendingRequest: true,
        hasActiveLiquidation: true,
        pendingRequest: {
          request_id: "REQ-2025-001",
          status: "downloaded",
          request_monthyear: "2025-01",
          created_at: "2025-01-01T10:00:00Z",
          school_name: "San Jose Elementary School",
          school_id: "SJES-001",
          division: "Division of City Schools - Manila",
          total_amount: 250000,
          priorities: [
            {
              expenseTitle: "School Supplies",
              amount: 75000,
              description: "Textbooks, notebooks, pencils, and other classroom materials"
            },
            {
              expenseTitle: "Facility Repairs",
              amount: 90000,
              description: "Repair of classroom furniture, doors, windows, and electrical fixtures"
            },
            {
              expenseTitle: "Office Supplies",
              amount: 40000,
              description: "Paper, ink, office equipment, and administrative materials"
            },
            {
              expenseTitle: "Teacher Training",
              amount: 30000,
              description: "Professional development seminars and training workshops"
            },
            {
              expenseTitle: "Maintenance",
              amount: 15000,
              description: "Cleaning supplies, minor repairs, and general maintenance"
            }
          ]
        },
        activeLiquidation: {
          LiquidationID: "LIQ-2025-001",
          status: "in_progress",
          created_at: "2025-01-15T10:00:00Z"
        }
      };

      // Check if request is downloaded and popup hasn't been shown yet
      if (requestStatus.hasPendingRequest && 
          requestStatus.pendingRequest?.status === 'downloaded' && 
          !hasShownPopup) {
        setShowDownloadedPopup(true);
        setRequestStatusData(requestStatus.pendingRequest);
        setHasShownPopup(true);
      }

      // Simulate other data for now
      setTimeout(() => {
        setData({
          ...dummyData,
          requestStatus: requestStatus,
          frequentlyUsedPriorities: [
            {
              priority: "School Supplies",
              frequency: 8,
              totalAmount: 320000,
              lastUsed: "2025-01-15"
            },
            {
              priority: "Facility Repairs",
              frequency: 6,
              totalAmount: 450000,
              lastUsed: "2025-01-18"
            },
            {
              priority: "Office Supplies",
              frequency: 4,
              totalAmount: 180000,
              lastUsed: "2025-01-20"
            },
            {
              priority: "Teacher Training",
              frequency: 3,
              totalAmount: 150000,
              lastUsed: "2025-01-10"
            },
            {
              priority: "Maintenance",
              frequency: 5,
              totalAmount: 120000,
              lastUsed: "2025-01-22"
            }
          ],
          recentRequests: [
            {
              request_id: "REQ-2025-001",
              status: "downloaded",
              request_monthyear: "2025-01",
              created_at: "2025-01-01T10:00:00Z",
              total_amount: 250000,
              priorities: [
                { expenseTitle: "School Supplies", amount: 75000 },
                { expenseTitle: "Facility Repairs", amount: 90000 },
                { expenseTitle: "Office Supplies", amount: 40000 },
                { expenseTitle: "Teacher Training", amount: 30000 },
                { expenseTitle: "Maintenance", amount: 15000 }
              ]
            },
            {
              request_id: "REQ-2024-012",
              status: "liquidated",
              request_monthyear: "2024-12",
              created_at: "2024-12-01T10:00:00Z",
              total_amount: 200000,
              priorities: [
                { expenseTitle: "School Supplies", amount: 80000 },
                { expenseTitle: "Facility Repairs", amount: 70000 },
                { expenseTitle: "Office Supplies", amount: 50000 }
              ]
            },
            {
              request_id: "REQ-2024-011",
              status: "liquidated",
              request_monthyear: "2024-11",
              created_at: "2024-11-01T10:00:00Z",
              total_amount: 180000,
              priorities: [
                { expenseTitle: "Teacher Training", amount: 100000 },
                { expenseTitle: "Maintenance", amount: 80000 }
              ]
            },
            {
              request_id: "REQ-2024-010",
              status: "liquidated",
              request_monthyear: "2024-10",
              created_at: "2024-10-01T10:00:00Z",
              total_amount: 220000,
              priorities: [
                { expenseTitle: "School Supplies", amount: 120000 },
                { expenseTitle: "Facility Repairs", amount: 100000 }
              ]
            },
            {
              request_id: "REQ-2024-009",
              status: "liquidated",
              request_monthyear: "2024-09",
              created_at: "2024-09-01T10:00:00Z",
              total_amount: 160000,
              priorities: [
                { expenseTitle: "Office Supplies", amount: 80000 },
                { expenseTitle: "Maintenance", amount: 80000 }
              ]
            }
          ]
        });
        setLoading(false);
        setRefreshing(false);
      }, 800);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setData(dummyData);
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case "in_progress":
        return <Badge className="bg-blue-100 text-blue-800">In Progress</Badge>;
      case "not_started":
        return <Badge className="bg-gray-100 text-gray-800">Not Started</Badge>;
      case "approved":
        return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
      case "submitted":
        return <Badge className="bg-blue-100 text-blue-800">Submitted</Badge>;
      case "under_review":
        return (
          <Badge className="bg-yellow-100 text-yellow-800">Under Review</Badge>
        );
      case "rejected":
        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
      case "downloaded":
        return <Badge className="bg-purple-100 text-purple-800">Downloaded</Badge>;
      case "unliquidated":
        return <Badge className="bg-orange-100 text-orange-800">Unliquidated</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
    }
  };

  const handleCreateMOOERequest = () => {
    navigate("/prepare-list-of-priorities");
  };

  const handleViewRequestStatus = () => {
    setShowRequestStatus(true);
  };

  const handleCloseRequestStatus = () => {
    setShowRequestStatus(false);
  };

  const handleCloseDownloadedPopup = () => {
    setShowDownloadedPopup(false);
  };

  const handleGoToLiquidation = () => {
    navigate("/liquidation");
  };

  const handleToggleRequestView = () => {
    setShowRequestView(!showRequestView);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              School Head Dashboard
            </h1>
            <p className="mt-1 text-gray-500">
              Liquidation progress and financial metrics
            </p>
          </div>
          <Button variant="outline" disabled>
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            Loading...
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            School Head Dashboard
          </h1>
          <p className="mt-1 text-gray-500">
            Liquidation progress and financial metrics
          </p>
        </div>
        <div className="flex gap-3">
          {!data?.requestStatus?.hasPendingRequest && !data?.requestStatus?.hasActiveLiquidation && (
            <Button 
              onClick={handleCreateMOOERequest}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              New MOOE Request
            </Button>
          )}
          {data?.requestStatus?.hasPendingRequest && (
            <Button 
              onClick={handleViewRequestStatus}
              variant="outline"
              className="border-blue-200 text-blue-600 hover:bg-blue-50"
            >
              <Eye className="h-4 w-4 mr-2" />
              View Request Status
            </Button>
          )}
          {data?.requestStatus?.hasActiveLiquidation && (
            <Button 
              onClick={handleGoToLiquidation}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <FileText className="h-4 w-4 mr-2" />
              Go to Liquidation
            </Button>
          )}
          <Button 
            onClick={handleToggleRequestView}
            variant="outline"
            className="border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            <FileText className="h-4 w-4 mr-2" />
            {showRequestView ? 'Hide Request View' : 'Show Request View'}
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Liquidation Completion
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data?.liquidationProgress.completionPercentage.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {data?.liquidationProgress.completedPriorities} of{" "}
              {data?.liquidationProgress.totalPriorities} list of priorities
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Amount Liquidated
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₱{data?.financialMetrics.totalLiquidatedAmount.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {data?.financialMetrics.liquidationPercentage.toFixed(1)}% of
              downloaded amount
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Remaining Amount
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₱{data?.financialMetrics.remainingAmount.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">To be liquidated</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Downloaded
            </CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₱{data?.financialMetrics.totalDownloadedAmount.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Initial cash advance
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Request View */}
      {showRequestView && (
        <Card className="mb-6">
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Request Overview
            </CardTitle>
            <Button 
              onClick={handleToggleRequestView}
              variant="ghost"
              size="sm"
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Current Request Status */}
              {data?.requestStatus?.pendingRequest ? (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-blue-800">Current MOOE Request</h3>
                    {getStatusBadge(data.requestStatus.pendingRequest.status)}
                  </div>
                  
                  {/* School Information */}
                  <div className="mb-4 p-3 bg-white rounded-lg border">
                    <div className="text-sm text-gray-600 font-medium mb-2">School Information</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <div className="text-xs text-gray-500">School Name</div>
                        <div className="font-semibold text-gray-800">{data.requestStatus.pendingRequest.school_name || "San Jose Elementary School"}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">School ID</div>
                        <div className="font-semibold text-gray-800">{data.requestStatus.pendingRequest.school_id || "SJES-001"}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Division</div>
                        <div className="font-semibold text-gray-800">{data.requestStatus.pendingRequest.division || "Division of City Schools - Manila"}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Request Period</div>
                        <div className="font-semibold text-gray-800">{data.requestStatus.pendingRequest.request_monthyear}</div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <div className="text-sm text-blue-600 font-medium">Request ID</div>
                      <div className="text-lg font-semibold text-blue-800">
                        {data.requestStatus.pendingRequest.request_id}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-blue-600 font-medium">Total Amount</div>
                      <div className="text-lg font-semibold text-blue-800">
                        ₱{data.requestStatus.pendingRequest.total_amount?.toLocaleString() || data.financialMetrics.totalDownloadedAmount.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-blue-600 font-medium">Created</div>
                      <div className="text-lg font-semibold text-blue-800">
                        {new Date(data.requestStatus.pendingRequest.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  
                  {/* Request Priorities and Amounts */}
                  <div className="mt-4 p-4 bg-white rounded-lg border">
                    <div className="text-sm text-gray-600 font-medium mb-3">Request Priorities & Amounts</div>
                    <div className="space-y-3">
                      {data.requestStatus.pendingRequest.priorities?.map((priority, index) => (
                        <div key={index} className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-sm"
                                style={{ backgroundColor: getPriorityColor(priority.expenseTitle, index) }}
                              ></div>
                              <span className="font-medium text-gray-800">{priority.expenseTitle}</span>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold text-gray-800">₱{priority.amount.toLocaleString()}</div>
                              <div className="text-xs text-gray-500">
                                {((priority.amount / (data.requestStatus?.pendingRequest?.total_amount || data?.financialMetrics?.totalDownloadedAmount || 1)) * 100).toFixed(1)}%
                              </div>
                            </div>
                          </div>
                          {priority.description && (
                            <div className="text-xs text-gray-600 mt-1">
                              {priority.description}
                            </div>
                          )}
                        </div>
                      )) || data.priorityBreakdown.map((priority, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-sm"
                              style={{ backgroundColor: priority.color }}
                            ></div>
                            <span className="font-medium text-gray-800">{priority.priority}</span>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-gray-800">₱{priority.amount.toLocaleString()}</div>
                            <div className="text-xs text-gray-500">{priority.percentage}%</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-gray-800">Total Amount</span>
                        <span className="text-lg font-bold text-blue-800">₱{data.requestStatus.pendingRequest.total_amount?.toLocaleString() || data.financialMetrics.totalDownloadedAmount.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 p-3 bg-white rounded border">
                    <div className="text-sm text-gray-600">
                      <strong>Status:</strong> {data.requestStatus.pendingRequest.status === 'pending' 
                        ? 'Your request is currently being reviewed by the Division Superintendent.'
                        : data.requestStatus.pendingRequest.status === 'approved'
                        ? 'Your request has been approved and is ready for download.'
                        : data.requestStatus.pendingRequest.status === 'downloaded'
                        ? 'Your request has been downloaded by the Division Accountant. You can now proceed to liquidation.'
                        : 'Your request status: ' + data.requestStatus.pendingRequest.status}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-gray-50 rounded-lg text-center">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">No Active Request</h3>
                  <p className="text-gray-500 mb-4">
                    You don't have any pending requests at the moment.
                  </p>
                  <Button 
                    onClick={handleCreateMOOERequest}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Request
                  </Button>
                </div>
              )}

              {/* Active Liquidation Status */}
              {data?.requestStatus?.activeLiquidation && (
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-green-800">Active Liquidation</h3>
                    <Badge className="bg-green-100 text-green-800">In Progress</Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-green-600 font-medium">Liquidation ID</div>
                      <div className="text-lg font-semibold text-green-800">
                        {data.requestStatus.activeLiquidation.LiquidationID}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-green-600 font-medium">Created</div>
                      <div className="text-lg font-semibold text-green-800">
                        {new Date(data.requestStatus.activeLiquidation.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-white rounded border">
                    <div className="text-sm text-gray-600">
                      <strong>Status:</strong> Your liquidation is currently in progress. 
                      You can continue working on it or view the details.
                    </div>
                  </div>
                  <div className="mt-4">
                    <Button 
                      onClick={handleGoToLiquidation}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Continue Liquidation
                    </Button>
                  </div>
                </div>
              )}

              {/* Frequently Used Priorities */}
              {data?.frequentlyUsedPriorities && data.frequentlyUsedPriorities.length > 0 && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Frequently Used Priorities
                  </h3>
                  <div className="space-y-3">
                    {data.frequentlyUsedPriorities.map((priority, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium text-gray-800">{priority.priority}</div>
                          <div className="text-sm text-gray-500">
                            Used {priority.frequency} times • Last used: {priority.lastUsed}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-gray-800">
                            ₱{priority.totalAmount.toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-500">Total amount</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Button 
                    onClick={handleCreateMOOERequest}
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-center gap-2"
                  >
                    <Plus className="h-6 w-6" />
                    <span className="font-medium">New Request</span>
                    <span className="text-xs text-gray-500">Create MOOE request</span>
                  </Button>
                  <Button 
                    onClick={() => navigate("/requests-history")}
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-center gap-2"
                  >
                    <Clock className="h-6 w-6" />
                    <span className="font-medium">Request History</span>
                    <span className="text-xs text-gray-500">View past requests</span>
                  </Button>
                  <Button 
                    onClick={handleGoToLiquidation}
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-center gap-2"
                  >
                    <FileText className="h-6 w-6" />
                    <span className="font-medium">Liquidation</span>
                    <span className="text-xs text-gray-500">Manage liquidations</span>
                  </Button>
                </div>
              </div>

            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts and Detailed Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-4">
        {/* Expense Breakdown (moved left) */}
        <Card>
          <CardHeader>
            <CardTitle>Month Expense Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data?.priorityBreakdown?.map((item) => ({
                      ...item,
                      name: item.priority, // Ensure 'name' property exists
                    }))}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="amount"
                    label={({ name, percent }) =>
                      `${name} (${(Number(percent) * 100).toFixed(0)}%)`
                    }
                  >
                    {data?.priorityBreakdown?.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={getPriorityColor(entry.priority, index)}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [
                      `₱${Number(value).toLocaleString()}`,
                      "Amount",
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* List of Priority Completion Chart (moved right) */}
        <Card>
          <CardHeader>
            <CardTitle>List of Priority Completion Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart
                  innerRadius="10%"
                  outerRadius="100%"
                  data={data?.liquidationProgress.priorities.map(
                    (p, index) => ({
                      name: p.priorityName,
                      value: p.completionPercentage,
                      fill: COLORS[index % COLORS.length],
                    })
                  )}
                >
                  <RadialBar background dataKey="value" />
                  <Tooltip
                    formatter={(value) => [`${value}%`, "Completion"]}
                    contentStyle={{
                      backgroundColor: "#111827",
                      border: "none",
                      borderRadius: 6,
                      color: "#FFFFFF",
                    }}
                    labelStyle={{ color: "#FFFFFF" }}
                    itemStyle={{ color: "#FFFFFF" }}
                  />
                  {/* ensure each arc color matches the same color mapping */}
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
            {/* External Legend */}
            <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-900">
              {data?.liquidationProgress.priorities.map((p, index) => (
                <div key={p.priorityId} className="flex items-center gap-2">
                  <span
                    className="inline-block h-3 w-3 rounded-sm"
                    style={{
                      backgroundColor: getPriorityColor(p.priorityName, index),
                    }}
                  />
                  <span className="font-semibold">{p.priorityName}</span>
                  <span className="text-slate-500">
                    - {p.completionPercentage}%
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Request Status View */}
      {showRequestStatus && data?.requestStatus?.pendingRequest && (
        <Card className="mb-6">
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Request Status
            </CardTitle>
            <Button 
              onClick={handleCloseRequestStatus}
              variant="ghost"
              size="sm"
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="text-sm text-blue-600 font-medium">Request ID</div>
                  <div className="text-lg font-semibold text-blue-800">
                    {data.requestStatus.pendingRequest.request_id}
                  </div>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="text-sm text-green-600 font-medium">Status</div>
                  <div className="text-lg font-semibold text-green-800">
                    {getStatusBadge(data.requestStatus.pendingRequest.status)}
                  </div>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <div className="text-sm text-purple-600 font-medium">Month/Year</div>
                  <div className="text-lg font-semibold text-purple-800">
                    {data.requestStatus.pendingRequest.request_monthyear}
                  </div>
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600 font-medium mb-2">Request Details</div>
                <div className="text-sm text-gray-800">
                  Your MOOE request is currently being reviewed by the Division Superintendent. 
                  You will be notified once it has been approved or if any additional information is required.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}





      {/* Priority Progress Details */}
      <Card className="mb-6">
        <CardHeader className="flex items-center justify-between">
          <CardTitle>List of Priority Document Progress</CardTitle>
          <a href="/liquidation">
            <Button className="mb-4" size="sm" variant="outline">
              View Details
            </Button>
          </a>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-3 text-left font-medium">Priority</th>
                  <th className="p-3 text-left font-medium">Status</th>
                  <th className="p-3 text-left font-medium">Documents</th>
                  <th className="p-3 text-left font-medium">Completion</th>
                </tr>
              </thead>
              <tbody>
                {data?.liquidationProgress.priorities.map((priority) => (
                  <tr key={priority.priorityId} className="border-b">
                    <td className="p-3 font-medium">{priority.priorityName}</td>
                    <td className="p-3">{getStatusBadge(priority.status)}</td>
                    <td className="p-3">
                      {priority.documentsUploaded} of{" "}
                      {priority.documentsRequired}
                    </td>
                    <td className="p-3">
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div
                          className="h-2.5 rounded-full"
                          style={{
                            width: `${priority.completionPercentage}%`,
                            backgroundColor: getPriorityColor(
                              priority.priorityName
                            ),
                          }}
                        ></div>
                      </div>
                      <span className="text-xs text-muted-foreground mt-1">
                        {priority.completionPercentage}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Downloaded Request Popup */}
      {showDownloadedPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                MOOE Request Downloaded
              </h3>
              <Button 
                onClick={handleCloseDownloadedPopup}
                variant="ghost"
                size="sm"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-4">
              {/* School Information */}
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="text-sm text-blue-600 font-medium mb-2">School Information</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-blue-500">School Name</div>
                    <div className="font-semibold text-blue-800">San Jose Elementary School</div>
                </div>
                  <div>
                    <div className="text-xs text-blue-500">Request ID</div>
                    <div className="font-semibold text-blue-800">{requestStatusData?.request_id}</div>
              </div>
                  <div>
                    <div className="text-xs text-blue-500">Period</div>
                    <div className="font-semibold text-blue-800">January 2025</div>
                  </div>
                  <div>
                    <div className="text-xs text-blue-500">Total Amount</div>
                    <div className="font-semibold text-blue-800">₱250,000</div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-green-50 rounded-lg">
                <div className="text-sm text-green-600 font-medium">Status</div>
                <div className="text-lg font-semibold text-green-800">
                  Downloaded by Division Accountant
                </div>
              </div>

              {/* Quick Priority Overview */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600 font-medium mb-2">Request Priorities</div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>School Supplies</span>
                    <span className="font-semibold">₱75,000</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Facility Repairs</span>
                    <span className="font-semibold">₱90,000</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Office Supplies</span>
                    <span className="font-semibold">₱40,000</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Teacher Training</span>
                    <span className="font-semibold">₱30,000</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Maintenance</span>
                    <span className="font-semibold">₱15,000</span>
                  </div>
                </div>
              </div>

              <div className="text-sm text-gray-600">
                Your MOOE request has been downloaded by the Division Accountant. 
                You can now proceed to the liquidation process to upload supporting documents and complete the liquidation.
              </div>
              <div className="flex gap-3 pt-4">
                <Button 
                  onClick={handleGoToLiquidation}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Go to Liquidation
                </Button>
                <Button 
                  onClick={handleCloseDownloadedPopup}
                  variant="outline"
                  className="flex-1"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SchoolHeadDashboard;