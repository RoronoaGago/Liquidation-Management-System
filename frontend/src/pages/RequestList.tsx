import { useState, useEffect } from "react";
import { Link } from "react-router";
import { useAuth } from "@/context/AuthContext";
import {
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  FileStackIcon,
  FileTextIcon,
  PrinterIcon,
  DownloadIcon,
} from "lucide-react";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import Button from "../components/ui/button/Button";
import FundRequest from "./FundRequest";
import StatusBadge from "@/components/ui/badge/StatusBadge";
// Import the type from your existing page

const RequestsList = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<FundRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  // Mock data - in a real app, this would come from an API
  useEffect(() => {
    const mockRequests: FundRequest[] = [
      {
        id: "REQ-2023-001",
        status: "approved",
        items: [
          {
            id: "1",
            accountCode: "5020101000",
            accountName: "5020101000 - Traveling Expenses - Local",
            amount: "5,000.00",
            description: "Field work transportation",
            dateRange: {
              start: "2023-06-01",
              end: "2023-06-03",
            },
            files: [],
          },
        ],
        createdAt: "2023-05-28T10:30:00Z",
        updatedAt: "2023-06-05T14:15:00Z",
      },
      {
        id: "REQ-2023-002",
        status: "liquidated",
        items: [
          {
            id: "1",
            accountCode: "5020201000",
            accountName: "5020201000 - Training Expenses",
            amount: "15,000.00",
            description: "Annual training seminar",
            dateRange: {
              start: "2023-07-10",
              end: "2023-07-12",
            },
            files: [],
          },
        ],
        createdAt: "2023-06-15T09:15:00Z",
        updatedAt: "2023-08-01T11:20:00Z",
      },
      // Add more mock requests as needed
    ];

    setRequests(mockRequests);
    setLoading(false);
  }, []);

  const filteredRequests =
    filter === "all"
      ? requests
      : requests.filter((req) => req.status === filter);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case "rejected":
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case "liquidated":
        return <CheckCircleIcon className="h-5 w-5 text-blue-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
    }
  };

  const exportToPDF = (requestId: string) => {
    // Implement PDF export logic
    console.log(`Exporting ${requestId} to PDF`);
  };

  const exportToExcel = (requestId: string) => {
    // Implement Excel export logic
    console.log(`Exporting ${requestId} to Excel`);
  };

  const cloneRequest = (requestId: string) => {
    // Implement clone logic
    console.log(`Cloning request ${requestId}`);
  };

  // TODO - make the creation of request and request list into subitmes

  return (
    <div className="container mx-auto px-4 py-6">
      <PageBreadcrumb pageTitle="My Fund Requests" />

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">My Fund Requests</h1>
          <Link to="/fund-requests/new">
            <Button
              variant="primary"
              disabled={requests.some(
                (req) =>
                  req.status !== "liquidated" && req.status !== "rejected"
              )}
              title={
                requests.some(
                  (req) =>
                    req.status !== "liquidated" && req.status !== "rejected"
                )
                  ? "You must liquidate your active request before creating a new one"
                  : undefined
              }
            >
              + New Request
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-2">
          <Button
            variant={filter === "all" ? "primary" : "outline"}
            onClick={() => setFilter("all")}
          >
            All Requests
          </Button>
          <Button
            variant={filter === "draft" ? "primary" : "outline"}
            onClick={() => setFilter("draft")}
          >
            Drafts
          </Button>
          <Button
            variant={filter === "submitted" ? "primary" : "outline"}
            onClick={() => setFilter("submitted")}
          >
            Submitted
          </Button>
          <Button
            variant={filter === "approved" ? "primary" : "outline"}
            onClick={() => setFilter("approved")}
          >
            Approved
          </Button>
          <Button
            variant={filter === "liquidated" ? "primary" : "outline"}
            onClick={() => setFilter("liquidated")}
          >
            Liquidated
          </Button>
        </div>

        {/* Requests Table */}
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="text-center py-10">
            <FileTextIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-lg font-medium">No requests found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {filter === "all"
                ? "You haven't created any fund requests yet."
                : `You don't have any ${filter} requests.`}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Request ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Updated
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRequests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        to={`/fund-requests/${request.id}`}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        {request.id}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getStatusIcon(request.status)}
                        <StatusBadge status={request.status} className="ml-2" />
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      ₱
                      {request.items
                        .reduce(
                          (sum, item) =>
                            sum + parseFloat(item.amount.replace(/,/g, "")),
                          0
                        )
                        .toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(request.createdAt || "").toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(request.updatedAt || "").toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => cloneRequest(request.id || "")}
                          className="text-gray-600 hover:text-gray-900"
                          title="Clone Request"
                        >
                          <FileStackIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => exportToPDF(request.id || "")}
                          className="text-gray-600 hover:text-gray-900"
                          title="Export to PDF"
                        >
                          <PrinterIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => exportToExcel(request.id || "")}
                          className="text-gray-600 hover:text-gray-900"
                          title="Export to Excel"
                        >
                          <DownloadIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default RequestsList;
